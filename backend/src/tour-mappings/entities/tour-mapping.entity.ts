import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('tour_code_mappings')
@Index(['storeId', 'productTitle'], { unique: true })
export class TourCodeMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  storeId: string; // 'EN', 'ES', 'FR'

  @Column()
  productTitle: string;

  @Column({ nullable: true })
  productSku: string;

  @Column({ nullable: true })
  tourCode: string; // 'MARR3D', 'ZAG2D', etc.

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}