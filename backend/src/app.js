// src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/db');

// Route files
const authRoutes = require('./routes/auth.routes');
const orderRoutes = require('./routes/order.routes');
const complaintRoutes = require('./routes/complaint.routes');
const restaurantRoutes = require('./routes/restaurant.routes');
const reviewRoutes = require('./routes/review.routes'); // NEW

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static folder for uploaded images
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'TrustEats Backend' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/reviews', reviewRoutes); // NEW

// Initialize DB connection on startup
testConnection();

module.exports = app;
