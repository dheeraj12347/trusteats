const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { testConnection } = require('./config/db');
const { startOrderCleanupJob } = require('./cron/orderCleanup'); // NEW

const PORT = process.env.PORT || 5000;

// Test DB connection once at startup
testConnection();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*', // change to your frontend origin in production
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Socket namespaces/rooms
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  // Restaurant joins its own room
  socket.on('joinRestaurantRoom', ({ restaurantId }) => {
    if (!restaurantId) return;
    const room = `restaurant_${restaurantId}`;
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
  });

  socket.on('leaveRestaurantRoom', ({ restaurantId }) => {
    if (!restaurantId) return;
    const room = `restaurant_${restaurantId}`;
    socket.leave(room);
    console.log(`Socket ${socket.id} left room ${room}`);
  });

  // Customer joins their own room
  socket.on('joinCustomerRoom', ({ customerId }) => {
    if (!customerId) return;
    const room = `customer_${customerId}`;
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
  });

  socket.on('leaveCustomerRoom', ({ customerId }) => {
    if (!customerId) return;
    const room = `customer_${customerId}`;
    socket.leave(room);
    console.log(`Socket ${socket.id} left room ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Make io available to routes/services
app.set('io', io);

// Start background cleanup job (cron)
startOrderCleanupJob(); // NEW

// Start server
server.listen(PORT, () => {
  console.log(`🚀 TrustEats backend running on port ${PORT}`);
});
