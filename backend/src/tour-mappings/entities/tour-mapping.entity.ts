import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('tour_code_mappings')
@Index(['storeId', 'shopifyProductId'], { unique: true })
export class TourCodeMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  storeId: string; // 'EN', 'ES', 'FR'

  @Column({ nullable: true })
  shopifyProductId: string; // Shopify product ID — stable even when title changes

  @Column({ nullable: true })
  productTitle: string; // Display only — not used for matching

  @Column({ nullable: true })
  productSku: string;

  @Column({ nullable: true })
  tourCode: string; // 'MARR3D', 'ZAG2D', etc.

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}