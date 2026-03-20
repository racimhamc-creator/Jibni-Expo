/**
 * Directions Service - Google Routes API wrapper
 * Provides traffic-aware routes with decoded polylines
 * Updated to use the new Routes API (v2)
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
  location?: { lat: number; lng: number }; // For NavigationHeader - where maneuver happens
  maneuver?: string;
  distanceToManeuver?: number; // Distance from driver to this maneuver (calculated in real-time)
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

// New Google Routes API v2 endpoint
const GOOGLE_ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

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
 * Get road-following route between two points using Google Routes API v2.
 * Uses backend proxy to protect API key.
 * Includes traffic-aware ETA.
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
    // VALIDATION: Check for valid coordinates
    const isOriginValid = 
      typeof start.latitude === 'number' && !isNaN(start.latitude) &&
      typeof start.longitude === 'number' && !isNaN(start.longitude) &&
      start.latitude >= -90 && start.latitude <= 90 &&
      start.longitude >= -180 && start.longitude <= 180;

    const isDestValid = 
      typeof end.latitude === 'number' && !isNaN(end.latitude) &&
      typeof end.longitude === 'number' && !isNaN(end.longitude) &&
      end.latitude >= -90 && end.latitude <= 90 &&
      end.longitude >= -180 && end.longitude <= 180;

    console.log('🛣️ Fetching route via backend...');
    console.log('   From:', { lat: start.latitude, lng: start.longitude });
    console.log('   To:', { lat: end.latitude, lng: end.longitude });
    console.log('   Origin valid:', isOriginValid);
    console.log('   Destination valid:', isDestValid);

    if (!isOriginValid || !isDestValid) {
      console.error('❌ Invalid coordinates detected!');
      throw new Error(`Invalid coordinates - Origin valid: ${isOriginValid}, Destination valid: ${isDestValid}`);
    }

    // Try backend endpoint first (recommended)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:8080';
      const response = await axios.post(
        `${apiUrl}/api/google/routes`,
        {
          origin: { latitude: start.latitude, longitude: start.longitude },
          destination: { latitude: end.latitude, longitude: end.longitude },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
        },
        {
          timeout: 10000,
          withCredentials: true,
        }
      );

      if (response.data.success) {
        const routeData = response.data.data;
        
        const result: RouteResult = {
          coordinates: routeData.encodedPolyline ? decodePolyline(routeData.encodedPolyline) : [],
          distance: routeData.distance,
          duration: routeData.duration,
          encodedPolyline: routeData.encodedPolyline,
          steps: routeData.steps || [],
          startLocation: routeData.startLocation,
          endLocation: routeData.endLocation,
        };

        // Cache the result
        routeCache.set(cacheKey, {
          result,
          timestamp: Date.now(),
        });

        console.log('   Route fetched via backend:', {
          distance: (routeData.distance / 1000).toFixed(1) + 'km',
          duration: Math.round(routeData.duration / 60) + 'min',
          steps: result.steps.length,
        });

        return result;
      }
    } catch (backendError: any) {
      console.warn('   Backend route failed, falling back to direct API:', backendError.message);
      // Fall through to direct API call
    }

    // Fallback: Direct API call (not recommended, but kept for compatibility)
    console.log('   Attempting direct Google Routes API call...');
    
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('Missing API key');
    }

    // Request body
    const requestBody = {
      origin: {
        location: {
          latLng: {
            latitude: start.latitude,
            longitude: start.longitude,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: end.latitude,
            longitude: end.longitude,
          },
        },
      },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      computeAlternativeRoutes: false,
      routeModifiers: {
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: false,
      },
      languageCode: 'en',
      units: 'METRIC',
    };

    console.log('   Request body:', JSON.stringify(requestBody, null, 2));
    console.log('   Headers:', {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY.substring(0, 10) + '...',
      'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,...',
    });

    // New Routes API v2 request format
    // IMPORTANT: Don't pass key in params - it causes 403 PERMISSION_DENIED!
    // Routes API v2 expects the key ONLY in X-Goog-Api-Key header
    const response = await axios.post(
      GOOGLE_ROUTES_API_URL,
      requestBody,
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.startLocation,routes.legs.steps.endLocation,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration,routes.legs.startLocation,routes.legs.endLocation',
        },
      }
    );

    const data = response.data;
    
    if (data.error) {
      console.error('   Google Routes API error:', data.error.status, data.error.message);
      throw new Error(data.error.message || data.error.status);
    }

    const route = data.routes?.[0];
    if (!route) {
      throw new Error('No route returned from Google Routes API');
    }

    // Extract route information from new API format
    const legs = route.legs || [];
    const totalDistance = legs.reduce((sum: number, leg: any) => sum + (leg.distance?.value || 0), 0);
    const totalDuration = legs.reduce((sum: number, leg: any) => sum + (leg.duration?.value || 0), 0);

    const steps: RouteStep[] = legs.flatMap((leg: any) =>
      (leg.steps || []).map((step: any) => {
        const decoded = step.polyline?.encodedPolyline ? 
          decodePolyline(step.polyline.encodedPolyline) : [];
        const startCoord = decoded[0] ?? { 
          latitude: step.startLocation?.latLng?.latitude ?? 0, 
          longitude: step.startLocation?.latLng?.longitude ?? 0 
        };
        const endCoord = decoded[decoded.length - 1] ?? { 
          latitude: step.endLocation?.latLng?.latitude ?? 0, 
          longitude: step.endLocation?.latLng?.longitude ?? 0 
        };

        // Handle Google Routes API v2 navigationInstruction format
        const navInstruction = step.navigationInstruction?.instructions 
          ?? step.navigationInstruction?.instruction 
          ?? 'Continue';
        const maneuver = step.navigationInstruction?.maneuver 
          ?? 'STRAIGHT';

        return {
          instruction: navInstruction,
          distance: step.distanceMeters ? `${step.distanceMeters}m` : '',
          distanceMeters: step.distanceMeters ?? 0,
          durationSeconds: step.staticDuration ?? 0,
          startCoord,
          endCoord,
          location: step.startLocation?.latLng,
          maneuver: maneuver,
        } as RouteStep;
      })
    );

    let coordinates: LocationCoord[] = [];
    if (route.polyline?.encodedPolyline) {
      coordinates = decodePolyline(route.polyline.encodedPolyline);
    } else if (legs.length) {
      coordinates = legs.flatMap((leg: any) =>
        (leg.steps || []).flatMap((step: any) =>
          step.polyline?.encodedPolyline ? 
            decodePolyline(step.polyline.encodedPolyline) : []
        )
      );
    }

    const result: RouteResult = {
      coordinates,
      distance: totalDistance,
      duration: totalDuration,
      encodedPolyline: route.polyline?.encodedPolyline,
      steps,
      startLocation: legs[0]?.startLocation?.latLng ? {
        latitude: legs[0].startLocation.latLng.latitude,
        longitude: legs[0].startLocation.latLng.longitude,
      } : start,
      endLocation: legs[0]?.endLocation?.latLng ? {
        latitude: legs[0].endLocation.latLng.latitude,
        longitude: legs[0].endLocation.latLng.longitude,
      } : end,
      summary: route.description || route.summary,
    };

    // Cache the result
    routeCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
    });

    console.log('   Route fetched successfully:', {
      distance: (totalDistance / 1000).toFixed(1) + 'km',
      duration: Math.round(totalDuration / 60) + 'min',
      steps: steps.length,
    });

    return result;
  } catch (error: any) {
    // Detailed error logging
    console.error('❌ Google Routes API Error Details:');
    console.error('   Message:', error.message);
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Status Text:', error.response.statusText);
      console.error('   Response Data:', JSON.stringify(error.response.data, null, 2));
      console.error('   Response Headers:', error.response.headers);
    } else if (error.request) {
      console.error('   No response received (network error)');
      console.error('   Request:', error.request);
    } else {
      console.error('   Error config:', error.config);
    }
    
    throw error;
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

    // VALIDATION: Check for valid coordinates
    const isOriginValid = 
      typeof origin.latitude === 'number' && !isNaN(origin.latitude) &&
      typeof origin.longitude === 'number' && !isNaN(origin.longitude);

    const isDestValid = 
      typeof destination.latitude === 'number' && !isNaN(destination.latitude) &&
      typeof destination.longitude === 'number' && !isNaN(destination.longitude);

    console.log(`[${label}] Fetching route from`, { lat: origin.latitude, lng: origin.longitude }, 'to', { lat: destination.latitude, lng: destination.longitude });
    console.log(`[${label}] Origin valid:`, isOriginValid, '| Destination valid:', isDestValid);

    if (!isOriginValid || !isDestValid) {
      console.error(`[${label}] Invalid coordinates - skipping API call`);
      return null;
    }

    // Request body
    const requestBody = {
      origin: {
        location: {
          latLng: {
            latitude: origin.latitude,
            longitude: origin.longitude,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.latitude,
            longitude: destination.longitude,
          },
        },
      },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      languageCode: 'en',
      units: 'METRIC',
    };

    // Use new Routes API v2
    // IMPORTANT: Don't pass key in params - it causes 403 PERMISSION_DENIED!
    const response = await axios.post(
      GOOGLE_ROUTES_API_URL,
      requestBody,
      {
        timeout: 8000,
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.startLocation.latLng,routes.legs.steps.endLocation.latLng,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration,routes.legs.startLocation.latLng,routes.legs.endLocation.latLng',
        },
      }
    );

    const data = response.data;
    
    if (data.error) {
      console.error(`[${label}] Google Routes API error:`, data.error.status, data.error.message);
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
    const polyline = route.polyline?.encodedPolyline ?? '';

    // Log for verification (matches Google Maps)
    console.log(`[${label}] Google distance:`, distance);
    console.log(`[${label}] Google ETA:`, duration);

    let coordinates: LocationCoord[] = [];
    if (polyline) {
      coordinates = decodePolyline(polyline);
      console.log(`[${label}] Decoded ${coordinates.length} points`);
    } else {
      coordinates = [
        { latitude: origin.latitude, longitude: origin.longitude },
        { latitude: destination.latitude, longitude: destination.longitude },
      ];
    }

    return { distance, duration, polyline, coordinates };
  } catch (error: any) {
    // Detailed error logging
    console.error(`[${label}] Google Directions Error Details:`);
    console.error('   Message:', error.message);
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('   No response received (network error)');
    }
    
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