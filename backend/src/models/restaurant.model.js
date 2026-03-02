const { pool } = require('../config/db');

const RestaurantModel = {
  async getAll() {
    const [rows] = await pool.query(
      `SELECT id, name, is_open, created_at FROM restaurants WHERE is_open = 1`
    );
    return rows;
  },

  async getMenuByRestaurantId(restaurantId) {
    const [rows] = await pool.query(
      `SELECT id, item_name, price, description
       FROM menu
       WHERE restaurant_id = ?`,
      [restaurantId]
    );
    return rows;
  },
};

module.exports = RestaurantModel;
