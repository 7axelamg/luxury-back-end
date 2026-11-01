import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Customer } from '../customers/customer.entity';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20, unique: true })
  placa: string;

  @Column({ length: 255, nullable: true })
  vehiculo: string;

  @Column({ length: 100, nullable: true })
  marca: string;

  @Column({ length: 100, nullable: true })
  modelo: string;

  @Column({ nullable: true })
  anio: number;

  @Column({ length: 50, nullable: true })
  color: string;

  @Column({ nullable: true })
  kilometraje: number;

  @ManyToOne(() => Customer, { eager: true, nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  @Column({ name: 'customer_id', type: 'varchar', length: 64, nullable: true })
  customer_id: string | null;
}
