import { api } from './api';
import { LocationCoord } from './directions';

export interface SnappedPoint extends LocationCoord {
  heading: number;
  routeIndex: number;
  distanceMeters: number;
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
