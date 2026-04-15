import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransportType } from './entities/transport-type.entity';
import { CreateTransportTypeDto } from './dto/create-transport-type.dto';
import { UpdateTransportTypeDto } from './dto/update-transport-type.dto';

@Injectable()
export class TransportTypesService {
  constructor(
    @InjectRepository(TransportType)
    private transportTypesRepository: Repository<TransportType>,
  ) {}

  async create(createDto: CreateTransportTypeDto) {
    const existing = await this.transportTypesRepository.findOne({
      where: { code: createDto.code },
    });

    if (existing) {
      throw new ConflictException(
        `Transport with code '${createDto.code}' already exists`,
      );
    }

    const transport = this.transportTypesRepository.create(createDto);
    return await this.transportTypesRepository.save(transport);
  }

  async findAll() {
    return await this.transportTypesRepository.find({
      order: { code: 'ASC' },
    });
  }

  async findActive() {
    return await this.transportTypesRepository.find({
      where: { isActive: true },
      order: { code: 'ASC' },
    });
  }

  // ⭐ NEW: Get single transport type
  async findOne(id: string) {
    const transport = await this.transportTypesRepository.findOne({
      where: { id },
    });
    if (!transport) {
      throw new NotFoundException('Transport type not found');
    }
    return transport;
  }

  async update(id: string, updateDto: UpdateTransportTypeDto) {
    const transport = await this.transportTypesRepository.findOne({
      where: { id },
    });
    if (!transport) {
      throw new NotFoundException('Transport type not found');
    }
    Object.assign(transport, updateDto);
    return await this.transportTypesRepository.save(transport);
  }

  async remove(id: string) {
    const transport = await this.transportTypesRepository.findOne({
      where: { id },
    });
    if (!transport) {
      throw new NotFoundException('Transport type not found');
    }
    await this.transportTypesRepository.remove(transport);
    return { message: 'Transport type deleted successfully' };
  }
}