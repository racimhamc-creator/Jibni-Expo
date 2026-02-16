import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import './config/database.js';
import { connectRedis } from './config/redis.js';
import { initializeSocket, getIO } from './services/socketManager.service.js';
import { setupSocketHandlers } from './services/socketHandlers.service.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import missionsRoutes from './routes/missions.routes.js';
import driversRoutes from './routes/drivers.routes.js';
import usersRoutes from './routes/users.routes.js';
import adminRoutes from './routes/admin.routes.js';
import adminDashboardRoutes from './routes/admin.dashboard.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import ridesRoutes from './routes/rides.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import testRoutes from './routes/test.routes.js';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());
// CORS configuration - allow multiple origins for development
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true, // Important: allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploads)
app.use('/uploads', express.static('public/uploads'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/missions', missionsRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/v1/admin', adminDashboardRoutes); // Legacy admin dashboard API
app.use('/api/v1/dashboard', dashboardRoutes); // New comprehensive dashboard API
app.use('/api/rides', ridesRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/test', testRoutes); // Temporary test routes

// Error handling
app.use(notFound);
app.use(errorHandler);

// Setup Socket.io with new architecture
const io = initializeSocket(httpServer);

// Setup socket connection handlers
io.on('connection', (socket) => {
  setupSocketHandlers(socket);
});

// Start server
const PORT = process.env.PORT || 8000;

const startServer = async () => {
  try {
    await connectRedis();
    
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Socket.io ready for real-time ride matching`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
