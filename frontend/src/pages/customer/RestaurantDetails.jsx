// frontend/src/pages/customer/RestaurantDetails.jsx
import React, { useEffect, useState, useCallback } from "react";
import { createReview, getRestaurantReviews } from "../../api/api";

function RestaurantDetails({ restaurantId }) {
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const fetchReviews = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const res = await getRestaurantReviews(restaurantId);
      setReviews(res.data);
    } catch (err) {
      console.error("Failed to load reviews", err);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!body || !rating) return;

    try {
      await createReview({ restaurantId, rating, title, body });
      setTitle("");
      setBody("");
      setRating(5);
      fetchReviews();
    } catch (err) {
      console.error("Failed to create review", err);
    }
  };

  return (
    <div>
      <h2>Reviews</h2>

      <form onSubmit={handleSubmit}>
        <label>
          Rating:
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <input
          type="text"
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          placeholder="Write your honest review..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        <button type="submit">Submit Review</button>
      </form>

      <ul>
        {reviews.map((rev) => (
          <li key={rev.id}>
            <strong>{rev.rating}★</strong> {rev.title || ""}
            <div>{rev.body}</div>
            <small>by {rev.user_name}</small>

            {rev.trust_score != null && (
              <div
                style={{
                  fontSize: "0.85rem",
                  marginTop: "0.25rem",
                  opacity: 0.8,
                }}
              >
                Trust score: {Number(rev.trust_score).toFixed(2)}
                {rev.ai_quality_label && ` (${rev.ai_quality_label})`}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RestaurantDetails;
