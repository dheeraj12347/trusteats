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

  test('a) face present -> AUTO_REJECTED / BLOCKED', async () => {
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
    assert.strictEqual(lastCreatedComplaintData.warning_state, 'BLOCKED');
    assert.strictEqual(lastCreatedComplaintData.face_detected, 1);
    assert.strictEqual(lastCreatedComplaintData.verifier_decision, 'REJECT_FACE_PRESENT');
  });

  test('b) non-food low confidence -> AUTO_REJECTED / BLOCKED', async () => {
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
    assert.strictEqual(lastCreatedComplaintData.warning_state, 'BLOCKED');
    assert.strictEqual(lastCreatedComplaintData.predicted_label, 'carrot_cake');
    assert.strictEqual(lastCreatedComplaintData.prediction_confidence, 0.04);
  });

  test('c) mismatch first attempt -> PENDING / WARNING_SENT / mismatch_attempts=1', async () => {
    // Setup stubs
    mockVerifyImageResult = {
      decision: 'FOOD_MISMATCH',
      reason: 'Warning: Captured food (hamburger) does not match the ordered item.',
      face_detected: false,
      confidence: 0.85,
      suspicious_capture: false,
      is_ai_generated: false,
      predicted_label: 'hamburger',
      prediction_confidence: 0.85
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
      .field('description', 'Mismatch food')
      .field('challenge_sequence', '1: Normal Meal | 2: Angle | 3: Receipt')
      .field('challenge_completed', 'true')
      .attach('images', buffer1, 'image1.jpg')
      .attach('images', buffer2, 'image2.jpg')
      .attach('images', buffer3, 'image3.jpg');

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.status, 'PENDING');
    assert.strictEqual(res.body.warning_state, 'WARNING_SENT');
    assert.strictEqual(lastCreatedComplaintData.warning_state, 'WARNING_SENT');
    assert.strictEqual(lastCreatedComplaintData.mismatch_attempts, 1);
  });

  test('d) mismatch retry -> AUTO_REJECTED / BLOCKED / mismatch_attempts=2', async () => {
    // Setup stubs
    mockVerifyImageResult = {
      decision: 'FOOD_MISMATCH',
      reason: 'Rejected: Repeated mismatch - captured food (hamburger) does not match.',
      face_detected: false,
      confidence: 0.82,
      suspicious_capture: false,
      is_ai_generated: false,
      predicted_label: 'hamburger',
      prediction_confidence: 0.82
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
    mockOrderItems = [{ name: 'pizza' }];
    lastCreatedComplaintData = null;
    lastUpdatedComplaintId = null;
    lastUpdatedComplaintData = null;

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('order_id', '100')
      .field('type', 'QUALITY_ISSUE')
      .field('description', 'Mismatch food retry')
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

  test('e) plausible match -> PENDING / PASSED', async () => {
    // Setup stubs
    mockVerifyImageResult = {
      decision: 'FOOD_MATCH_PLAUSIBLE',
      reason: 'Verification passed: Plausible food match detected (pizza).',
      face_detected: false,
      confidence: 0.96,
      suspicious_capture: false,
      is_ai_generated: false,
      predicted_label: 'pizza',
      prediction_confidence: 0.96
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
      .field('description', 'Perfect pizza')
      .field('challenge_sequence', '1: Normal Meal | 2: Angle | 3: Receipt')
      .field('challenge_completed', 'true')
      .attach('images', buffer1, 'image1.jpg')
      .attach('images', buffer2, 'image2.jpg')
      .attach('images', buffer3, 'image3.jpg');

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.status, 'PENDING'); // No Auto-Approval policy test!
    assert.strictEqual(lastCreatedComplaintData.warning_state, 'PASSED');
    assert.strictEqual(lastCreatedComplaintData.predicted_label, 'pizza');
    assert.strictEqual(lastCreatedComplaintData.prediction_confidence, 0.96);
  });
});
