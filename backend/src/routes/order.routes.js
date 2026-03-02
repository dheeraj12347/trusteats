const express = require('express');
const OrderController = require('../controllers/order.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/role.middleware');

const router = express.Router();

// Customer: place order
router.post(
  '/',
  authMiddleware,
  allowRoles('CUSTOMER'),
  OrderController.create
);

// Customer: get own orders
router.get(
  '/my',
  authMiddleware,
  allowRoles('CUSTOMER'),
  OrderController.customerOrders
);

// Restaurant: get orders for a restaurant (restaurant_id from params)
router.get(
  '/restaurant/:restaurantId',
  authMiddleware,
  allowRoles('RESTAURANT', 'ADMIN'),
  OrderController.restaurantOrders
);

// Restaurant: update order status
router.put(
  '/:id/status',
  authMiddleware,
  allowRoles('RESTAURANT', 'ADMIN'),
  OrderController.updateStatus
);

// health
router.get('/health', (req, res) => {
  res.json({ scope: 'orders', status: 'ok' });
});

module.exports = router;
