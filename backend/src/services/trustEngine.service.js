const { pool } = require('../config/db');
const ReviewModel = require('../models/review.model');
const { spawn } = require('child_process');
const path = require('path');

const TrustEngineService = {
  // -----------------------------
  // Existing complaint-based logic (UNCHANGED)
  // -----------------------------
  async getUserStats(customerId) {
    const [rows] = await pool.query(
      `SELECT 
          COUNT(*) AS total_complaints,
          SUM(CASE WHEN status IN ('AUTO_REJECTED','RESOLVED') THEN 1 ELSE 0 END) AS resolved_or_rejected
       FROM complaints
       WHERE customer_id = ?`,
      [customerId]
    );
    return rows[0];
  },

  async getRestaurantStats(restaurantId) {
    const [rows] = await pool.query(
      `SELECT 
          COUNT(*) AS total_complaints,
          SUM(CASE WHEN status IN ('AUTO_APPROVED','RESOLVED') THEN 1 ELSE 0 END) AS total_issues
       FROM complaints
       WHERE restaurant_id = ?`,
      [restaurantId]
    );
    return rows[0];
  },

  async decide({ complaint, customer, restaurant }) {
    const userStats = await this.getUserStats(customer.id);
    const restStats = await this.getRestaurantStats(restaurant.id);

    const userComplaintCount = userStats.total_complaints || 0;
    const restComplaintCount = restStats.total_complaints || 0;

    const highTrustUser = customer.trust_score >= 80;
    const lowTrustUser = customer.trust_score <= 40;
    const frequentComplainer = userComplaintCount >= 3;
    const restaurantHasIssues = restComplaintCount >= 5;

    let status = 'ESCALATED';
    let reason = 'Escalated for manual review';

    if (highTrustUser && !frequentComplainer) {
      status = 'AUTO_APPROVED';
      reason = 'High trust customer with low complaint history';
    } else if (lowTrustUser && frequentComplainer && !restaurantHasIssues) {
      status = 'AUTO_REJECTED';
      reason = 'Low trust customer with multiple complaints';
    }

    return { status, reason };
  },

  // -----------------------------
  // Review analysis (INTEGRATED AI)
  // -----------------------------
  /**
   * Analyze a review's text and update trust/sentiment fields.
   * Called from ReviewService after a review is created.
   * Uses local Python model via src/ai/predict.py.
   */
  async analyzeReviewText(reviewId, text) {
    return new Promise((resolve) => {
      try {
        if (!text || !text.trim()) return resolve();

        const scriptPath = path.join(__dirname, '../ai/predict.py');
        const pythonProcess = spawn('python', [scriptPath, text]);

        let outputData = '';

        pythonProcess.stdout.on('data', (data) => {
          outputData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          console.error(`Python Script Error: ${data}`);
        });

        pythonProcess.on('close', async (code) => {
          if (code !== 0) {
            console.error(`Python process exited with code ${code}`);
            return resolve(); // do not break main flow
          }

          try {
            const aiResult = JSON.parse(outputData);

            const dbFields = {
              trustScore: aiResult.trust_score,
              isSuspicious: aiResult.is_suspicious,
              aiQualityLabel: aiResult.ai_quality_label,
              sentimentFood: aiResult.sentiment_food || 0.0,
              sentimentService: aiResult.sentiment_service || 0.0,
              sentimentAmbience: aiResult.sentiment_ambience || 0.0,
              sentimentHygiene: aiResult.sentiment_hygiene || 0.0,
              sentimentValue: aiResult.sentiment_value || 0.0,
            };

            await ReviewModel.updateAiFields(reviewId, dbFields);
            resolve();
          } catch (parseError) {
            console.error('Failed to parse AI output:', parseError);
            resolve();
          }
        });
      } catch (err) {
        console.error('AI review analysis failed:', err.message || err);
        resolve();
      }
    });
  },
};

module.exports = TrustEngineService;
