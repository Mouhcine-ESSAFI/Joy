import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomerFilterDto } from './dto/customer-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Owner', 'Admin', 'Travel Agent', 'Finance')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll(@Query() filters: CustomerFilterDto) {
    return this.customersService.findAll(filters);
  }

  @Get('stats')
  getStats() {
    return this.customersService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }
}
