const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

// Set JWT secret for tests
process.env.JWT_SECRET = 'test_secret_for_integration_testing';

// Mock DB pool and models before requiring app
const { pool } = require('../src/config/db');
const UserModel = require('../src/models/user.model');
const OrderModel = require('../src/models/order.model');
const ComplaintModel = require('../src/models/complaint.model');

// In-memory mock database state
let mockUsers = {};
let mockOrders = {};
let mockComplaints = {};
let mockRestaurants = {
  1: { id: 1, name: 'Burger House' },
  2: { id: 2, name: 'Pizza Point' },
  3: { id: 3, name: 'Desi Tadka' },
  4: { id: 4, name: 'Chinese Wok' }
};

// Mock DB Pool connections
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

// Override UserModel queries
UserModel.create = async ({ name, email, password, role, restaurant_id }) => {
  const id = Object.keys(mockUsers).length + 1;
  const user = {
    id,
    name,
    email,
    password,
    role,
    trust_score: 100,
    restaurant_id: restaurant_id || null
  };
  mockUsers[id] = user;
  return user;
};

UserModel.findByEmail = async (email) => {
  return Object.values(mockUsers).find(u => u.email === email) || null;
};

UserModel.findById = async (id) => {
  return mockUsers[id] || null;
};

// Override OrderModel queries
OrderModel.findById = async (id) => {
  return mockOrders[id] || null;
};

OrderModel.getOrdersForRestaurant = async (restaurantId) => {
  return Object.values(mockOrders).filter(o => o.restaurant_id === Number(restaurantId));
};

OrderModel.updateStatus = async (orderId, status) => {
  if (mockOrders[orderId]) {
    mockOrders[orderId].status = status;
    return true;
  }
  return false;
};

// Override ComplaintModel queries
ComplaintModel.listForRestaurant = async (restaurantId) => {
  return Object.values(mockComplaints).filter(c => c.restaurant_id === Number(restaurantId));
};

// Stub DB queries for controller and helper routes
pool.query = async (sql, values) => {
  if (sql.includes('SELECT id FROM restaurants WHERE id = ?')) {
    const id = values[0];
    return [mockRestaurants[id] ? [mockRestaurants[id]] : []];
  }
  return [[]];
};

// Require app after stubs
const request = require('supertest');
const app = require('../src/app');

// Stub io
app.set('io', {
  emit: () => {},
  to: () => ({ emit: () => {} })
});

