// src/routes/complaint.routes.js
const express = require('express');
const ComplaintController = require('../controllers/complaint.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { allowRoles } = require('../middleware/role.middleware');
const upload = require('../utils/uploader');

const router = express.Router();

// Customer: create complaint (with optional image)
router.post(
  '/',
  authMiddleware,
  allowRoles('CUSTOMER'),
  upload.single('image'),
  ComplaintController.create
);

// Customer: list own complaints
router.get(
  '/my',
  authMiddleware,
  allowRoles('CUSTOMER'),
  ComplaintController.listForCustomer
);

// Restaurant: view complaints for its restaurant
router.get(
  '/restaurant/:restaurantId',
  authMiddleware,
  allowRoles('RESTAURANT', 'ADMIN'),
  ComplaintController.listForRestaurant
);

// Admin: list all complaints
router.get(
  '/admin',
  authMiddleware,
  allowRoles('ADMIN'),
  ComplaintController.listForAdmin
);

// Admin: list unprocessed complaints for AI
router.get(
  '/admin/unprocessed',
  authMiddleware,
  allowRoles('ADMIN'),
  ComplaintController.listUnprocessedForAI
);

// Admin: update AI-related fields for a complaint
router.patch(
  '/:id/ai',
  authMiddleware,
  allowRoles('ADMIN'),
  ComplaintController.updateAIFields
);

// Admin: manual decision override
router.put(
  '/:id/manual-decision',
  authMiddleware,
  allowRoles('ADMIN'),
  ComplaintController.manualDecision
);

// Health check
router.get('/health', (req, res) => {
  res.json({ scope: 'complaints', status: 'ok' });
});

module.exports = router;
