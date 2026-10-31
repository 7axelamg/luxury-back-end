import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Order } from '../orders/order.entity';
import { User } from '../users/user.entity';

@Entity('photos')
export class Photo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id' })
  order_id: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'uploaded_by', nullable: true })
  uploaded_by: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'uploaded_by' })
  uploader: User;

  @Column({
    type: 'enum',
    enum: ['RECEPCION', 'REV_1', 'REV_2', 'FINAL'],
    default: 'RECEPCION',
  })
  stage: string;

  @Column({ type: 'longtext' })
  url: string;

  @Column({ length: 255, nullable: true })
  descripcion: string;

  @CreateDateColumn()
  created_at: Date;
}
