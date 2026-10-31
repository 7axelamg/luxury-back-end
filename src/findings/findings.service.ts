import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Finding, FindingStatus } from './finding.entity';

@Injectable()
export class FindingsService {
  constructor(
    @InjectRepository(Finding)
    private readonly findingRepo: Repository<Finding>,
  ) {}

  /** Lista todos los hallazgos de una orden, ordenados por fecha de creación */
  async findByOrder(orderId: string): Promise<Finding[]> {
    return this.findingRepo.find({
      where: { order_id: orderId },
      order: { fecha_creacion: 'ASC' },
    });
  }

  /** Crea un hallazgo nuevo ligado a una orden */
  async create(orderId: string, dto: any): Promise<Finding> {
    const finding = this.findingRepo.create({
      order_id: orderId,
      etapa_origen: dto.etapa_origen,
      item_relacionado: dto.item_relacionado || null,
      descripcion: dto.descripcion,
      foto_url: dto.foto_url || null,
      estado: FindingStatus.PENDIENTE,
      creado_por_id: dto.creado_por_id || null,
    });
    return this.findingRepo.save(finding);
  }

  /**
   * Actualiza un hallazgo existente.
   * Solo el Gerente Comercial / Admin pueden cambiar:
   * estado, precio_cotizado, fecha_contacto, notas_contacto.
   * El control de roles se realiza en el frontend y/o en el controlador.
   */
  async update(id: string, dto: any): Promise<Finding> {
    const finding = await this.findingRepo.findOne({ where: { id } });
    if (!finding) throw new NotFoundException(`Hallazgo ${id} no encontrado`);

    if (dto.descripcion !== undefined) finding.descripcion = dto.descripcion;
    if (dto.foto_url !== undefined) finding.foto_url = dto.foto_url;
    if (dto.estado !== undefined) finding.estado = dto.estado;
    if (dto.precio_cotizado !== undefined) finding.precio_cotizado = dto.precio_cotizado;
    if (dto.fecha_contacto !== undefined)
      finding.fecha_contacto = dto.fecha_contacto ? new Date(dto.fecha_contacto) : null as any;
    if (dto.notas_contacto !== undefined) finding.notas_contacto = dto.notas_contacto;
    if (dto.item_relacionado !== undefined) finding.item_relacionado = dto.item_relacionado;

    return this.findingRepo.save(finding);
  }

  /** Elimina un hallazgo */
  async remove(id: string): Promise<void> {
    const finding = await this.findingRepo.findOne({ where: { id } });
    if (!finding) throw new NotFoundException(`Hallazgo ${id} no encontrado`);
    await this.findingRepo.remove(finding);
  }
}
