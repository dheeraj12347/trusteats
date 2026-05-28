// src/services/complaintDecision.service.js

const ComplaintDecisionService = {
  validateVerifierOutput(verifierResult) {
    if (!verifierResult || typeof verifierResult !== 'object') {
      throw new Error('Invalid verifierResult: Output must be a non-null object.');
    }

    // Check deprecation / old format
    const isOldFormat = verifierResult.recommended_status !== undefined || verifierResult.recommended_warning_state !== undefined;
    if (isOldFormat) {
      console.warn('Deprecation Warning: verifierResult contains deprecated field "recommended_status" or "recommended_warning_state". These will be removed in future versions.');
    }

    // Required field: decision
    if (verifierResult.decision === undefined) {
      throw new Error('Validation Error: Required field "decision" is missing from verifierResult.');
    }
    const allowedDecisions = ['REJECT', 'REJECT_FACE_PRESENT', 'REJECT_NON_FOOD', 'FOOD_MISMATCH', 'FOOD_MATCH_PLAUSIBLE', 'UNCERTAIN'];
    if (typeof verifierResult.decision !== 'string' || !allowedDecisions.includes(verifierResult.decision)) {
      throw new Error(`Validation Error: Field "decision" must be one of: ${allowedDecisions.join(', ')}.`);
    }

    // Required field: reason / reasoning
    const hasReason = verifierResult.reason !== undefined || verifierResult.reasoning !== undefined;
    if (!hasReason) {
      throw new Error('Validation Error: Required field "reason" or "reasoning" is missing from verifierResult.');
    }
    if (verifierResult.reason !== undefined && typeof verifierResult.reason !== 'string') {
      throw new Error('Validation Error: Field "reason" must be a string.');
    }
    if (verifierResult.reasoning !== undefined && typeof verifierResult.reasoning !== 'string') {
      throw new Error('Validation Error: Field "reasoning" must be a string.');
    }

    // Required field: food_match_result (for new format only, old format can derive it, and hard rejects do not produce it)
    const isHardReject = ['REJECT', 'REJECT_FACE_PRESENT', 'REJECT_NON_FOOD'].includes(verifierResult.decision);
    if (!isOldFormat && !isHardReject && verifierResult.food_match_result === undefined) {
      throw new Error('Validation Error: Required field "food_match_result" is missing from verifierResult.');
    }
    if (verifierResult.food_match_result !== undefined) {
      const allowedMatchResults = ['food_match_plausible', 'food_mismatch', 'uncertain'];
      if (typeof verifierResult.food_match_result !== 'string' || !allowedMatchResults.includes(verifierResult.food_match_result)) {
        throw new Error(`Validation Error: Field "food_match_result" must be one of: ${allowedMatchResults.join(', ')}.`);
      }
    }
  },

  evaluateComplaint({ verifierResult, existingComplaint }) {
    // Validate output format and schema
    this.validateVerifierOutput(verifierResult);

    const decision = verifierResult.decision;
    const food_match_result = verifierResult.food_match_result || 
      (decision === 'FOOD_MISMATCH' ? 'food_mismatch' : (decision === 'FOOD_MATCH_PLAUSIBLE' ? 'food_match_plausible' : 'uncertain'));
    const issue_support_level = verifierResult.issue_support_level || 
      (['REJECT', 'REJECT_FACE_PRESENT', 'REJECT_NON_FOOD'].includes(decision) ? 'fraud_suspected' : 'issue_uncertain');

    let status = 'PENDING';
    let warning_state = null;
    let mismatch_attempts = 0;
    let reason = verifierResult.reason || verifierResult.reasoning || '';

    // Load existing attempts/warning state if this is a retry
    if (existingComplaint) {
      mismatch_attempts = existingComplaint.mismatch_attempts || 0;
      warning_state = existingComplaint.warning_state || null;
    }

    // 1. Fraud / Replay / Face / Non-food Rejections
    if (decision === 'REJECT_FACE_PRESENT' || decision === 'REJECT_NON_FOOD' || decision === 'REJECT' || issue_support_level === 'fraud_suspected') {
      status = 'AUTO_REJECTED';
      warning_state = null;
      if (decision === 'REJECT_FACE_PRESENT') {
        reason = 'Rejected: Face detected in captured evidence. For security and privacy, faces are strictly blocked.';
      } else if (decision === 'REJECT_NON_FOOD') {
        reason = 'Rejected: Captured evidence does not appear to contain recognizable food.';
      } else {
        reason = verifierResult.reason || verifierResult.reasoning || 'Rejected: Fraud or invalid evidence suspected.';
      }
    } 
    // 2. Food Mismatch
    else if (food_match_result === 'food_mismatch' || decision === 'FOOD_MISMATCH') {
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
    } 
    // 3. Plausible matches with issue support checks
    else if (food_match_result === 'food_match_plausible' || decision === 'FOOD_MATCH_PLAUSIBLE') {
      status = 'PENDING';
      warning_state = null;
      mismatch_attempts = 0;
      
      if (issue_support_level === 'issue_supported_strong') {
        reason = `Verification passed: Plausible food match and strong evidence of the reported issue. Sent for high-priority review.`;
      } else if (issue_support_level === 'issue_supported_weak') {
        reason = `Verification passed: Plausible food match with weak/moderate evidence of the reported issue. Sent for review.`;
      } else if (issue_support_level === 'issue_not_visible') {
        reason = `Verification passed: Plausible food match, but the reported issue is not clearly visible in the photos. Sent for review.`;
      } else {
        reason = `Verification passed: Plausible food match, but evidence support is uncertain. Sent for manual review.`;
      }
    } 
    // 4. Default fallbacks (Uncertain/Unmapped/Model failure)
    else {
      status = 'PENDING';
      warning_state = null;
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

