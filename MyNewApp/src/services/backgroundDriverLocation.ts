import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { io } from 'socket.io-client';
import { storage } from './storage';
import { api } from './api';

const TASK_NAME = 'JIBNI_DRIVER_LOCATION_TASK';

function getSocketUrl(): string {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  const PRODUCTION_URL = 'https://jibni-new-production.up.railway.app';
  if (!apiUrl || apiUrl.includes('${secrets.') || !apiUrl.startsWith('http')) return PRODUCTION_URL;
  return apiUrl;
}

async function emitLocationUpdate(lat: number, lng: number, heading?: number) {
  const token = await storage.getToken();
  if (!token) return;

  // Create a short-lived socket connection and emit the SAME event used in foreground.
  // This avoids changing backend logic and keeps compatibility with existing socket flow.
  const socketUrl = getSocketUrl();
  const socket = io(socketUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: false,
    timeout: 15000,
  });

  return new Promise<void>((resolve) => {
    socket.on('connect', () => {
      socket.emit('location_update', { lat, lng, heading });
      socket.disconnect();
      resolve();
    });
    socket.on('connect_error', () => {
      socket.disconnect();
      resolve();
    });
  });
}

async function persistLocationToDatabase(lat: number, lng: number, heading?: number) {
  try {
    await api.updateDriverLocation({ lat, lng, heading });
    console.log('💾 Background location persisted to database');
  } catch (error) {
    console.error('❌ Failed to persist background location to database:', error);
  }
}

TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('❌ Background driver location task error:', error);
    return;
  }

  try {
    const enabled = await storage.getDriverBgTrackingEnabled();
    if (!enabled) return;

    const locations = (data as any)?.locations as Location.LocationObject[] | undefined;
    const latest = locations?.[locations.length - 1];
    if (!latest) return;

    const { latitude, longitude, heading } = latest.coords;
    console.log('Background driver location update:', { latitude, longitude, heading });

    // Emit to socket for real-time updates
    await emitLocationUpdate(latitude, longitude, heading ?? undefined);
    
    // Also persist to database for persistence across app restarts
    await persistLocationToDatabase(latitude, longitude, heading ?? undefined);
  } catch (e: any) {
    console.error('❌ Background driver location task failed:', e?.message || e);
  }
});

export async function startDriverBackgroundLocationUpdates() {
  // Check permissions first
  let fg = await Location.getForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') {
      console.warn('⚠️ Foreground location permission not granted');
      return;
    }
  }

  let bg = await Location.getBackgroundPermissionsAsync();
  if (bg.status !== 'granted') {
    bg = await Location.requestBackgroundPermissionsAsync();
    if (bg.status !== 'granted') {
      console.warn('⚠️ Background location permission not granted');
      return;
    }
  }

  const hasStarted = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
  if (hasStarted) return;

  await Location.startLocationUpdatesAsync(TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 5000,
    distanceInterval: 10,
    // Android foreground service is required for more reliable background tracking
    foregroundService: {
      notificationTitle: 'Jibni',
      notificationBody: 'Updating driver location in background',
    },
    pausesUpdatesAutomatically: false,
  });

  console.log('✅ Started background driver location updates');
}

export async function stopDriverBackgroundLocationUpdates() {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
  if (!hasStarted) return;
  await Location.stopLocationUpdatesAsync(TASK_NAME);
  console.log('🛑 Stopped background driver location updates');
}

