// frontend/src/pages/customer/RestaurantDetails.jsx
import React, { useEffect, useState, useCallback } from "react";
import { createReview, getRestaurantReviews } from "../../api/api";

function RestaurantDetails({ restaurantId }) {
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

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
    setLoading(true);

    try {
      await createReview({ restaurantId, rating, title, body });
      setTitle("");
      setBody("");
      setRating(5);
      fetchReviews();
    } catch (err) {
      console.error("Failed to create review", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Review Submission Section */}
      <div className="te-card" style={{ maxWidth: '600px', width: '100%' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', fontFamily: 'var(--font-headings)' }}>
          Write a Review
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div className="te-input-group" style={{ flex: 1 }}>
              <label className="te-label">Rating</label>
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="te-input"
                style={{ appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23475569\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
              >
                {[5, 4, 3, 2, 1].map((r) => (
                  <option key={r} value={r}>
                    {r} ★ {r === 5 ? 'Excellent' : r === 4 ? 'Very Good' : r === 3 ? 'Good' : r === 2 ? 'Fair' : 'Poor'}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="te-input-group" style={{ flex: 2 }}>
              <label className="te-label">Title (Optional)</label>
              <input
                type="text"
                placeholder="Summarize your experience..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="te-input"
              />
            </div>
          </div>

          <div className="te-input-group">
            <label className="te-label">Review Details</label>
            <textarea
              placeholder="What did you like or dislike about the food quality, packaging, and delivery time?"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="te-input"
              required
            />
          </div>

          <button type="submit" className="te-btn te-btn--primary" style={{ alignSelf: 'flex-start' }} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      </div>

      {/* Reviews List Section */}
      <div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', fontFamily: 'var(--font-headings)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Customer Reviews 
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>({reviews.length})</span>
        </h2>

        {reviews.length === 0 ? (
          <div className="te-empty-state">
            <span className="te-empty-icon">💬</span>
            <p>No reviews yet. Be the first to share your experience!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reviews.map((rev) => (
              <div key={rev.id} className="te-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <span className="te-badge te-badge--success" style={{ marginRight: '0.75rem' }}>
                      {rev.rating} ★
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{rev.title || "User Review"}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    by <strong style={{ color: 'var(--text-secondary)' }}>{rev.user_name}</strong>
                  </span>
                </div>

                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {rev.body}
                </p>

                {rev.trust_score != null && (
                  <div style={{
                    marginTop: '1rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)'
                  }}>
                    <span>User trust score on submission:</span>
                    <strong style={{ color: 'var(--brand-orange)' }}>
                      {Number(rev.trust_score).toFixed(0)}/100
                    </strong>
                    {rev.ai_quality_label && (
                      <span className="te-badge te-badge--info" style={{ textTransform: 'none', padding: '0.1rem 0.5rem', fontSize: '0.65rem' }}>
                        {rev.ai_quality_label}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default RestaurantDetails;
