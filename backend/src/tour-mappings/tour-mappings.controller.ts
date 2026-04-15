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
import { TourMappingsService } from './tour-mappings.service';
import { CreateTourMappingDto } from './dto/create-tour-mapping.dto';
import { UpdateTourMappingDto } from './dto/update-tour-mapping.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('tour-mappings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN) // ⭐ Owner & Admin only
export class TourMappingsController {
  constructor(private readonly tourMappingsService: TourMappingsService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TRAVEL_AGENT, UserRole.FINANCE, UserRole.DRIVER)
  findAll() {
    return this.tourMappingsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TRAVEL_AGENT, UserRole.FINANCE, UserRole.DRIVER)
  findOne(@Param('id') id: string) {
    return this.tourMappingsService.findOne(id);
  }

  @Post()
  create(@Body() createDto: CreateTourMappingDto) {
    return this.tourMappingsService.create(createDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateTourMappingDto) {
    return this.tourMappingsService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tourMappingsService.remove(id);
  }
}