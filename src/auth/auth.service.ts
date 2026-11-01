import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    if (!username || !password) {
      throw new BadRequestException('El usuario y la contraseña son requeridos');
    }

    const cleanUsername = username.trim();
    const user = await this.userRepo.findOne({
      where: [{ username: cleanUsername }, { username: cleanUsername.toLowerCase() }],
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // Verificar si la cuenta está bloqueada temporalmente
    if (user.bloqueadoHasta) {
      const now = new Date();
      if (now < new Date(user.bloqueadoHasta)) {
        const diffMinutes = Math.ceil(
          (new Date(user.bloqueadoHasta).getTime() - now.getTime()) / (1000 * 60),
        );
        throw new UnauthorizedException(
          `Cuenta bloqueada temporalmente por 5 intentos fallidos. Intente nuevamente en ${diffMinutes} minuto(s).`,
        );
      } else {
        // El tiempo de bloqueo ya expiró
        user.bloqueadoHasta = null;
        user.intentosFallidos = 0;
        await this.userRepo.save(user);
      }
    }

    const valid = await user.checkPassword(password);
    if (!valid) {
      user.intentosFallidos = (user.intentosFallidos || 0) + 1;
      if (user.intentosFallidos >= 5) {
        user.bloqueadoHasta = new Date(Date.now() + 15 * 60 * 1000); // Bloqueo de 15 minutos
        await this.userRepo.save(user);
        throw new UnauthorizedException(
          'Demasiados intentos fallidos. Su cuenta ha sido bloqueada temporalmente por 15 minutos.',
        );
      }
      await this.userRepo.save(user);
      const restantes = 5 - user.intentosFallidos;
      throw new UnauthorizedException(
        `Credenciales incorrectas. Intentos restantes antes de bloqueo: ${restantes}`,
      );
    }

    if (user.activo === false) {
      throw new UnauthorizedException(
        'Este usuario se encuentra inactivo. Comuníquese con la administración del taller.',
      );
    }

    // Login exitoso: restablecer intentos fallidos
    user.intentosFallidos = 0;
    user.bloqueadoHasta = null;
    await this.userRepo.save(user);

    const payload = {
      sub: user.id,
      userId: user.id,
      username: user.username,
      role: user.role,
      rol: user.role,
      sedeId: user.sedeId || null,
    };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        userId: user.id,
        username: user.username,
        nombre: user.nombre,
        role: user.role,
        rol: user.role,
        sedeId: user.sedeId || null,
        debeCambiarPassword: !!user.debeCambiarPassword,
      },
    };
  }

  /** Cambio obligatorio o voluntario de contraseña */
  async changePassword(
    identifier: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<any> {
    if (!currentPassword || !newPassword) {
      throw new BadRequestException('Se requiere la contraseña actual y la nueva');
    }

    if (newPassword.trim().length < 6) {
      throw new BadRequestException('La nueva contraseña debe tener al menos 6 caracteres');
    }

    const user = await this.userRepo.findOne({
      where: [{ id: identifier }, { username: identifier }],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const valid = await user.checkPassword(currentPassword);
    if (!valid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    await user.setPassword(newPassword.trim());
    user.debeCambiarPassword = false;
    user.intentosFallidos = 0;
    user.bloqueadoHasta = null;

    await this.userRepo.save(user);

    return {
      message: 'Contraseña actualizada exitosamente',
      debeCambiarPassword: false,
    };
  }

  async validateUserById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }
}
