const { spawn } = require('child_process');
const path = require('path');

/**
 * Main AI Service for Complaints
 */
const ComplaintAiService = {
  // Helper to run Python Image Verification
  async verifyImage(img1, img2, img3, challengeSequence, expectedFoodLabels) {
    return new Promise((resolve) => {
      if (!img1 || !img2 || !img3) {
        return resolve({
          is_ai_generated: false,
          is_appropriate: false,
          confidence: 0.0,
          reason: "Missing image paths for verification.",
          decision: "REJECT",
          suspicious_capture: true,
          challenge_consistent: false,
          checks: {
            files_valid: false,
            quality_ok: false,
            screen_recap_suspected: false,
            metadata_ok: false
          }
        });
      }

      const scriptPath = path.join(__dirname, '../ai/verify_image.py');
      const py = spawn('python', [scriptPath, img1, img2, img3, challengeSequence || '', expectedFoodLabels || '']);
      let dataString = "";

      const timeout = setTimeout(() => {
        py.kill();
        resolve({
          is_ai_generated: false,
          is_appropriate: false,
          confidence: 0.0,
          reason: "Verification timed out.",
          decision: "REJECT",
          suspicious_capture: true,
          challenge_consistent: false,
          checks: {
            files_valid: false,
            quality_ok: false,
            screen_recap_suspected: false,
            metadata_ok: false
          }
        });
      }, 45000);

      py.stdout.on('data', (data) => {
        dataString += data.toString();
      });

      py.stderr.on('data', (data) => {
        console.error("Python verify error:", data.toString());
      });

      py.on('close', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          return resolve({
            is_ai_generated: false,
            is_appropriate: false,
            confidence: 0.0,
            reason: `Verifier process exited with code ${code}`,
            decision: "REJECT",
            suspicious_capture: true,
            challenge_consistent: false,
            checks: {
              files_valid: false,
              quality_ok: false,
              screen_recap_suspected: false,
              metadata_ok: false
            }
          });
        }
        try {
          const parsed = JSON.parse(dataString.trim());
          resolve(parsed);
        } catch (e) {
          resolve({
            is_ai_generated: false,
            is_appropriate: false,
            confidence: 0.0,
            reason: "Malformed verifier output.",
            decision: "REJECT",
            suspicious_capture: true,
            challenge_consistent: false,
            checks: {
              files_valid: false,
              quality_ok: false,
              screen_recap_suspected: false,
              metadata_ok: false
            }
          });
        }
      });
    });
  },

  /**
   * Enhanced Scoring Function
   * Incorporates User Trust, Restaurant History, and Image Analysis
   */
  async scoreComplaint({ complaint, user, order, restaurantStats, risk_score, image_is_ai }) {
    // 1. STRAIGHT AWAY REJECT if image is AI-generated
    if (image_is_ai === 1) {
      return {
        ai_score: 0,
        ai_decision: 'REJECT',
        reasons: ['invalid_or_ai_generated_image'],
        image_is_ai: 1,
      };
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

