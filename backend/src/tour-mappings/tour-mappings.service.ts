import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadGatewayException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TourCodeMapping } from './entities/tour-mapping.entity';
import { CreateTourMappingDto } from './dto/create-tour-mapping.dto';
import { UpdateTourMappingDto } from './dto/update-tour-mapping.dto';
import { Order } from '../orders/entities/order.entity';
import { ShopifyStore } from '../shopify-stores/entities/shopify-store.entity';

@Injectable()
export class TourMappingsService {
  private readonly logger = new Logger(TourMappingsService.name);

  constructor(
    @InjectRepository(TourCodeMapping)
    private mappingsRepository: Repository<TourCodeMapping>,
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(ShopifyStore)
    private shopifyStoresRepository: Repository<ShopifyStore>,
  ) {}

  async findAll() {
    return await this.mappingsRepository.find({
      order: { storeId: 'ASC', shopifyProductId: 'ASC' },
    });
  }

  async findOne(id: string) {
    const mapping = await this.mappingsRepository.findOne({ where: { id } });
    if (!mapping) {
      throw new NotFoundException('Tour mapping not found');
    }
    return mapping;
  }

  async findByStoreAndProductId(storeId: string, shopifyProductId: string) {
    return await this.mappingsRepository.findOne({
      where: { storeId, shopifyProductId },
    });
  }

  /** Fetch all products from the Shopify store (used to populate the create-mapping dropdown) */
  async getStoreProducts(storeId: string): Promise<{ id: string; title: string }[]> {
    const store = await this.shopifyStoresRepository.findOne({ where: { internalName: storeId } });
    if (!store) throw new NotFoundException(`Store "${storeId}" not found`);

    const baseUrl = `https://${store.shopifyDomain}/admin/api/${store.apiVersion}`;
    const headers = {
      'X-Shopify-Access-Token': store.accessToken,
      'Content-Type': 'application/json',
    };

    this.logger.log(`Fetching products for store "${storeId}" from ${store.shopifyDomain} (API ${store.apiVersion})`);

    const products: { id: string; title: string }[] = [];
    let url: string | null = `${baseUrl}/products.json?fields=id,title&limit=250`;

    while (url) {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        let body = '';
        try { body = await res.text(); } catch {}
        this.logger.error(`Shopify products fetch failed: ${res.status} ${res.statusText} — ${body}`);
        throw new BadGatewayException(
          `Shopify returned ${res.status} when fetching products for store "${storeId}". ` +
          `Check that the access token has the read_products scope.`,
        );
      }
      const data = await res.json();
      for (const p of data.products || []) {
        if (p.id && p.title) products.push({ id: p.id.toString(), title: p.title });
      }

      // Cursor-based pagination via Link header
      const link = res.headers.get('link') || '';
      const next = link.match(/<([^>]+)>;\s*rel="next"/);
      url = next ? next[1] : null;
    }

    this.logger.log(`Fetched ${products.length} products for store "${storeId}"`);
    return products.sort((a, b) => a.title.localeCompare(b.title));
  }

  async create(createDto: CreateTourMappingDto) {
    const existing = await this.mappingsRepository.findOne({
      where: { storeId: createDto.storeId, shopifyProductId: createDto.shopifyProductId },
    });
    if (existing) {
      throw new ConflictException(
        `Mapping already exists for store ${createDto.storeId} and product ID "${createDto.shopifyProductId}"`,
      );
    }
    const mapping = this.mappingsRepository.create(createDto);
    const saved = await this.mappingsRepository.save(mapping);

    // Propagate to all existing orders in the same store with the matching Shopify product ID
    if (saved.tourCode && saved.shopifyProductId) {
      await this.ordersRepository.update(
        { storeId: saved.storeId, shopifyProductId: saved.shopifyProductId },
        { tourCode: saved.tourCode },
      );
    }

    return saved;
  }

  /** Update tour code. If the code changes, propagate to all matching orders in the same store. */
  async update(id: string, updateDto: UpdateTourMappingDto) {
    const mapping = await this.mappingsRepository.findOne({ where: { id } });
    if (!mapping) throw new NotFoundException('Tour mapping not found');

    const oldCode = mapping.tourCode;
    const newCode = updateDto.tourCode ?? oldCode;

    Object.assign(mapping, updateDto);
    const saved = await this.mappingsRepository.save(mapping);

    // Propagate code change to all orders matching this store + Shopify product ID
    if (newCode !== oldCode && mapping.shopifyProductId) {
      await this.ordersRepository.update(
        { storeId: mapping.storeId, shopifyProductId: mapping.shopifyProductId },
        { tourCode: newCode ?? undefined },
      );
    }

    return saved;
  }

  /** Delete a mapping. Blocked if any orders are still assigned to its tour code. */
  async remove(id: string) {
    const mapping = await this.mappingsRepository.findOne({ where: { id } });
    if (!mapping) throw new NotFoundException('Tour mapping not found');

    if (mapping.shopifyProductId) {
      const inUse = await this.ordersRepository.count({
        where: { storeId: mapping.storeId, shopifyProductId: mapping.shopifyProductId },
      });
      if (inUse > 0) {
        throw new ConflictException(
          `Cannot delete: tour code "${mapping.tourCode}" is linked to ${inUse} order(s). Reassign those orders first.`,
        );
      }
    }

    await this.mappingsRepository.remove(mapping);
    return { message: 'Tour mapping deleted successfully' };
  }
}
