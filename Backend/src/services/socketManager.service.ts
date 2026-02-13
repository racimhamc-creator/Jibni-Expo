import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyToken } from '../middleware/auth.middleware.js';

let io: SocketServer | null = null;

export const initializeSocket = (httpServer: HTTPServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = await verifyToken(token);
      socket.data.userId = decoded.userId;
      socket.data.role = decoded.role;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  console.log('✅ Socket.io initialized');
  return io;
};

export const getIO = (): SocketServer => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Join user to their role-specific room
export const joinUserRoom = (socket: Socket): void => {
  const { userId, role } = socket.data;
  
  // Join user-specific room
  socket.join(`user:${userId}`);
  
  // Join role-specific room
  if (role === 'driver') {
    socket.join('drivers');
  } else {
    socket.join('clients');
  }
  
  console.log(`👤 User ${userId} (${role}) joined rooms`);
};

// Get socket instance by ID
export const getSocketById = (socketId: string): Socket | undefined => {
  if (!io) return undefined;
  return io.sockets.sockets.get(socketId);
};

// Check if user is connected
export const isUserConnected = async (userId: string): Promise<boolean> => {
  if (!io) return false;
  const sockets = await io.in(`user:${userId}`).allSockets();
  return sockets.size > 0;
};

// Emit to specific user
export const emitToUser = (userId: string, event: string, data: any): void => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
};

// Emit to all drivers
export const emitToDrivers = (event: string, data: any): void => {
  if (!io) return;
  io.to('drivers').emit(event, data);
};

// Emit to all clients
export const emitToClients = (event: string, data: any): void => {
  if (!io) return;
  io.to('clients').emit(event, data);
};
