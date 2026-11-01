import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import { RoleAuditLog } from './role-audit.entity';

export class CreateUserDto {
  nombre_completo?: string;
  nombre?: string;
  username: string;
  password?: string;
  role?: UserRole;
  sedeId?: string;
  documento?: string;
  email?: string;
  telefono?: string;
  cargo?: string;
  debeCambiarPassword?: boolean;
}

export class UpdateUserDto {
  nombre_completo?: string;
  nombre?: string;
  role?: UserRole;
  password?: string;
  sedeId?: string;
  activo?: boolean;
  documento?: string;
  email?: string;
  telefono?: string;
  cargo?: string;
  debeCambiarPassword?: boolean;
  motivo_cambio_rol?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RoleAuditLog)
    private readonly auditRepo: Repository<RoleAuditLog>,
  ) {}

  /** Lista todos los empleados/usuarios con su sede asociada */
  async findAll(): Promise<any[]> {
    const users = await this.userRepo.find({
      relations: { sede: true },
      order: { created_at: 'DESC' },
    });
    return users.map((u) => this.sanitize(u));
  }

  /** Busca un usuario por ID */
  async findOne(id: string): Promise<any> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: { sede: true },
    });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return this.sanitize(user);
  }

  /** Crea un usuario individual con contraseña temporal y cambio obligatorio */
  async createUser(dto: CreateUserDto, actorUser?: any): Promise<any> {
    if (!dto.username || !dto.username.trim()) {
      throw new BadRequestException('El nombre de usuario es obligatorio');
    }

    const username = dto.username.trim().toLowerCase();
    const usernameRegex = /^[a-z0-9._-]{3,30}$/;
    if (!usernameRegex.test(username)) {
      throw new BadRequestException(
        'El nombre de usuario debe tener entre 3 y 30 caracteres, sin espacios y solo letras minúsculas, números, guiones o puntos.',
      );
    }

    // Regla de seguridad: Eliminar cuentas genéricas o compartidas
    const genericAccounts = [
      'usuario',
      'user',
      'guest',
      'invitado',
      'compartido',
      'compartida',
      'shared',
      'generico',
      'generica',
      'demo',
      'taller',
    ];
    if (genericAccounts.includes(username)) {
      throw new BadRequestException(
        `No se permite crear cuentas genéricas o compartidas ("${username}"). Cada usuario debe ser individual y nominativo.`,
      );
    }

    const nombre = (dto.nombre_completo || dto.nombre || '').trim();
    if (!nombre) {
      throw new BadRequestException('El nombre completo es obligatorio para cuentas individuales');
    }

    const exists = await this.userRepo.findOne({ where: { username } });
    if (exists) {
      throw new ConflictException(`El usuario "${username}" ya existe en el sistema`);
    }

    // Generar contraseña temporal si no se especifica
    const generatedTempPassword =
      dto.password && dto.password.trim().length >= 6
        ? dto.password.trim()
        : `Temp*${Math.random().toString(36).slice(-6)}!`;

    const user = new User();
    user.username = username;
    user.nombre = nombre;
    user.documento = (dto.documento || '').trim();
    user.email = (dto.email || '').trim();
    user.telefono = (dto.telefono || '').trim();
    user.cargo = (dto.cargo || '').trim();
    user.role = dto.role || UserRole.RECEPCIONISTA;
    user.sedeId = dto.sedeId || null;
    user.activo = true;
    user.debeCambiarPassword = true; // Cambio obligatorio en el primer ingreso
    user.intentosFallidos = 0;
    user.bloqueadoHasta = null;

    await user.setPassword(generatedTempPassword);

    const saved = await this.userRepo.save(user);

    // Registrar en auditoría de roles
    try {
      const audit = new RoleAuditLog();
      audit.target_user_id = saved.id;
      audit.target_username = saved.username;
      audit.target_nombre = saved.nombre;
      audit.previous_role = 'NINGUNO (CREACIÓN)';
      audit.new_role = saved.role;
      audit.assigned_by_id = actorUser?.id || null;
      audit.assigned_by_username = actorUser?.username || 'SUPER_ADMIN';
      audit.motivo = 'Creación de cuenta individual y asignación de rol inicial';
      await this.auditRepo.save(audit);
    } catch (e) {
      console.error('Error al guardar log de auditoría:', e);
    }

    return {
      ...this.sanitize(saved),
      temporaryPassword: generatedTempPassword,
    };
  }

  /** Actualiza datos de un usuario */
  async updateUser(id: string, dto: UpdateUserDto, actorUser?: any): Promise<any> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: { sede: true },
    });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    if (dto.nombre_completo !== undefined || dto.nombre !== undefined) {
      user.nombre = (dto.nombre_completo || dto.nombre || '').trim();
    }
    if (dto.documento !== undefined) user.documento = dto.documento.trim();
    if (dto.email !== undefined) user.email = dto.email.trim();
    if (dto.telefono !== undefined) user.telefono = dto.telefono.trim();
    if (dto.cargo !== undefined) user.cargo = dto.cargo.trim();
    if (dto.sedeId !== undefined) user.sedeId = dto.sedeId || null;
    if (dto.activo !== undefined) user.activo = dto.activo;
    if (dto.debeCambiarPassword !== undefined) user.debeCambiarPassword = dto.debeCambiarPassword;

    // Verificación de cambio de rol
    if (dto.role && dto.role !== user.role) {
      const previousRole = user.role;
      user.role = dto.role;

      try {
        const audit = new RoleAuditLog();
        audit.target_user_id = user.id;
        audit.target_username = user.username;
        audit.target_nombre = user.nombre;
        audit.previous_role = previousRole;
        audit.new_role = dto.role;
        audit.assigned_by_id = actorUser?.id || null;
        audit.assigned_by_username = actorUser?.username || 'SUPER_ADMIN';
        audit.motivo = dto.motivo_cambio_rol || 'Reasignación de funciones por SUPER_ADMIN';
        await this.auditRepo.save(audit);
      } catch (e) {
        console.error('Error al registrar auditoría de rol:', e);
      }
    }

    if (dto.password && dto.password.trim().length > 0) {
      if (dto.password.trim().length < 6) {
        throw new BadRequestException('La contraseña debe tener al menos 6 caracteres');
      }
      await user.setPassword(dto.password.trim());
    }

    const saved = await this.userRepo.save(user);
    return this.sanitize(saved);
  }

  /** Restablece la contraseña generando una temporal y forzando cambio obligatorio */
  async resetPassword(id: string, actorUser?: any): Promise<any> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    const temporaryPassword = `Temp*${Math.random().toString(36).slice(-6)}!`;
    await user.setPassword(temporaryPassword);
    user.debeCambiarPassword = true;
    user.intentosFallidos = 0;
    user.bloqueadoHasta = null;

    await this.userRepo.save(user);

    return {
      message: 'Contraseña restablecida exitosamente. El usuario deberá cambiarla en su próximo ingreso.',
      userId: user.id,
      username: user.username,
      temporaryPassword,
    };
  }

  /** Desactiva un usuario (nunca borrar usuarios de la BD) */
  async deactivate(id: string): Promise<any> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    user.activo = false;
    const saved = await this.userRepo.save(user);
    return this.sanitize(saved);
  }

  /** Reactiva un usuario */
  async activate(id: string): Promise<any> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    user.activo = true;
    const saved = await this.userRepo.save(user);
    return this.sanitize(saved);
  }

  /** Consulta el historial de cambios y asignaciones de roles */
  async getRoleAuditLogs(): Promise<RoleAuditLog[]> {
    return this.auditRepo.find({
      order: { created_at: 'DESC' },
      take: 100,
    });
  }

  /** Remueve la propiedad password del objeto devuelto */
  private sanitize(user: User): any {
    const { password, ...safeUser } = user;
    return safeUser;
  }
}
