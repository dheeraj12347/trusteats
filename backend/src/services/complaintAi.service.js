const { spawn } = require('child_process');
const path = require('path');

/**
 * Main AI Service for Complaints
 */
const ComplaintAiService = {
  // Helper to run Python Image Verification
  async verifyImage(imagePath) {
    return new Promise((resolve) => {
      if (!imagePath) {
        return resolve({ is_appropriate: true, is_ai_generated: false });
      }

      const scriptPath = path.join(__dirname, '../ai/verify_image.py');
      const py = spawn('python', [scriptPath, imagePath]);
      let dataString = "";

      py.stdout.on('data', (data) => {
        dataString += data.toString();
      });

      py.on('close', () => {
        try {
          resolve(JSON.parse(dataString));
        } catch (e) {
          resolve({ is_appropriate: false, is_ai_generated: false });
        }
      });
    });
  },

  /**
   * Enhanced Scoring Function
   * Incorporates User Trust, Restaurant History, and Image Analysis
   */
  async scoreComplaint({ complaint, user, order, restaurantStats, risk_score }) {
    // 1. STRAIGHT AWAY REJECT: Image Verification
    if (complaint.image_path) {
      const imgCheck = await this.verifyImage(complaint.image_path);
      if (imgCheck.is_ai_generated || !imgCheck.is_appropriate) {
        return {
          ai_score: 0,
          ai_decision: 'REJECT',
          reasons: ['invalid_or_ai_generated_image'],
          image_is_ai: imgCheck.is_ai_generated ? 1 : 0,
        };
      }
    }

    let score = 50;
    const reasons = [];

    // Complaint type
    if (complaint.type === 'QUALITY_ISSUE' || complaint.type === 'FOREIGN_OBJECT') {
      score += 15;
      reasons.push('serious_food_issue');
    }

    if (complaint.type === 'MISSING_ITEM') {
      score += 5;
      reasons.push('missing_item');
    }

    // User trust score factor
    if (user && typeof user.trust_score === 'number') {
      if (user.trust_score >= 80) {
        score += 20;
        reasons.push('high_trust_user');
      } else if (user.trust_score <= 40) {
        score -= 20;
        reasons.push('low_trust_user');
      }
    }

    // Restaurant history factor
    if (restaurantStats && typeof restaurantStats.total_issues === 'number') {
      if (restaurantStats.total_issues > 10) {
        score += 15;
        reasons.push('restaurant_history_of_issues');
      }
    }

    // Order value
    if (order.total_price && order.total_price > 500) {
      score -= 10;
      reasons.push('high_amount_requires_review');
    }

    // Existing risk_score from order
    if (typeof risk_score === 'number') {
      if (risk_score >= 25) {
        score -= 15;
        reasons.push('high_risk_order');
      } else if (risk_score >= 10) {
        score -= 5;
        reasons.push('medium_risk_order');
      } else {
        score += 5;
        reasons.push('low_risk_order');
      }
    }

    // Clamp 0–100
    score = Math.max(0, Math.min(100, score));

    // Map score → decision: ALWAYS APPROVE or REJECT (no REVIEW)
    let ai_decision;
    if (score >= 50) {
      ai_decision = 'APPROVE';
    } else {
      ai_decision = 'REJECT';
    }

    return {
      ai_score: Math.round(score),
      ai_decision,
      reasons,
      image_is_ai: 0,
    };
  },
};

module.exports = ComplaintAiService;
