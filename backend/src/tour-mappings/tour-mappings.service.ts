import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TourCodeMapping } from './entities/tour-mapping.entity';
import { CreateTourMappingDto } from './dto/create-tour-mapping.dto';
import { UpdateTourMappingDto } from './dto/update-tour-mapping.dto';

@Injectable()
export class TourMappingsService {
  constructor(
    @InjectRepository(TourCodeMapping)
    private mappingsRepository: Repository<TourCodeMapping>,
  ) {}

  async findAll() {
    return await this.mappingsRepository.find({
      order: { storeId: 'ASC', productTitle: 'ASC' },
    });
  }

  // ⭐ NEW: Get single mapping
  async findOne(id: string) {
    const mapping = await this.mappingsRepository.findOne({ where: { id } });
    if (!mapping) {
      throw new NotFoundException('Tour mapping not found');
    }
    return mapping;
  }

  async findByStoreAndTitle(storeId: string, productTitle: string) {
  return await this.mappingsRepository.findOne({
    where: { 
      storeId, 
      productTitle,
    },
  });
  }

  // ⭐ NEW: Create mapping
  async create(createDto: CreateTourMappingDto) {
    // Check if mapping already exists for this store + product
    const existing = await this.mappingsRepository.findOne({
      where: {
        storeId: createDto.storeId,
        productTitle: createDto.productTitle,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Mapping already exists for store ${createDto.storeId} and product ${createDto.productTitle}`,
      );
    }

    const mapping = this.mappingsRepository.create(createDto);
    return await this.mappingsRepository.save(mapping);
  }

  async update(id: string, updateDto: UpdateTourMappingDto) {
    const mapping = await this.mappingsRepository.findOne({ where: { id } });
    if (!mapping) {
      throw new NotFoundException('Tour mapping not found');
    }
    Object.assign(mapping, updateDto);
    return await this.mappingsRepository.save(mapping);
  }

  // ⭐ NEW: Delete mapping
  async remove(id: string) {
    const mapping = await this.mappingsRepository.findOne({ where: { id } });
    if (!mapping) {
      throw new NotFoundException('Tour mapping not found');
    }
    await this.mappingsRepository.remove(mapping);
    return { message: 'Tour mapping deleted successfully' };
  }
}