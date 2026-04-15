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

async function viewWebhookLogs() {
  await dataSource.initialize();
  
  const logs = await dataSource.query(`
    SELECT 
      id,
      topic,
      "shopifyOrderId",
      "shopifyOrderNumber",
      "storeId",
      status,
      "errorMessage",
      "receivedAt",
      "processedAt"
    FROM webhook_logs
    ORDER BY "receivedAt" DESC
    LIMIT 20
  `);
  
  console.log('\n📋 Recent Webhook Logs:\n');
  
  if (logs.length === 0) {
    console.log('  ℹ️  No webhooks received yet\n');
  } else {
    logs.forEach((log: any, index: number) => {
      console.log(`${index + 1}. ${log.topic} - Order #${log.shopifyOrderNumber || log.shopifyOrderId}`);
      console.log(`   Status: ${log.status}`);
      console.log(`   Store: ${log.storeId}`);
      console.log(`   Received: ${log.receivedAt}`);
      if (log.errorMessage) {
        console.log(`   ❌ Error: ${log.errorMessage}`);
      }
      if (log.processedAt) {
        console.log(`   ✅ Processed: ${log.processedAt}`);
      }
      console.log('');
    });
  }
  
  await dataSource.destroy();
}

viewWebhookLogs().catch(console.error);
