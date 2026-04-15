import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

async function checkStores() {
  await dataSource.initialize();
  
  const stores = await dataSource.query('SELECT * FROM shopify_stores');
  
  console.log('\n🏪 Your Shopify Stores in Database:\n');
  
  if (stores.length === 0) {
    console.log('  ⚠️  No stores found in database!\n');
  } else {
    stores.forEach((store: any) => {
      console.log(`  📍 Internal Name: ${store.internalName}`);
      console.log(`     Shopify Domain: ${store.shopifyDomain}`);
      console.log(`     Store ID: ${store.shopifyStoreId}`);
      console.log(`     Active: ${store.isActive}`);
      console.log('');
    });
  }
  
  await dataSource.destroy();
}

checkStores().catch(console.error);
