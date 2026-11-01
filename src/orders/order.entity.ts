import {
  Entity, PrimaryColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Customer } from '../customers/customer.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { User } from '../users/user.entity';
import { Sede } from '../sedes/sede.entity';

@Entity('orders')
export class Order {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 64, nullable: true })
  customer_id: string | null;

  @ManyToOne(() => Customer, { eager: true, nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  @Column({ name: 'vehicle_id', type: 'varchar', length: 64, nullable: true })
  vehicle_id: string | null;

  @ManyToOne(() => Vehicle, { eager: true, nullable: true })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle | null;

  @Column({ name: 'vehiculo', type: 'varchar', length: 255, nullable: true })
  vehiculo: string | null;

  @Column({ name: 'paso_actual', default: 1 })
  paso_actual: number;

  @Column({ length: 100, default: 'Recepción completada' })
  estado: string;

  @Column({ nullable: true })
  kilometraje: number;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({ type: 'text', nullable: true })
  pertenencias: string;

  // Sede a la que pertenece la orden
  @Column({ name: 'sede_id', type: 'varchar', length: 36, nullable: true })
  sede_id: string | null;

  @ManyToOne(() => Sede, { nullable: true, eager: true })
  @JoinColumn({ name: 'sede_id' })
  sede: Sede | null;

  // Usuario que recibió el vehículo
  @Column({ name: 'recibido_por_id', type: 'varchar', length: 36, nullable: true })
  recibido_por_id: string | null;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'recibido_por_id' })
  recibidoPor: User | null;

  // Cotización documento
  @Column({ name: 'cotizacion_doc_nombre', length: 255, nullable: true })
  cotizacion_doc_nombre: string;

  @Column({ name: 'cotizacion_doc_url', type: 'longtext', nullable: true })
  cotizacion_doc_url: string;

  @Column({ name: 'cotizacion_doc_fecha', nullable: true })
  cotizacion_doc_fecha: Date;

  // Notificación cliente
  @Column({ name: 'cliente_notificado', default: false })
  cliente_notificado: boolean;

  @Column({ name: 'canal_notificacion', length: 50, nullable: true })
  canal_notificacion: string;

  @Column({
    name: 'decision_cliente',
    type: 'enum',
    enum: ['PENDIENTE', 'AUTORIZADO', 'RECHAZADO'],
    default: 'PENDIENTE',
  })
  decision_cliente: string;

  @Column({ name: 'pago_acordado', type: 'decimal', precision: 12, scale: 2, nullable: true })
  pago_acordado: number;

  @Column({ name: 'notas_cliente', type: 'text', nullable: true })
  notas_cliente: string;

  // FK usuarios
  @Column({ name: 'recepcionista_id', type: 'varchar', length: 64, nullable: true })
  recepcionista_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'recepcionista_id' })
  recepcionista: User | null;

  @Column({ name: 'tecnico_id', type: 'varchar', length: 64, nullable: true })
  tecnico_id: string | null;

  @Column({ name: 'gerente_id', type: 'varchar', length: 64, nullable: true })
  gerente_id: string | null;

  // Responsables directos por etapa
  @Column({ name: 'responsable_etapa1_id', type: 'varchar', length: 64, nullable: true })
  responsable_etapa1_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'responsable_etapa1_id' })
  responsable_etapa1: User | null;

  @Column({ name: 'fecha_etapa1', type: 'datetime', nullable: true })
  fecha_etapa1: Date | null;

  @Column({ name: 'responsable_etapa2_id', type: 'varchar', length: 64, nullable: true })
  responsable_etapa2_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'responsable_etapa2_id' })
  responsable_etapa2: User | null;

  @Column({ name: 'fecha_etapa2', type: 'datetime', nullable: true })
  fecha_etapa2: Date | null;

  @Column({ name: 'responsable_etapa3_id', type: 'varchar', length: 64, nullable: true })
  responsable_etapa3_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'responsable_etapa3_id' })
  responsable_etapa3: User | null;

  @Column({ name: 'fecha_etapa3', type: 'datetime', nullable: true })
  fecha_etapa3: Date | null;

  @Column({ name: 'responsable_etapa4_id', type: 'varchar', length: 64, nullable: true })
  responsable_etapa4_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'responsable_etapa4_id' })
  responsable_etapa4: User | null;

  @Column({ name: 'fecha_etapa4', type: 'datetime', nullable: true })
  fecha_etapa4: Date | null;

  @Column({ name: 'responsable_etapa5_id', type: 'varchar', length: 64, nullable: true })
  responsable_etapa5_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'responsable_etapa5_id' })
  responsable_etapa5: User | null;

  @Column({ name: 'fecha_etapa5', type: 'datetime', nullable: true })
  fecha_etapa5: Date | null;

  @CreateDateColumn({ name: 'fecha_ingreso' })
  fecha_ingreso: Date;

  @Column({ name: 'fecha_cierre', type: 'datetime', nullable: true })
  fecha_cierre: Date | null;
}
