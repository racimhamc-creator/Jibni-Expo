import { useState, useEffect, useRef, useCallback } from 'react';
import { socketService } from '../services/socket';
import { LocationCoord } from '../services/directions';

// ─── Constants ────────────────────────────────────────────────────────────────

export const DISTANCE_THRESHOLD = 5;   // metres – treat smaller distances as zero
export const JITTER_THRESHOLD   = 2;   // metres – GPS noise gate
export const AVERAGING_WINDOW   = 3;   // readings for moving-average smoother

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DriverLocationData {
  driverId:  string;
  latitude:  number;
  longitude: number;
  heading?:  number;
  speed?:    number;
  timestamp: number;
}

export interface UseMissionTrackingOptions {
  rideId?:             string;
  enableAutoFollow?:   boolean;
  updateInterval?:     number;
  distanceThreshold?:  number;
  jitterThreshold?:    number;
  enableAveraging?:    boolean;
  averagingWindow?:    number;
  clientLocation?:     { lat: number; lng: number } | null;
  destinationLocation?: { lat: number; lng: number } | null;
  /**
   * If you pass the active route polyline the hook will interpolate the driver
   * position **along the road** instead of in a straight line.  This makes the
   * driver marker appear to follow the road even when raw GPS updates are slow.
   */
  activeRoute?: LocationCoord[] | null;
}

// ─── Geometry helpers (self-contained, no extra imports) ─────────────────────

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R    = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Distance in km (used for ETA estimates) */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return haversineMeters(lat1, lon1, lat2, lon2) / 1000;
}

function calcBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const y  = Math.sin(Δλ) * Math.cos(φ2);
  const x  = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Given a raw GPS point, return the nearest point on `route` plus the
 * forward-looking heading derived from the route geometry.
 */
