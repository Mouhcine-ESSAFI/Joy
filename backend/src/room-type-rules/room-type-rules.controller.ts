import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { RoomTypeRulesService } from './room-type-rules.service';
import { CreateRoomTypeRuleDto } from './dto/create-room-type-rule.dto';
import { UpdateRoomTypeRuleDto } from './dto/update-room-type-rule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('room-type-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
export class RoomTypeRulesController {
  constructor(private readonly roomTypeRulesService: RoomTypeRulesService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TRAVEL_AGENT, UserRole.FINANCE, UserRole.DRIVER)
  findAll() {
    return this.roomTypeRulesService.findAll();
  }

  @Post()
  create(@Body() createDto: CreateRoomTypeRuleDto) {
    return this.roomTypeRulesService.create(createDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateRoomTypeRuleDto) {
    return this.roomTypeRulesService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roomTypeRulesService.remove(id);
  }
}