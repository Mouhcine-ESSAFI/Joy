import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplement } from './entities/supplement.entity';
import { CreateSupplementDto } from './dto/create-supplement.dto';
import { OrdersService } from '../orders/orders.service';

// Shared UUID validator
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUUID(id: string | undefined, fieldName = 'ID'): void {
  if (!id) {
    throw new BadRequestException(`${fieldName} is required`);
  }
  if (!UUID_REGEX.test(id)) {
    throw new BadRequestException(
      `Invalid ${fieldName} format. Expected UUID, got: ${id}`,
    );
  }
}

@Injectable()
export class SupplementsService {
  private readonly logger = new Logger(SupplementsService.name);
  constructor(
    @InjectRepository(Supplement)
    private supplementsRepository: Repository<Supplement>,
    private ordersService: OrdersService,
  ) {}

  async create(orderId: string, createDto: CreateSupplementDto, userId: string) {
    // ⭐ Validate both IDs
    validateUUID(orderId, 'order ID');
    validateUUID(userId, 'user ID');

    const supplement = this.supplementsRepository.create({
      orderId,
      label: createDto.label,
      amount: createDto.amount,
      createdBy: userId,
    });
    
    const saved = await this.supplementsRepository.save(supplement);
    
    // ⭐ Track in history
    try {
      await this.ordersService.trackSupplementAdded(
        orderId,
        saved.id,
        saved.label,
        saved.amount,
        userId,
      );
    } catch (error) {
      this.logger.error(`Failed to track supplement in history: ${error?.message}`);
      // Continue anyway - don't fail the whole operation
    }
    
    return saved;
  }

  async findByOrder(orderId: string) {
    // ⭐ Validate UUID - prevents database crash
    validateUUID(orderId, 'order ID');

    return await this.supplementsRepository.find({
      where: { orderId },
      relations: ['creator'],
      order: { createdAt: 'DESC' },
    });
  }

  async remove(id: string, userId: string) {
    validateUUID(id, 'supplement ID');
    validateUUID(userId, 'user ID');

    const supplement = await this.supplementsRepository.findOne({
      where: { id },
    });

    if (!supplement) {
      throw new NotFoundException('Supplement not found');
    }

    // ⭐ Track in history before deleting
    try {
      await this.ordersService.trackSupplementRemoved(
        supplement.orderId,
        supplement.id,
        supplement.label,
        supplement.amount,
        userId,
      );
    } catch (error) {
      console.error('Failed to track supplement removal in history:', error);
      // Continue anyway
    }

    await this.supplementsRepository.remove(supplement);
    return { message: 'Supplement deleted successfully' };
  }
}