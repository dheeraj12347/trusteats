// src/controllers/restaurant.controller.js
const RestaurantModel = require('../models/restaurant.model');

const RestaurantController = {
  // GET /api/restaurants
  async list(req, res) {
    try {
      const restaurants = await RestaurantModel.getAll();
      return res.json({ restaurants });
    } catch (err) {
      console.error('List restaurants error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  // GET /api/restaurants/:id/menu
  async menu(req, res) {
    try {
      const { id } = req.params;
      const menu = await RestaurantModel.getMenuByRestaurantId(id);
      return res.json({ restaurant_id: id, menu });
    } catch (err) {
      console.error('Get menu error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
};

module.exports = RestaurantController;
