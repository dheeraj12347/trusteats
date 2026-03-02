// backend/src/models/review.model.js
const { pool } = require("../config/db");

const ReviewModel = {
  create: async ({ userId, restaurantId, rating, title, body, visitDate }) => {
    const [result] = await pool.query(
      `INSERT INTO reviews 
       (user_id, restaurant_id, rating, title, body, visit_date) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, restaurantId, rating, title || null, body, visitDate || null]
    );
    return result.insertId;
  },

  findByRestaurant: async (restaurantId) => {
    const [rows] = await pool.query(
      `SELECT r.*, u.name AS user_name
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.restaurant_id = ?
       ORDER BY r.created_at DESC`,
      [restaurantId]
    );
    return rows;
  },

  updateAiFields: async (reviewId, aiData) => {
    const {
      trustScore,
      isSuspicious,
      aiQualityLabel,
      sentimentFood,
      sentimentService,
      sentimentAmbience,
      sentimentHygiene,
      sentimentValue,
    } = aiData;

    await pool.query(
      `UPDATE reviews
       SET trust_score = ?, 
           is_suspicious = ?, 
           ai_quality_label = ?, 
           sentiment_food = ?, 
           sentiment_service = ?, 
           sentiment_ambience = ?, 
           sentiment_hygiene = ?, 
           sentiment_value = ?
       WHERE id = ?`,
      [
        trustScore,
        isSuspicious ? 1 : 0,
        aiQualityLabel || null,
        sentimentFood,
        sentimentService,
        sentimentAmbience,
        sentimentHygiene,
        sentimentValue,
        reviewId,
      ]
    );
  },
};

module.exports = ReviewModel;
