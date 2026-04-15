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

async function resetOrders() {
  await dataSource.initialize();
  
  console.log('\n🗑️  Deleting all orders...');
  
  // Count before
  const countBefore = await dataSource.query('SELECT COUNT(*) FROM orders');
  console.log(`   📊 Orders before: ${countBefore[0].count}`);
  
  // Delete all orders
  await dataSource.query('DELETE FROM orders');
  await dataSource.query('DELETE FROM shopify_stores'); // Also clear stores to reset sync timestamps
  
  // Delete all supplements
  await dataSource.query('DELETE FROM supplements');
  
  // Delete all webhook logs
  await dataSource.query('DELETE FROM webhook_logs');
  
  // Reset sync timestamps on stores
  await dataSource.query(`
    UPDATE shopify_stores 
    SET "lastSyncedAt" = NULL, 
        "lastOrderFetchedAt" = NULL, 
        "initialSyncCompleted" = false
  `);
  
  // Count after
  const countAfter = await dataSource.query('SELECT COUNT(*) FROM orders');
  console.log(`   📊 Orders after: ${countAfter[0].count}`);
  
  console.log('\n✅ Database reset complete!');
  console.log('   🔄 All orders deleted');
  console.log('   🔄 All supplements deleted');
  console.log('   🔄 All webhook logs deleted');
  console.log('   🔄 Store sync timestamps reset\n');
  
  await dataSource.destroy();
}

resetOrders().catch(console.error);