function snapToRoute(
  lat: number,
  lng: number,
  route: LocationCoord[],
  fallbackHeading = 0,
): DriverLocationData & { routeIndex: number } {
  if (!route || route.length < 2) {
    return { driverId: '', latitude: lat, longitude: lng, heading: fallbackHeading, timestamp: Date.now(), routeIndex: 0 };
  }

  let minDist    = Infinity;
  let closestIdx = 0;

  for (let i = 0; i < route.length; i++) {
    const d = haversineMeters(lat, lng, route[i].latitude, route[i].longitude);
    if (d < minDist) { minDist = d; closestIdx = i; }
  }

  // Look ~80 m ahead for a stable heading angle
  let aheadIdx    = closestIdx;
  let accumulated = 0;
  while (aheadIdx < route.length - 1 && accumulated < 80) {
    accumulated += haversineMeters(
      route[aheadIdx].latitude,     route[aheadIdx].longitude,
      route[aheadIdx + 1].latitude, route[aheadIdx + 1].longitude,
    );
    aheadIdx++;
  }

  const heading = calcBearing(
    route[closestIdx].latitude, route[closestIdx].longitude,
    route[aheadIdx].latitude,   route[aheadIdx].longitude,
  );

  return {
    driverId:   '',
    latitude:   route[closestIdx].latitude,
    longitude:  route[closestIdx].longitude,
    heading,
    timestamp:  Date.now(),
    routeIndex: closestIdx,
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useMissionTracking = (options: UseMissionTrackingOptions = {}) => {
  const {
    rideId,
    enableAutoFollow    = true,
    updateInterval      = 1000,
    distanceThreshold   = DISTANCE_THRESHOLD,
    jitterThreshold     = JITTER_THRESHOLD,
    enableAveraging     = false,
    averagingWindow     = AVERAGING_WINDOW,
    clientLocation,
    destinationLocation,
    activeRoute,
  } = options;

  // Raw driver location (straight-line interpolated)
  const [driverLocation, setDriverLocation] = useState<DriverLocationData | null>(null);
  // Route-snapped driver location (moves along the road)
  const [snappedLocation, setSnappedLocation] = useState<DriverLocationData | null>(null);

  const [eta,        setEta]        = useState<number>(0);
  const [distance,   setDistance]   = useState<number>(0);
  const [isTracking, setIsTracking] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  const lastLocationRef    = useRef<DriverLocationData | null>(null);
  const interpolationRef   = useRef<NodeJS.Timeout | null>(null);
  const etaCalculationRef  = useRef<NodeJS.Timeout | null>(null);
  const locationHistoryRef = useRef<DriverLocationData[]>([]);
  const activeRouteRef     = useRef<LocationCoord[] | null>(null);

  // Keep route ref current without causing re-renders
  useEffect(() => { activeRouteRef.current = activeRoute ?? null; }, [activeRoute]);

  // ── Snap a location to the current route (if available) ────────────────
  const applyRouteSnap = useCallback((loc: DriverLocationData): DriverLocationData => {
    const route = activeRouteRef.current;
    if (!route || route.length < 2) return loc;
    const snapped = snapToRoute(loc.latitude, loc.longitude, route, loc.heading ?? 0);
    return { ...loc, latitude: snapped.latitude, longitude: snapped.longitude, heading: snapped.heading };
  }, []);

  // ── Moving-average smoother ────────────────────────────────────────────
  const applyMovingAverage = useCallback((loc: DriverLocationData): DriverLocationData => {
    if (!enableAveraging || averagingWindow <= 1) return loc;

    locationHistoryRef.current.push(loc);
    if (locationHistoryRef.current.length > averagingWindow) locationHistoryRef.current.shift();

    const h = locationHistoryRef.current;
    return {
      ...loc,
      latitude:  h.reduce((s, l) => s + l.latitude,  0) / h.length,
      longitude: h.reduce((s, l) => s + l.longitude, 0) / h.length,
      heading:   h.reduce((s, l) => s + (l.heading ?? 0), 0) / h.length || undefined,
      speed:     h.reduce((s, l) => s + (l.speed   ?? 0), 0) / h.length || undefined,
    };
  }, [enableAveraging, averagingWindow]);

  // ── Jitter filter ──────────────────────────────────────────────────────
  const isJitter = useCallback((next: DriverLocationData, last: DriverLocationData): boolean => {
    return haversineMeters(last.latitude, last.longitude, next.latitude, next.longitude) < jitterThreshold;
  }, [jitterThreshold]);

  // ── ETA / distance calculation ─────────────────────────────────────────
  const updateMetrics = useCallback((loc: DriverLocationData) => {
    const target = clientLocation ?? destinationLocation ?? null;
    if (!target) return;

    const destLat = 'lat' in target ? target.lat : (target as any).latitude;
    const destLng = 'lat' in target ? target.lng : (target as any).longitude;

    const raw     = haversineMeters(loc.latitude, loc.longitude, destLat, destLng);
    const adj     = Math.max(0, raw - distanceThreshold);
    setDistance(adj);

    const speedKmh = (loc.speed && loc.speed > 0) ? loc.speed * 3.6 : 30;
    setEta(adj > 0 ? Math.max(1, Math.round((adj / 1000 / speedKmh) * 60)) : 0);
  }, [clientLocation, destinationLocation, distanceThreshold]);

  // ── Core location update handler ───────────────────────────────────────
  const handleDriverLocationUpdate = useCallback((rawLoc: DriverLocationData) => {
    if (!rawLoc) return;

    const now = Date.now();
    setLastUpdate(now);

    const smoothed = applyMovingAverage(rawLoc);

    // First location — set immediately
    if (!lastLocationRef.current) {
      setDriverLocation(smoothed);
      setSnappedLocation(applyRouteSnap(smoothed));
      lastLocationRef.current = smoothed;
      updateMetrics(smoothed);
      return;
    }

    // Jitter filter — but bypass if within 50 m of pickup (need precise arrival)
    if (isJitter(smoothed, lastLocationRef.current)) return;

    const timeDiff = smoothed.timestamp - lastLocationRef.current.timestamp;
    const maxInterp = 2500; // ms

    if (interpolationRef.current) clearInterval(interpolationRef.current);

    if (timeDiff > 0 && timeDiff <= maxInterp) {
      // Interpolate straight-line for raw position…
      const from  = lastLocationRef.current;
      const steps = Math.min(Math.floor(timeDiff / 100), 12);
      let step    = 0;

      interpolationRef.current = setInterval(() => {
        step++;
        const t = Math.min(step / steps, 1);

        const interpolated: DriverLocationData = {
          ...smoothed,
          latitude:  from.latitude  + (smoothed.latitude  - from.latitude)  * t,
          longitude: from.longitude + (smoothed.longitude - from.longitude) * t,
          heading:   smoothed.heading, // use target heading immediately
        };

        setDriverLocation(interpolated);
        // …but snap each interpolated step to the road for the visible marker
        setSnappedLocation(applyRouteSnap(interpolated));
        updateMetrics(interpolated);

        if (step >= steps) {
          if (interpolationRef.current) clearInterval(interpolationRef.current);
          interpolationRef.current = null;
          lastLocationRef.current  = smoothed;
        }
      }, timeDiff / steps);
    } else {
      setDriverLocation(smoothed);
      setSnappedLocation(applyRouteSnap(smoothed));
      lastLocationRef.current = smoothed;
      updateMetrics(smoothed);
    }
  }, [applyMovingAverage, applyRouteSnap, isJitter, updateMetrics]);

  // ── Socket listeners ───────────────────────────────────────────────────
  useEffect(() => {
    if (!rideId) return;
    setIsTracking(true);

    const onLocationUpdate = (data: any) => {
      let latitude: number, longitude: number;

      if (data?.location?.lat != null && data?.location?.lng != null) {
        latitude  = data.location.lat;
        longitude = data.location.lng;
      } else if (data?.latitude != null && data?.longitude != null) {
        latitude  = data.latitude;
        longitude = data.longitude;
      } else {
        console.warn('useMissionTracking: unrecognised location payload', data);
        return;
      }

      handleDriverLocationUpdate({
        driverId:  data.driverId  ?? '',
        latitude,
        longitude,
        heading:   data.heading   ?? undefined,
        speed:     data.speed     ?? undefined,
        timestamp: data.timestamp ?? Date.now(),
      });
    };

    socketService.onDriverLocationUpdate(onLocationUpdate);
    socketService.joinRideRoom(rideId);

    return () => {
      socketService.offDriverLocationUpdate(onLocationUpdate);
      socketService.leaveRideRoom(rideId);
      if (interpolationRef.current)  clearInterval(interpolationRef.current);
      if (etaCalculationRef.current) clearInterval(etaCalculationRef.current);
    };
  }, [rideId, handleDriverLocationUpdate]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (interpolationRef.current)  clearInterval(interpolationRef.current);
    if (etaCalculationRef.current) clearInterval(etaCalculationRef.current);
  }, []);

  return {
    /** Raw interpolated location (straight-line between GPS updates) */
    driverLocation,
    /** Road-snapped location – use this for the visible map marker */
    snappedLocation,
    eta,
    distance,
    isTracking,
    lastUpdate,
    calculateETA: updateMetrics,
  };
};

// ─── Standalone distance helper (used by other modules) ──────────────────────
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return haversineKm(lat1, lon1, lat2, lon2);
}