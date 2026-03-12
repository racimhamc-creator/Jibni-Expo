/**
 * Directions Service - Google Directions API wrapper
 * Provides traffic-aware routes (departure_time=now) with decoded polylines
 */

import axios from 'axios';
import polyline from '@mapbox/polyline';
import { GOOGLE_MAPS_API_KEY } from '../config/maps';

export interface LocationCoord {
  latitude: number;
  longitude: number;
}

export interface RouteStep {
  instruction: string;
  distance?: string; // Human-readable (e.g., "500 m")
  distanceMeters: number;
  durationSeconds: number;
  startCoord: LocationCoord;
  endCoord: LocationCoord;
  location?: { lat: number; lng: number }; // For NavigationHeader
  maneuver?: string;
}

export interface RouteResult {
  coordinates: LocationCoord[];
  distance: number; // in meters
  duration: number; // in seconds
  encodedPolyline?: string;
  steps: RouteStep[];
  startLocation?: LocationCoord;
  endLocation?: LocationCoord;
  summary?: string;
}

// Cache for route results to reduce API calls
const routeCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const GOOGLE_MAPS_DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json';

interface CacheEntry {
  result: RouteResult;
  timestamp: number;
}

/**
 * Generate cache key for a route
 */
function getCacheKey(start: LocationCoord, end: LocationCoord): string {
  // Round to 5 decimal places for better precision (~1.1m)
  const startLat = start.latitude.toFixed(5);
  const startLng = start.longitude.toFixed(5);
  const endLat = end.latitude.toFixed(5);
  const endLng = end.longitude.toFixed(5);
  return `${startLat},${startLng}|${endLat},${endLng}`;
}

/**
 * Check if cache entry is still valid
 */
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_DURATION;
}

function decodePolyline(points: string): LocationCoord[] {
  return polyline.decode(points).map(([lat, lng]: [number, number]) => ({ 
    latitude: lat, 
    longitude: lng 
  }));
}

/**
 * Get road-following route between two points using Google Directions API.
 * Includes traffic-aware ETA by setting departure_time=now.
 */
export async function getRoadRoute(
  start: LocationCoord,
  end: LocationCoord
): Promise<RouteResult> {
  const cacheKey = getCacheKey(start, end);
  const cached = routeCache.get(cacheKey);
  
  // Return cached result if valid
  if (cached && isCacheValid(cached)) {
    console.log('📍 Using cached route');
    return cached.result;
  }

  try {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('Missing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY env variable');
    }

    console.log('🛣️ Fetching Google Directions route...');
    console.log('   From:', start.latitude.toFixed(6), start.longitude.toFixed(6));
    console.log('   To:', end.latitude.toFixed(6), end.longitude.toFixed(6));

    const response = await axios.get(GOOGLE_MAPS_DIRECTIONS_URL, {
      params: {
        origin: `${start.latitude},${start.longitude}`,
        destination: `${end.latitude},${end.longitude}`,
        mode: 'driving',
        departure_time: 'now',
        key: GOOGLE_MAPS_API_KEY,
        alternatives: false,
        traffic_model: 'best_guess',
        units: 'metric',
      },
      timeout: 10000,
    });

    const data = response.data;
    if (data.status !== 'OK') {
      console.error('   Google Directions error:', data.status, data.error_message);
      throw new Error(data.error_message || data.status);
    }

    const route = data.routes?.[0];
    if (!route) {
      throw new Error('No route returned from Google Directions API');
    }

    const legs = route.legs || [];
    const totalDistance = legs.reduce((sum: number, leg: any) => sum + (leg.distance?.value || 0), 0);
    const totalDuration = legs.reduce((sum: number, leg: any) => sum + (leg.duration?.value || 0), 0);

    const steps: RouteStep[] = legs.flatMap((leg: any) =>
      (leg.steps || []).map((step: any) => {
        const decoded = step.polyline?.points ? decodePolyline(step.polyline.points) : [];
        const start = decoded[0] ?? { 
          latitude: step.start_location.lat, 
          longitude: step.start_location.lng 
        };
        const end = decoded[decoded.length - 1] ?? { 
          latitude: step.end_location.lat, 
          longitude: step.end_location.lng 
        };

        return {
          instruction: stripHtml(step.html_instructions || ''),
          distance: step.distance?.text || '', // Human-readable distance (e.g., "500 m")
          distanceMeters: step.distance?.value ?? 0,
          durationSeconds: step.duration?.value ?? 0,
          startCoord: start,
          endCoord: end,
          location: step.start_location, // For NavigationHeader
          maneuver: step.maneuver || 'straight',
        } as RouteStep;
      })
    );

    let coordinates: LocationCoord[] = [];
    if (route.overview_polyline?.points) {
      coordinates = decodePolyline(route.overview_polyline.points);
    } else if (legs.length) {
      coordinates = legs.flatMap((leg: any) =>
        (leg.steps || []).flatMap((step: any) =>
          step.polyline?.points ? decodePolyline(step.polyline.points) : []
        )
      );
    }

    if (!coordinates.length) {
      coordinates = [start, end];
    }

    const result: RouteResult = {
      coordinates,
      distance: totalDistance,
      duration: totalDuration,
      encodedPolyline: route.overview_polyline?.points,
      steps,
      startLocation: start,
      endLocation: end,
      summary: route.summary,
    };

    routeCache.set(cacheKey, { result, timestamp: Date.now() });

    console.log(`✅ Google Directions route fetched: ${(totalDistance / 1000).toFixed(2)} km, ${Math.round(totalDuration / 60)} min, ${steps.length} steps`);
    return result;
  } catch (error: any) {
    console.error('❌ Failed to fetch Google Directions route:', error?.message || error);
    console.log('⚠️ Falling back to straight line');
    return {
      coordinates: [start, end],
      distance: calculateStraightDistance(start, end),
      duration: 0,
      steps: [
        {
          instruction: 'Head to destination',
          distanceMeters: calculateStraightDistance(start, end),
          durationSeconds: 0,
          startCoord: start,
          endCoord: end,
          maneuver: 'straight',
        },
      ],
      startLocation: start,
      endLocation: end,
    };
  }
}

