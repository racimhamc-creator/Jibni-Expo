import { redisClient } from '../config/redis.js';
import { NearbyDriver } from '../types/location.js';

const EARTH_RADIUS_M = 6371000; // Earth radius in meters

const haversineDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
};

export const findNearbyDrivers = async (
  lat: number,
  lng: number,
  radiusKm: number = 100
): Promise<NearbyDriver[]> => {
  const radiusM = radiusKm * 1000;
  const keys = await redisClient.keys('driver:*');
  const nearbyDrivers: NearbyDriver[] = [];

  for (const key of keys) {
    const locationData = await redisClient.get(key);
    if (!locationData) continue;

    const location = JSON.parse(locationData);
    const distance = haversineDistance(lat, lng, location.lat, location.lng);

    if (distance <= radiusM) {
      const driverId = key.replace('driver:', '');
      nearbyDrivers.push({
        driverId,
        location: {
          lat: location.lat,
          lng: location.lng,
          heading: location.heading,
          timestamp: location.timestamp,
        },
        distance,
      });
    }
  }

  // Sort by distance and return top 10
  return nearbyDrivers
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 10);
};
