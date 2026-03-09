// GPS Distance and Jitter Handling Utilities

export const DISTANCE_THRESHOLD = 5; // meters - treat distances below this as zero
export const JITTER_THRESHOLD = 2; // meters - filter out GPS movements below this
export const AVERAGING_WINDOW = 3; // number of readings for moving average

/**
 * Calculate distance between two coordinates in meters using Haversine formula
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Apply distance threshold to prevent jittery distance updates
 * Returns 0 if distance is below threshold, otherwise returns thresholded distance
 */
export const applyDistanceThreshold = (distance: number, threshold: number = DISTANCE_THRESHOLD): number => {
  return Math.max(0, distance - threshold);
};

/**
 * Check if a movement should be filtered as GPS jitter
 */
export const shouldFilterJitter = (
  newLat: number, 
  newLon: number, 
  oldLat: number, 
  oldLon: number, 
  threshold: number = JITTER_THRESHOLD
): boolean => {
  const distance = calculateDistance(newLat, newLon, oldLat, oldLon);
  return distance < threshold;
};

/**
 * Format distance for display with appropriate units
 */
export const formatDistance = (distanceMeters: number): string => {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)}m`;
  } else {
    return `${(distanceMeters / 1000).toFixed(1)}km`;
  }
};

/**
 * Format ETA for display
 */
export const formatETA = (etaMinutes: number): string => {
  if (etaMinutes < 1) {
    return 'Arriving';
  } else if (etaMinutes < 60) {
    return `${Math.round(etaMinutes)} min`;
  } else {
    const hours = Math.floor(etaMinutes / 60);
    const minutes = Math.round(etaMinutes % 60);
    return `${hours}h ${minutes}m`;
  }
};

/**
 * Moving average calculator for GPS coordinates
 */
export class MovingAverage {
  private window: number;
  private history: { lat: number; lng: number }[] = [];

  constructor(window: number = AVERAGING_WINDOW) {
    this.window = window;
  }

  add(lat: number, lng: number): { lat: number; lng: number } {
    this.history.push({ lat, lng });
    
    if (this.history.length > this.window) {
      this.history.shift();
    }

    const avgLat = this.history.reduce((sum, point) => sum + point.lat, 0) / this.history.length;
    const avgLng = this.history.reduce((sum, point) => sum + point.lng, 0) / this.history.length;

    return { lat: avgLat, lng: avgLng };
  }

  reset(): void {
    this.history = [];
  }

  size(): number {
    return this.history.length;
  }
}
