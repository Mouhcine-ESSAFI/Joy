import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('webhook_logs')
export class WebhookLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  topic: string; // 'orders/create', 'orders/updated', etc.

  @Column()
  shopifyOrderId: string;

  @Column({ nullable: true })
  shopifyOrderNumber: string;

  @Column()
  storeId: string;

  @Column({ type: 'jsonb' })
  payload: any; // Full webhook payload

  @Column({ default: 'pending' })
  status: string; // 'pending', 'processed', 'failed'

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ nullable: true })
  processedOrderId: string; // Our order ID after processing

  @CreateDateColumn()
  receivedAt: Date;

  @Column({ nullable: true })
  processedAt: Date;
}