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

async function countOrders() {
  await dataSource.initialize();
  
  const totalOrders = await dataSource.query('SELECT COUNT(*) as count FROM orders');
  const recentOrders = await dataSource.query(`
    SELECT 
      id,
      "shopifyOrderNumber",
      "customerName",
      "tourTitle",
      "tourDate",
      "createdAt"
    FROM orders
    ORDER BY "createdAt" DESC
    LIMIT 10
  `);
  
  console.log(`\n📊 Total Orders: ${totalOrders[0].count}\n`);
  console.log('📋 Recent Orders:\n');
  
  recentOrders.forEach((order: any, index: number) => {
    console.log(`${index + 1}. Order #${order.shopifyOrderNumber}`);
    console.log(`   Customer: ${order.customerName}`);
    console.log(`   Tour: ${order.tourTitle}`);
    console.log(`   Date: ${order.tourDate}`);
    console.log(`   Created: ${order.createdAt}`);
    console.log('');
  });
  
  await dataSource.destroy();
}

countOrders().catch(console.error);
