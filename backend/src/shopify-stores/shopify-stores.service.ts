import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShopifyStore, StoreStatus } from './entities/shopify-store.entity';
import { CreateShopifyStoreDto } from './dto/create-shopify-store.dto';
import { UpdateShopifyStoreDto } from './dto/update-shopify-store.dto';

@Injectable()
export class ShopifyStoresService {
  private readonly logger = new Logger(ShopifyStoresService.name);

  constructor(
    @InjectRepository(ShopifyStore)
    private shopifyStoresRepository: Repository<ShopifyStore>,
    // ⭐ ADD THIS: Inject SyncService (with forwardRef to avoid circular dependency)
    @Inject(forwardRef(() => 'SyncService'))
    private syncService: any, // Type as 'any' to avoid circular import
  ) {}

  async create(createDto: CreateShopifyStoreDto): Promise<ShopifyStore> {
    const store = this.shopifyStoresRepository.create(createDto);
    const savedStore = await this.shopifyStoresRepository.save(store);

    // 🚀 If store is active, trigger initial sync
    if (savedStore.isActive) {
      this.logger.log(`🔄 New active store created: ${savedStore.internalName}. Triggering initial sync...`);
      
      // ⭐ FIXED: Actually call the sync service
      setImmediate(() => {
        this.syncService.syncStore(savedStore.id).catch((error: any) => {
          this.logger.error(`❌ Initial sync failed for ${savedStore.internalName}: ${error.message}`);
        });
      });
    }

    return savedStore;
  }

  async update(id: string, updateDto: UpdateShopifyStoreDto): Promise<ShopifyStore> {
    const store = await this.findOne(id);
    const wasInactive = !store.isActive;

    Object.assign(store, updateDto);
    const updatedStore = await this.shopifyStoresRepository.save(store);

    // 🚀 If store was just activated, trigger catch-up sync
    if (wasInactive && updatedStore.isActive) {
      this.logger.log(`🔄 Store reactivated: ${updatedStore.internalName}. Triggering catch-up sync...`);
      
      // ⭐ FIXED: Actually call the sync service
      setImmediate(() => {
        this.syncService.syncStore(updatedStore.id).catch((error: any) => {
          this.logger.error(`❌ Catch-up sync failed for ${updatedStore.internalName}: ${error.message}`);
        });
      });
    }

    return updatedStore;
  }

  async toggleStatus(id: string): Promise<ShopifyStore> {
    const store = await this.findOne(id);
    const newStatus = store.status === StoreStatus.ACTIVE ? StoreStatus.INACTIVE : StoreStatus.ACTIVE;
    
    return this.update(id, { status: newStatus });
  }

  async findAll(): Promise<ShopifyStore[]> {
    return this.shopifyStoresRepository.find({
      order: { createdAt: 'ASC' },
    });
  }

  // Keep old method name for backward compatibility
  async findActive(): Promise<ShopifyStore[]> {
    return this.findActiveStores();
  }

  async findActiveStores(): Promise<ShopifyStore[]> {
    return this.shopifyStoresRepository.find({
      where: { status: StoreStatus.ACTIVE },
    });
  }

  async findOne(id: string): Promise<ShopifyStore> {
    const store = await this.shopifyStoresRepository.findOne({ where: { id } });
    if (!store) {
      throw new Error(`Store not found: ${id}`);
    }
    return store;
  }

  async findByDomain(shopifyDomain: string): Promise<ShopifyStore | null> {
    return this.shopifyStoresRepository.findOne({ where: { shopifyDomain } });
  }

  async findByInternalName(internalName: string): Promise<ShopifyStore | null> {
    return this.shopifyStoresRepository.findOne({ where: { internalName } });
  }

  async updateSyncTimestamp(id: string): Promise<void> {
    await this.shopifyStoresRepository.update(id, {
      lastSyncedAt: new Date(),
      lastOrderFetchedAt: new Date(),
    });
  }

  async markInitialSyncCompleted(id: string): Promise<void> {
    await this.shopifyStoresRepository.update(id, {
      initialSyncCompleted: true,
      lastSyncedAt: new Date(),
    });
  }

  async remove(id: string): Promise<void> {
    await this.shopifyStoresRepository.delete(id);
    this.logger.log(`🗑️ Store deleted: ${id}`);
  }
}