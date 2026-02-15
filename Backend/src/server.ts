import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
import ridesRoutes from './routes/rides.routes.js';
import testRoutes from './routes/test.routes.js';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.use('/api/v1/admin', adminDashboardRoutes); // New admin dashboard API
app.use('/api/rides', ridesRoutes);
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
