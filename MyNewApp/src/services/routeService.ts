import { getRoadRoute, LocationCoord, RouteStep } from './directions';
import { decodePolyline } from '../utils/polyline';
import { api } from './api';

export interface RouteData {
  coordinates: LocationCoord[];
  distance: number; // in meters
  duration: number; // in seconds
  encodedPolyline?: string;
  steps: RouteStep[];
}

export interface RouteServiceOptions {
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  optimize?: boolean;
}

interface CachedRouteEntry {
  data: RouteData;
  timestamp: number;
}

class RouteService {
  private routeCache = new Map<string, CachedRouteEntry>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get route via backend Google Directions API (server-side key)
   */
  async getRouteFromBackend(
    origin: LocationCoord,
    destination: LocationCoord
  ): Promise<RouteData> {
    try {
      const response = await api.post('/api/test/directions', {
        origin: { lat: origin.latitude, lng: origin.longitude },
        destination: { lat: destination.latitude, lng: destination.longitude },
      }) as { data: { distance: number; duration: number; polyline: string } };

      const { distance, duration, polyline } = response.data;
      const coordinates = decodePolyline(polyline);

      return {
        coordinates,
        distance,
        duration,
        encodedPolyline: polyline,
        steps: [], // Backend doesn't return steps for now
      };
    } catch (error) {
      console.error('Backend Directions error:', error);
      throw error;
    }
  }

  /**
   * Get route between two points with caching
   */
  async getRoute(
    origin: LocationCoord,
    destination: LocationCoord,
    options: RouteServiceOptions = {}
  ): Promise<RouteData> {
    const cacheKey = this.generateCacheKey(origin, destination, options);
    
    // Check cache first
    const cached = this.routeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const route = await getRoadRoute(origin, destination);
      
      const routeData: RouteData = {
        coordinates: route.coordinates,
        distance: route.distance || this.calculateTotalDistance(route.coordinates),
        duration: route.duration || this.estimateDuration(route.coordinates),
        encodedPolyline: route.encodedPolyline,
        steps: route.steps,
      };

      // Cache the result
      this.routeCache.set(cacheKey, { data: routeData, timestamp: Date.now() });

      return routeData;
    } catch (error) {
      console.error('Route service error:', error);
      throw error;
    }
  }

  /**
   * Get route polyline for map rendering
   */
  async getRoutePolyline(
    origin: LocationCoord,
    destination: LocationCoord,
    options: RouteServiceOptions = {}
  ): Promise<LocationCoord[]> {
    const route = await this.getRoute(origin, destination, options);
    return route.coordinates;
  }

  /**
   * Calculate ETA based on current position and route
   */
  calculateETA(
    currentLocation: LocationCoord,
    routeCoordinates: LocationCoord[],
    currentSpeed?: number
  ): { eta: number; remainingDistance: number } {
    if (!routeCoordinates || routeCoordinates.length < 2) {
      return { eta: 0, remainingDistance: 0 };
    }

    // Find closest point on route
    const closestIndex = this.findClosestPointIndex(currentLocation, routeCoordinates);
    
    // Calculate remaining distance
    let remainingDistance = 0;
    for (let i = closestIndex; i < routeCoordinates.length - 1; i++) {
      remainingDistance += this.calculateDistance(
        routeCoordinates[i],
        routeCoordinates[i + 1]
      );
    }

    // Estimate speed
    let speedKmh = currentSpeed || 30; // Default city speed
    if (currentSpeed && currentSpeed > 0) {
      // Convert m/s to km/h if it's in m/s
      if (currentSpeed < 10) {
        speedKmh = currentSpeed * 3.6;
      }
    }

    // Calculate ETA in seconds
    const etaSeconds = (remainingDistance / 1000) / speedKmh * 3600;

    return {
      eta: Math.max(60, etaSeconds), // Minimum 1 minute
      remainingDistance,
    };
  }

  /**
   * Snap coordinates to nearest road (simplified implementation)
   */
  async snapToRoad(coordinates: LocationCoord[]): Promise<LocationCoord[]> {
    // This is a simplified implementation
    // In production, you'd use a service like Google Roads API
    return coordinates;
  }

  /**
   * Clear route cache
   */
  clearCache(): void {
    this.routeCache.clear();
  }

  /**
   * Generate cache key for route
   */
  private generateCacheKey(
    origin: LocationCoord,
    destination: LocationCoord,
    options: RouteServiceOptions
  ): string {
    const key = [
      origin.latitude.toFixed(6),
      origin.longitude.toFixed(6),
      destination.latitude.toFixed(6),
      destination.longitude.toFixed(6),
      JSON.stringify(options),
    ].join('|');
    
    return key;
  }

  /**
   * Find closest point index on route
   */
  private findClosestPointIndex(
    currentLocation: LocationCoord,
    routeCoordinates: LocationCoord[]
  ): number {
    let minDistance = Infinity;
    let closestIndex = 0;

    routeCoordinates.forEach((point, index) => {
      const distance = this.calculateDistance(currentLocation, point);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  }

  /**
   * Calculate total distance of route
   */
  private calculateTotalDistance(coordinates: LocationCoord[]): number {
    let totalDistance = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
      totalDistance += this.calculateDistance(coordinates[i], coordinates[i + 1]);
    }
    return totalDistance;
  }

  /**
   * Estimate duration based on distance
   */
  private estimateDuration(coordinates: LocationCoord[]): number {
    const distance = this.calculateTotalDistance(coordinates);
    // Assume average speed of 30 km/h in city
    const avgSpeedKmh = 30;
    return (distance / 1000) / avgSpeedKmh * 3600; // Convert to seconds
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(point1: LocationCoord, point2: LocationCoord): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(point1.latitude * Math.PI / 180) *
      Math.cos(point2.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export const routeService = new RouteService();
