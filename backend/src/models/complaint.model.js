// src/models/complaint.model.js
const { pool } = require('../config/db');

const ComplaintModel = {
  async create(data) {
    const {
      order_id,
      customer_id,
      restaurant_id,
      type,
      description,
      image_path,
      image_path_2,
      image_path_3,
      image_hash,
      image_hash_2,
      image_hash_3,
      challenge_sequence,
      challenge_completed,
      suspicious_capture,
      image_is_ai,
      verification_confidence,
      verification_reason,
      verification_decision,
      status,
      ai_score,
      trust_score,
      decision_reason,
      predicted_label,
      prediction_confidence,
      face_detected,
      expected_labels,
      verifier_decision,
      verifier_reason,
      mismatch_attempts,
      warning_state,
      raw_verifier_response,
    } = data;

    // Debug: see exactly what controller sent
    console.log('DEBUG ComplaintModel.create data =', data);

    // Safety: force a valid enum string if anything weird comes in
    let finalStatus = status || 'PENDING';
    if (
      !['PENDING', 'AUTO_APPROVED', 'AUTO_REJECTED', 'ESCALATED', 'RESOLVED'].includes(
        finalStatus
      )
    ) {
      finalStatus = 'PENDING';
    }

    const [result] = await pool.query(
      `INSERT INTO complaints
         (order_id,
          customer_id,
          restaurant_id,
          type,
          description,
          image_path,
          image_path_2,
          image_path_3,
          image_hash,
          image_hash_2,
          image_hash_3,
          challenge_sequence,
          challenge_completed,
          suspicious_capture,
          image_is_ai,
          verification_confidence,
          verification_reason,
          verification_decision,
          status,
          ai_score,
          trust_score,
          decision_reason,
          predicted_label,
          prediction_confidence,
          face_detected,
          expected_labels,
          verifier_decision,
          verifier_reason,
          mismatch_attempts,
          warning_state,
          raw_verifier_response)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order_id,
        customer_id,
        restaurant_id,
        type,
        description || null,
        image_path || null,
        image_path_2 || null,
        image_path_3 || null,
        image_hash || null,
        image_hash_2 || null,
        image_hash_3 || null,
        challenge_sequence || null,
        challenge_completed ?? 0,
        suspicious_capture ?? 0,
        image_is_ai ?? 0,
        verification_confidence ?? null,
        verification_reason || null,
        verification_decision || null,
        finalStatus,
        ai_score ?? null,
        trust_score ?? null,
        decision_reason || null,
        predicted_label || null,
        prediction_confidence ?? null,
        face_detected ?? 0,
        expected_labels || null,
        verifier_decision || null,
        verifier_reason || null,
        mismatch_attempts ?? 0,
        warning_state || null,
        raw_verifier_response || null,
      ]
    );

    return { id: result.insertId };
  },

  async updateComplaint(id, data) {
    const {
      image_path,
      image_path_2,
      image_path_3,
      image_hash,
      image_hash_2,
      image_hash_3,
      challenge_sequence,
      challenge_completed,
      suspicious_capture,
      image_is_ai,
      verification_confidence,
      verification_reason,
      verification_decision,
      status,
      ai_score,
      trust_score,
      decision_reason,
      predicted_label,
      prediction_confidence,
      face_detected,
      expected_labels,
      verifier_decision,
      verifier_reason,
      mismatch_attempts,
      warning_state,
      raw_verifier_response,
    } = data;

    // Safety: force a valid enum string if anything weird comes in
    let finalStatus = status || 'PENDING';
    if (
      !['PENDING', 'AUTO_APPROVED', 'AUTO_REJECTED', 'ESCALATED', 'RESOLVED'].includes(
        finalStatus
      )
    ) {
      finalStatus = 'PENDING';
    }

    await pool.query(
      `UPDATE complaints
       SET image_path = ?,
           image_path_2 = ?,
           image_path_3 = ?,
           image_hash = ?,
           image_hash_2 = ?,
           image_hash_3 = ?,
           challenge_sequence = ?,
           challenge_completed = ?,
           suspicious_capture = ?,
           image_is_ai = ?,
           verification_confidence = ?,
           verification_reason = ?,
           verification_decision = ?,
           status = ?,
           ai_score = ?,
           trust_score = ?,
           decision_reason = ?,
           predicted_label = ?,
           prediction_confidence = ?,
           face_detected = ?,
           expected_labels = ?,
           verifier_decision = ?,
           verifier_reason = ?,
           mismatch_attempts = ?,
           warning_state = ?,
           raw_verifier_response = ?
       WHERE id = ?`,
      [
        image_path || null,
        image_path_2 || null,
        image_path_3 || null,
        image_hash || null,
        image_hash_2 || null,
        image_hash_3 || null,
        challenge_sequence || null,
        challenge_completed ?? 0,
        suspicious_capture ?? 0,
        image_is_ai ?? 0,
        verification_confidence ?? null,
        verification_reason || null,
        verification_decision || null,
        finalStatus,
        ai_score ?? null,
        trust_score ?? null,
        decision_reason || null,
        predicted_label || null,
        prediction_confidence ?? null,
        face_detected ?? 0,
        expected_labels || null,
        verifier_decision || null,
        verifier_reason || null,
        mismatch_attempts ?? 0,
        warning_state || null,
        raw_verifier_response || null,
        id,
      ]
    );
  },

  async findByOrderId(order_id, customer_id) {
    const [rows] = await pool.query(
      `SELECT * FROM complaints WHERE order_id = ? AND customer_id = ? LIMIT 1`,
      [order_id, customer_id]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT * FROM complaints WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async updateStatus(id, status, decision_reason) {
    await pool.query(
      `UPDATE complaints 
         SET status = ?, decision_reason = ? 
       WHERE id = ?`,
      [status, decision_reason || null, id]
    );
  },

  // Customer list: now always returns all complaints for this customer
  async listForCustomer(customer_id) {
    const [rows] = await pool.query(
      `SELECT *
         FROM complaints
        WHERE customer_id = ?
        ORDER BY created_at DESC`,
      [customer_id]
    );
    return rows;
  },

  // Restaurant list: now always returns all complaints for this restaurant
  async listForRestaurant(restaurant_id) {
    const [rows] = await pool.query(
      `SELECT *
         FROM complaints
        WHERE restaurant_id = ?
        ORDER BY created_at DESC`,
      [restaurant_id]
    );
    return rows;
  },

  // Admin: see everything (no filter)
  async listForAdmin() {
    const [rows] = await pool.query(
      `SELECT *
         FROM complaints
        ORDER BY created_at DESC`
    );
    return rows;
  },
};

module.exports = ComplaintModel;

