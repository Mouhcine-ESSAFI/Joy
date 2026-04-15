import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum StoreStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('shopify_stores')
export class ShopifyStore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  internalName: string; // EN, ES, FR

  @Column()
  shopifyDomain: string; // descubredesierto.myshopify.com

  @Column()
  accessToken: string;

  @Column({ default: '2026-01' })
  apiVersion: string;

  @Column({
    type: 'enum',
    enum: StoreStatus,
    default: StoreStatus.ACTIVE,
  })
  status: StoreStatus;

  // 🔑 Webhook secret stored per store
  @Column({ nullable: true })
  webhookSecret: string;

  // 📊 Track sync status
  @Column({ type: 'timestamp', nullable: true })
  lastSyncedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastOrderFetchedAt: Date;

  @Column({ default: false })
  initialSyncCompleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get isActive(): boolean {
    return this.status === StoreStatus.ACTIVE;
  }
}
