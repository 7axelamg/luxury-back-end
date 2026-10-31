import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { User } from '../users/user.entity';

@Entity('historial_acciones')
export class HistorialAccion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'varchar', length: 64 })
  order_id: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'user_id', type: 'varchar', length: 64, nullable: true })
  user_id: string | null;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ type: 'int' })
  etapa: number; // 1 a 5

  @Column({ length: 255 })
  accion: string; // ej: "Ingresó el vehículo", "Cerró Revisión Exterior", etc.

  @Column({ type: 'text', nullable: true })
  detalle: string | null; // información extra (ej: qué ítem específico)

  @CreateDateColumn({ type: 'datetime' })
  fecha: Date; // generado automáticamente
}
