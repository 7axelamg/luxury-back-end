import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Sede } from '../sedes/sede.entity';

export enum UserRole {
  RECEPCIONISTA = 'RECEPCIONISTA',
  JEFE_DE_PATIO = 'JEFE_DE_PATIO',
  TECNICO = 'TECNICO',
  LUBRICADOR = 'LUBRICADOR',
  GERENTE_COMERCIAL = 'GERENTE_COMERCIAL',
  ADMINISTRADOR = 'ADMINISTRADOR',
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMINISTRADOR',
  USER = 'RECEPCIONISTA',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ nullable: true })
  nombre: string;

  @Column()
  password: string; // hashed password

  @Column({ nullable: true })
  documento: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  telefono: string;

  @Column({ nullable: true })
  cargo: string;

  @Column({
    type: 'enum',
    enum: ['RECEPCIONISTA', 'JEFE_DE_PATIO', 'TECNICO', 'LUBRICADOR', 'GERENTE_COMERCIAL', 'ADMINISTRADOR', 'SUPER_ADMIN'],
    default: 'RECEPCIONISTA',
  })
  role: UserRole;

  @Column({ default: true })
  activo: boolean;

  @Column({ name: 'sede_id', type: 'varchar', length: 64, nullable: true })
  sedeId: string | null;

  @ManyToOne(() => Sede, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sede_id' })
  sede: Sede | null;

  @Column({ name: 'debe_cambiar_password', default: false })
  debeCambiarPassword: boolean;

  @Column({ name: 'intentos_fallidos', default: 0 })
  intentosFallidos: number;

  @Column({ name: 'bloqueado_hasta', type: 'timestamp', nullable: true })
  bloqueadoHasta: Date | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  async setPassword(raw: string): Promise<void> {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(raw, salt);
  }

  async checkPassword(raw: string): Promise<boolean> {
    return bcrypt.compare(raw, this.password);
  }
}
