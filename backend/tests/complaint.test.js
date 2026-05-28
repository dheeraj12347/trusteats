const { test, describe } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

// Set JWT secret for tests
process.env.JWT_SECRET = 'test_secret_for_integration_testing';

// Mock DB pool and models before requiring app to prevent MySQL connection errors
const { pool } = require('../src/config/db');
const ComplaintAiService = require('../src/services/complaintAi.service');
const ComplaintModel = require('../src/models/complaint.model');
const OrderModel = require('../src/models/order.model');
const UserModel = require('../src/models/user.model');

// Mock DB Pool connection
pool.getConnection = async () => {
  return {
    ping: async () => {},
    release: () => {},
    query: async () => [[]],
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {}
  };
};

// Dynamic stubs controlling data for each test case
let mockVerifyImageResult = {};
let mockOrdersForCustomer = [];
let mockUser = null;
let mockComplaintFindByOrderId = null;
let mockCreatedComplaintId = 999;
let lastCreatedComplaintData = null;
let lastUpdatedComplaintId = null;
let lastUpdatedComplaintData = null;
let mockOrderItems = [];
let mockRestStats = [];

// Override service/model methods
ComplaintAiService.verifyImage = async () => mockVerifyImageResult;
OrderModel.getOrdersForCustomer = async () => mockOrdersForCustomer;
UserModel.findById = async () => mockUser;
ComplaintModel.findByOrderId = async () => mockComplaintFindByOrderId;

ComplaintModel.create = async (data) => {
  lastCreatedComplaintData = data;
  return { id: mockCreatedComplaintId };
};

ComplaintModel.updateComplaint = async (id, data) => {
  lastUpdatedComplaintId = id;
  lastUpdatedComplaintData = data;
};

ComplaintModel.findById = async (id) => {
  const base = lastCreatedComplaintData || lastUpdatedComplaintData || {};
  return { id, created_at: new Date().toISOString(), ...base };
};

// Stub pool.query dynamically
pool.query = async (sql, values) => {
  if (sql.includes('order_items')) {
    return [mockOrderItems];
  }
  if (sql.includes('complaints') && sql.includes('restaurant_id')) {
    return [mockRestStats];
  }
  return [[]];
};

// Now import supertest and the express app
const request = require('supertest');
const app = require('../src/app');

