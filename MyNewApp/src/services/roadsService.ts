import axios from 'axios';
import { GOOGLE_MAPS_API_KEY } from '../config/maps';
import { LocationCoord } from './directions';

const SNAP_TO_ROADS_URL = 'https://roads.googleapis.com/v1/snapToRoads';
const MAX_POINTS_PER_CALL = 100;
const MIN_INTERVAL_MS = 5000;

export interface SnappedPoint extends LocationCoord {
  heading: number;
  routeIndex: number;
  distanceMeters: number;
}

let lastRequestTime = 0;

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

export async function snapPathWithRoads(points: LocationCoord[]): Promise<LocationCoord[]> {
  if (!GOOGLE_MAPS_API_KEY || !points.length) {
    return points;
  }

  const now = Date.now();
  if (now - lastRequestTime < MIN_INTERVAL_MS) {
    return points;
  }

  lastRequestTime = now;

  const chunks: LocationCoord[][] = [];
  for (let i = 0; i < points.length; i += MAX_POINTS_PER_CALL) {
    chunks.push(points.slice(i, i + MAX_POINTS_PER_CALL));
  }

  const snapped: LocationCoord[] = [];

  for (const chunk of chunks) {
    try {
      const path = chunk.map((p) => `${p.latitude},${p.longitude}`).join('|');
      const response = await axios.get(SNAP_TO_ROADS_URL, {
        params: {
          path,
          interpolate: true,
          key: GOOGLE_MAPS_API_KEY,
        },
        timeout: 5000,
      });

      const snappedPoints = response.data.snappedPoints || [];
      snappedPoints.forEach((item: any) => {
        snapped.push({ latitude: item.location.latitude, longitude: item.location.longitude });
      });
    } catch (error) {
      console.error('snapToRoads failed, returning raw chunk', error);
      snapped.push(...chunk);
    }
  }

  return snapped;
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
