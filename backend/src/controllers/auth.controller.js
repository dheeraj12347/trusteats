// src/controllers/auth.controller.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');

const AuthController = {
  async register(req, res) {
    try {
      const { name, email, password, role } = req.body;

      if (!name || !email || !password) {
        return res
          .status(400)
          .json({ message: 'Name, email, and password are required' });
      }

      const existing = await UserModel.findByEmail(email);
      if (existing) {
        return res.status(409).json({ message: 'Email already registered' });
      }

      const hashed = await bcrypt.hash(password, 10);
      const userRole =
        role && ['CUSTOMER', 'RESTAURANT', 'ADMIN'].includes(role)
          ? role
          : 'CUSTOMER';

      const user = await UserModel.create({
        name,
        email,
        password: hashed,
        role: userRole,
      });

      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          trust_score: user.trust_score,
          restaurant_id: user.restaurant_id || null,
        },
        token,
      });
    } catch (err) {
      console.error('Register error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: 'Email and password are required' });
      }

      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // debug: make sure restaurant_id is present here
      console.log('LOGIN user from DB:', user);

      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          trust_score: user.trust_score,
          restaurant_id: user.restaurant_id || null, // <-- this line is crucial
        },
        token,
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async me(req, res) {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        trust_score: user.trust_score,
        created_at: user.created_at,
        restaurant_id: user.restaurant_id || null,
      });
    } catch (err) {
      console.error('Me error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
};

module.exports = AuthController;
