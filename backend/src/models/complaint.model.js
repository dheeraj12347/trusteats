// src/models/complaint.model.js
const { pool } = require('../config/db');

const ComplaintModel = {
  async create(data) {
    const {
      order_id,
      customer_id,
      restaurant_id,
      type,
      description,
      image_path,
      image_is_ai,
      status,
      ai_score,
      decision_reason,
    } = data;

    // Debug: see exactly what controller sent
    console.log('DEBUG ComplaintModel.create data =', data);

    // Safety: force a valid enum string if anything weird comes in
    let finalStatus = status || 'PENDING';
    if (
      !['PENDING', 'AUTO_APPROVED', 'AUTO_REJECTED', 'ESCALATED', 'RESOLVED'].includes(
        finalStatus
      )
    ) {
      finalStatus = 'PENDING';
    }

    const [result] = await pool.query(
      `INSERT INTO complaints
         (order_id,
          customer_id,
          restaurant_id,
          type,
          description,
          image_path,
          image_is_ai,
          status,
          ai_score,
          decision_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order_id,
        customer_id,
        restaurant_id,
        type,
        description || null,
        image_path || null,
        image_is_ai || 0,
        finalStatus,
        ai_score ?? null,
        decision_reason || null,
      ]
    );

    return { id: result.insertId };
  },

  async findByOrderId(order_id, customer_id) {
    const [rows] = await pool.query(
      `SELECT * FROM complaints WHERE order_id = ? AND customer_id = ? LIMIT 1`,
      [order_id, customer_id]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT * FROM complaints WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async updateStatus(id, status, decision_reason) {
    await pool.query(
      `UPDATE complaints 
         SET status = ?, decision_reason = ? 
       WHERE id = ?`,
      [status, decision_reason || null, id]
    );
  },

  // Customer list: now always returns all complaints for this customer
  async listForCustomer(customer_id) {
    const [rows] = await pool.query(
      `SELECT id,
              order_id,
              customer_id,
              restaurant_id,
              type,
              description,
              status,
              ai_score,
              decision_reason,
              image_path,
              image_is_ai,
              created_at
         FROM complaints
        WHERE customer_id = ?
        ORDER BY created_at DESC`,
      [customer_id]
    );
    return rows;
  },

  // Restaurant list: now always returns all complaints for this restaurant
  async listForRestaurant(restaurant_id) {
    const [rows] = await pool.query(
      `SELECT id,
              order_id,
              customer_id,
              restaurant_id,
              type,
              description,
              status,
              ai_score,
              decision_reason,
              image_path,
              image_is_ai,
              created_at
         FROM complaints
        WHERE restaurant_id = ?
        ORDER BY created_at DESC`,
      [restaurant_id]
    );
    return rows;
  },

  // Admin: see everything (no filter)
  async listForAdmin() {
    const [rows] = await pool.query(
      `SELECT id,
              order_id,
              customer_id,
              restaurant_id,
              type,
              description,
              status,
              ai_score,
              decision_reason,
              image_path,
              image_is_ai,
              created_at
         FROM complaints
        ORDER BY created_at DESC`
    );
    return rows;
  },
};

module.exports = ComplaintModel;
