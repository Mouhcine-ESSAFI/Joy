import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request, // ⭐ ADD THIS
} from '@nestjs/common';
import { ShopifyStoresService } from './shopify-stores.service';
import { CreateShopifyStoreDto } from './dto/create-shopify-store.dto';
import { UpdateShopifyStoreDto } from './dto/update-shopify-store.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('shopify-stores')
@UseGuards(JwtAuthGuard, RolesGuard)

export class ShopifyStoresController {
  constructor(private readonly shopifyStoresService: ShopifyStoresService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN) // ⭐ Owner/Admin only
  create(@Body() createShopifyStoreDto: CreateShopifyStoreDto) {
    return this.shopifyStoresService.create(createShopifyStoreDto);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TRAVEL_AGENT) // ⭐ Allow Travel Agent
  async findAll(@Request() req) {
    const allStores = await this.shopifyStoresService.findAll();
    
    // ⭐ Filter stores for Travel Agent
    if (req.user.role === 'Travel Agent' || req.user.role === UserRole.TRAVEL_AGENT) {
      const accessibleStores = req.user.accessibleShopifyStores || [];
      return allStores.filter(store => 
        accessibleStores.includes(store.internalName)
      );
    }
    
    // Owner/Admin see all stores
    return allStores;
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TRAVEL_AGENT) // ⭐ Allow Travel Agent
  findOne(@Param('id') id: string) {
    return this.shopifyStoresService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN) // ⭐ Owner/Admin only
  update(
    @Param('id') id: string,
    @Body() updateShopifyStoreDto: UpdateShopifyStoreDto,
  ) {
    return this.shopifyStoresService.update(id, updateShopifyStoreDto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER) // ⭐ Owner only
  remove(@Param('id') id: string) {
    return this.shopifyStoresService.remove(id);
  }

  @Post(':id/toggle-status')
  @Roles(UserRole.OWNER, UserRole.ADMIN) // ⭐ Owner/Admin only
  toggleStatus(@Param('id') id: string) {
    return this.shopifyStoresService.toggleStatus(id);
  }
}