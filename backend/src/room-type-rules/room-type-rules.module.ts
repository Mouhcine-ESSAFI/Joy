import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomTypeRulesService } from './room-type-rules.service';
import { RoomTypeRulesController } from './room-type-rules.controller';
import { RoomTypeRule } from './entities/room-type-rule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RoomTypeRule])],
  controllers: [RoomTypeRulesController],
  providers: [RoomTypeRulesService],
  exports: [RoomTypeRulesService],
})
export class RoomTypeRulesModule {}