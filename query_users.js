require('dotenv').config({ path: './backend/.env' });
const mysql = require('mysql2/promise');

const host = process.env.DB_HOST || 'localhost';
const user = process.env.DB_USER || 'root';
const password = process.env.DB_PASSWORD || 'dheeraj1234';
const database = process.env.DB_NAME || 'trusteats_db';

async function query() {
  try {
    const conn = await mysql.createConnection({ host, user, password, database });
    
    const [users] = await conn.query('SELECT id, name, email, role, trust_score, restaurant_id FROM users');
    console.log('--- USERS ---');
    console.log(users);

    const [restaurants] = await conn.query('SELECT id, name, cuisine FROM restaurants');
    console.log('--- RESTAURANTS ---');
    console.log(restaurants);

    const [orders] = await conn.query('SELECT id, customer_id, restaurant_id, status, total_price FROM orders');
    console.log('--- ORDERS ---');
    console.log(orders);
    
    await conn.end();
  } catch (err) {
    console.error('Database query failed:', err.message);
  }
}

query();
