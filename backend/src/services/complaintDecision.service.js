// src/services/complaintDecision.service.js

const ComplaintDecisionService = {
  evaluateComplaint({ verifierResult, existingComplaint }) {
    const decision = verifierResult.decision;
    let status = 'PENDING';
    let warning_state = null;
    let mismatch_attempts = 0;
    let reason = verifierResult.reason || '';

    // Load existing attempts/warning state if this is a retry
    if (existingComplaint) {
      mismatch_attempts = existingComplaint.mismatch_attempts || 0;
      warning_state = existingComplaint.warning_state || null;
    }

    if (decision === 'REJECT_FACE_PRESENT') {
      status = 'AUTO_REJECTED';
      warning_state = 'BLOCKED';
      reason = 'Rejected: Face detected in captured evidence. For security and privacy, faces are strictly blocked.';
    } else if (decision === 'REJECT_NON_FOOD') {
      status = 'AUTO_REJECTED';
      warning_state = 'BLOCKED';
      reason = 'Rejected: Captured evidence does not appear to be food.';
    } else if (decision === 'FOOD_MISMATCH') {
      if (warning_state === 'WARNING_SENT' && mismatch_attempts === 1) {
        // Second attempt -> AUTO_REJECTED
        status = 'AUTO_REJECTED';
        warning_state = 'BLOCKED';
        mismatch_attempts = 2;
        reason = `Rejected: Repeated mismatch - captured food (${verifierResult.predicted_label || 'unknown'}) does not match the ordered item.`;
      } else {
        // First attempt -> PENDING with warning
        status = 'PENDING';
        warning_state = 'WARNING_SENT';
        mismatch_attempts = 1;
        reason = `Warning: Captured food (${verifierResult.predicted_label || 'unknown'}) does not match the ordered item. Please submit a valid photo.`;
      }
    } else if (decision === 'FOOD_MATCH_PLAUSIBLE') {
      // Plausible match -> Always PENDING for manual review in this phase
      status = 'PENDING';
      warning_state = 'PASSED';
      reason = `Verification passed: Plausible food match detected (${verifierResult.predicted_label || 'unknown'}). Sent for review.`;
    } else {
      // UNCERTAIN or other decisions -> PENDING
      status = 'PENDING';
      warning_state = 'UNCERTAIN';
      reason = `Verification uncertain: Sent for manual review. Reason: ${verifierResult.reason || 'uncertain match'}`;
    }

    return {
      status,
      warning_state,
      mismatch_attempts,
      reason
    };
  }
};

module.exports = ComplaintDecisionService;
