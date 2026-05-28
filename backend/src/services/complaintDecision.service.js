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

    if (verifierResult.foreign_object_detection_available !== undefined) {
      if (typeof verifierResult.foreign_object_detection_available !== 'boolean') {
        throw new Error('Validation Error: Field "foreign_object_detection_available" must be a boolean.');
      }
    }
    if (verifierResult.foreign_object_detection_mode !== undefined) {
      const allowedModes = ['owlvit', 'fallback', 'none'];
      if (typeof verifierResult.foreign_object_detection_mode !== 'string' || !allowedModes.includes(verifierResult.foreign_object_detection_mode)) {
        throw new Error(`Validation Error: Field "foreign_object_detection_mode" must be one of: ${allowedModes.join(', ')}.`);
      }
    }
    if (verifierResult.foreign_object_detector_name !== undefined) {
      const allowedNames = ['google/owlvit-base-patch32', 'clip-fallback', 'none'];
      if (typeof verifierResult.foreign_object_detector_name !== 'string' || !allowedNames.includes(verifierResult.foreign_object_detector_name)) {
        throw new Error(`Validation Error: Field "foreign_object_detector_name" must be one of: ${allowedNames.join(', ')}.`);
      }
    }
    if (verifierResult.foreign_object_detected !== undefined) {
      if (typeof verifierResult.foreign_object_detected !== 'boolean') {
        throw new Error('Validation Error: Field "foreign_object_detected" must be a boolean.');
      }
    }
    if (verifierResult.foreign_object_labels !== undefined && !Array.isArray(verifierResult.foreign_object_labels)) {
      throw new Error('Validation Error: Field "foreign_object_labels" must be an array.');
    }
    if (verifierResult.foreign_object_confidence !== undefined && typeof verifierResult.foreign_object_confidence !== 'number') {
      throw new Error('Validation Error: Field "foreign_object_confidence" must be a number.');
    }
    if (verifierResult.foreign_object_boxes !== undefined && !Array.isArray(verifierResult.foreign_object_boxes)) {
      throw new Error('Validation Error: Field "foreign_object_boxes" must be an array.');
    }
    if (verifierResult.foreign_object_reasoning !== undefined && typeof verifierResult.foreign_object_reasoning !== 'string') {
      throw new Error('Validation Error: Field "foreign_object_reasoning" must be a string.');
    }

    if (verifierResult.food_detection_available !== undefined) {
      if (typeof verifierResult.food_detection_available !== 'boolean') {
        throw new Error('Validation Error: Field "food_detection_available" must be a boolean.');
      }
    }
    if (verifierResult.food_detection_mode !== undefined) {
      const allowedModes = ['vit-food101', 'fallback', 'none'];
      if (typeof verifierResult.food_detection_mode !== 'string' || !allowedModes.includes(verifierResult.food_detection_mode)) {
        throw new Error(`Validation Error: Field "food_detection_mode" must be one of: ${allowedModes.join(', ')}.`);
      }
    }
    if (verifierResult.food_detector_name !== undefined) {
      const allowedNames = ['nateraw/food', 'vit-fallback', 'none'];
      if (typeof verifierResult.food_detector_name !== 'string' || !allowedNames.includes(verifierResult.food_detector_name)) {
        throw new Error(`Validation Error: Field "food_detector_name" must be one of: ${allowedNames.join(', ')}.`);
      }
    }
    if (verifierResult.predicted_food_labels !== undefined && !Array.isArray(verifierResult.predicted_food_labels)) {
      throw new Error('Validation Error: Field "predicted_food_labels" must be an array.');
    }
    if (verifierResult.predicted_top_label !== undefined && typeof verifierResult.predicted_top_label !== 'string') {
      throw new Error('Validation Error: Field "predicted_top_label" must be a string.');
    }
    if (verifierResult.predicted_top_confidence !== undefined && typeof verifierResult.predicted_top_confidence !== 'number') {
      throw new Error('Validation Error: Field "predicted_top_confidence" must be a number.');
    }
    if (verifierResult.expected_food_labels !== undefined && !Array.isArray(verifierResult.expected_food_labels)) {
      throw new Error('Validation Error: Field "expected_food_labels" must be an array.');
    }
    if (verifierResult.food_match_score !== undefined && typeof verifierResult.food_match_score !== 'number') {
      throw new Error('Validation Error: Field "food_match_score" must be a number.');
    }
    if (verifierResult.food_match_category !== undefined) {
      const allowedCats = ['plausible_match', 'mismatch', 'non_food', 'unknown'];
      if (typeof verifierResult.food_match_category !== 'string' || !allowedCats.includes(verifierResult.food_match_category)) {
        throw new Error(`Validation Error: Field "food_match_category" must be one of: ${allowedCats.join(', ')}.`);
      }
    }
    if (verifierResult.food_match_reasoning !== undefined && typeof verifierResult.food_match_reasoning !== 'string') {
      throw new Error('Validation Error: Field "food_match_reasoning" must be a string.');
    }
  },

  evaluateComplaint({ verifierResult, existingComplaint, complaintType }) {
    // Validate output format and schema
    this.validateVerifierOutput(verifierResult);

    const decision = verifierResult.decision;
    const food_match_result = verifierResult.food_match_result || 
      (decision === 'FOOD_MISMATCH' ? 'food_mismatch' : (decision === 'FOOD_MATCH_PLAUSIBLE' ? 'food_match_plausible' : 'uncertain'));
    let issue_support_level = verifierResult.issue_support_level || 
      (['REJECT', 'REJECT_FACE_PRESENT', 'REJECT_NON_FOOD'].includes(decision) ? 'fraud_suspected' : 'issue_uncertain');

    const hasNewFoodContract = verifierResult.food_detection_available === true;
    const foodCategory = hasNewFoodContract ? verifierResult.food_match_category : null;

    let isPlausibleMatch = false;
    let isMismatch = false;
    let isNonFood = false;

    if (hasNewFoodContract) {
      isPlausibleMatch = (foodCategory === 'plausible_match');
      isMismatch = (foodCategory === 'mismatch');
      isNonFood = (foodCategory === 'non_food');
    } else {
      isPlausibleMatch = (food_match_result === 'food_match_plausible' || decision === 'FOOD_MATCH_PLAUSIBLE');
      isMismatch = (food_match_result === 'food_mismatch' || decision === 'FOOD_MISMATCH');
      isNonFood = (decision === 'REJECT_NON_FOOD');
    }

    // Business Policy Override: MISSING_ITEM with food match should never be treated as strong evidence
    const actualComplaintType = complaintType || verifierResult.complaint_type || (existingComplaint ? existingComplaint.type : null);
    if (actualComplaintType === 'MISSING_ITEM' && isPlausibleMatch) {
      if (issue_support_level === 'issue_supported_strong') {
        issue_support_level = 'issue_supported_weak';
      }
    }

    // Business Policy: FOREIGN_OBJECT claims require explicit confirmation from the object detector
    if (actualComplaintType === 'FOREIGN_OBJECT' && isPlausibleMatch) {
      if (verifierResult.foreign_object_detection_available === true) {
        if (verifierResult.foreign_object_detected === true) {
          issue_support_level = 'issue_supported_strong';
        } else {
          // Explicit detector-negative result
          issue_support_level = 'issue_not_visible';
        }
      } else {
        // Falling back to CLIP classifier: do not treat classification as equivalent to object detection confirmation.
        // Downgrade any strong support to weak/uncertain.
        if (issue_support_level === 'issue_supported_strong') {
          issue_support_level = 'issue_supported_weak';
        }
      }
    }

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
    if (decision === 'REJECT_FACE_PRESENT' || decision === 'REJECT' || issue_support_level === 'fraud_suspected' || isNonFood) {
      status = 'AUTO_REJECTED';
      warning_state = null;
      if (decision === 'REJECT_FACE_PRESENT') {
        reason = 'Rejected: Face detected in captured evidence. For security and privacy, faces are strictly blocked.';
      } else if (decision === 'REJECT_NON_FOOD' || isNonFood) {
        reason = 'Rejected: Captured evidence does not appear to contain recognizable food.';
      } else {
        reason = verifierResult.reason || verifierResult.reasoning || 'Rejected: Fraud or invalid evidence suspected.';
      }
    } 
    // 2. Food Mismatch
    else if (isMismatch) {
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
    else if (isPlausibleMatch) {
      status = 'PENDING';
      warning_state = null;
      mismatch_attempts = 0;
      
      if (issue_support_level === 'issue_supported_strong') {
        if (actualComplaintType === 'FOREIGN_OBJECT' && verifierResult.foreign_object_detection_available === true && verifierResult.foreign_object_detected === true) {
          const labels = verifierResult.foreign_object_labels || [];
          reason = `Verification passed: Plausible food match and strong evidence of the reported issue. Detected: ${labels.join(', ')}. Sent for high-priority review.`;
        } else {
          reason = `Verification passed: Plausible food match and strong evidence of the reported issue. Sent for high-priority review.`;
        }
      } else if (issue_support_level === 'issue_supported_weak') {
        reason = `Verification passed: Plausible food match with weak/moderate evidence of the reported issue. Sent for review.`;
      } else if (issue_support_level === 'issue_not_visible') {
        if (actualComplaintType === 'FOREIGN_OBJECT' && verifierResult.foreign_object_detection_available === true && verifierResult.foreign_object_detected === false) {
          reason = `Verification passed: Plausible food match, but no foreign object detected in submitted evidence. Sent for review.`;
        } else {
          reason = `Verification passed: Plausible food match, but the reported issue is not clearly visible in the photos. Sent for review.`;
        }
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
      reason,
      issue_support_level
    };
  }
};

module.exports = ComplaintDecisionService;

