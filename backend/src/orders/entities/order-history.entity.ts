import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Order } from './order.entity';
import { User } from '../../users/entities/user.entity';

export enum OrderHistoryType {
  STATUS_CHANGE = 'status_change',
  NOTE_ADDED = 'note_added',
  DRIVER_ASSIGNED = 'driver_assigned',
  DRIVER_UNASSIGNED = 'driver_unassigned',
  FIELD_UPDATED = 'field_updated',
  SUPPLEMENT_ADDED = 'supplement_added',
  SUPPLEMENT_REMOVED = 'supplement_removed',
}

@Entity('order_history')
@Index(['orderId', 'createdAt'])
export class OrderHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ⭐ FIXED: Map to snake_case column names
  @Column({ type: 'uuid', name: 'order_id' })
  @Index()
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({
    type: 'enum',
    enum: OrderHistoryType,
  })
  @Index()
  type: OrderHistoryType;

  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // For STATUS_CHANGE
  @Column({ nullable: true, name: 'old_status' })
  oldStatus: string;

  @Column({ nullable: true, name: 'new_status' })
  newStatus: string;

  // For FIELD_UPDATED
  @Column({ nullable: true, name: 'field_name' })
  fieldName: string;

  @Column({ type: 'text', nullable: true, name: 'old_value' })
  oldValue: string;

  @Column({ type: 'text', nullable: true, name: 'new_value' })
  newValue: string;

  // For NOTE_ADDED
  @Column({ type: 'text', nullable: true })
  note: string;

  // For DRIVER_ASSIGNED/UNASSIGNED
  @Column({ type: 'uuid', nullable: true, name: 'driver_id' })
  driverId: string;

  @Column({ nullable: true, name: 'driver_name' })
  driverName: string;

  // For SUPPLEMENT_ADDED/REMOVED
  @Column({ type: 'uuid', nullable: true, name: 'supplement_id' })
  supplementId: string;

  @Column({ nullable: true, name: 'supplement_label' })
  supplementLabel: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'supplement_amount' })
  supplementAmount: number;

  // Generic metadata for future extensions
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}