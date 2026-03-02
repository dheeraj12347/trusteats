// src/routes/review.routes.js
const express = require("express");
const router = express.Router();
const ReviewController = require("../controllers/review.controller");
const authMiddleware = require("../middleware/auth.middleware");

// POST /api/reviews
router.post("/", authMiddleware, ReviewController.createReview);

// GET /api/reviews/restaurant/:restaurantId
router.get("/restaurant/:restaurantId", ReviewController.getRestaurantReviews);

module.exports = router;
