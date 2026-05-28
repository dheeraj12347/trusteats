const { pool } = require('../config/db');

const OrderModel = {
  async createOrder({ customer_id, restaurant_id, items, risk_score, risk_flags, ip, user_agent }) {
    // items: [{ menu_id, quantity }]
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Calculate total
      const menuIds = items.map(i => i.menu_id);
      const [menuRows] = await connection.query(
        `SELECT id, price FROM menu WHERE id IN (?)`,
        [menuIds]
      );

      const priceMap = {};
      menuRows.forEach(m => { priceMap[m.id] = m.price; });

      let total = 0;
      items.forEach(i => {
        const price = priceMap[i.menu_id] || 0;
        total += price * i.quantity;
      });

      // Insert order with risk_score & risk_flags
      const [orderResult] = await connection.query(
        `INSERT INTO orders (customer_id, restaurant_id, status, total_price, risk_score, risk_flags, is_archived)
         VALUES (?, ?, 'PLACED', ?, ?, ?, 0)`,
        [customer_id, restaurant_id, total, risk_score, risk_flags || null]
      );
      const orderId = orderResult.insertId;

      // Insert order items
      for (const i of items) {
        const priceEach = priceMap[i.menu_id] || 0;
        await connection.query(
          `INSERT INTO order_items (order_id, menu_id, quantity, price_each)
           VALUES (?, ?, ?, ?)`,
          [orderId, i.menu_id, i.quantity, priceEach]
        );
      }

      // Log IP + user agent in request_logs
      await connection.query(
        `INSERT INTO request_logs (user_id, ip, user_agent, type)
         VALUES (?, ?, ?, 'ORDER')`,
        [customer_id, ip || null, user_agent || null]
      );

      await connection.commit();
      return { id: orderId, total_price: total, risk_score };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  async getOrdersForCustomer(customerId) {
    const [rows] = await pool.query(
      `SELECT 
          o.id,
          o.restaurant_id,
          r.name AS restaurant_name,
          o.status,
          o.total_price,
          o.created_at,
          o.risk_score,
          c.status AS complaint_status,
          c.ai_score AS complaint_ai_score,
          c.decision_reason AS complaint_decision_reason,
          c.image_is_ai AS complaint_image_is_ai,
          c.warning_state AS complaint_warning_state,
          c.mismatch_attempts AS complaint_mismatch_attempts
       FROM orders o
       JOIN restaurants r ON o.restaurant_id = r.id
       LEFT JOIN complaints c 
         ON c.order_id = o.id
        AND c.id = (
          SELECT c2.id
          FROM complaints c2
          WHERE c2.order_id = o.id
          ORDER BY c2.created_at DESC
          LIMIT 1
        )
       WHERE o.customer_id = ?
         AND o.is_archived = 0
       ORDER BY o.created_at DESC`,
      [customerId]
    );
    return rows;
  },

  async getOrdersForRestaurant(restaurantId) {
    const [rows] = await pool.query(
      `SELECT 
          o.id,
          o.customer_id,
          u.name AS customer_name,
          o.status,
          o.total_price,
          o.created_at,
          o.risk_score,
          c.status AS complaint_status,
          c.ai_score AS complaint_ai_score,
          c.decision_reason AS complaint_decision_reason,
          c.image_is_ai AS complaint_image_is_ai,
          c.warning_state AS complaint_warning_state,
          c.mismatch_attempts AS complaint_mismatch_attempts
       FROM orders o
       JOIN users u ON o.customer_id = u.id
       LEFT JOIN complaints c 
         ON c.order_id = o.id
        AND c.id = (
          SELECT c2.id
          FROM complaints c2
          WHERE c2.order_id = o.id
          ORDER BY c2.created_at DESC
          LIMIT 1
        )
       WHERE o.restaurant_id = ?
         AND o.is_archived = 0
       ORDER BY o.created_at DESC`,
      [restaurantId]
    );
    return rows;
  },

  async updateStatus(orderId, status) {
    if (status === 'DELIVERED') {
      const [result] = await pool.query(
        `UPDATE orders
         SET status = ?, delivered_at = NOW()
         WHERE id = ?`,
        [status, orderId]
      );
      return result.affectedRows > 0;
    }

    const [result] = await pool.query(
      `UPDATE orders
       SET status = ?
       WHERE id = ?`,
      [status, orderId]
    );
    return result.affectedRows > 0;
  },

  async getCustomerStats(customer_id) {
    // account age in days, total orders, total complaints
    const [[userRow]] = await pool.query(
      `SELECT DATEDIFF(NOW(), created_at) AS account_age_days
       FROM users
       WHERE id = ?`,
      [customer_id]
    );

    const [[orderCountRow]] = await pool.query(
      `SELECT COUNT(*) AS total_orders
       FROM orders
       WHERE customer_id = ?`,
      [customer_id]
    );

    const [[complaintCountRow]] = await pool.query(
      `SELECT COUNT(*) AS total_complaints
       FROM complaints
       WHERE customer_id = ?`,
      [customer_id]
    );

    return {
      account_age_days: userRow?.account_age_days ?? null,
      total_orders: orderCountRow?.total_orders ?? 0,
      total_complaints: complaintCountRow?.total_complaints ?? 0,
    };
  },

  async findById(orderId) {
    const [rows] = await pool.query(
      `SELECT id, customer_id, restaurant_id, status, total_price, created_at, risk_score, risk_flags, is_archived
       FROM orders
       WHERE id = ?`,
      [orderId]
    );
    return rows[0] || null;
  },
};

module.exports = OrderModel;
