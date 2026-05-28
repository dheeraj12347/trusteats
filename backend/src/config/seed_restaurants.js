// src/config/seed_restaurants.js
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const host = process.env.DB_HOST || 'localhost';
const user = process.env.DB_USER || 'root';
const password = process.env.DB_PASSWORD || 'dheeraj1234';
const database = process.env.DB_NAME || 'trusteats_db';

const seeds = [
  {
    name: 'Pizza Point Owner',
    email: 'pizzapoint@example.com',
    password: 'password123',
    role: 'RESTAURANT',
    restaurant_id: 2
  },
  {
    name: 'Desi Tadka Owner',
    email: 'desitadka@example.com',
    password: 'password123',
    role: 'RESTAURANT',
    restaurant_id: 3
  },
  {
    name: 'Chinese Wok Owner',
    email: 'chinesewok@example.com',
    password: 'password123',
    role: 'RESTAURANT',
    restaurant_id: 4
  }
];

async function seed() {
  let conn;
  try {
    conn = await mysql.createConnection({ host, user, password, database });
    console.log('Seeding restaurant owners...');

    for (const item of seeds) {
      // Check email
      const [emailRows] = await conn.query(
        'SELECT id FROM users WHERE email = ?',
        [item.email]
      );

      // Check restaurant_id ownership
      const [restRows] = await conn.query(
        'SELECT id FROM users WHERE restaurant_id = ?',
        [item.restaurant_id]
      );

      if (emailRows.length > 0) {
        console.log(`User with email "${item.email}" already exists. Skipping.`);
        continue;
      }

      if (restRows.length > 0) {
        console.log(`Restaurant with ID "${item.restaurant_id}" already has an owner. Skipping.`);
        continue;
      }

      // Hash password and insert
      const hashed = await bcrypt.hash(item.password, 10);
      await conn.query(
        `INSERT INTO users (name, email, password, role, restaurant_id, trust_score)
         VALUES (?, ?, ?, ?, ?, 100)`,
        [item.name, item.email, hashed, item.role, item.restaurant_id]
      );
      console.log(`Successfully seeded owner for restaurant ${item.restaurant_id} (${item.name}).`);
    }

    console.log('Seeding completed successfully.');
  } catch (err) {
    console.error('Seeding failed:', err.message);
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}

seed();