/**
 * Strip HTML tags from instruction text
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, '');
}

/**
 * Calculate straight-line distance between two points (fallback)
 * Uses Haversine formula
 */
function calculateStraightDistance(start: LocationCoord, end: LocationCoord): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (start.latitude * Math.PI) / 180;
  const φ2 = (end.latitude * Math.PI) / 180;
  const Δφ = ((end.latitude - start.latitude) * Math.PI) / 180;
  const Δλ = ((end.longitude - start.longitude) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Fetch route from Google Directions API and log raw values for verification.
 * Used to verify Google data matches before building UI behavior.
 */
export interface GoogleDirectionsLogResult {
  distance: string;
  duration: string;
  polyline: string;
  coordinates: LocationCoord[];
}

export async function fetchGoogleDirectionsAndLog(
  origin: LocationCoord,
  destination: LocationCoord,
  label: string
): Promise<GoogleDirectionsLogResult | null> {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn(`[${label}] Missing Google Maps API key, skipping Directions fetch`);
      return null;
    }

    const response = await axios.get(GOOGLE_MAPS_DIRECTIONS_URL, {
      params: {
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
        mode: 'driving',
        departure_time: 'now',
        key: GOOGLE_MAPS_API_KEY,
      },
      timeout: 8000,
    });

    const data = response.data;
    if (data.status !== 'OK') {
      console.error(`[${label}] Google Directions error:`, data.status, data.error_message);
      return null;
    }

    const route = data.routes?.[0];
    if (!route) {
      console.error(`[${label}] No route returned from Google`);
      return null;
    }

    const leg = route.legs?.[0];
    const distance = leg?.distance?.text ?? 'N/A';
    const duration = leg?.duration?.text ?? 'N/A';
    const polyline = route.overview_polyline?.points ?? '';

    // Log for verification (matches Google Maps)
    console.log(`[${label}] Google distance:`, distance);
    console.log(`[${label}] Google ETA:`, duration);
    // console.log(`[${label}] Google polyline length:`, polyline.length); // Hidden to reduce console flood

    let coordinates: LocationCoord[] = [];
    if (polyline) {
      coordinates = decodePolyline(polyline);
      console.log(`[${label}] Decoded ${coordinates.length} points`);
      // console.log(`[${label}] Route coordinates:`, JSON.stringify(coordinates, null, 2)); // Hidden to reduce console flood
    } else {
      coordinates = [
        { latitude: origin.latitude, longitude: origin.longitude },
        { latitude: destination.latitude, longitude: destination.longitude },
      ];
    }

    return { distance, duration, polyline, coordinates };
  } catch (error: any) {
    console.error(`[${label}] Failed to fetch Google Directions:`, error?.message || error);
    return null;
  }
}

/**
 * Clear route cache
 */
export function clearRouteCache(): void {
  routeCache.clear();
  console.log('🗑️ Route cache cleared');
}

/**
 * Get route cache size (for debugging)
 */
export function getRouteCacheSize(): number {
  return routeCache.size;
}

/**
 * Calculate distance between two coordinates in kilometers
 * Uses Haversine formula
 */
export function getDistanceFromLatLonInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}