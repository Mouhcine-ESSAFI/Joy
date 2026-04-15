import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ShopifyStore } from '../../shopify-stores/entities/shopify-store.entity';
import { User } from '../../users/entities/user.entity';
import { Supplement } from '../../supplements/entities/supplement.entity';
import { OrderHistory } from './order-history.entity';

export enum OrderStatus {
  NEW = 'New',
  UPDATED = 'Updated',
  VALIDATE = 'Validate',
  COMPLETED = 'Completed',
  CANCELED = 'Canceled',
}

export enum TourType {
  SHARED = 'Shared',
  PRIVATE = 'Private',
}

export enum PaymentStatus {
  PENDING = 'pending',
  DEPOSIT_PAID = 'deposit_paid',
  PARTIALLY_PAID = 'partially_paid',
  FULLY_PAID = 'fully_paid',
  REFUNDED = 'refunded',
}

export enum FinancialStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  PARTIALLY_REFUNDED = 'partially_refunded',
  REFUNDED = 'refunded',
  VOIDED = 'voided',
}

@Entity('orders')
@Index(['shopifyOrderId', 'lineItemIndex'])
@Index(['tourDate', 'status'])
@Index(['storeId', 'status'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ==================== Shopify Information ====================
  @Column()
  @Index()
  shopifyOrderId: string;

  @Column()
  shopifyOrderNumber: string;

  @Column()
  shopifyLineItemId: string;

  @Column({ type: 'int', default: 0 })
  lineItemIndex: number;

  @Column()
  storeId: string;

  @ManyToOne(() => ShopifyStore)
  @JoinColumn({ name: 'storeId', referencedColumnName: 'internalName' })
  store: ShopifyStore;

  // ⭐ NEW: When order was created in Shopify (for proper sorting)
  @Column({ type: 'timestamp', nullable: true })
  @Index()
  shopifyCreatedAt: Date;

  // ==================== Customer Information ====================
  @Column()
  customerName: string;

  @Column()
  @Index()
  customerEmail: string;

  @Column({ nullable: true })
  customerPhone: string;

  @Column({ name: 'shopify_customer_id', nullable: true })
  shopifyCustomerId?: string;

  // ==================== Tour Details ====================
  @Column({ type: 'date', nullable: true })
  @Index()
  tourDate: Date;

  @Column({ type: 'varchar', nullable: true })
  tourHour: string;

  @Column({ type: 'int' })
  pax: number;

  @Column({ nullable: true })
  @Index()
  tourCode: string;

  @Column()
  tourTitle: string;

  @Column({ type: 'enum', enum: TourType, nullable: true })
  tourType: TourType;

  @Column({ nullable: true })
  campType: string;

  @Column({ nullable: true })
  roomType: string;

  @Column({ nullable: true })
  pickupLocation: string;

  @Column({ nullable: true })
  accommodationName: string;

  // ==================== Status ====================
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.NEW,
  })
  @Index()
  status: OrderStatus;

  // ==================== Payment Tracking ====================
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  lineItemPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  lineItemDiscount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  shopifyTotalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  originalTotalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  depositAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  balanceAmount: number;

  @Column({ default: 'EUR' })
  currency: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.DEPOSIT_PAID,
  })
  paymentStatus: PaymentStatus;

  @Column({
    type: 'enum',
    enum: FinancialStatus,
    nullable: true,
  })
  financialStatus: FinancialStatus;

  // ==================== Logistics ====================
  @Column({ nullable: true })
  @Index()
  transport: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  // ==================== Driver Assignment ====================
  @Column({ type: 'uuid', nullable: true })
  @Index()
  driverId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'driverId' })
  driver: User;

  @Column({ type: 'text', nullable: true })
  driverNotes: string;

  @Column({ type: 'timestamp', nullable: true })
  assignedAt: Date;

  // ==================== Shopify Raw Data ====================
  @Column({ type: 'jsonb', default: {} })
  lineItemProperties: Record<string, any>;

  @Column({ type: 'jsonb', default: {} })
  shopifyMetadata: Record<string, any>;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];
  
  // ==================== Relationships ====================
  @OneToMany(() => Supplement, (supplement) => supplement.order)
  supplements: Supplement[];

  // ⭐ NEW: Order history
  @OneToMany(() => OrderHistory, (history) => history.order)
  history: OrderHistory[];

  // ==================== Timestamps ====================
  @CreateDateColumn()
  createdAt: Date; // When imported to our DB

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  canceledAt: Date;
}