// src/controllers/order.controller.js
const OrderModel = require('../models/order.model');

const OrderController = {
  // POST /api/orders
  async create(req, res) {
    try {
      const customer_id = req.user.id;
      const { restaurant_id, items } = req.body;

      if (!restaurant_id || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'restaurant_id and items are required' });
      }

      // Basic input validation for items
      const normalizedItems = items.map(i => ({
        menu_id: Number(i.menu_id || i.menuId),
        quantity: Number(i.quantity || 1),
      })).filter(i => i.menu_id && i.quantity > 0);

      if (normalizedItems.length === 0) {
        return res.status(400).json({ message: 'At least one valid item is required' });
      }

      // Get customer stats for risk scoring
      const stats = await OrderModel.getCustomerStats(customer_id);
      const { account_age_days, total_orders, total_complaints } = stats;

      // Simple rule-based risk score
      let risk_score = 0;
      const risk_flags = [];

      // Account age < 7 days → +10
      if (account_age_days !== null && account_age_days < 7) {
        risk_score += 10;
        risk_flags.push('new_account');
      }

      // Total orders < 3 → +5
      if (total_orders < 3) {
        risk_score += 5;
        risk_flags.push('few_orders');
      }

      // Total complaints > 1 → +20
      if (total_complaints > 1) {
        risk_score += 20;
        risk_flags.push('multiple_complaints');
      }

      // We'll compute total in model, but we can estimate for rule based on menu later.
      // For now we just add a placeholder flag after insert if needed.

      // IP + user-agent
      const ip =
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        req.ip ||
        null;
      const user_agent = req.headers['user-agent'] || null;

      const order = await OrderModel.createOrder({
        customer_id,
        restaurant_id,
        items: normalizedItems,
        risk_score,
        risk_flags: risk_flags.length ? risk_flags.join(',') : null,
        ip,
        user_agent,
      });

      // notify restaurant in real time (new order)
      const io = req.app.get('io');
      io.to(`restaurant_${restaurant_id}`).emit('orderPlaced', {
        orderId: order.id,
        restaurant_id,
        customer_id,
        total_price: order.total_price,
        risk_score: order.risk_score,
      });

      return res.status(201).json({
        message: 'Order placed successfully',
        order_id: order.id,
        total_price: order.total_price,
        risk_score: order.risk_score,
      });
    } catch (err) {
      console.error('Create order error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  // GET /api/orders/my
  async customerOrders(req, res) {
    try {
      const customer_id = req.user.id;
      const orders = await OrderModel.getOrdersForCustomer(customer_id);
      return res.json({ orders });
    } catch (err) {
      console.error('Customer orders error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  // GET /api/orders/restaurant/:restaurantId
  async restaurantOrders(req, res) {
    try {
      const { restaurantId } = req.params;
      const orders = await OrderModel.getOrdersForRestaurant(restaurantId);
      return res.json({ orders });
    } catch (err) {
      console.error('Restaurant orders error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  // PUT /api/orders/:id/status
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const allowed = ['PLACED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
      if (!allowed.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      // update in DB and get full updated order
      const updated = await OrderModel.updateStatus(id, status);
      if (!updated) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // At the moment updateStatus only returns boolean; if you want full order
      // you can extend model later.

      // For now just broadcast minimal payload
      const io = req.app.get('io');
      io.emit('orderStatusUpdated', { id: Number(id), status });

      return res.json({
        message: 'Order status updated',
        order: { id: Number(id), status },
      });
    } catch (err) {
      console.error('Update order status error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
};

module.exports = OrderController;
