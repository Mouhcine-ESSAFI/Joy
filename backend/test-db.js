const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
  database: process.env.DB_DATABASE || 'joy_morocco',
});

async function testConnection() {
  try {
    await client.connect();
    console.log('✅ Database connection successful!');
    console.log('📊 Connected as:', process.env.DB_USERNAME);
    console.log('🗄️  Database:', process.env.DB_DATABASE);
    
    const res = await client.query('SELECT NOW()');
    console.log('📅 Server time:', res.rows[0].now);
    
    // Test creating a table
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_connection (
        id SERIAL PRIMARY KEY,
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Test table created successfully');
    
    // Insert test data
    await client.query(`
      INSERT INTO test_connection (message) VALUES ('Hello from Joy Morocco Backend!')
    `);
    console.log('✅ Test data inserted');
    
    // Query test data
    const result = await client.query('SELECT * FROM test_connection');
    console.log('📋 Test data:', result.rows);
    
    // Clean up
    await client.query('DROP TABLE test_connection');
    console.log('✅ Test table dropped');
    
    await client.end();
    console.log('✅ Connection closed successfully');
    console.log('\n🎉 All database tests passed!');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  }
}

testConnection();