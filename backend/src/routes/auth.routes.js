// src/routes/auth.routes.js
const express = require('express');
const AuthController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// get current user
router.get('/me', authMiddleware, AuthController.me);

// simple health
router.get('/health', (req, res) => {
  res.json({ scope: 'auth', status: 'ok' });
});

module.exports = router;
