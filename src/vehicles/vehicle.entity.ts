import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Customer } from '../customers/customer.entity';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20, unique: true })
  placa: string;

  @Column({ length: 100 })
  marca: string;

  @Column({ length: 100 })
  modelo: string;

  @Column({ nullable: true })
  anio: number;

  @Column({ length: 50, nullable: true })
  color: string;

  @Column({ nullable: true })
  kilometraje: number;

  @ManyToOne(() => Customer, { eager: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'customer_id' })
  customer_id: string;
}
