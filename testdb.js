require('dotenv').config();

const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

async function main() {
  console.log('Connecting to:', process.env.DIRECT_URL?.substring(0, 50));
  try {
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log('✅ Connected! Time:', res.rows[0].now);
    await client.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

main();