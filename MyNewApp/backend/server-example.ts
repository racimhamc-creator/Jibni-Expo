// Backend Server Integration Example
// =====================================
// Add this to your Express server main file (e.g., index.ts or app.ts)
//
// This shows how to integrate the driverRoutes and set up socket.io
// =====================================

import express from 'express';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import your models
import { User } from './models/User';
import { Ride } from './models/Ride';

// Import driver routes
import driverRoutes, { setSocketIO } from './routes/driverRoutes';

// =====================================
// 1. SETUP EXPRESS APP
// =====================================
const app = express();
app.use(express.json());

// =====================================
// 2. CONNECT TO MONGODB
// =====================================
// Replace with your MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jibni';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// =====================================
// 3. REGISTER ROUTES
// =====================================
// Register the driver arrival route
// This makes POST /api/driver/arrived available
app.use('/api', driverRoutes);

// Add other routes as needed
// app.use('/api/users', userRoutes);
// app.use('/api/rides', ridesRoutes);

// =====================================
// 4. SETUP SOCKET.IO
// =====================================
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Pass socket.io instance to driver routes
// This enables the server to emit driver_arrived events
setSocketIO(io);

// =====================================
// 5. SOCKET.IO CONNECTION HANDLING
// =====================================
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // Join ride room
  socket.on('join_ride', (rideId: string) => {
    console.log(`📱 Client ${socket.id} joining ride room:`, rideId);
    socket.join(rideId);
  });

  // Leave ride room
  socket.on('leave_ride', (rideId: string) => {
    console.log(`📱 Client ${socket.id} leaving ride room:`, rideId);
    socket.leave(rideId);
  });

  // Handle driver location updates
  socket.on('driver_location', (data: {
    rideId: string;
    lat: number;
    lng: number;
    heading?: number;
  }) => {
    // Broadcast to passenger in the same ride room
    socket.to(data.rideId).emit('driver_location_update', data);
  });

  // Handle driver arrived
  socket.on('driver_arrived', (data: {
    rideId: string;
    driverLat?: number;
    driverLng?: number;
    gpsAccuracy?: number;
    distance?: number;
  }) => {
    console.log('🚗 Driver arrived via socket:', data.rideId);
    // Broadcast to passenger
    socket.to(data.rideId).emit('driver_arrived', data);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// =====================================
// 6. START SERVER
// =====================================
const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Driver arrival endpoint: POST /api/driver/arrived`);
});

// =====================================
// TEST THE ENDPOINT
// =====================================
// You can test with curl:
//
// curl -X POST http://localhost:3000/api/driver/arrived \
//   -H "Content-Type: application/json" \
//   -d '{
//     "rideId": "ride123",
//     "driverLat": 36.7538,
//     "driverLng": 3.0588,
//     "gpsAccuracy": 10,
//     "distance": 25
//   }'
//
// Expected response (if driver is within threshold):
// {
//   "success": true,
//   "validated": true,
//   "serverDistance": 25,
//   "threshold": 50,
//   "status": "driver_arrived"
// }
