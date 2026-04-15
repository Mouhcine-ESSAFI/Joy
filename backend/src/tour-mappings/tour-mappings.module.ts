import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TourMappingsService } from './tour-mappings.service';
import { TourMappingsController } from './tour-mappings.controller';
import { TourCodeMapping } from './entities/tour-mapping.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TourCodeMapping])],
  controllers: [TourMappingsController],
  providers: [TourMappingsService],
  exports: [TourMappingsService],
})
export class TourMappingsModule {}