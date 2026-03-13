import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import { socketService } from '../services/socket';

export interface DriverLocationData {
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

interface UseDriverLocationOptions {
  accuracy?: Location.Accuracy;
  timeInterval?: number;
  distanceInterval?: number;
  enableBackground?: boolean;
  jitterThreshold?: number; // meters
  enableAveraging?: boolean;
  averagingWindow?: number;
  currentRide?: any; // Add currentRide for arrival detection
}

export const useDriverLocation = (options: UseDriverLocationOptions = {}) => {
  const {
    accuracy = Location.Accuracy.Highest,
    timeInterval = 1000,
    distanceInterval = 5,
    enableBackground = false,
    jitterThreshold = 2, // meters
    enableAveraging = false,
    averagingWindow = 3,
    currentRide,
  } = options;

  const [locationData, setLocationData] = useState<DriverLocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(false);

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const lastLocationRef = useRef<Location.LocationObject | null>(null);
  const hasArrivedRef = useRef<boolean>(false); // Prevent duplicate arrival events
  const currentRideRef = useRef<any>(currentRide);
  
  // GPS jitter handling state
  const locationHistoryRef = useRef<Location.LocationObject[]>([]);

  // Reset arrival flag when currentRide changes and keep latest ride in ref
  useEffect(() => {
    currentRideRef.current = currentRide ?? null;
    hasArrivedRef.current = false;
    if (currentRide) {
      console.log('🔄 Reset arrival flag for new ride:', currentRide.rideId);
    } else {
      console.log('🔄 Cleared current ride reference');
    }
  }, [currentRide?.rideId]);

  // Calculate distance between two coordinates in meters
  const calculateDistance = useCallback((coords1: any, coords2: any): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (coords2.latitude - coords1.latitude) * Math.PI / 180;
    const dLon = (coords2.longitude - coords1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(coords1.latitude * Math.PI / 180) * Math.cos(coords2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Apply moving average to smooth GPS coordinates
  const applyMovingAverage = useCallback((location: Location.LocationObject): Location.LocationObject => {
    if (!enableAveraging || averagingWindow <= 1) {
      return location;
    }

    // Add new location to history
    locationHistoryRef.current.push(location);
    
    // Keep only the latest N readings
    if (locationHistoryRef.current.length > averagingWindow) {
      locationHistoryRef.current.shift();
    }

    // Calculate average coordinates
    const history = locationHistoryRef.current;
    const avgLatitude = history.reduce((sum, loc) => sum + loc.coords.latitude, 0) / history.length;
    const avgLongitude = history.reduce((sum, loc) => sum + loc.coords.longitude, 0) / history.length;
    const avgAltitude = history.reduce((sum, loc) => sum + (loc.coords.altitude || 0), 0) / history.length;
    const avgAccuracy = history.reduce((sum, loc) => sum + (loc.coords.accuracy || 0), 0) / history.length;

    return {
      ...location,
      coords: {
        latitude: avgLatitude,
        longitude: avgLongitude,
        altitude: avgAltitude,
        accuracy: avgAccuracy,
        altitudeAccuracy: location.coords.altitudeAccuracy,
        heading: location.coords.heading,
        speed: location.coords.speed,
      },
      timestamp: location.timestamp,
    };
  }, [enableAveraging, averagingWindow]);

  // Filter GPS jitter based on movement threshold
  const shouldFilterJitter = useCallback((newLocation: Location.LocationObject, lastLocation: Location.LocationObject): boolean => {
    const distance = calculateDistance(lastLocation.coords, newLocation.coords);
    
    // Filter out movements smaller than jitter threshold
    return distance < jitterThreshold;
  }, [calculateDistance, jitterThreshold]);

  // Start high-frequency location tracking
  const startTracking = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        setIsLoading(false);
        return;
      }

      // Request background permissions if needed
      if (enableBackground) {
        const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus !== 'granted') {
          console.warn('Background location permission denied');
        }
      }

      // Get initial location
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy,
      });

      lastLocationRef.current = initialLocation;

      // Start watching position with high frequency
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy,
          timeInterval,
          distanceInterval,
        },
        (location) => {
          const activeRide = currentRideRef.current;
          const pickupCoords = activeRide?.pickupLocation
            ? {
                latitude: activeRide.pickupLocation.lat,
                longitude: activeRide.pickupLocation.lng,
              }
            : null;

          let rawDistanceToPickup: number | null = null;
          if (pickupCoords) {
            rawDistanceToPickup = calculateDistance(
              { latitude: location.coords.latitude, longitude: location.coords.longitude },
              pickupCoords
            );

            if (activeRide && !hasArrivedRef.current && rawDistanceToPickup <= 45) {
              console.log('🚗 Driver arrived at pickup location (raw distance:', rawDistanceToPickup.toFixed(2), 'm)');
              hasArrivedRef.current = true;
              try {
                socketService.driverArrived(activeRide.rideId);
                console.log('📤 Emitted driver_arrived event for ride:', activeRide.rideId);
              } catch (error) {
                console.error('❌ Failed to emit driver_arrived event:', error);
                hasArrivedRef.current = false;
              }
            }
          }

          // Apply moving average if enabled
          const smoothedLocation = applyMovingAverage(location);

          // Only process if location has changed significantly
          const bypassJitterFiltering = rawDistanceToPickup !== null && rawDistanceToPickup <= 50;

          if (lastLocationRef.current && !bypassJitterFiltering) {
            // Check for GPS jitter - filter out small movements when driver appears stationary
            if (shouldFilterJitter(smoothedLocation, lastLocationRef.current)) {
              // Ignore this update as it's likely GPS noise
              return;
            }

            const distance = calculateDistance(
              lastLocationRef.current.coords,
              smoothedLocation.coords
            );
            
            // Ignore tiny movements to reduce noise
            if (distance < distanceInterval / 1000) { // Convert meters to km
              return;
            }
          }

          lastLocationRef.current = smoothedLocation;

          const driverData: DriverLocationData = {
            driverId: '', // Will be set by socket service
            latitude: smoothedLocation.coords.latitude,
            longitude: smoothedLocation.coords.longitude,
            heading: smoothedLocation.coords.heading !== null && smoothedLocation.coords.heading !== undefined ? smoothedLocation.coords.heading : undefined,
            speed: smoothedLocation.coords.speed !== null && smoothedLocation.coords.speed !== undefined ? smoothedLocation.coords.speed : undefined,
            timestamp: Date.now(),
          };

          setLocationData(driverData);

          // Send to socket service
          socketService.updateLocation({
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            heading: location.coords.heading !== null && location.coords.heading !== undefined ? location.coords.heading : undefined,
          });
        }
      );

      setIsTracking(true);
      setIsLoading(false);
      console.log('📍 Driver location tracking started');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start location tracking';
      setError(errorMessage);
      setIsLoading(false);
      console.error('❌ Driver location tracking error:', err);
    }
  }, [accuracy, timeInterval, distanceInterval, enableBackground]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setIsTracking(false);
    console.log('📍 Driver location tracking stopped');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    locationData,
    error,
    isLoading,
    isTracking,
    startTracking,
    stopTracking,
  };
};

// Helper function to calculate distance between coordinates
function calculateDistance(
  coord1: Location.LocationObjectCoords,
  coord2: Location.LocationObjectCoords
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.latitude * Math.PI / 180) *
    Math.cos(coord2.latitude * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
