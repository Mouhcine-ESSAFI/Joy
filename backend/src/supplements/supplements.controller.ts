import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { SupplementsService } from './supplements.service';
import { CreateSupplementDto } from './dto/create-supplement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Logger } from '@nestjs/common';

@Controller('supplements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupplementsController {
  private readonly logger = new Logger(SupplementsController.name);
  constructor(private readonly supplementsService: SupplementsService) {}

  @Post('orders/:orderId')
  @Roles('Owner', 'Admin', 'Travel Agent')
  create(
    @Param('orderId') orderId: string,
    @Body() createSupplementDto: CreateSupplementDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as any)?.id;
    
    // ⭐ Add validation
    if (!userId) {
      this.logger.error('User ID not found in request');
      throw new UnauthorizedException('User authentication failed. Please log in again.');
    }
    
    return this.supplementsService.create(orderId, createSupplementDto, userId);
  }

  @Get('orders/:orderId')
  @Roles('Owner', 'Admin', 'Travel Agent', 'Finance', 'Driver')
  findByOrder(@Param('orderId') orderId: string) {
    return this.supplementsService.findByOrder(orderId);
  }

  @Delete(':id')
  @Roles('Owner', 'Admin', 'Travel Agent')
  remove(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any)?.id;
    
    // ⭐ Add validation
    if (!userId) {
      throw new UnauthorizedException('User authentication failed. Please log in again.');
    }
    
    return this.supplementsService.remove(id, userId);
  }
}