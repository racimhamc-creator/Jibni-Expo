import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Platform, Dimensions, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';

let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;

try {
  const maps = require('react-native-maps');
  MapView = maps.default || maps;
  Marker = maps.Marker || (maps.default && maps.default.Marker);
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE || 'google';
} catch (error) {
  console.warn('react-native-maps not available');
}

import { LocationCoord } from '../../services/directions';
import { DriverLocationData } from '../../hooks/useMissionTracking';
import DriverMarker from './DriverMarker';
import ClientMarker from './ClientMarker';
import RoutePolyline from './RoutePolyline';
import { routeService } from '../../services/routeService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ─── Geometry helpers ────────────────────────────────────────────────────────

/** Haversine distance in metres between two lat/lng points */
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Compass bearing in degrees (0–360) from point A → B */
function calcBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Smooth angle interpolation that avoids crossing 0/360 boundary */
function lerpAngle(from: number, to: number, t: number): number {
  let diff = ((to - from + 540) % 360) - 180;
  return (from + diff * t + 360) % 360;
}

interface SnappedPoint {
  latitude: number;
  longitude: number;
  heading: number;
  /** index into the route array – used to slice the remaining polyline */
  routeIndex: number;
}

/**
 * Find the nearest point on `route` to the raw GPS coordinate.
 * Returns the snapped coordinate + forward-looking heading from the route.
 */
function snapToRoute(
  lat: number,
  lng: number,
  route: LocationCoord[],
  fallbackHeading = 0,
): SnappedPoint {
  if (!route || route.length < 2) {
    return { latitude: lat, longitude: lng, heading: fallbackHeading, routeIndex: 0 };
  }

  let minDist = Infinity;
  let closestIdx = 0;

  for (let i = 0; i < route.length; i++) {
    const d = haversineMeters(lat, lng, route[i].latitude, route[i].longitude);
    if (d < minDist) {
      minDist = d;
      closestIdx = i;
    }
  }

  // Look ~80 m ahead along the route for a stable heading
  let aheadIdx = closestIdx;
  let accumulated = 0;
  while (aheadIdx < route.length - 1 && accumulated < 80) {
    accumulated += haversineMeters(
      route[aheadIdx].latitude, route[aheadIdx].longitude,
      route[aheadIdx + 1].latitude, route[aheadIdx + 1].longitude,
    );
    aheadIdx++;
  }

  const heading = calcBearing(
    route[closestIdx].latitude, route[closestIdx].longitude,
    route[aheadIdx].latitude,   route[aheadIdx].longitude,
  );

  return {
    latitude: route[closestIdx].latitude,
    longitude: route[closestIdx].longitude,
    heading,
    routeIndex: closestIdx,
  };
}

/**
 * Total distance (metres) along the polyline starting from `fromIndex`.
 */
function remainingRouteDistanceMeters(route: LocationCoord[], fromIndex: number): number {
  let total = 0;
  for (let i = Math.max(fromIndex, 0); i < route.length - 1; i++) {
    total += haversineMeters(
      route[i].latitude, route[i].longitude,
      route[i + 1].latitude, route[i + 1].longitude,
    );
  }
  return total;
}

// ─── Component types ─────────────────────────────────────────────────────────

interface TrackingMapProps {
  driverLocation?: DriverLocationData | null;
  clientLocation?: { latitude: number; longitude: number } | null;
  destinationLocation?: { lat: number; lng: number } | null;
  rideStatus?: 'searching' | 'accepted' | 'driver_arrived' | 'in_progress' | 'completed';
  eta?: number;
  distance?: number;
  onRecenter?: () => void;
  showRecenterButton?: boolean;
  language?: 'ar' | 'fr' | 'en';
  /** Called whenever the route-based ETA (seconds) is recalculated */
  onEtaUpdate?: (etaSeconds: number, distanceMeters: number) => void;
  /** Pre-fetched route coordinates (from backend Directions API) */
  routeCoordinates?: LocationCoord[];
}

// ─── Main component ──────────────────────────────────────────────────────────

