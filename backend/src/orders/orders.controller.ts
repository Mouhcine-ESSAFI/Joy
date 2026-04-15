import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator'; // ⭐ ADD THIS
import type { Request } from 'express';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles('Owner', 'Admin')
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Get()
  @Roles('Owner', 'Admin', 'Travel Agent', 'Finance', 'Driver')
  async findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 50,
    @Query('storeId') storeId?: string,
    @Query('status') status?: string,
    @Query('shopifyOrderId') shopifyOrderId?: string,
    @Query('tourType') tourType?: string,
    @Query('transport') transport?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('customerName') customerName?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @CurrentUser() user?, // ⭐ ADD THIS - Get current user
  ) {
    return this.ordersService.findAll(
      {
        page: Number(page),
        pageSize: Number(pageSize),
        storeId,
        status,
        shopifyOrderId,
        tourType,
        transport,
        startDate,
        endDate,
        customerName,
        search,
        sortBy,
        sortOrder,
      },
      user, // ⭐ Pass user to service
    );
  }

  @Get(':id')
  @Roles('Owner', 'Admin', 'Travel Agent', 'Finance', 'Driver')
  findOne(@Param('id') id: string, @CurrentUser() user) {
    return this.ordersService.findOne(id, user); // ⭐ Pass user
  }

  @Patch(':id')
  @Roles('Owner', 'Admin', 'Travel Agent')
  update(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as any)?.id;
    return this.ordersService.update(id, updateOrderDto, userId);
  }

  @Post(':id/notes')
  @Roles('Owner', 'Admin', 'Travel Agent')
  addNote(
    @Param('id') id: string,
    @Body('note') note: string,
    @Req() req: Request,
  ) {
    const userId = (req.user as any)?.id;
    return this.ordersService.addNote(id, note, userId);
  }

  @Get(':id/history')
  @Roles('Owner', 'Admin', 'Travel Agent', 'Finance', 'Driver')
  getHistory(@Param('id') id: string) {
    return this.ordersService.getHistory(id);
  }

  @Delete(':id')
  @Roles('Owner', 'Admin')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}