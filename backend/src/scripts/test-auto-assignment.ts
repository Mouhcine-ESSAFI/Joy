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

async function testAutoAssignment() {
  await dataSource.initialize();

  console.log('\n🧪 Testing Auto-Assignment Logic\n');

  // Check room type assignment
  console.log('📋 Room Type Assignment by PAX:\n');
  
  const roomStats = await dataSource.query(`
    SELECT 
      pax,
      "roomType",
      COUNT(*) as count
    FROM orders
    WHERE "roomType" IS NOT NULL
    GROUP BY pax, "roomType"
    ORDER BY pax, "roomType"
  `);

  if (roomStats.length === 0) {
    console.log('   ⚠️  No room types assigned yet');
  } else {
    roomStats.forEach((stat: any) => {
      console.log(`   ${stat.pax} PAX → ${stat.roomType} (${stat.count} orders)`);
    });
  }

  // Check orders without room types
  const noRoomType = await dataSource.query(`
    SELECT COUNT(*) as count
    FROM orders
    WHERE "roomType" IS NULL AND pax IS NOT NULL
  `);

  console.log(`\n   ❌ Orders without room type: ${noRoomType[0].count}`);

  // Check tour code mapping
  console.log('\n🗺️  Tour Code Assignment:\n');
  
  const tourCodeStats = await dataSource.query(`
    SELECT 
      "tourCode",
      COUNT(*) as count
    FROM orders
    WHERE "tourCode" IS NOT NULL
    GROUP BY "tourCode"
    ORDER BY count DESC
    LIMIT 10
  `);

  if (tourCodeStats.length === 0) {
    console.log('   ⚠️  No tour codes assigned yet');
  } else {
    tourCodeStats.forEach((stat: any) => {
      console.log(`   ${stat.tourCode}: ${stat.count} orders`);
    });
  }

  const noTourCode = await dataSource.query(`
    SELECT COUNT(*) as count
    FROM orders
    WHERE "tourCode" IS NULL
  `);

  console.log(`\n   ❌ Orders without tour code: ${noTourCode[0].count}`);

  // Sample orders
  console.log('\n📦 Sample Orders with Auto-Assignment:\n');
  
  const samples = await dataSource.query(`
    SELECT 
      "shopifyOrderNumber",
      "tourTitle",
      pax,
      "roomType",
      "tourCode",
      "tourType"
    FROM orders
    WHERE "roomType" IS NOT NULL OR "tourCode" IS NOT NULL
    LIMIT 5
  `);

  samples.forEach((order: any, index: number) => {
    console.log(`   ${index + 1}. Order #${order.shopifyOrderNumber}`);
    console.log(`      Tour: ${order.tourTitle?.substring(0, 40)}...`);
    console.log(`      PAX: ${order.pax} → Room: ${order.roomType || 'N/A'}`);
    console.log(`      Tour Code: ${order.tourCode || 'N/A'}`);
    console.log('');
  });

  await dataSource.destroy();
}

testAutoAssignment().catch(console.error);