const TrackingMap: React.FC<TrackingMapProps> = ({
  driverLocation,
  clientLocation,
  destinationLocation,
  rideStatus = 'searching',
  eta = 0,
  distance = 0,
  onRecenter,
  showRecenterButton = true,
  language = 'en',
  onEtaUpdate,
  routeCoordinates,
}) => {
  const mapRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  // Route polylines
  const [driverRoute, setDriverRoute]           = useState<LocationCoord[]>([]);
  const [destinationRoute, setDestinationRoute] = useState<LocationCoord[]>([]);
  const [isLoadingRoute, setIsLoadingRoute]     = useState(false);

  // Snapped driver state (road-following)
  const [snappedDriver, setSnappedDriver] = useState<SnappedPoint | null>(null);
  const [routeProgressIndex, setRouteProgressIndex] = useState(0);

  // Displayed ETA / distance (may be overridden by route calculation)
  const [displayEta, setDisplayEta]           = useState(eta);
  const [displayDistance, setDisplayDistance] = useState(distance);

  // Misc refs
  const recenterButtonScale    = useRef(new Animated.Value(1)).current;
  const isAnimatingRef         = useRef(false);
  const iosAnimationLock       = useRef(false);
  const cameraUpdateInterval   = useRef<NodeJS.Timeout | null>(null);
  const lastCameraUpdate       = useRef(0);
  const lastCameraHeading      = useRef(0);
  const [hasAutoZoomed, setHasAutoZoomed] = useState(false);

  // ── Keep display ETA in sync with prop when we have no route yet ──────────
  useEffect(() => { setDisplayEta(eta); },      [eta]);
  useEffect(() => { setDisplayDistance(distance); }, [distance]);

  // ── Initial map region ────────────────────────────────────────────────────
  const initialRegion = useMemo(() => ({
    latitude:      clientLocation?.latitude  ?? 28.0339,
    longitude:     clientLocation?.longitude ?? 1.6596,
    latitudeDelta:  0.05,
    longitudeDelta: 0.05,
  }), []); // intentionally stable

  // ── Camera-follow helpers ─────────────────────────────────────────────────

  const stopCameraFollow = useCallback(() => {
    if (cameraUpdateInterval.current) {
      clearInterval(cameraUpdateInterval.current);
      cameraUpdateInterval.current = null;
    }
  }, []);

  const startCameraFollow = useCallback(() => {
    stopCameraFollow();
    const throttleMs = Platform.OS === 'ios' ? 1500 : 800;

    cameraUpdateInterval.current = setInterval(() => {
      const target = snappedDriver ?? (driverLocation
        ? { latitude: driverLocation.latitude, longitude: driverLocation.longitude, heading: driverLocation.heading ?? 0, routeIndex: 0 }
        : null);

      if (
        !mapRef.current || !target || isUserInteracting ||
        !isMapReady || isAnimatingRef.current || iosAnimationLock.current
      ) return;

      const now = Date.now();
      if (now - lastCameraUpdate.current < throttleMs) return;
      lastCameraUpdate.current = now;

      // Smooth heading transition
      const rawHeading = target.heading ?? 0;
      const smoothed   = lerpAngle(lastCameraHeading.current, rawHeading, 0.35);
      lastCameraHeading.current = smoothed;

      const isNav    = rideStatus === 'in_progress';
      const zoom     = isNav ? 17.5 : 11;
      const pitch    = isNav ? 55 : 0;
      const duration = Platform.OS === 'ios' ? 900 : 800;

      try {
        isAnimatingRef.current = true;
        mapRef.current.animateCamera(
          { center: { latitude: target.latitude, longitude: target.longitude }, pitch, heading: smoothed, zoom },
          { duration },
        );
        setTimeout(() => { isAnimatingRef.current = false; }, duration + 100);
      } catch (e) {
        isAnimatingRef.current = false;
      }
    }, throttleMs);
  }, [snappedDriver, driverLocation, isUserInteracting, rideStatus, isMapReady, stopCameraFollow]);

  // ── Start / stop camera loop when status or map readiness changes ─────────
  useEffect(() => {
    if (!isMapReady) return;

    if (rideStatus === 'in_progress' || rideStatus === 'accepted') {
      stopCameraFollow();
      iosAnimationLock.current = true;

      const zoom    = rideStatus === 'in_progress' ? 17.5 : 10;
      const pitch   = rideStatus === 'in_progress' ? 55 : 0;
      const heading = snappedDriver?.heading ?? driverLocation?.heading ?? 0;
      const lat     = snappedDriver?.latitude  ?? driverLocation?.latitude  ?? initialRegion.latitude;
      const lng     = snappedDriver?.longitude ?? driverLocation?.longitude ?? initialRegion.longitude;

      mapRef.current?.animateCamera({ center: { latitude: lat, longitude: lng }, pitch, heading, zoom }, { duration: 1000 });

      const delay = Platform.OS === 'ios' ? 1400 : 1100;
      setTimeout(() => {
        iosAnimationLock.current = false;
        startCameraFollow();
      }, delay);
    } else {
      stopCameraFollow();
    }

    return stopCameraFollow;
  }, [rideStatus, isMapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-zoom to fit both markers when ride is accepted ───────────────────
  useEffect(() => {
    if (rideStatus !== 'accepted' || hasAutoZoomed || !isMapReady || !mapRef.current) return;

    const attempt = (retry = 0) => {
      if (!driverLocation || !clientLocation) {
        if (retry < 6) setTimeout(() => attempt(retry + 1), 300);
        return;
      }
      const pts = [
        { latitude: driverLocation.latitude, longitude: driverLocation.longitude },
        clientLocation,
      ];
      if (destinationLocation) pts.push({ latitude: destinationLocation.lat, longitude: destinationLocation.lng });

      try {
        mapRef.current.fitToCoordinates(pts, {
          edgePadding: { top: 120, right: 60, bottom: 250, left: 60 },
          animated: true,
        });
        setHasAutoZoomed(true);
      } catch (e) { /* noop */ }
    };

    attempt();
  }, [rideStatus, driverLocation, clientLocation, isMapReady, hasAutoZoomed, destinationLocation]);

  useEffect(() => {
    if (rideStatus !== 'accepted') setHasAutoZoomed(false);
  }, [rideStatus]);

  // ── Fetch route polylines ─────────────────────────────────────────────────
  useEffect(() => {
    // Use pre-fetched route if available
    if (routeCoordinates && routeCoordinates.length > 0) {
      setDestinationRoute(routeCoordinates);
      return;
    }

    if (!driverLocation || !clientLocation) return;
    let cancelled = false;

    const fetch = async () => {
      setIsLoadingRoute(true);
      try {
        if (rideStatus === 'accepted') {
          const r = await routeService.getRoutePolyline(
            { latitude: driverLocation.latitude, longitude: driverLocation.longitude },
            clientLocation,
          );
          if (!cancelled) setDriverRoute(r);
        }
        if (rideStatus === 'in_progress' && destinationLocation) {
          const r = await routeService.getRoutePolyline(
            clientLocation,
            { latitude: destinationLocation.lat, longitude: destinationLocation.lng },
          );
          if (!cancelled) {
            setDestinationRoute(r);
            setRouteProgressIndex(0); // reset progress on new route
          }
        }
      } catch (e) {
        console.warn('Failed to fetch route polyline:', e);
      } finally {
        if (!cancelled) setIsLoadingRoute(false);
      }
    };

    fetch();

    return () => { cancelled = true; };
  }, [rideStatus, driverLocation, clientLocation, destinationLocation, routeCoordinates]); // fetch once per status change

  // ── Snap driver to route whenever driver location or routes update ─────────
  useEffect(() => {
    if (!driverLocation) return;

    const activeRoute = rideStatus === 'in_progress' ? destinationRoute : driverRoute;

    if (activeRoute.length >= 2) {
      const snapped = snapToRoute(
        driverLocation.latitude,
        driverLocation.longitude,
        activeRoute,
        driverLocation.heading ?? 0,
      );
      setSnappedDriver(snapped);

      if (rideStatus === 'in_progress') {
        setRouteProgressIndex(snapped.routeIndex);
      }
    } else {
      // No route yet — use raw GPS
      setSnappedDriver({
        latitude:   driverLocation.latitude,
        longitude:  driverLocation.longitude,
        heading:    driverLocation.heading ?? 0,
        routeIndex: 0,
      });
    }
  }, [driverLocation, driverRoute, destinationRoute, rideStatus]);

  // ── Recalculate ETA from remaining route distance ─────────────────────────
  useEffect(() => {
    if (rideStatus !== 'in_progress' || destinationRoute.length < 2) return;

    const remainingMeters = remainingRouteDistanceMeters(destinationRoute, routeProgressIndex);
    const speedMs  = (driverLocation?.speed && driverLocation.speed > 0.5) ? driverLocation.speed : 8.3; // ~30 km/h default
    const etaSecs  = Math.ceil(remainingMeters / speedMs);

    setDisplayEta(etaSecs);
    setDisplayDistance(remainingMeters);
    onEtaUpdate?.(etaSecs, remainingMeters);
  }, [routeProgressIndex, destinationRoute, driverLocation?.speed, rideStatus, onEtaUpdate]);

  // ── Remaining route = route from snapped index onward ────────────────────
  const remainingRoute = useMemo(() => {
    if (rideStatus !== 'in_progress' || destinationRoute.length < 2) return destinationRoute;
    return destinationRoute.slice(Math.max(routeProgressIndex - 1, 0));
  }, [destinationRoute, routeProgressIndex, rideStatus]);

  // ── Already-driven portion (grayed out) ──────────────────────────────────
  const drivenRoute = useMemo(() => {
    if (rideStatus !== 'in_progress' || destinationRoute.length < 2 || routeProgressIndex < 2) return [];
    return destinationRoute.slice(0, routeProgressIndex + 1);
  }, [destinationRoute, routeProgressIndex, rideStatus]);

  // ── Recenter button ───────────────────────────────────────────────────────
  const handleRecenter = useCallback(() => {
    Animated.sequence([
      Animated.timing(recenterButtonScale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.timing(recenterButtonScale, { toValue: 1.0, duration: 100, useNativeDriver: true }),
    ]).start();

    setIsUserInteracting(false);
    onRecenter?.();

    const target = snappedDriver ?? driverLocation;
    if (!target || !mapRef.current) return;

    const heading  = target.heading ?? 0;
    const isNav    = rideStatus === 'in_progress';
    mapRef.current.animateCamera(
      { center: { latitude: target.latitude, longitude: target.longitude }, pitch: isNav ? 55 : 0, heading, zoom: isNav ? 17.5 : 12 },
      { duration: 600 },
    );
  }, [snappedDriver, driverLocation, rideStatus, onRecenter, recenterButtonScale]);

  // Marker position: prefer snapped, fall back to raw
  const markerPos = snappedDriver ?? (driverLocation
    ? { latitude: driverLocation.latitude, longitude: driverLocation.longitude }
    : null);

  const etaMinutes = Math.ceil(displayEta / 60);
  const distKm     = (displayDistance / 1000).toFixed(1);

  if (!MapView) {
    return (
      <View style={styles.placeholderContainer}>
        <Text>Map loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        initialRegion={initialRegion}
        provider={PROVIDER_GOOGLE}
        onMapReady={() => setIsMapReady(true)}
        onPanDrag={() => setIsUserInteracting(true)}
        onTouchStart={() => setIsUserInteracting(true)}
        showsUserLocation={false}
        showsMyLocationButton={false}
        pitchEnabled={true}
        rotateEnabled={true}
        mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
      >
        {/* ── Driver marker (road-snapped) ─────────────────────────────── */}
        {markerPos && (
          <Marker
            coordinate={{ latitude: markerPos.latitude, longitude: markerPos.longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}           // keeps marker flat on the map during rotation
            tracksViewChanges={false}
          >
            <DriverMarker
              location={{ ...driverLocation, ...markerPos } as any}
              heading={snappedDriver?.heading ?? driverLocation?.heading}
              isVisible={true}
              mapRef={mapRef}
            />
          </Marker>
        )}

        {/* ── Client / pickup marker ────────────────────────────────────── */}
        {clientLocation && (
          <Marker
            coordinate={{ latitude: clientLocation.latitude, longitude: clientLocation.longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <ClientMarker location={clientLocation} isVisible={true} />
          </Marker>
        )}

        {/* ── Destination marker ────────────────────────────────────────── */}
        {destinationLocation && rideStatus !== 'completed' && (
          <Marker
            coordinate={{ latitude: destinationLocation.lat, longitude: destinationLocation.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.destinationMarker}>
              <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                <Path d="M21 10C21 17 12 23 12 23S3 17 3 10C3 5.03 7.03 1 12 1S21 5.03 21 10Z" fill="#FF3B30" stroke="white" strokeWidth="2" />
                <Path d="M12 6C10.9 6 10 6.9 10 8C10 9.1 10.9 10 12 10C13.1 10 14 9.1 14 8C14 6.9 13.1 6 12 6Z" fill="white" />
              </Svg>
            </View>
          </Marker>
        )}

        {/* ── Route: driver → pickup (blue) ─────────────────────────────── */}
        <RoutePolyline
          coordinates={driverRoute}
          strokeColor="#185ADC"
          strokeWidth={4}
          isVisible={rideStatus === 'accepted' && driverRoute.length > 0}
        />

        {/* ── Route: already driven portion (gray) ─────────────────────── */}
        <RoutePolyline
          coordinates={drivenRoute}
          strokeColor="#BBBBBB"
          strokeWidth={4}
          isVisible={rideStatus === 'in_progress' && drivenRoute.length > 0}
        />

        {/* ── Route: remaining journey (green) ─────────────────────────── */}
        <RoutePolyline
          coordinates={remainingRoute}
          strokeColor="#34C759"
          strokeWidth={4}
          isVisible={rideStatus === 'in_progress' && remainingRoute.length > 0}
        />
      </MapView>

      {/* ── Re-center button ─────────────────────────────────────────────── */}
      {showRecenterButton && isUserInteracting && (
        <Animated.View style={[styles.recenterButton, { transform: [{ scale: recenterButtonScale }] }]}>
          <TouchableOpacity onPress={handleRecenter} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path d="M12 8C9.79 8 8 9.79 8 12C8 14.21 9.79 16 12 16C14.21 16 16 14.21 16 12C16 9.79 14.21 8 12 8ZM12 14C10.9 14 10 13.1 10 12C10 10.9 10.9 10 12 10C13.1 10 14 10.9 14 12C14 13.1 13.1 14 12 14Z" fill="#185ADC" />
              <Path d="M12 2L12 8M12 16L12 22M6 12H8M16 12H18" stroke="#185ADC" strokeWidth="2" strokeLinecap="round" />
            </Svg>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── ETA pill ─────────────────────────────────────────────────────── */}
      {displayEta > 0 && rideStatus !== 'completed' && (
        <View style={styles.etaContainer}>
          <Text style={styles.etaText}>{etaMinutes} min</Text>
          {displayDistance > 0 && (
            <Text style={styles.distanceText}>{distKm} km</Text>
          )}
          {rideStatus === 'in_progress' && (
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:            { flex: 1, position: 'relative' },
  placeholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8EEFB' },
  recenterButton: {
    position: 'absolute', bottom: 100, right: 20,
    backgroundColor: 'white', borderRadius: 25, width: 50, height: 50,
    justifyContent: 'center', alignItems: 'center',
    elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4,
  },
  destinationMarker: { backgroundColor: 'white', borderRadius: 16, padding: 4, elevation: 3 },
  etaContainer: {
    position: 'absolute', top: 50, left: 20,
    backgroundColor: 'rgba(24, 90, 220, 0.92)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
  },
  etaText:      { color: 'white', fontSize: 18, fontWeight: '700' },
  distanceText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 1 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  liveDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#34C759', marginRight: 4,
  },
  liveText: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
});

export default TrackingMap;