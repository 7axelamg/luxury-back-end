import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sede } from './sede.entity';
import { CreateSedeDto } from './dto/create-sede.dto';
import { UpdateSedeDto } from './dto/update-sede.dto';

@Injectable()
export class SedesService implements OnModuleInit {
  constructor(
    @InjectRepository(Sede)
    private readonly sedeRepo: Repository<Sede>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultSedes();
  }

  async seedDefaultSedes(): Promise<void> {
    const count = await this.sedeRepo.count();
    if (count < 3) {
      const defaultSedes = [
        { nombre: 'Sede Principal - Bogotá (Calle 127)', activa: true },
        { nombre: 'Sede Norte - Medellín (El Poblado)', activa: true },
        { nombre: 'Sede Occidente - Cali (Ciudad Jardín)', activa: true },
      ];

      for (const item of defaultSedes) {
        const exists = await this.sedeRepo.findOne({ where: { nombre: item.nombre } });
        if (!exists) {
          const sede = this.sedeRepo.create(item);
          await this.sedeRepo.save(sede);
        }
      }
    }
  }

  async findAll(): Promise<Sede[]> {
    return this.sedeRepo.find({
      order: { created_at: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Sede> {
    const sede = await this.sedeRepo.findOne({ where: { id } });
    if (!sede) {
      throw new NotFoundException(`Sede con ID ${id} no encontrada`);
    }
    return sede;
  }

  async create(dto: CreateSedeDto): Promise<Sede> {
    if (!dto.nombre || !dto.nombre.trim()) {
      throw new BadRequestException('El nombre de la sede es obligatorio');
    }

    const nombre = dto.nombre.trim();
    const exists = await this.sedeRepo.findOne({ where: { nombre } });
    if (exists) {
      throw new ConflictException(`Ya existe una sede con el nombre "${nombre}"`);
    }

    const sede = this.sedeRepo.create({
      nombre,
      activa: dto.activa !== undefined ? dto.activa : true,
    });

    return this.sedeRepo.save(sede);
  }

  async update(id: string, dto: UpdateSedeDto): Promise<Sede> {
    const sede = await this.findOne(id);

    if (dto.nombre !== undefined) {
      const nombre = dto.nombre.trim();
      if (!nombre) {
        throw new BadRequestException('El nombre de la sede no puede estar vacío');
      }

      const duplicate = await this.sedeRepo.findOne({ where: { nombre } });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(`Ya existe otra sede con el nombre "${nombre}"`);
      }
      sede.nombre = nombre;
    }

    if (dto.activa !== undefined) {
      sede.activa = dto.activa;
    }

    return this.sedeRepo.save(sede);
  }

  async deactivate(id: string): Promise<Sede> {
    const sede = await this.findOne(id);
    sede.activa = false;
    return this.sedeRepo.save(sede);
  }

  async activate(id: string): Promise<Sede> {
    const sede = await this.findOne(id);
    sede.activa = true;
    return this.sedeRepo.save(sede);
  }
}
