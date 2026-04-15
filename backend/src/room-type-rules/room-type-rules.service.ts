import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomTypeRule } from './entities/room-type-rule.entity';
import { CreateRoomTypeRuleDto } from './dto/create-room-type-rule.dto';
import { UpdateRoomTypeRuleDto } from './dto/update-room-type-rule.dto';

@Injectable()
export class RoomTypeRulesService {
  constructor(
    @InjectRepository(RoomTypeRule)
    private rulesRepository: Repository<RoomTypeRule>,
  ) {}

  async create(createDto: CreateRoomTypeRuleDto) {
    const rule = this.rulesRepository.create(createDto);
    return await this.rulesRepository.save(rule);
  }

  async findAll() {
    return await this.rulesRepository.find({
      order: { paxMin: 'ASC' },
    });
  }

  async findByPax(pax: number) {
    return await this.rulesRepository.findOne({
      where: {
        paxMin: pax,
        paxMax: pax,
        isActive: true,
      },
    });
  }

  /**
   * ⭐ NEW: Find matching rule for auto-assignment
   * @param campType - The camp type (not used for now, reserved for future)
   * @param pax - Number of passengers
   * @returns The matching active rule, or null if none found
   */
  async findMatchingRule(campType: string, pax: number): Promise<RoomTypeRule | null> {
    // Get all active rules, ordered by paxMin ascending
    const rules = await this.rulesRepository.find({
      where: { isActive: true },
      order: { paxMin: 'ASC' },
    });

    // Find first rule where pax is within range
    const matchingRule = rules.find(
      rule => pax >= rule.paxMin && pax <= rule.paxMax
    );

    return matchingRule || null;
  }

  async update(id: string, updateDto: UpdateRoomTypeRuleDto) {
    const rule = await this.rulesRepository.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException('Room type rule not found');
    }
    Object.assign(rule, updateDto);
    return await this.rulesRepository.save(rule);
  }

  async remove(id: string) {
    const rule = await this.rulesRepository.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException('Room type rule not found');
    }
    await this.rulesRepository.remove(rule);
    return { message: 'Rule deleted successfully' };
  }
}