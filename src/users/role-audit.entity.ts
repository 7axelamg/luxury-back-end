import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('role_audit_logs')
export class RoleAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  target_user_id: string;

  @Column({ nullable: true })
  target_username: string;

  @Column({ nullable: true })
  target_nombre: string;

  @Column({ nullable: true })
  previous_role: string;

  @Column()
  new_role: string;

  @Column({ nullable: true })
  assigned_by_id: string;

  @Column({ nullable: true })
  assigned_by_username: string;

  @Column({ nullable: true })
  motivo: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
