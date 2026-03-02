// src/models/user.model.js
const { pool } = require('../config/db');

const UserModel = {
  async create({ name, email, password, role }) {
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES (?, ?, ?, ?)`,
      [name, email, password, role]
    );

    // NOTE: if you also store restaurant_id at creation time,
    // you can include it here too.
    return {
      id: result.insertId,
      name,
      email,
      role,
      trust_score: 100,
      restaurant_id: null,
    };
  },

  async findByEmail(email) {
    // Select explicit columns including restaurant_id
    const [rows] = await pool.query(
      `SELECT id,
              name,
              email,
              password,
              role,
              trust_score,
              restaurant_id
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT id,
              name,
              email,
              role,
              trust_score,
              created_at,
              restaurant_id
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },
};

module.exports = UserModel;
