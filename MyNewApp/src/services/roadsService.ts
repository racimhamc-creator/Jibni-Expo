import { api } from './api';
import { LocationCoord } from './directions';
import axios from 'axios';

// Google Roads API configuration
const GOOGLE_ROADS_API_URL = 'https://roads.googleapis.com/v1/nearestRoads';
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export interface SnappedPoint extends LocationCoord {
  heading: number;
  routeIndex: number;
  distanceMeters: number;
}

export interface NearestRoadLocation {
  lat: number;
  lng: number;
  originalLat: number;
  originalLng: number;
  distance: number; // Distance from original to snapped point in meters
}

export interface RoadsApiResponse {
  snappedPoints: Array<{
    location: {
      latitude: number;
      longitude: number;
    };
    placeId?: string;
    originalIndex?: number;
  }>;
}

/**
 * Snap GPS points to road using Google Roads API via backend
 */
export async function snapToRoad(points: LocationCoord[]): Promise<LocationCoord[]> {
  if (!points || points.length === 0) {
    return [];
  }

  try {
    console.log('🛣️ Roads Service: Snapping', points.length, 'GPS points to road');
    
    const response = await api.post('/api/test/snap-to-road', {
      path: points,
    }) as { data: { success: boolean; data: { snappedPoints: any[] } } };

    if (response.data.success && response.data.data.snappedPoints) {
      const snapped = response.data.data.snappedPoints.map((point: any) => ({
        latitude: point.location.latitude,
        longitude: point.location.longitude,
      }));
      
      console.log('🛣️ Roads Service: Snapped', points.length, '→', snapped.length, 'points');
      return snapped;
    }
    
    return points;
  } catch (error) {
    console.error('🛣️ Roads Service: Failed to snap to road:', error);
    return points;
  }
}

/**
 * Snap a single GPS point to nearest route polyline
 */
export function snapToNearestPolylinePoint(
  point: LocationCoord,
  route?: LocationCoord[]
): SnappedPoint {
  if (!route || route.length < 2) {
    return { ...point, heading: 0, routeIndex: 0, distanceMeters: 0 };
  }

  let minDistance = Infinity;
  let closestIdx = 0;

  for (let i = 0; i < route.length; i++) {
    const d = haversineMeters(point.latitude, point.longitude, route[i].latitude, route[i].longitude);
    if (d < minDistance) {
      minDistance = d;
      closestIdx = i;
    }
  }

  const heading = calcBearing(
    route[closestIdx].latitude,
    route[closestIdx].longitude,
    route[Math.min(closestIdx + 1, route.length - 1)].latitude,
    route[Math.min(closestIdx + 1, route.length - 1)].longitude
  );

  return {
    latitude: route[closestIdx].latitude,
    longitude: route[closestIdx].longitude,
    heading,
    routeIndex: closestIdx,
    distanceMeters: minDistance,
  };
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Get the nearest road location using Google Roads API via backend
 * @param latitude Raw GPS latitude
 * @param longitude Raw GPS longitude
 * @returns Promise<NearestRoadLocation | null> Snapped location or null on error
 */
export async function getNearestRoadLocation(
  latitude: number,
  longitude: number
): Promise<NearestRoadLocation | null> {
  try {
    // Use backend endpoint (supports both EXPO_PUBLIC_API_URL and NEXT_PUBLIC_SERVER_URL)
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:8080';
    console.log('🛣️ Nearest Road: Calling API at:', `${apiUrl}/api/google/nearest-road`);
    
    const response = await axios.post(
      `${apiUrl}/api/google/nearest-road`,
      { latitude, longitude },
      {
        timeout: 5000,
        withCredentials: true,
      }
    );

    if (response.data.success && response.data.data) {
      const data = response.data.data;
      const snappedLat = data.location?.latitude || data.lat;
      const snappedLng = data.location?.longitude || data.lng;

      if (!snappedLat || !snappedLng) {
        console.warn('🛣️ Nearest Road: No snapped location returned');
        return null;
      }

      const distance = haversineMeters(latitude, longitude, snappedLat, snappedLng);

      console.log(`🛣️ Nearest Road: Snapped - Distance: ${distance.toFixed(2)}m`);

      return {
        lat: snappedLat,
        lng: snappedLng,
        originalLat: latitude,
        originalLng: longitude,
        distance,
      };
    }

    return null;
  } catch (error: any) {
    console.error('🛣️ Nearest Road: Network Error -', error?.message || error);
    console.error('🛣️ Error details:', error?.response?.data);
    console.error('🛣️ Error status:', error?.response?.status);
    console.error('🛣️ Request URL:', `${process.env.EXPO_PUBLIC_API_URL || process.env.NEXT_PUBLIC_SERVER_URL}/api/google/nearest-road`);
    return null;
  }
}

/**
 * Performance optimization: Check if movement is significant enough to warrant API call
 * @param prevLat Previous latitude
 * @param prevLng Previous longitude  
 * @param newLat New latitude
 * @param newLng New longitude
 * @param threshold Minimum movement in meters (default: 10m)
 * @returns boolean True if movement exceeds threshold
 */
export function shouldSnapToRoad(
  prevLat: number,
  prevLng: number,
  newLat: number,
  newLng: number,
  threshold: number = 10
): boolean {
  if (prevLat === 0 || prevLng === 0) return true; // First location
  
  const distance = haversineMeters(prevLat, prevLng, newLat, newLng);
  return distance > threshold;
}
