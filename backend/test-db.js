const mysql = require('mysql2/promise');

const host = 'localhost';
const user = 'root';
const password = 'dheeraj1234';
const database = 'trusteats_db';

async function test() {
  try {
    const conn = await mysql.createConnection({ host, user, password, database });
    console.log('✅ Connected to trusteats_db successfully!');
    
    const [rows] = await conn.query('SHOW TABLES');
    console.log('Tables in trusteats_db:');
    console.log(rows.map(r => Object.values(r)[0]));
    
    await conn.end();
  } catch (err) {
    console.log(`❌ Failed: ${err.message}`);
  }
}

test();
