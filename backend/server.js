require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { initSchema } = require('./db/schema');

const app = express();
const server = http.createServer(app);

// CORS configuration - allow all origins dynamically
app.use(cors({
  origin: true, // Reflects the request origin, fully supporting credentials and all domains
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());
app.use(express.json());

// Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

// Make io accessible to routes
app.set('io', io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join_match', (matchId) => {
    socket.join(`match:${matchId}`);
    console.log(`Socket ${socket.id} joined match:${matchId}`);
  });

  socket.on('leave_match', (matchId) => {
    socket.leave(`match:${matchId}`);
    console.log(`Socket ${socket.id} left match:${matchId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/public'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'AH6 Cricket Backend' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Validate required env vars
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is required');
      process.exit(1);
    }
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET environment variable is required');
      process.exit(1);
    }
    if (!process.env.SCORER_EMAIL || !process.env.SCORER_PASSWORD) {
      console.error('❌ SCORER_EMAIL and SCORER_PASSWORD environment variables are required');
      process.exit(1);
    }

    // Initialize database schema
    await initSchema();

    server.listen(PORT, () => {
      console.log(`\n🏏 AH6 Cricket Backend running on port ${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/health`);
      console.log(`   Scorer: ${process.env.SCORER_EMAIL}\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
