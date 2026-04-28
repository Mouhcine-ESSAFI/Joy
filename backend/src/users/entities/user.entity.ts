import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { Exclude } from 'class-transformer';

export enum UserRole {
  OWNER = 'Owner',
  ADMIN = 'Admin',
  TRAVEL_AGENT = 'Travel Agent',
  DRIVER = 'Driver',
  FINANCE = 'Finance',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.TRAVEL_AGENT,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ type: 'jsonb', default: [] })
  accessibleShopifyStores: string[];

  @Column({ type: 'jsonb', default: {} })
  permissions: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'varchar', nullable: true })
  assignedTransportCode: string | null;

  @Column({ type: 'varchar', nullable: true })
  refreshTokenHash: string | null;
}