require('dotenv').config({ path: './.env' });
const mysql = require('mysql2/promise');

const host = process.env.DB_HOST || 'localhost';
const user = process.env.DB_USER || 'root';
const password = process.env.DB_PASSWORD || 'dheeraj1234';
const database = process.env.DB_NAME || 'trusteats_db';

async function query() {
  try {
    const conn = await mysql.createConnection({ host, user, password, database });
    
    const [users] = await conn.query('SELECT * FROM users');
    console.log('--- USERS ---');
    console.log(users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, trust_score: u.trust_score, restaurant_id: u.restaurant_id })));

    const [restaurants] = await conn.query('SELECT * FROM restaurants');
    console.log('--- RESTAURANTS ---');
    console.log(restaurants);

    const [orders] = await conn.query('SELECT * FROM orders');
    console.log('--- ORDERS ---');
    console.log(orders);

    const [complaints] = await conn.query('SELECT * FROM complaints');
    console.log('--- COMPLAINTS ---');
    console.log(complaints.map(c => ({ id: c.id, order_id: c.order_id, customer_id: c.customer_id, status: c.status, warning_state: c.warning_state })));
    
    await conn.end();
  } catch (err) {
    console.error('Database query failed:', err.message);
  }
}

query();