describe('Restaurant Access Isolation & Multi-login Integration Tests', () => {
  const tokenCustomer = jwt.sign({ id: 99, role: 'CUSTOMER' }, 'test_secret_for_integration_testing');

  // Reset in-memory database before each test
  beforeEach(() => {
    mockUsers = {
      1: {
        id: 1,
        name: 'Burger Owner',
        email: 'burgerhouse@example.com',
        password: '$2b$10$abcdefghijklmnopqrstuv', // pre-hashed placeholder
        role: 'RESTAURANT',
        trust_score: 100,
        restaurant_id: 1
      },
      2: {
        id: 2,
        name: 'Pizza Owner',
        email: 'pizzapoint@example.com',
        password: '$2b$10$abcdefghijklmnopqrstuv', // pre-hashed placeholder
        role: 'RESTAURANT',
        trust_score: 100,
        restaurant_id: 2
      }
    };

    mockOrders = {
      101: { id: 101, customer_id: 99, restaurant_id: 1, status: 'PLACED', total_price: 150 },
      102: { id: 102, customer_id: 99, restaurant_id: 2, status: 'PLACED', total_price: 250 }
    };

    mockComplaints = {
      1: { id: 1, order_id: 101, customer_id: 99, restaurant_id: 1, status: 'PENDING' },
      2: { id: 2, order_id: 102, customer_id: 99, restaurant_id: 2, status: 'PENDING' }
    };
  });

  const getRestaurantToken = (userId) => {
    const user = mockUsers[userId];
    return jwt.sign(
      { id: user.id, role: user.role, restaurant_id: user.restaurant_id },
      'test_secret_for_integration_testing'
    );
  };

  test('1) register restaurant validates invalid restaurant_id', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Invalid Owner',
        email: 'invalid@example.com',
        password: 'password123',
        role: 'RESTAURANT',
        restaurant_id: 999 // non-existent
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.message, 'Invalid restaurant_id');
  });

  test('2) register restaurant succeeds with valid restaurant_id', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Tadka Owner',
        email: 'desitadka@example.com',
        password: 'password123',
        role: 'RESTAURANT',
        restaurant_id: 3 // Desi Tadka exists in mockRestaurants
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.user.restaurant_id, 3);
    assert.strictEqual(res.body.user.role, 'RESTAURANT');

    // Decode generated token to ensure restaurant_id is embedded
    const payload = jwt.verify(res.body.token, 'test_secret_for_integration_testing');
    assert.strictEqual(payload.restaurant_id, 3);
  });

  test('3) login returns correct restaurant_id and tokens', async () => {
    // Stub bcrypt compare to always succeed for testing login
    const originalCompare = require('bcrypt').compare;
    require('bcrypt').compare = async () => true;

    try {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'pizzapoint@example.com',
          password: 'password123'
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.user.restaurant_id, 2);

      // Verify JWT contains restaurant_id
      const payload = jwt.verify(res.body.token, 'test_secret_for_integration_testing');
      assert.strictEqual(payload.restaurant_id, 2);
    } finally {
      require('bcrypt').compare = originalCompare;
    }
  });

  test('4) restaurant-scoped orders access: cannot view other restaurant orders', async () => {
    const tokenRest1 = getRestaurantToken(1); // Burger House (restaurant_id: 1)

    // Allowed to view restaurant 1 orders
    const res1 = await request(app)
      .get('/api/orders/restaurant/1')
      .set('Authorization', `Bearer ${tokenRest1}`);
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.body.orders.length, 1);
    assert.strictEqual(res1.body.orders[0].id, 101);

    // Forbidden from viewing restaurant 2 orders
    const res2 = await request(app)
      .get('/api/orders/restaurant/2')
      .set('Authorization', `Bearer ${tokenRest1}`);
    assert.strictEqual(res2.status, 403);
    assert.strictEqual(res2.body.message, 'Forbidden');
  });

  test('5) restaurant-scoped complaints access: cannot view other restaurant complaints', async () => {
    const tokenRest1 = getRestaurantToken(1); // Burger House (restaurant_id: 1)

    // Allowed to view restaurant 1 complaints
    const res1 = await request(app)
      .get('/api/complaints/restaurant/1')
      .set('Authorization', `Bearer ${tokenRest1}`);
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.body.complaints.length, 1);
    assert.strictEqual(res1.body.complaints[0].id, 1);

    // Forbidden from viewing restaurant 2 complaints
    const res2 = await request(app)
      .get('/api/complaints/restaurant/2')
      .set('Authorization', `Bearer ${tokenRest1}`);
    assert.strictEqual(res2.status, 403);
    assert.strictEqual(res2.body.message, 'Forbidden');
  });

  test('6) forbidden cross-restaurant status updates', async () => {
    const tokenRest1 = getRestaurantToken(1); // Burger House (restaurant_id: 1)

    // Allowed to update status of restaurant 1 order
    const res1 = await request(app)
      .put('/api/orders/101/status')
      .set('Authorization', `Bearer ${tokenRest1}`)
      .send({ status: 'PREPARING' });
    assert.strictEqual(res1.status, 200);

    // Forbidden from updating status of restaurant 2 order
    const res2 = await request(app)
      .put('/api/orders/102/status')
      .set('Authorization', `Bearer ${tokenRest1}`)
      .send({ status: 'PREPARING' });
    assert.strictEqual(res2.status, 403);
    assert.strictEqual(res2.body.message, 'Forbidden');
  });

  test('7) duplicate seeding check (logic validation)', async () => {
    // Logic check mimicking seed_restaurants.js
    const simulateSeedCheck = (seeds, existingUsers) => {
      const skipped = [];
      const inserted = [];
      for (const item of seeds) {
        const emailExists = existingUsers.some(u => u.email === item.email);
        const restExists = existingUsers.some(u => u.restaurant_id === item.restaurant_id);

        if (emailExists || restExists) {
          skipped.push(item.restaurant_id);
        } else {
          inserted.push(item.restaurant_id);
        }
      }
      return { skipped, inserted };
    };

    const seeds = [
      { email: 'tadka@example.com', restaurant_id: 3 },
      { email: 'chinesewok@example.com', restaurant_id: 4 }
    ];

    // Case A: Fresh DB -> inserts all
    const result1 = simulateSeedCheck(seeds, []);
    assert.deepEqual(result1.inserted, [3, 4]);
    assert.deepEqual(result1.skipped, []);

    // Case B: Duplicate -> skips duplicates
    const existing = [
      { email: 'tadka@example.com', restaurant_id: 3 }
    ];
    const result2 = simulateSeedCheck(seeds, existing);
    assert.deepEqual(result2.inserted, [4]);
    assert.deepEqual(result2.skipped, [3]);
  });
});