describe('Complaint Submission Integration Tests', () => {
  const token = jwt.sign({ id: 1, role: 'CUSTOMER' }, 'test_secret_for_integration_testing');
  const buffer1 = Buffer.from('dummy image 1 content');
  const buffer2 = Buffer.from('dummy image 2 content');
  const buffer3 = Buffer.from('dummy image 3 content');

  test('a) face present -> AUTO_REJECTED / warning null', async () => {
    // Setup stubs
    mockVerifyImageResult = {
      decision: 'REJECT_FACE_PRESENT',
      reason: 'Rejected: Face detected in captured evidence. For security and privacy, faces are strictly blocked.',
      face_detected: true,
      confidence: 1.0,
      suspicious_capture: false,
      is_ai_generated: false
    };
    mockOrdersForCustomer = [{ id: 100, status: 'DELIVERED', restaurant_id: 1, total_price: 150 }];
    mockUser = { id: 1, trust_score: 85 };
    mockComplaintFindByOrderId = null;
    mockOrderItems = [{ name: 'pizza' }];
    lastCreatedComplaintData = null;

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('order_id', '100')
      .field('type', 'QUALITY_ISSUE')
      .field('description', 'Face on pizza')
      .field('challenge_sequence', '1: Normal Meal | 2: Angle | 3: Receipt')
      .field('challenge_completed', 'true')
      .attach('images', buffer1, 'image1.jpg')
      .attach('images', buffer2, 'image2.jpg')
      .attach('images', buffer3, 'image3.jpg');

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.status, 'AUTO_REJECTED');
    assert.strictEqual(lastCreatedComplaintData.warning_state, null);
    assert.strictEqual(lastCreatedComplaintData.face_detected, 1);
    assert.strictEqual(lastCreatedComplaintData.verifier_decision, 'REJECT_FACE_PRESENT');
  });

  test('b) non-food low confidence -> AUTO_REJECTED / warning null', async () => {
    // Setup stubs
    mockVerifyImageResult = {
      decision: 'REJECT_NON_FOOD',
      reason: 'Rejected: Captured evidence does not appear to contain recognizable food.',
      face_detected: false,
      confidence: 0.04,
      suspicious_capture: false,
      is_ai_generated: false,
      predicted_label: 'carrot_cake',
      prediction_confidence: 0.04
    };
    mockOrdersForCustomer = [{ id: 100, status: 'DELIVERED', restaurant_id: 1, total_price: 150 }];
    mockUser = { id: 1, trust_score: 85 };
    mockComplaintFindByOrderId = null;
    mockOrderItems = [{ name: 'pizza' }];
    lastCreatedComplaintData = null;

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('order_id', '100')
      .field('type', 'QUALITY_ISSUE')
      .field('description', 'Non food item')
      .field('challenge_sequence', '1: Normal Meal | 2: Angle | 3: Receipt')
      .field('challenge_completed', 'true')
      .attach('images', buffer1, 'image1.jpg')
      .attach('images', buffer2, 'image2.jpg')
      .attach('images', buffer3, 'image3.jpg');

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.status, 'AUTO_REJECTED');
    assert.strictEqual(lastCreatedComplaintData.warning_state, null);
    assert.strictEqual(lastCreatedComplaintData.predicted_label, 'carrot_cake');
    assert.strictEqual(lastCreatedComplaintData.prediction_confidence, 0.04);
  });

  test('c) burger + complaint "wrong item received" + pizza image -> mismatch flow', async () => {
    // Setup stubs
    mockVerifyImageResult = {
      decision: 'FOOD_MISMATCH',
      reason: 'Warning: Captured food (pizza) does not match the ordered item (burger).',
      face_detected: false,
      confidence: 0.85,
      suspicious_capture: false,
      is_ai_generated: false,
      predicted_label: 'pizza',
      prediction_confidence: 0.85,
      food_match_result: 'food_mismatch',
      issue_support_level: 'issue_uncertain',
      detected_objects: []
    };
    mockOrdersForCustomer = [{ id: 100, status: 'DELIVERED', restaurant_id: 1, total_price: 150 }];
    mockUser = { id: 1, trust_score: 85 };
    mockComplaintFindByOrderId = null;
    mockOrderItems = [{ name: 'burger' }];
    lastCreatedComplaintData = null;

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('order_id', '100')
      .field('type', 'QUALITY_ISSUE')
      .field('description', 'wrong item received')
      .field('challenge_sequence', '1: Normal Meal | 2: Angle | 3: Receipt')
      .field('challenge_completed', 'true')
      .attach('images', buffer1, 'image1.jpg')
      .attach('images', buffer2, 'image2.jpg')
      .attach('images', buffer3, 'image3.jpg');

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.status, 'PENDING');
    assert.strictEqual(res.body.warning_state, 'WARNING_SENT');
    assert.strictEqual(res.body.food_match_result, 'food_mismatch');
    assert.strictEqual(lastCreatedComplaintData.warning_state, 'WARNING_SENT');
    assert.strictEqual(lastCreatedComplaintData.mismatch_attempts, 1);
  });

  test('d) mismatch retry -> AUTO_REJECTED / BLOCKED / mismatch_attempts=2', async () => {
    // Setup stubs
    mockVerifyImageResult = {
      decision: 'FOOD_MISMATCH',
      reason: 'Rejected: Repeated mismatch - captured food (pizza) does not match.',
      face_detected: false,
      confidence: 0.82,
      suspicious_capture: false,
      is_ai_generated: false,
      predicted_label: 'pizza',
      prediction_confidence: 0.82,
      food_match_result: 'food_mismatch',
      issue_support_level: 'issue_uncertain',
      detected_objects: []
    };
    mockOrdersForCustomer = [{ id: 100, status: 'DELIVERED', restaurant_id: 1, total_price: 150 }];
    mockUser = { id: 1, trust_score: 85 };
    // Simulate existing warning complaint
    mockComplaintFindByOrderId = {
      id: 550,
      order_id: 100,
      customer_id: 1,
      warning_state: 'WARNING_SENT',
      mismatch_attempts: 1
    };
    mockOrderItems = [{ name: 'burger' }];
    lastCreatedComplaintData = null;
    lastUpdatedComplaintId = null;
    lastUpdatedComplaintData = null;

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('order_id', '100')
      .field('type', 'QUALITY_ISSUE')
      .field('description', 'wrong item retry')
      .field('challenge_sequence', '1: Normal Meal | 2: Angle | 3: Receipt')
      .field('challenge_completed', 'true')
      .attach('images', buffer1, 'image1.jpg')
      .attach('images', buffer2, 'image2.jpg')
      .attach('images', buffer3, 'image3.jpg');

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.status, 'AUTO_REJECTED');
    assert.strictEqual(lastUpdatedComplaintId, 550);
    assert.strictEqual(lastUpdatedComplaintData.warning_state, 'BLOCKED');
    assert.strictEqual(lastUpdatedComplaintData.mismatch_attempts, 2);
  });

  test('e) burger + complaint "cockroach found" + detected insect-like object -> strong evidence', async () => {
    // Setup stubs
    mockVerifyImageResult = {
      decision: 'FOOD_MATCH_PLAUSIBLE',
      reason: 'Verification passed: Plausible food match detected (burger) and insect-like object detected.',
      face_detected: false,
      confidence: 0.95,
      suspicious_capture: false,
      is_ai_generated: false,
      predicted_label: 'burger',
      prediction_confidence: 0.95,
      food_match_result: 'food_match_plausible',
      issue_support_level: 'issue_supported_strong',
      detected_objects: ['insect/bug'],
      reasoning: 'Evidence strongly supports the complaint. Detected insect/bug.'
    };
    mockOrdersForCustomer = [{ id: 100, status: 'DELIVERED', restaurant_id: 1, total_price: 150 }];
    mockUser = { id: 1, trust_score: 85 };
    mockComplaintFindByOrderId = null;
    mockOrderItems = [{ name: 'burger' }];
    lastCreatedComplaintData = null;

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('order_id', '100')
      .field('type', 'FOREIGN_OBJECT')
      .field('description', 'cockroach found')
      .field('challenge_sequence', '1: Normal Meal | 2: Angle | 3: Receipt')
      .field('challenge_completed', 'true')
      .attach('images', buffer1, 'image1.jpg')
      .attach('images', buffer2, 'image2.jpg')
      .attach('images', buffer3, 'image3.jpg');

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.status, 'PENDING');
    assert.strictEqual(res.body.issue_support_level, 'issue_supported_strong');
    assert.deepEqual(res.body.detected_objects, ['insect/bug']);
    assert.strictEqual(lastCreatedComplaintData.warning_state, null);
  });

  test('f) burger + complaint "cockroach found" + normal burger image -> should NOT be treated as strong evidence', async () => {
    // Setup stubs
    mockVerifyImageResult = {
      decision: 'FOOD_MATCH_PLAUSIBLE',
      reason: 'Verification passed: Plausible food match detected (burger).',
      face_detected: false,
      confidence: 0.9,
      suspicious_capture: false,
      is_ai_generated: false,
      predicted_label: 'burger',
      prediction_confidence: 0.9,
      food_match_result: 'food_match_plausible',
      issue_support_level: 'issue_not_visible',
      detected_objects: [],
      reasoning: 'The reported issue is not clearly visible in the provided food images.'
    };
    mockOrdersForCustomer = [{ id: 100, status: 'DELIVERED', restaurant_id: 1, total_price: 150 }];
    mockUser = { id: 1, trust_score: 85 };
    mockComplaintFindByOrderId = null;
    mockOrderItems = [{ name: 'burger' }];
    lastCreatedComplaintData = null;

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('order_id', '100')
      .field('type', 'FOREIGN_OBJECT')
      .field('description', 'cockroach found')
      .field('challenge_sequence', '1: Normal Meal | 2: Angle | 3: Receipt')
      .field('challenge_completed', 'true')
      .attach('images', buffer1, 'image1.jpg')
      .attach('images', buffer2, 'image2.jpg')
      .attach('images', buffer3, 'image3.jpg');

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.status, 'PENDING');
    assert.strictEqual(res.body.issue_support_level, 'issue_not_visible');
    assert.deepEqual(res.body.detected_objects, []);
    assert.strictEqual(lastCreatedComplaintData.warning_state, null);
  });

  test('g) burger + complaint "foreign object" + replay-on-screen image -> fraud reject', async () => {
    // Setup stubs
    mockVerifyImageResult = {
      decision: 'REJECT',
      reason: 'Screen replay or suspicious filename detected in evidence.',
      face_detected: false,
      confidence: 0.0,
      suspicious_capture: true,
      is_ai_generated: false,
      food_match_result: 'uncertain',
      issue_support_level: 'fraud_suspected',
      detected_objects: []
    };
    mockOrdersForCustomer = [{ id: 100, status: 'DELIVERED', restaurant_id: 1, total_price: 150 }];
    mockUser = { id: 1, trust_score: 85 };
    mockComplaintFindByOrderId = null;
    mockOrderItems = [{ name: 'burger' }];
    lastCreatedComplaintData = null;

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('order_id', '100')
      .field('type', 'FOREIGN_OBJECT')
      .field('description', 'Replay screen')
      .field('challenge_sequence', '1: Normal Meal | 2: Angle | 3: Receipt')
      .field('challenge_completed', 'true')
      .attach('images', buffer1, 'image1.jpg')
      .attach('images', buffer2, 'image2.jpg')
      .attach('images', buffer3, 'image3.jpg');

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.status, 'AUTO_REJECTED');
    assert.strictEqual(res.body.issue_support_level, 'fraud_suspected');
    assert.strictEqual(lastCreatedComplaintData.warning_state, null);
  });

  test('h) verifier output validation: missing decision -> fails safely with 500', async () => {
    // Setup stubs with missing decision
    mockVerifyImageResult = {
      reason: 'Missing decision field',
      food_match_result: 'food_match_plausible',
    };
    mockOrdersForCustomer = [{ id: 100, status: 'DELIVERED', restaurant_id: 1, total_price: 150 }];
    mockUser = { id: 1, trust_score: 85 };
    mockComplaintFindByOrderId = null;
    mockOrderItems = [{ name: 'burger' }];
    lastCreatedComplaintData = null;

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('order_id', '100')
      .field('type', 'FOREIGN_OBJECT')
      .field('description', 'Test validation')
      .field('challenge_sequence', '1: Normal Meal | 2: Angle | 3: Receipt')
      .field('challenge_completed', 'true')
      .attach('images', buffer1, 'image1.jpg')
      .attach('images', buffer2, 'image2.jpg')
      .attach('images', buffer3, 'image3.jpg');

    assert.strictEqual(res.status, 500);
    assert.strictEqual(res.body.message, 'Internal server error');
  });

  test('i) verifier output validation: missing reason/reasoning -> fails safely with 500', async () => {
    // Setup stubs with missing reason
    mockVerifyImageResult = {
      decision: 'FOOD_MATCH_PLAUSIBLE',
      food_match_result: 'food_match_plausible',
    };
    mockOrdersForCustomer = [{ id: 100, status: 'DELIVERED', restaurant_id: 1, total_price: 150 }];
    mockUser = { id: 1, trust_score: 85 };
    mockComplaintFindByOrderId = null;
    mockOrderItems = [{ name: 'burger' }];
    lastCreatedComplaintData = null;

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('order_id', '100')
      .field('type', 'FOREIGN_OBJECT')
      .field('description', 'Test validation')
      .field('challenge_sequence', '1: Normal Meal | 2: Angle | 3: Receipt')
      .field('challenge_completed', 'true')
      .attach('images', buffer1, 'image1.jpg')
      .attach('images', buffer2, 'image2.jpg')
      .attach('images', buffer3, 'image3.jpg');

    assert.strictEqual(res.status, 500);
    assert.strictEqual(res.body.message, 'Internal server error');
  });

  test('j) verifier output validation: missing food_match_result in new format -> fails safely with 500', async () => {
    // Setup stubs with missing food_match_result (new format)
    mockVerifyImageResult = {
      decision: 'FOOD_MATCH_PLAUSIBLE',
      reason: 'Plausible matching',
    };
    mockOrdersForCustomer = [{ id: 100, status: 'DELIVERED', restaurant_id: 1, total_price: 150 }];
    mockUser = { id: 1, trust_score: 85 };
    mockComplaintFindByOrderId = null;
    mockOrderItems = [{ name: 'burger' }];
    lastCreatedComplaintData = null;

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('order_id', '100')
      .field('type', 'FOREIGN_OBJECT')
      .field('description', 'Test validation')
      .field('challenge_sequence', '1: Normal Meal | 2: Angle | 3: Receipt')
      .field('challenge_completed', 'true')
      .attach('images', buffer1, 'image1.jpg')
      .attach('images', buffer2, 'image2.jpg')
      .attach('images', buffer3, 'image3.jpg');

    assert.strictEqual(res.status, 500);
    assert.strictEqual(res.body.message, 'Internal server error');
  });

  test('k) verifier output validation: old format with recommended_status -> succeeds and logs deprecation', async () => {
    // Setup stubs with old format, missing food_match_result
    mockVerifyImageResult = {
      decision: 'FOOD_MATCH_PLAUSIBLE',
      reason: 'Old format check',
      recommended_status: 'PENDING',
      recommended_warning_state: null,
    };
    mockOrdersForCustomer = [{ id: 100, status: 'DELIVERED', restaurant_id: 1, total_price: 150 }];
    mockUser = { id: 1, trust_score: 85 };
    mockComplaintFindByOrderId = null;
    mockOrderItems = [{ name: 'burger' }];
    lastCreatedComplaintData = null;

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('order_id', '100')
      .field('type', 'FOREIGN_OBJECT')
      .field('description', 'Test validation')
      .field('challenge_sequence', '1: Normal Meal | 2: Angle | 3: Receipt')
      .field('challenge_completed', 'true')
      .attach('images', buffer1, 'image1.jpg')
      .attach('images', buffer2, 'image2.jpg')
      .attach('images', buffer3, 'image3.jpg');

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.status, 'PENDING');
  });

  test('l) verifier output validation: Node policy ignores recommended_* and uses signals (decision, food_match_result, issue_support_level)', async () => {
    // Setup stubs where recommended_* contradicts signal fields:
    // decision: FOOD_MATCH_PLAUSIBLE with strong support -> should result in PENDING (with null warning_state)
    // but recommended_status is AUTO_REJECTED and recommended_warning_state is BLOCKED
    mockVerifyImageResult = {
      decision: 'FOOD_MATCH_PLAUSIBLE',
      reason: 'Contradictory old fields',
      food_match_result: 'food_match_plausible',
      issue_support_level: 'issue_supported_strong',
      recommended_status: 'AUTO_REJECTED',
      recommended_warning_state: 'BLOCKED',
    };
    mockOrdersForCustomer = [{ id: 100, status: 'DELIVERED', restaurant_id: 1, total_price: 150 }];
    mockUser = { id: 1, trust_score: 85 };
    mockComplaintFindByOrderId = null;
    mockOrderItems = [{ name: 'burger' }];
    lastCreatedComplaintData = null;

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('order_id', '100')
      .field('type', 'FOREIGN_OBJECT')
      .field('description', 'Test validation')
      .field('challenge_sequence', '1: Normal Meal | 2: Angle | 3: Receipt')
      .field('challenge_completed', 'true')
      .attach('images', buffer1, 'image1.jpg')
      .attach('images', buffer2, 'image2.jpg')
      .attach('images', buffer3, 'image3.jpg');

    assert.strictEqual(res.status, 201);
    // Should be PENDING because it ignores recommended_status 'AUTO_REJECTED'
    assert.strictEqual(res.body.status, 'PENDING');
    // warning_state should be null because it ignores recommended_warning_state 'BLOCKED'
    assert.strictEqual(res.body.warning_state, null);
    assert.strictEqual(lastCreatedComplaintData.warning_state, null);
  });

  test('m) verifier output validation: Node policy ignores recommended_* and uses signals on food mismatch retry', async () => {
    // Setup stubs where recommended_* contradictions are present on food mismatch:
    // decision: FOOD_MISMATCH, food_match_result: food_mismatch -> should result in PENDING / WARNING_SENT on 1st attempt
    // but recommended_status is AUTO_REJECTED and recommended_warning_state is BLOCKED
    mockVerifyImageResult = {
      decision: 'FOOD_MISMATCH',
      reason: 'Contradictory old fields mismatch',
      food_match_result: 'food_mismatch',
      issue_support_level: 'issue_uncertain',
      recommended_status: 'AUTO_REJECTED',
      recommended_warning_state: 'BLOCKED',
    };
    mockOrdersForCustomer = [{ id: 100, status: 'DELIVERED', restaurant_id: 1, total_price: 150 }];
    mockUser = { id: 1, trust_score: 85 };
    mockComplaintFindByOrderId = null; // 1st attempt
    mockOrderItems = [{ name: 'burger' }];
    lastCreatedComplaintData = null;

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('order_id', '100')
      .field('type', 'QUALITY_ISSUE')
      .field('description', 'wrong item received')
      .field('challenge_sequence', '1: Normal Meal | 2: Angle | 3: Receipt')
      .field('challenge_completed', 'true')
      .attach('images', buffer1, 'image1.jpg')
      .attach('images', buffer2, 'image2.jpg')
      .attach('images', buffer3, 'image3.jpg');

    assert.strictEqual(res.status, 201);
    // Should be PENDING / WARNING_SENT because it ignores recommended_status / recommended_warning_state
    assert.strictEqual(res.body.status, 'PENDING');
    assert.strictEqual(res.body.warning_state, 'WARNING_SENT');
    assert.strictEqual(lastCreatedComplaintData.warning_state, 'WARNING_SENT');
  });

  test('n) verifier output validation: new format contract_version 1 with NO recommended_* fields succeeds', async () => {
    // Setup stubs with new format only, no recommended_status/warning_state, and contract_version: 1
    mockVerifyImageResult = {
      decision: 'FOOD_MATCH_PLAUSIBLE',
      reason: 'New format only check',
      food_match_result: 'food_match_plausible',
      issue_support_level: 'issue_supported_strong',
      contract_version: 1
    };
    mockOrdersForCustomer = [{ id: 100, status: 'DELIVERED', restaurant_id: 1, total_price: 150 }];
    mockUser = { id: 1, trust_score: 85 };
    mockComplaintFindByOrderId = null;
    mockOrderItems = [{ name: 'burger' }];
    lastCreatedComplaintData = null;

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('order_id', '100')
      .field('type', 'FOREIGN_OBJECT')
      .field('description', 'Test validation')
      .field('challenge_sequence', '1: Normal Meal | 2: Angle | 3: Receipt')
      .field('challenge_completed', 'true')
      .attach('images', buffer1, 'image1.jpg')
      .attach('images', buffer2, 'image2.jpg')
      .attach('images', buffer3, 'image3.jpg');

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.status, 'PENDING');
    assert.strictEqual(res.body.warning_state, null);
  });

  test('o) upload format: GIF image is accepted end-to-end', async () => {
    mockVerifyImageResult = {
      decision: 'FOOD_MATCH_PLAUSIBLE',
      reason: 'GIF upload test passed',
      food_match_result: 'food_match_plausible',
      issue_support_level: 'issue_supported_strong',
      contract_version: 1
    };
    mockOrdersForCustomer = [{ id: 100, status: 'DELIVERED', restaurant_id: 1, total_price: 150 }];
    mockUser = { id: 1, trust_score: 85 };
    mockComplaintFindByOrderId = null;
    mockOrderItems = [{ name: 'burger' }];
    lastCreatedComplaintData = null;

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('order_id', '100')
      .field('type', 'FOREIGN_OBJECT')
      .field('description', 'GIF test')
      .field('challenge_sequence', '1: Normal Meal | 2: Angle | 3: Receipt')
      .field('challenge_completed', 'true')
      .attach('images', buffer1, 'image1.gif')
      .attach('images', buffer2, 'image2.gif')
      .attach('images', buffer3, 'image3.gif');

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.status, 'PENDING');
  });

  test('p) upload format: WEBP image is accepted end-to-end', async () => {
    mockVerifyImageResult = {
      decision: 'FOOD_MATCH_PLAUSIBLE',
      reason: 'WEBP upload test passed',
      food_match_result: 'food_match_plausible',
      issue_support_level: 'issue_supported_strong',
      contract_version: 1
    };
    mockOrdersForCustomer = [{ id: 100, status: 'DELIVERED', restaurant_id: 1, total_price: 150 }];
    mockUser = { id: 1, trust_score: 85 };
    mockComplaintFindByOrderId = null;
    mockOrderItems = [{ name: 'burger' }];
    lastCreatedComplaintData = null;

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('order_id', '100')
      .field('type', 'FOREIGN_OBJECT')
      .field('description', 'WEBP test')
      .field('challenge_sequence', '1: Normal Meal | 2: Angle | 3: Receipt')
      .field('challenge_completed', 'true')
      .attach('images', buffer1, 'image1.webp')
      .attach('images', buffer2, 'image2.webp')
      .attach('images', buffer3, 'image3.webp');

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.status, 'PENDING');
  });

  test('q) upload format: invalid extension with valid mime is rejected', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('order_id', '100')
      .field('type', 'FOREIGN_OBJECT')
      .field('description', 'Invalid ext test')
      .field('challenge_sequence', '1: Normal Meal | 2: Angle | 3: Receipt')
      .field('challenge_completed', 'true')
      .attach('images', buffer1, { filename: 'image1.txt', contentType: 'image/png' })
      .attach('images', buffer2, { filename: 'image2.txt', contentType: 'image/png' })
      .attach('images', buffer3, { filename: 'image3.txt', contentType: 'image/png' });

    assert.strictEqual(res.status, 400);
    assert.match(res.body.message, /Only images.*are allowed/);
  });

  test('r) upload format: valid extension with invalid mime is rejected', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('order_id', '100')
      .field('type', 'FOREIGN_OBJECT')
      .field('description', 'Invalid mime test')
      .field('challenge_sequence', '1: Normal Meal | 2: Angle | 3: Receipt')
      .field('challenge_completed', 'true')
      .attach('images', buffer1, { filename: 'image1.png', contentType: 'text/plain' })
      .attach('images', buffer2, { filename: 'image2.png', contentType: 'text/plain' })
      .attach('images', buffer3, { filename: 'image3.png', contentType: 'text/plain' });

    assert.strictEqual(res.status, 400);
    assert.match(res.body.message, /Only images.*are allowed/);
  });
});

