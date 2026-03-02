// backend/src/services/review.service.js
const ReviewModel = require("../models/review.model");
const TrustEngineService = require("./trustEngine.service"); // we’ll reuse/extend this

const ReviewService = {
  createReview: async (payload) => {
    const reviewId = await ReviewModel.create(payload);

    // Fire-and-forget AI analysis (no need to block response)
    TrustEngineService.analyzeReviewText(reviewId, payload.body).catch((err) =>
      console.error("AI review analysis failed:", err)
    );

    return reviewId;
  },

  getRestaurantReviews: async (restaurantId) => {
    return ReviewModel.findByRestaurant(restaurantId);
  },
};

module.exports = ReviewService;
