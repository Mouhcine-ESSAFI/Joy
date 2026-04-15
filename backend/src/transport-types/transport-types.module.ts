import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransportTypesService } from './transport-types.service';
import { TransportTypesController } from './transport-types.controller';
import { TransportType } from './entities/transport-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TransportType])],
  controllers: [TransportTypesController],
  providers: [TransportTypesService],
  exports: [TransportTypesService],
})
export class TransportTypesModule {}