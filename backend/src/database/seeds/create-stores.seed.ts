import { DataSource } from 'typeorm';
import { ShopifyStore, StoreStatus } from '../../shopify-stores/entities/shopify-store.entity';

export async function createStores(dataSource: DataSource) {
  const storeRepository = dataSource.getRepository(ShopifyStore);

  const stores = [
    {
      internalName: 'SA',
      shopifyDomain: 'desertexplore.myshopify.com',
      accessToken: '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',
      webhookSecret: '42a139cea115257f71e55a4c63b47e25ff42c4678decd954bc0d06775d359e28',
      apiVersion: '2026-01',
      status: StoreStatus.ACTIVE,
    },
    {
      internalName: 'DS',
      shopifyDomain: 'descubredesierto.myshopify.com',
      accessToken: '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',
      webhookSecret: 'fd4d4f7c48bf67975f165fdb1c3363c6a43c3f764d07ab5d5baf66def35d6c7d',
      apiVersion: '2026-01',
      status: StoreStatus.ACTIVE,
    }
  ];

  for (const storeData of stores) {
    const existingStore = await storeRepository.findOne({
      where: { internalName: storeData.internalName },
    });

    if (!existingStore) {
      const store = storeRepository.create(storeData);
      await storeRepository.save(store);
      console.log(`✅ Store '${storeData.internalName}' created`);
    } else {
      console.log(`✅ Store '${storeData.internalName}' already exists`);
    }
  }
}