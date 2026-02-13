import { io, Socket } from 'socket.io-client';
import { Mission } from '@/types/mission';
import { LocationData } from '@/types/location';

// Socket URL - should match API URL
// For physical device: Use your computer's IP address (e.g., http://192.168.1.33:8000)
// For emulator/simulator: Use localhost (http://localhost:8000)
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://192.168.1.33:8000';

class SocketService {
  private serverSocket: Socket | null = null;
  private missionSocket: Socket | null = null;
  private token: string | null = null;

  connectServer(token: string): Socket {
    this.token = token;
    
    if (this.serverSocket?.connected) {
      return this.serverSocket;
    }

    this.serverSocket = io(`${SOCKET_URL}/server`, {
      auth: { token },
      transports: ['websocket'],
    });

    return this.serverSocket;
  }

  connectMissions(token: string): Socket {
    this.token = token;
    
    if (this.missionSocket?.connected) {
      return this.missionSocket;
    }

    this.missionSocket = io(`${SOCKET_URL}/missions`, {
      auth: { token },
      transports: ['websocket'],
    });

    return this.missionSocket;
  }

  // Server namespace - Driver location updates
  sendHeartbeat(location: LocationData): void {
    if (this.serverSocket?.connected) {
      this.serverSocket.emit('heartbeat', {
        lat: location.lat,
        lng: location.lng,
        heading: location.heading,
      });
    }
  }

  onConnectionEstablished(callback: (data: { userId: string }) => void): void {
    this.serverSocket?.on('connection_established', callback);
  }

  // Missions namespace - Mission requests/responses
  requestMission(data: {
    driverId: string;
    pickupLocation: { lat: number; lng: number; address: string };
    destinationLocation: { lat: number; lng: number; address: string };
    vehicleType?: string;
  }): void {
    if (this.missionSocket?.connected) {
      this.missionSocket.emit('mission_request', data);
    }
  }

  onNewMission(callback: (mission: Mission) => void): void {
    this.missionSocket?.on('new_mission', callback);
  }

  respondToMission(missionId: string, action: 'accept' | 'reject'): void {
    if (this.missionSocket?.connected) {
      this.missionSocket.emit('mission_response', { missionId, action });
    }
  }

  onMissionAccepted(callback: (mission: Mission) => void): void {
    this.missionSocket?.on('mission_accepted', callback);
  }

  onMissionRejected(callback: (data: { missionId: string }) => void): void {
    this.missionSocket?.on('mission_rejected', callback);
  }

  onMissionCompleted(callback: (mission: Mission) => void): void {
    this.missionSocket?.on('mission_completed', callback);
  }

  disconnect(): void {
    this.serverSocket?.disconnect();
    this.missionSocket?.disconnect();
    this.serverSocket = null;
    this.missionSocket = null;
  }
}

export const socketService = new SocketService();
