import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Order } from '../orders/order.entity';
import { User } from '../users/user.entity';

export enum FindingStatus {
  PENDIENTE = 'PENDIENTE',
  COTIZADO = 'COTIZADO',
  AUTORIZADO = 'AUTORIZADO',
  RECHAZADO = 'RECHAZADO',
  SIN_RESPUESTA = 'SIN_RESPUESTA',
}

@Entity('findings')
export class Finding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'varchar', length: 64 })
  order_id: string;

  @ManyToOne(() => Order, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  /** 2 = Revisión Mecánica, 3 = Ejecución de Trabajos */
  @Column({ name: 'etapa_origen', type: 'int' })
  etapa_origen: number;

  /** Nombre del ítem del checklist al que está asociado */
  @Column({ name: 'item_relacionado', length: 200, nullable: true })
  item_relacionado: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ name: 'foto_url', type: 'longtext', nullable: true })
  foto_url: string;

  @Column({
    type: 'enum',
    enum: FindingStatus,
    default: FindingStatus.PENDIENTE,
  })
  estado: FindingStatus;

  @Column({
    name: 'precio_cotizado',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  precio_cotizado: number;

  @Column({ name: 'fecha_contacto', type: 'datetime', nullable: true })
  fecha_contacto: Date;

  @Column({ name: 'notas_contacto', type: 'text', nullable: true })
  notas_contacto: string;

  @Column({ name: 'creado_por_id', nullable: true })
  creado_por_id: string;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'creado_por_id' })
  creado_por: User;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fecha_creacion: Date;
}
