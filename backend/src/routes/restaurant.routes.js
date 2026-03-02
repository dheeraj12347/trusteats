const express = require('express');
const RestaurantController = require('../controllers/restaurant.controller');

const router = express.Router();

// GET /api/restaurants
router.get('/', RestaurantController.list);

// GET /api/restaurants/:id/menu
router.get('/:id/menu', RestaurantController.menu);

// existing health route can stay if you want
router.get('/health', (req, res) => {
  res.json({ scope: 'restaurants', status: 'ok' });
});

module.exports = router;
