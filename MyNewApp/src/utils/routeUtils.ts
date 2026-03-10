import { LocationCoord } from '../services/directions';

/**
 * Calculate distance between two coordinates in meters
 */
export function calculateDistance(point1: LocationCoord, point2: LocationCoord): number {
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

/**
 * Find the closest point on a route to a given location
 */
export function findClosestPointOnRoute(
  location: { latitude: number; longitude: number },
  route: LocationCoord[]
): { point: LocationCoord; index: number; distance: number } | null {
  if (!route || route.length === 0) return null;

  let minDistance = Infinity;
  let closestIndex = 0;
  let closestPoint = route[0];

  // Check each point on the route
  route.forEach((point, index) => {
    const distance = calculateDistance(location, point);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
      closestPoint = point;
    }
  });

  // Also check between segments for more accurate results
  for (let i = 0; i < route.length - 1; i++) {
    const segmentClosest = findClosestPointOnSegment(location, route[i], route[i + 1]);
    if (segmentClosest && segmentClosest.distance < minDistance) {
      minDistance = segmentClosest.distance;
      closestIndex = i;
      closestPoint = segmentClosest.point;
    }
  }

  return {
    point: closestPoint,
    index: closestIndex,
    distance: minDistance,
  };
}

/**
 * Find the closest point on a line segment to a given location
 */
function findClosestPointOnSegment(
  location: { latitude: number; longitude: number },
  segmentStart: LocationCoord,
  segmentEnd: LocationCoord
): { point: LocationCoord; distance: number } | null {
  // Convert to simple 2D for calculation (approximation)
  const x1 = segmentStart.longitude;
  const y1 = segmentStart.latitude;
  const x2 = segmentEnd.longitude;
  const y2 = segmentEnd.latitude;
  const x0 = location.longitude;
  const y0 = location.latitude;

  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    // Segment is a point
    return {
      point: segmentStart,
      distance: calculateDistance(location, segmentStart),
    };
  }

  // Parameter t represents position along the segment (0 to 1)
  const t = Math.max(0, Math.min(1, ((x0 - x1) * dx + (y0 - y1) * dy) / (dx * dx + dy * dy)));

  const closestPoint = {
    latitude: y1 + t * dy,
    longitude: x1 + t * dx,
  };

  return {
    point: closestPoint,
    distance: calculateDistance(location, closestPoint),
  };
}

/**
 * Calculate heading/bearing between two points
 */
export function calculateHeading(from: LocationCoord, to: LocationCoord): number {
  const deltaLng = (to.longitude - from.longitude) * Math.PI / 180;
  const fromLat = from.latitude * Math.PI / 180;
  const toLat = to.latitude * Math.PI / 180;
  
  const x = Math.sin(deltaLng) * Math.cos(toLat);
  const y = Math.cos(fromLat) * Math.sin(toLat) - Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLng);
  
  const heading = Math.atan2(x, y) * 180 / Math.PI;
  return (heading + 360) % 360;
}

/**
 * Calculate total distance of a route
 */
export function getTotalRouteDistance(route: LocationCoord[]): number {
  if (!route || route.length < 2) return 0;
  
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    total += calculateDistance(route[i], route[i + 1]);
  }
  return total;
}

/**
 * Interpolate position along a route at a given progress (0-1)
 */
export function getPositionAtProgress(
  route: LocationCoord[],
  progress: number
): LocationCoord | null {
  if (!route || route.length < 2 || progress < 0 || progress > 1) {
    return null;
  }

  const totalDistance = getTotalRouteDistance(route);
  const targetDistance = totalDistance * progress;
  
  let accumulatedDistance = 0;
  
  for (let i = 0; i < route.length - 1; i++) {
    const segmentDistance = calculateDistance(route[i], route[i + 1]);
    
    if (accumulatedDistance + segmentDistance >= targetDistance) {
      const segmentProgress = (targetDistance - accumulatedDistance) / segmentDistance;
      
      return {
        latitude: route[i].latitude + (route[i + 1].latitude - route[i].latitude) * segmentProgress,
        longitude: route[i].longitude + (route[i + 1].longitude - route[i].longitude) * segmentProgress,
      };
    }
    
    accumulatedDistance += segmentDistance;
  }
  
  // Return last point if progress is 1
  return route[route.length - 1];
}
