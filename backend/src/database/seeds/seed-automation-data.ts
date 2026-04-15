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
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
});

async function seedAutomationData() {
  await dataSource.initialize();

  console.log('\n🌱 Seeding automation data...\n');

  // 1. Room Type Rules
  console.log('📋 Creating Room Type Rules...');
  
  const roomRules = [
    {
      paxMin: 1,
      paxMax: 1,
      defaultRoomType: 'Single',
      allowedRoomTypes: ['Single', 'Double'],
      isActive: true,
    },
    {
      paxMin: 2,
      paxMax: 2,
      defaultRoomType: 'Double',
      allowedRoomTypes: ['Double', 'Twin', 'Triple'],
      isActive: true,
    },
    {
      paxMin: 3,
      paxMax: 3,
      defaultRoomType: 'Triple',
      allowedRoomTypes: ['Triple', 'Family'],
      isActive: true,
    },
    {
      paxMin: 4,
      paxMax: 6,
      defaultRoomType: 'Family',
      allowedRoomTypes: ['Family', 'Suite'],
      isActive: true,
    },
  ];

  for (const rule of roomRules) {
    await dataSource.query(
      `INSERT INTO room_type_rules ("paxMin", "paxMax", "defaultRoomType", "allowedRoomTypes", "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [rule.paxMin, rule.paxMax, rule.defaultRoomType, rule.allowedRoomTypes, rule.isActive]
    );
    console.log(`   ✅ ${rule.paxMin}-${rule.paxMax} PAX → ${rule.defaultRoomType}`);
  }

  // 2. Transport Types
  console.log('\n🚗 Creating Transport Types...');
  
  const transportTypes = [
    { code: 'FCHK', name: 'Firdaous Chauffeurs', isActive: true },
    { code: 'MDBM', name: 'Mohamed Bamou', isActive: true },
    { code: 'TBC', name: 'To Be Confirmed', isActive: true },
    { code: 'SELF', name: 'Self Drive', isActive: false },
    { code: 'SPTC', name: 'Supratours Coach', isActive: true },
  ];

  for (const transport of transportTypes) {
    await dataSource.query(
      `INSERT INTO transport_types (code, name, "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (code) DO NOTHING`,
      [transport.code, transport.name, transport.isActive]
    );
    console.log(`   ✅ ${transport.code} - ${transport.name}`);
  }

  // 3. Tour Mappings (example SKUs)
  console.log('\n🗺️  Creating Tour Mappings...');
  
  const tourMappings = [
    {
      storeId: 'ES',
      shopifyProductId: 'prod_example_1',
      productTitle: 'Tour de 3 días desde Marrakech a Merzouga',
      productSku: '3D-MRK-MRZ',
      tourCode: '3DMM',
    },
    {
      storeId: 'ES',
      shopifyProductId: 'prod_example_2',
      productTitle: 'Tour de 4 días al desierto de Merzouga desde Marrakech',
      productSku: '4D-MRK-MRZ',
      tourCode: '4DMM',
    },
    {
      storeId: 'ES',
      shopifyProductId: 'prod_example_3',
      productTitle: 'Excursión de 2 días al desierto de Marrakech a Zagora',
      productSku: '2D-MRK-ZGR',
      tourCode: '2DMZ',
    },
    {
      storeId: 'EN',
      shopifyProductId: 'prod_example_4',
      productTitle: '3 Days Desert Tour from Marrakech to Merzouga',
      productSku: '3D-MRK-MRZ-EN',
      tourCode: '3DMM',
    },
  ];

  for (const mapping of tourMappings) {
    try {
      await dataSource.query(
        `INSERT INTO tour_code_mappings ("storeId", "shopifyProductId", "productTitle", "productSku", "tourCode", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [mapping.storeId, mapping.shopifyProductId, mapping.productTitle, mapping.productSku, mapping.tourCode]
      );
      console.log(`   ✅ ${mapping.tourCode} - ${mapping.productTitle.substring(0, 50)}...`);
    } catch (error) {
      // Ignore duplicates
    }
  }

  console.log('\n🎉 Automation data seeded successfully!\n');
  
  // Summary
  const roomRulesCount = await dataSource.query('SELECT COUNT(*) FROM room_type_rules WHERE "isActive" = true');
  const transportCount = await dataSource.query('SELECT COUNT(*) FROM transport_types WHERE "isActive" = true');
  const mappingsCount = await dataSource.query('SELECT COUNT(*) FROM tour_code_mappings');
  
  console.log('📊 Summary:');
  console.log(`   Room Type Rules: ${roomRulesCount[0].count}`);
  console.log(`   Transport Types: ${transportCount[0].count}`);
  console.log(`   Tour Mappings: ${mappingsCount[0].count}`);
  console.log('');

  await dataSource.destroy();
}

seedAutomationData().catch(console.error);
