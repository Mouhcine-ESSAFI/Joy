import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TourCodeMapping } from './entities/tour-mapping.entity';
import { CreateTourMappingDto } from './dto/create-tour-mapping.dto';
import { UpdateTourMappingDto } from './dto/update-tour-mapping.dto';
import { Order } from '../orders/entities/order.entity';
import { ShopifyStoresService } from '../shopify-stores/shopify-stores.service';

@Injectable()
export class TourMappingsService {
  constructor(
    @InjectRepository(TourCodeMapping)
    private mappingsRepository: Repository<TourCodeMapping>,
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    private shopifyStoresService: ShopifyStoresService,
  ) {}

  async findAll() {
    return await this.mappingsRepository.find({
      order: { storeId: 'ASC', productTitle: 'ASC' },
    });
  }

  async findOne(id: string) {
    const mapping = await this.mappingsRepository.findOne({ where: { id } });
    if (!mapping) {
      throw new NotFoundException('Tour mapping not found');
    }
    return mapping;
  }

  async findByStoreAndTitle(storeId: string, productTitle: string) {
    return await this.mappingsRepository.findOne({
      where: { storeId, productTitle },
    });
  }

  /** Fetch all product titles from the Shopify store (used to populate the create-mapping dropdown) */
  async getStoreProducts(storeId: string): Promise<string[]> {
    const store = await this.shopifyStoresService.findByInternalName(storeId);
    if (!store) throw new NotFoundException(`Store "${storeId}" not found`);

    const baseUrl = `https://${store.shopifyDomain}/admin/api/${store.apiVersion}`;
    const headers = {
      'X-Shopify-Access-Token': store.accessToken,
      'Content-Type': 'application/json',
    };

    const titles = new Set<string>();
    let url: string | null =
      `${baseUrl}/products.json?fields=title&limit=250`;

    while (url) {
      const res = await fetch(url, { headers });
      if (!res.ok) break;
      const data = await res.json();
      for (const p of data.products || []) {
        if (p.title) titles.add(p.title);
      }

      // Cursor-based pagination via Link header
      const link = res.headers.get('link') || '';
      const next = link.match(/<([^>]+)>;\s*rel="next"/);
      url = next ? next[1] : null;
    }

    return [...titles].sort();
  }

  async create(createDto: CreateTourMappingDto) {
    const existing = await this.mappingsRepository.findOne({
      where: { storeId: createDto.storeId, productTitle: createDto.productTitle },
    });
    if (existing) {
      throw new ConflictException(
        `Mapping already exists for store ${createDto.storeId} and product "${createDto.productTitle}"`,
      );
    }
    const mapping = this.mappingsRepository.create(createDto);
    return await this.mappingsRepository.save(mapping);
  }

  /** Update tour code. If the code changes, propagate to all matching orders in the same store. */
  async update(id: string, updateDto: UpdateTourMappingDto) {
    const mapping = await this.mappingsRepository.findOne({ where: { id } });
    if (!mapping) throw new NotFoundException('Tour mapping not found');

    const oldCode = mapping.tourCode;
    const newCode = updateDto.tourCode ?? oldCode;

    Object.assign(mapping, updateDto);
    const saved = await this.mappingsRepository.save(mapping);

    // Propagate code change to all orders that had the old code for this store
    if (newCode !== oldCode && oldCode) {
      await this.ordersRepository.update(
        { storeId: mapping.storeId, tourCode: oldCode },
        { tourCode: newCode ?? undefined },
      );
    }

    return saved;
  }

  /** Delete a mapping. Blocked if any orders are still assigned to its tour code. */
  async remove(id: string) {
    const mapping = await this.mappingsRepository.findOne({ where: { id } });
    if (!mapping) throw new NotFoundException('Tour mapping not found');

    if (mapping.tourCode) {
      const inUse = await this.ordersRepository.count({
        where: { storeId: mapping.storeId, tourCode: mapping.tourCode },
      });
      if (inUse > 0) {
        throw new ConflictException(
          `Cannot delete: tour code "${mapping.tourCode}" is assigned to ${inUse} order(s). Reassign or clear those orders first.`,
        );
      }
    }

    await this.mappingsRepository.remove(mapping);
    return { message: 'Tour mapping deleted successfully' };
  }
}
