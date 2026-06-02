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

  async findByStore(storeId: string) {
    return await this.mappingsRepository.find({
      where: { storeId },
      order: { productTitle: 'ASC' },
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

  async findByStoreAndTitle(storeId: string, productTitle: string) {
    return await this.mappingsRepository.findOne({
      where: { storeId, productTitle },
    });
  }

  /**
   * Returns all Shopify products for a store, enriched with their tour mapping (if any).
   * Used to populate the Tour select in order detail.
   */
  async getStoreTourOptions(storeId: string): Promise<
    { shopifyProductId: string; title: string; tourMappingId: string | null; tourCode: string | null }[]
  > {
    const [products, mappings] = await Promise.all([
      this.getStoreProducts(storeId),
      this.mappingsRepository.find({ where: { storeId } }),
    ]);

    const mappingByProductId = new Map(mappings.map((m) => [m.shopifyProductId, m]));

    return products.map((p) => {
      const mapping = mappingByProductId.get(p.id) ?? null;
      return {
        shopifyProductId: p.id,
        title: p.title,
        tourMappingId: mapping?.id ?? null,
        tourCode: mapping?.tourCode ?? null,
      };
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

    // Propagate to all existing orders with the matching storeId + shopifyProductId
    if (saved.shopifyProductId) {
      await this.ordersRepository.update(
        { storeId: saved.storeId, shopifyProductId: saved.shopifyProductId },
        {
          tourMappingId: saved.id,
          ...(saved.tourCode ? { tourCode: saved.tourCode } : {}),
        },
      );
    }

    // Fallback: connect historical orders that were stored without shopifyProductId,
    // matched by tourTitle == productTitle
    if (saved.productTitle) {
      await this.ordersRepository
        .createQueryBuilder()
        .update()
        .set({
          tourMappingId: saved.id,
          shopifyProductId: saved.shopifyProductId,
          ...(saved.tourCode ? { tourCode: saved.tourCode } : {}),
        })
        .where(
          'storeId = :storeId AND tourTitle = :title AND (shopifyProductId IS NULL OR tourMappingId IS NULL)',
          { storeId: saved.storeId, title: saved.productTitle },
        )
        .execute();
    }

    return saved;
  }

  /** Update tour code. If the code changes, propagate to all orders linked by FK. */
  async update(id: string, updateDto: UpdateTourMappingDto) {
    const mapping = await this.mappingsRepository.findOne({ where: { id } });
    if (!mapping) throw new NotFoundException('Tour mapping not found');

    const oldCode = mapping.tourCode;
    const newCode = updateDto.tourCode ?? oldCode;

    Object.assign(mapping, updateDto);
    const saved = await this.mappingsRepository.save(mapping);

    if (mapping.shopifyProductId) {
      // Always wire up the FK for any orders not yet linked (regardless of tourCode change)
      await this.ordersRepository
        .createQueryBuilder()
        .update()
        .set({
          tourMappingId: mapping.id,
          ...(newCode ? { tourCode: newCode } : {}),
        })
        .where(
          'storeId = :storeId AND shopifyProductId = :pid AND (tourMappingId IS NULL OR tourMappingId != :mid)',
          { storeId: mapping.storeId, pid: mapping.shopifyProductId, mid: mapping.id },
        )
        .execute();

      // Also update tourCode on already-linked orders if it changed
      if (newCode !== oldCode) {
        await this.ordersRepository.update(
          { tourMappingId: mapping.id },
          { tourCode: newCode ?? undefined },
        );
      }
    }

    return saved;
  }

  /** Delete a mapping. Blocked if any orders are linked via FK or by shopifyProductId. */
  async remove(id: string) {
    const mapping = await this.mappingsRepository.findOne({ where: { id } });
    if (!mapping) throw new NotFoundException('Tour mapping not found');

    const byFk = await this.ordersRepository.count({ where: { tourMappingId: mapping.id } });
    if (byFk > 0) {
      throw new ConflictException(
        `Cannot delete: ${byFk} order(s) are linked to this tour. Reassign those orders first.`,
      );
    }

    if (mapping.shopifyProductId) {
      const byProductId = await this.ordersRepository.count({
        where: { storeId: mapping.storeId, shopifyProductId: mapping.shopifyProductId },
      });
      if (byProductId > 0) {
        throw new ConflictException(
          `Cannot delete: ${byProductId} order(s) reference product "${mapping.productTitle}" from store ${mapping.storeId}. Reassign those orders first.`,
        );
      }
    }

    await this.mappingsRepository.remove(mapping);
    return { message: 'Tour mapping deleted successfully' };
  }
}
