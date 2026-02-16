import { Server as HTTPServer } from 'http';
import { Server as SocketServer, Namespace } from 'socket.io';
import { redisClient } from './redis.js';
import { verifyToken } from '../middleware/auth.middleware.js';

export const setupSocket = (httpServer: HTTPServer): {
  serverNamespace: Namespace;
  missionNamespace: Namespace;
} => {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Server namespace for driver location updates
  const serverNamespace = io.of('/server');
  
  serverNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }
      
      const decoded = await verifyToken(token);
      socket.data.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  serverNamespace.on('connection', (socket) => {
    const userId = socket.data.userId;
    console.log(`Driver connected: ${userId}`);
    
    socket.emit('connection_established', { userId });

    socket.on('heartbeat', async (data: { lat: number; lng: number; heading?: number }) => {
      // Store location in Redis
      const locationKey = `driver:${userId}`;
      const locationData = {
        lat: data.lat,
        lng: data.lng,
        heading: data.heading,
        timestamp: Date.now(),
      };
      
      await redisClient.setEx(
        locationKey,
        60, // TTL: 60 seconds
        JSON.stringify(locationData)
      );
    });

    socket.on('disconnect', () => {
      console.log(`Driver disconnected: ${userId}`);
    });
  });

  // Missions namespace for mission requests/responses
  const missionNamespace = io.of('/missions');
  
  missionNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }
      
      const decoded = await verifyToken(token);
      socket.data.userId = decoded.userId;
      socket.data.role = decoded.role;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  missionNamespace.on('connection', (socket) => {
    const userId = socket.data.userId;
    const role = socket.data.role;
    console.log(`User connected to missions: ${userId} (${role})`);

    socket.on('mission_request', async (data) => {
      // Emit to specific driver
      missionNamespace.to(`driver:${data.driverId}`).emit('new_mission', data);
    });

    socket.on('mission_response', async (data: { missionId: string; action: 'accept' | 'reject' }) => {
      // Handle mission response
      // This will be handled by the mission controller
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected from missions: ${userId}`);
    });
  });

  return { serverNamespace, missionNamespace };
};
