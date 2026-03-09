import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import { storage } from './storage';

// Socket URL configuration
// Uses the same EXPO_PUBLIC_API_URL from .env file

const getSocketUrl = (): string => {
  // Try environment variable first
  let apiUrl = process.env.EXPO_PUBLIC_API_URL;
  
  // Hardcoded production URL (used for local builds)
  const PRODUCTION_URL = 'https://jibni-new-production.up.railway.app';
  
  // Fallback to hardcoded production URL if:
  // - env var not set
  // - env var contains ${secrets. (unresolved secret)
  // - env var is not a valid URL
  if (!apiUrl || apiUrl.includes('${secrets.') || !apiUrl.startsWith('http')) {
    apiUrl = PRODUCTION_URL;
    console.log('⚠️ Using hardcoded production URL for socket:', apiUrl);
  } else {
    console.log('🔌 Using Socket URL from environment:', apiUrl);
  }
  
  return apiUrl;
};

const SOCKET_URL = getSocketUrl();

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async connect(): Promise<void> {
    try {
      const token = await storage.getToken();
      
      if (!token) {
        console.error('❌ No token found for socket connection');
        return;
      }

      this.socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5,
        timeout: 20000,
        pingTimeout: 60000,
        pingInterval: 25000,
      });

      this.setupListeners();
      
      console.log('🔌 Socket connecting to:', SOCKET_URL);
    } catch (error) {
      console.error('❌ Socket connection error:', error);
    }
  }

  private onConnectCallback?: () => void;
  private onDriverFoundCallback?: (data: any) => void;
  private onDriverLocationUpdateCallback?: (data: any) => void;
  private onRideStartedCallback?: (data: any) => void;
  private onRideCompletedCallback?: (data: any) => void;
  private onDriverArrivedCallback?: (data: any) => void;
  private onDriverApprovedCallback?: (data: any) => void;
  private onDriverRejectedCallback?: (data: any) => void;
  private onCompletionRequestCallback?: (data: any) => void;
  private onCompletionDeniedCallback?: (data: any) => void;
  private onRideCancelledByDriverCallback?: (data: any) => void;
  private driverOnlineData?: { location: { lat: number; lng: number; heading?: number }; vehicleType?: string; fcmToken?: string };

  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      
      // If driver was online, re-register after reconnect
      if (this.driverOnlineData) {
        console.log('🔄 Re-registering driver after reconnect');
        this.emit('driver_online', this.driverOnlineData);
      }
      
      this.onConnectCallback?.();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ Max reconnection attempts reached');
        this.disconnect();
      }
    });

    this.socket.on('driver_online_confirmed', (data) => {
      console.log('✅ Driver online confirmed:', data);
    });

    // Client events
    this.socket.on('ride_searching', (data) => {
      console.log('🔍 Ride searching:', data);
    });

    this.socket.on('driver_found', (data) => {
      console.log('🚗 Driver found:', data);
      this.onDriverFoundCallback?.(data);
    });

    this.socket.on('driver_location_update', (data) => {
      console.log('📍 Driver location:', data);
      this.onDriverLocationUpdateCallback?.(data);
    });

    this.socket.on('no_driver_found', (data) => {
      console.log('❌ No driver found:', data);
    });

    this.socket.on('ride_cancelled_by_driver', (data) => {
      console.log('🚫 Ride cancelled by driver:', data);
      this.onRideCancelledByDriverCallback?.(data);
    });

    // Driver events
    this.socket.on('ride_request', (data) => {
      console.log('📨 New ride request:', data);
    });

    this.socket.on('ride_accepted_confirmed', (data) => {
      console.log('✅ Ride accepted:', data);
    });

    this.socket.on('ride_rejected_confirmed', (data) => {
      console.log('❌ Ride rejected:', data);
    });

    this.socket.on('ride_timeout', (data) => {
      console.log('⏱️ Ride timeout:', data);
    });

    this.socket.on('driver_arrived', (data) => {
      console.log('🚗 Driver arrived event:', data);
      this.onDriverArrivedCallback?.(data);
    });

    this.socket.on('ride_started', (data) => {
      console.log('🚀 Ride started event:', data);
      this.onRideStartedCallback?.(data);
    });

    this.socket.on('ride_completed', (data) => {
      console.log('✅ Ride completed event:', data);
      this.onRideCompletedCallback?.(data);
    });

    this.socket.on('ride_cancelled_by_client', (data) => {
      console.log('🚫 Ride cancelled by client:', data);
    });

    this.socket.on('ride_completion_requested', (data) => {
      console.log('🏁 Ride completion requested:', data);
      this.onCompletionRequestCallback?.(data);
    });

    this.socket.on('ride_completion_denied', (data) => {
      console.log('❌ Ride completion denied by client:', data);
      this.onCompletionDeniedCallback?.(data);
    });

    // Driver approval events
    this.socket.on('driver_approved', (data) => {
      console.log('🎉 Driver approved:', data);
      this.onDriverApprovedCallback?.(data);
    });

    this.socket.on('driver_rejected', (data) => {
      console.log('❌ Driver rejected:', data);
      this.onDriverRejectedCallback?.(data);
    });
  }

  // Emit events
  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      console.log(`📤 Emitting ${event}:`, data);
      this.socket.emit(event, data);
    } else {
      console.warn('⚠️ Socket not connected, cannot emit:', event);
    }
  }

  // Listen to events
  on(event: string, callback: (data: any) => void): void {
    this.socket?.on(event, callback);
  }

  // Remove listener
  off(event: string, callback?: (data: any) => void): void {
    this.socket?.off(event, callback);
  }

  // Join ride room
  joinRideRoom(rideId: string): void {
    this.emit('join_ride_room', { rideId });
  }

  // Leave ride room
  leaveRideRoom(rideId: string): void {
    this.emit('leave_ride_room', { rideId });
  }

  // Client: Request a ride
  requestRide(data: {
    pickupLocation: { lat: number; lng: number; address: string };
    destinationLocation: { lat: number; lng: number; address: string };
    vehicleType: 'moto' | 'car' | 'truck' | 'van';
    pricing: { basePrice: number; distancePrice: number; totalPrice: number };
    distance: { clientToDestination: number };
    eta: { clientToDestination: number };
  }): void {
    this.emit('request_ride', data);
  }

  // Client: Cancel ride
  cancelRide(rideId: string, reason?: string): void {
    this.emit('client_cancel_ride', { rideId, reason });
  }

  // Driver: Come online
  driverOnline(location: { lat: number; lng: number; heading?: number }, vehicleType?: string, fcmToken?: string): void {
    this.driverOnlineData = { location, vehicleType, fcmToken };
    this.emit('driver_online', { location, vehicleType, fcmToken });
    console.log('📤 Emitted driver_online:', { location, vehicleType });
  }

  // Driver: Update location
  updateLocation(location: { lat: number; lng: number; heading?: number }): void {
    this.emit('location_update', location);
  }

  // Driver: Accept ride
  acceptRide(rideId: string): void {
    this.emit('accept_ride', { rideId });
  }

  // Driver: Reject ride
  rejectRide(rideId: string): void {
    this.emit('reject_ride', { rideId });
  }

  // Driver: Cancel ride
  driverCancelRide(rideId: string, reason?: string): void {
    this.emit('driver_cancel_ride', { rideId, reason });
  }

  // Driver: Mark arrived at pickup
  driverArrived(rideId: string): void {
    this.emit('driver_arrived', { rideId });
  }

  // Driver: Start ride
  startRide(rideId: string): void {
    console.log(`📤🚀 startRide called - connected: ${this.isConnected()}, rideId: ${rideId}`);
    this.emit('start_ride', { rideId });
  }

  // Driver: Complete ride (direct - used for force complete after client denies)
  completeRide(rideId: string): void {
    this.emit('complete_ride', { rideId });
  }

  // Driver: Request ride completion (asks client to confirm first)
  requestCompleteRide(rideId: string): void {
    this.emit('request_complete_ride', { rideId });
  }

  // Client: Confirm ride completion
  confirmCompleteRide(rideId: string): void {
    this.emit('confirm_complete_ride', { rideId });
  }

  // Client: Deny ride completion
  denyCompleteRide(rideId: string): void {
    this.emit('deny_complete_ride', { rideId });
  }

  // Update FCM token
  updateFCMToken(token: string): void {
    this.emit('update_fcm_token', { token });
  }

  // Disconnect
  disconnect(): void {
    this.driverOnlineData = undefined; // Clear driver data
    this.socket?.disconnect();
    this.socket = null;
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Register callbacks for app-level event handling
  onDriverFound(callback: (data: any) => void): void {
    this.onDriverFoundCallback = callback;
  }

  onDriverLocationUpdate(callback: (data: any) => void): void {
    this.onDriverLocationUpdateCallback = callback;
  }

  offDriverLocationUpdate(callback?: (data: any) => void): void {
    this.onDriverLocationUpdateCallback = undefined;
  }

  onRideStarted(callback: (data: any) => void): void {
    this.onRideStartedCallback = callback;
  }

  onRideCompleted(callback: (data: any) => void): void {
    this.onRideCompletedCallback = callback;
  }

  onDriverArrived(callback: (data: any) => void): void {
    this.onDriverArrivedCallback = callback;
  }

  onRideCancelledByDriver(callback: (data: any) => void): void {
    this.onRideCancelledByDriverCallback = callback;
  }

  onDriverApproved(callback: (data: any) => void): void {
    this.onDriverApprovedCallback = callback;
  }

  onDriverRejected(callback: (data: any) => void): void {
    this.onDriverRejectedCallback = callback;
  }

  onCompletionRequest(callback: (data: any) => void): void {
    this.onCompletionRequestCallback = callback;
  }

  onCompletionDenied(callback: (data: any) => void): void {
    this.onCompletionDeniedCallback = callback;
  }
}

export const socketService = new SocketService();
