const ReviewService = require("../services/review.service");
const TrustEngineService = require("../services/trustEngine.service");

const ReviewController = {
  createReview: async (req, res) => {
    try {
      const userId = req.user.id; // assuming auth.middleware sets req.user
      const { restaurantId, rating, title, body, visitDate } = req.body;

      if (!restaurantId || !rating || !body) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // 1. Create the review record
      const reviewId = await ReviewService.createReview({
        userId,
        restaurantId,
        rating,
        title,
        body,
        visitDate,
      });

      // 2. Trigger AI analysis in the background
      TrustEngineService.analyzeReviewText(reviewId, body).catch((err) => {
        console.error("AI Analysis Background Error:", err);
      });

      res.status(201).json({
        id: reviewId,
        message: "Review created and AI analysis started.",
      });
    } catch (err) {
      console.error("Error creating review:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getRestaurantReviews: async (req, res) => {
    try {
      const { restaurantId } = req.params;
      const reviews = await ReviewService.getRestaurantReviews(restaurantId);
      res.json(reviews);
    } catch (err) {
      console.error("Error fetching reviews:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};

module.exports = ReviewController;
