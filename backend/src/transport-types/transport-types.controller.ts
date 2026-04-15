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
import { TransportTypesService } from './transport-types.service';
import { CreateTransportTypeDto } from './dto/create-transport-type.dto';
import { UpdateTransportTypeDto } from './dto/update-transport-type.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('transport-types')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
export class TransportTypesController {
  constructor(private readonly transportTypesService: TransportTypesService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TRAVEL_AGENT, UserRole.FINANCE, UserRole.DRIVER)
  findAll() {
    return this.transportTypesService.findAll();
  }

  @Get('active')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TRAVEL_AGENT, UserRole.FINANCE, UserRole.DRIVER)
  findActive() {
    return this.transportTypesService.findActive();
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TRAVEL_AGENT, UserRole.FINANCE, UserRole.DRIVER)
  findOne(@Param('id') id: string) {
    return this.transportTypesService.findOne(id);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  create(@Body() createDto: CreateTransportTypeDto) {
    return this.transportTypesService.create(createDto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateDto: UpdateTransportTypeDto) {
    return this.transportTypesService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.transportTypesService.remove(id);
  }
}