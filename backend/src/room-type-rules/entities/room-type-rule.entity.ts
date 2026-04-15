import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('room_type_rules')
export class RoomTypeRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  paxMin: number;

  @Column({ type: 'int' })
  paxMax: number;

  @Column()
  defaultRoomType: string; // '1xSingle', '1xDouble', etc.

  @Column({ type: 'simple-array' })
  allowedRoomTypes: string[]; // ['1xSingle', '1xDouble']

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}