import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Image, Linking, Animated, PanResponder, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import Svg, { Path } from 'react-native-svg';
import { socketService } from '../../services/socket';
import { api } from '../../services/api';
import { getRoadRoute, getDistanceFromLatLonInKm, LocationCoord } from '../../services/directions';
import { snapToRoad, getNearestRoadLocation, shouldSnapToRoad, NearestRoadLocation, snapToNearestPolylinePoint } from '../../services/roadsService';
import ActiveRideBottomSheet from './ActiveRideBottomSheet';
import CancelMissionModal from '../common/CancelMissionModal';
import { Language, getTranslation } from '../../utils/translations';
import Text from '../ui/Text';
import { useLanguage } from '../../contexts/LanguageContext';
import { useMissionTracking } from '../../hooks/useMissionTracking';
import { DISTANCE_THRESHOLD, formatDistance, formatETA } from '../../utils/distanceUtils';
import RoutePolyline from '../map/RoutePolyline';
import { useDriverAnimation } from '../../hooks/useDriverAnimation';
import { getTotalRouteDistance } from '../../utils/routeUtils';

const { width: deviceWidth, height: deviceHeight } = Dimensions.get('window');

// Import Google Maps
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
let PROVIDER_GOOGLE: any = null;

try {
  const maps = require('react-native-maps');
  MapView = maps.default || maps;
  Marker = maps.Marker || (maps.default && maps.default.Marker);
  Polyline = maps.Polyline || (maps.default && maps.default.Polyline);
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE || 'google';
} catch (error) {
  console.warn('react-native-maps not available, using placeholder');
}

interface HomeScreenProps {
  onSelectAddress: () => void;
  onBecomeDriver: () => void;
  onProfile: () => void;
  onCancelRide?: () => void;
  activeRide?: {
    rideId: string;
    driverId?: string;
    status: string;
    pickupLocation: { lat: number; lng: number; address: string };
    destinationLocation: { lat: number; lng: number; address: string };
    pricing?: { totalPrice: number };
    eta?: { driverToClient: number; clientToDestination: number };
    distance?: { driverToClient: number; clientToDestination: number };
    driverPhone?: string;
  } | null;
  driverLocation?: { lat: number; lng: number } | null;
  language?: Language;
  selectedDestination?: {
    lat: number;
    lng: number;
    placeDescription: string;
    routeData?: any;
  } | null;
}

type RideStatus = 'accepted' | 'driver_arrived' | 'in_progress' | 'completed';

// Rotating Arrow Marker Component for Driver
const RotatingArrowMarker: React.FC<{ heading: number }> = ({ heading }) => {
  return (
    <View style={styles.arrowMarkerContainer}>
      <View style={[styles.arrowMarker, { transform: [{ rotate: `${heading}deg` }] }]}>
        <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 2L12 22M12 2L6 10M12 2L18 10"
            stroke="#FFFFFF"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    </View>
  );
};

// Navigation Banner Component (Top instruction)
const NavigationBanner: React.FC<{
  instruction: string;
  distance: string;
  isVisible: boolean;
}> = ({ instruction, distance, isVisible }) => {
  if (!isVisible) return null;
  
  return (
    <View style={styles.navigationBanner}>
      <View style={styles.navigationBannerContent}>
        <Text style={styles.navigationInstruction}>{instruction}</Text>
        <Text style={styles.navigationDistance}>{distance}</Text>
      </View>
    </View>
  );
};

// Navigation Panel Component (Bottom panel during navigation)
const NavigationPanel: React.FC<{
  eta: string;
  distance: string;
  isVisible: boolean;
}> = ({ eta, distance, isVisible }) => {
  if (!isVisible) return null;
  
  return (
    <View style={styles.navigationPanel}>
      <View style={styles.navigationPanelContent}>
        <View style={styles.navigationStat}>
          <Text style={styles.navigationStatValue}>{eta}</Text>
          <Text style={styles.navigationStatLabel}>ETA</Text>
        </View>
        <View style={styles.navigationDivider} />
        <View style={styles.navigationStat}>
          <Text style={styles.navigationStatValue}>{distance}</Text>
          <Text style={styles.navigationStatLabel}>Remaining</Text>
        </View>
      </View>
    </View>
  );
};

// Re-center Button Component
const RecenterButton: React.FC<{
  onPress: () => void;
  isVisible: boolean;
}> = ({ onPress, isVisible }) => {
  if (!isVisible) return null;
  
  return (
    <TouchableOpacity style={styles.recenterButton} onPress={onPress}>
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
          stroke="#185ADC"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M12 2V4M12 20V22M2 12H4M20 12H22"
          stroke="#185ADC"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
    </TouchableOpacity>
  );
};

const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectAddress,
  onBecomeDriver,
  onProfile,
  onCancelRide,
  activeRide,
  driverLocation,
  language = 'ar',
  selectedDestination,
}) => {
  const { t, isRTL } = useLanguage();
  const mapRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const locationData = useRef<{ speed: number }>({ speed: 0 });


  // NEW: Use professional mission tracking hook with jitter handling
  const { driverLocation: trackedDriverLocation, eta, distance, isTracking } = useMissionTracking({
    rideId: activeRide?.rideId,
    enableAutoFollow: true,
    distanceThreshold: DISTANCE_THRESHOLD,
    jitterThreshold: 2, // meters
    enableAveraging: false, // Can be enabled for more smoothing
    clientLocation: activeRide?.pickupLocation ? {
      lat: activeRide.pickupLocation.lat,
      lng: activeRide.pickupLocation.lng,
    } : userLocation ? {
      lat: userLocation.coords.latitude,
      lng: userLocation.coords.longitude,
    } : null,
    destinationLocation: activeRide?.destinationLocation ? {
      lat: activeRide.destinationLocation.lat,
      lng: activeRide.destinationLocation.lng,
    } : null,
  });

  useEffect(() => {
  if (trackedDriverLocation?.speed) {
    locationData.current.speed = trackedDriverLocation.speed;
  }
}, [trackedDriverLocation]);


  // Debug: Log trackedDriverLocation changes
  useEffect(() => {
    if (trackedDriverLocation) {
      console.log('🏠 HomeScreen: trackedDriverLocation updated:', {
        latitude: trackedDriverLocation.latitude,
        longitude: trackedDriverLocation.longitude,
        heading: trackedDriverLocation.heading,
      });
    }
  }, [trackedDriverLocation]);

  // Debug logging
  useEffect(() => {
    if (activeRide) {
      console.log('🏠 HomeScreen - activeRide:', activeRide.rideId, 'status:', activeRide.status);
      console.log('🏠 HomeScreen - pickupLocation:', activeRide.pickupLocation);
      console.log('🏠 HomeScreen - destinationLocation:', activeRide.destinationLocation);
      console.log('🏠 HomeScreen - eta:', activeRide.eta);
      console.log('🏠 HomeScreen - distance:', activeRide.distance);
      console.log('🏠 HomeScreen - useMissionTracking rideId:', activeRide.rideId);
    }
    if (driverLocation) {
      console.log('🏠 HomeScreen - driverLocation:', driverLocation);
    }
    if (trackedDriverLocation) {
      console.log('🏠 HomeScreen - trackedDriverLocation:', trackedDriverLocation);
    }
  }, [activeRide, driverLocation, trackedDriverLocation]);

  // Register FCM token on mount
  useEffect(() => {
    const registerFCMToken = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status === 'granted') {
          const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: 'f5594dc1-c2f6-41cc-8012-24fd342ac7d5',
          });
          await api.updateFCMToken(tokenData.data);
          console.log('✅ FCM token registered from HomeScreen');
        }
      } catch (error) {
        console.log('ℹ️ Could not register FCM token:', error);
      }
    };
    registerFCMToken();
  }, []);

  // Initialize with Algeria coordinates as fallback
  const [mapRegion, setMapRegion] = useState({
    latitude: 28.0339,
    longitude: 1.6596,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // Additional Navigation Camera State (new variables only)
  const [showRecenterButton, setShowRecenterButton] = useState(false);
  const [snappedDriverLocation, setSnappedDriverLocation] = useState<LocationCoord | null>(null);
  const [snappedClientLocation, setSnappedClientLocation] = useState<LocationCoord | null>(null);
  const [roadSnappingData, setRoadSnappingData] = useState<NearestRoadLocation | null>(null);
  const [previousDriverLocation, setPreviousDriverLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [cameraHeading, setCameraHeading] = useState(0);
  const [deviceHeading, setDeviceHeading] = useState(0);
  
  // Smooth driver marker animation refs
  const animatedDriverPositionRef = useRef<LocationCoord | null>(null);
  const driverAnimationProgress = useRef<number>(0);
  const driverAnimationStart = useRef<LocationCoord | null>(null);
  const driverAnimationEnd = useRef<LocationCoord | null>(null);

  // Road route states
  const [driverToPickupRoute, setDriverToPickupRoute] = useState<LocationCoord[] | null>(null);
  const [pickupToDestinationRoute, setPickupToDestinationRoute] = useState<LocationCoord[] | null>(null);
  const [routeSteps, setRouteSteps] = useState<any[]>([]); // Store turn-by-turn instructions
  const [currentStepIndex, setCurrentStepIndex] = useState(0); // Track current step
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Driver animation for pickup route (accepted status)
  const { animatedPosition: animatedDriverPosition, isAnimating } = useDriverAnimation({
    routeCoordinates: driverToPickupRoute || [],
    driverLocation: trackedDriverLocation || { latitude: 0, longitude: 0 },
    speed: 10, // 10 m/s ~36 km/h
    updateInterval: 1000,
  });

  // Real-time ETA updates based on driver progress
  useEffect(() => {
    if (!animatedDriverPosition || !activeRide) return;

    const remainingProgress = 1 - animatedDriverPosition.progress;
    const totalDuration = activeRide.eta?.driverToClient || 0; // Total estimated time in seconds
    const remainingETA = Math.round(remainingProgress * totalDuration);

    // Update remaining time display
    if (remainingETA > 0) {
      const minutes = Math.ceil(remainingETA / 60);
      setRemainingTime(`${minutes} min`);
    } else {
      setRemainingTime('Arrived');
    }

    // Calculate remaining distance
    if (driverToPickupRoute && animatedDriverPosition.progress < 1) {
      const totalDistance = getTotalRouteDistance(driverToPickupRoute);
      const remainingDistanceMeters = (1 - animatedDriverPosition.progress) * totalDistance;
      setRemainingDistance(formatDistance(remainingDistanceMeters));
    }
  }, [animatedDriverPosition, activeRide, driverToPickupRoute]);

  // Navigation mode states
  const [isNavigating, setIsNavigating] = useState(false);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [driverHeading, setDriverHeading] = useState(0);
  const [navigationInstruction, setNavigationInstruction] = useState('Continue straight');
  const [remainingDistance, setRemainingDistance] = useState('0 km');
  const [remainingTime, setRemainingTime] = useState('0 min');
  const cameraUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const lastCameraUpdate = useRef<number>(0);
  const currentZoom = useRef<number>(19);
  const targetZoom = useRef<number>(19);
  const lastCameraHeading = useRef<number>(0);

  // Get user's current location on mount
  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();

        if (status !== 'granted') {
          console.log('Location permission not granted');
          setLocationPermissionGranted(false);
          return;
        }

        setLocationPermissionGranted(true);

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setUserLocation(location);

        const newRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };

        setMapRegion(newRegion);

        if (mapRef.current && isMapReady) {
          // DISABLE: Don't move camera if ride is accepted - handled by stable effect
          if (activeRide?.status !== 'accepted') {
            mapRef.current.animateToRegion(newRegion, 1000);
          } else {
            console.log('🗺️ Client: Skipping user location camera movement - ride accepted');
          }
        }
      } catch (error) {
        console.error('Error getting location:', error);
        setLocationPermissionGranted(false);
      }
    };

    getCurrentLocation();
  }, []);

  // Center map on user location when map becomes ready - DISABLED FOR ACCEPTED STATUS
  useEffect(() => {
    if (isMapReady && userLocation && mapRef.current) {
      // DISABLE: Don't move camera if ride is accepted - handled by stable effect
      if (activeRide?.status === 'accepted') {
        console.log('🗺️ Client: Skipping map ready camera movement - ride accepted');
        return;
      }
      
      const region = {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

      setTimeout(() => {
        mapRef.current?.animateToRegion(region, 1000);
      }, 300);
    }
  }, [isMapReady, userLocation, activeRide?.status]);

  // Fetch road route when driver location or pickup changes
 const fetchDriverToPickupRoute = useCallback(async () => {
  if (!trackedDriverLocation || !activeRide) return;

  // SNAP the start point BEFORE asking for the route
  const snappedStart = await getNearestRoadLocation(
    trackedDriverLocation.latitude, 
    trackedDriverLocation.longitude
  );
  
  const start: LocationCoord = snappedStart 
    ? { latitude: snappedStart.lat, longitude: snappedStart.lng }
    : { latitude: trackedDriverLocation.latitude, longitude: trackedDriverLocation.longitude };

  const end: LocationCoord = {
    latitude: activeRide.pickupLocation?.lat || 0,
    longitude: activeRide.pickupLocation?.lng || 0,
  };

  const route = await getRoadRoute(start, end);
  setDriverToPickupRoute(route.coordinates);
  setRouteSteps(route.steps || []); // Store turn-by-turn instructions
  setCurrentStepIndex(0); // Reset to first step
}, [trackedDriverLocation, activeRide]);

  // Fetch road route from pickup to destination when ride starts
  const fetchPickupToDestinationRoute = useCallback(async () => {
    if (!activeRide || activeRide.status !== 'in_progress') return;

    const pickupLat = activeRide.pickupLocation?.lat || userLocation?.coords.latitude;
    const pickupLng = activeRide.pickupLocation?.lng || userLocation?.coords.longitude;
    const destLat = activeRide.destinationLocation?.lat;
    const destLng = activeRide.destinationLocation?.lng;

    if (!pickupLat || !pickupLng || !destLat || !destLng) return;

    setIsLoadingRoute(true);
    try {
      const start: LocationCoord = {
        latitude: pickupLat,
        longitude: pickupLng,
      };
      const end: LocationCoord = {
        latitude: destLat,
        longitude: destLng,
      };

      const route = await getRoadRoute(start, end);
      console.log('🛣️ Pickup->Destination route fetched:', route.coordinates.length, 'points');
      console.log('🛣️ Route steps:', route.steps?.length || 0, 'turn instructions');
      setPickupToDestinationRoute(route.coordinates);
      setRouteSteps(route.steps || []); // Store turn-by-turn instructions
      setCurrentStepIndex(0); // Reset to first step
    } catch (error) {
      console.error('Failed to fetch destination route:', error);
    } finally {
      setIsLoadingRoute(false);
    }
  }, [activeRide, userLocation]);

  // Fetch driver to pickup route when locations change - STABILITY FIX
  useEffect(() => {
    if (activeRide && trackedDriverLocation && activeRide.status !== 'in_progress') {
      // Only fetch route if we don't have one yet, or if driver moved significantly (>100m)
      if (!driverToPickupRoute || driverToPickupRoute.length === 0) {
        console.log('🛣️ Client: No route exists, fetching initial driver-to-pickup route');
        fetchDriverToPickupRoute();
      } else {
        // Check if driver moved significantly from route start
        const routeStart = driverToPickupRoute[0];
        const distanceFromStart = getDistanceFromLatLonInKm(
          trackedDriverLocation.latitude, trackedDriverLocation.longitude,
          routeStart.latitude, routeStart.longitude
        ) * 1000;
        
        // Only recalculate if driver moved more than 100m from route start
        if (distanceFromStart > 100) {
          console.log('🛣️ Client: Driver moved significantly (>100m), recalcating route');
          fetchDriverToPickupRoute();
        } else {
          console.log('🛣️ Client: Driver movement minor, keeping existing route for stability');
        }
      }
    }
  }, [activeRide?.rideId, activeRide?.status, trackedDriverLocation?.latitude, trackedDriverLocation?.longitude, fetchDriverToPickupRoute, driverToPickupRoute]);

  // Fetch pickup to destination route when ride starts
  useEffect(() => {
    if (activeRide?.status === 'in_progress') {
      fetchPickupToDestinationRoute();
    }
  }, [activeRide?.status, fetchPickupToDestinationRoute]);

  // Clear routes when ride ends
  useEffect(() => {
    if (!activeRide) {
      setDriverToPickupRoute(null);
      setPickupToDestinationRoute(null);
    }
  }, [activeRide]);

  // Auto-enable navigation mode when ride is accepted or in progress - FIXED: Skip accepted status
  useEffect(() => {
    // FIXED: Don't auto-enable navigation for accepted status - this causes camera movements
    const isAcceptedStatus = activeRide?.status === 'accepted' || activeRide?.status === 'driver_arriving';
    if (isAcceptedStatus) {
      console.log('🗺️ Client: Skipping auto-navigation mode for accepted status - prevents camera movements');
      setIsNavigating(false); // Explicitly disable navigation for accepted status
    } else if (activeRide?.status === 'in_progress') {
      setIsNavigating(true); // Only enable for in_progress
    } else if (!activeRide || activeRide.status === 'completed') {
      setIsNavigating(false);
    }
  }, [activeRide?.status]);

  // Calculate driver heading based on location changes
  const lastDriverLocation = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (trackedDriverLocation && lastDriverLocation.current) {
      const lat1 = lastDriverLocation.current.lat;
      const lon1 = lastDriverLocation.current.lng;
      const lat2 = trackedDriverLocation.latitude;
      const lon2 = trackedDriverLocation.longitude;

      // Calculate bearing
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const lat1Rad = lat1 * Math.PI / 180;
      const lat2Rad = lat2 * Math.PI / 180;

      const y = Math.sin(dLon) * Math.cos(lat2Rad);
      const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
                Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

      let bearing = Math.atan2(y, x) * 180 / Math.PI;
      bearing = (bearing + 360) % 360;

      // Only update heading if moved enough
      const distance = getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2);
      if (distance > 0.001) { // Moved more than 1 meter
        setDriverHeading(bearing);
      }
    }
    lastDriverLocation.current = trackedDriverLocation ? {
      lat: trackedDriverLocation.latitude,
      lng: trackedDriverLocation.longitude
    } : null;
  }, [trackedDriverLocation]);

// Center map on user location when map becomes ready - DUPLICATE DISABLED FOR ACCEPTED STATUS
useEffect(() => {
  if (isMapReady && userLocation && mapRef.current) {
    // DISABLE: Don't move camera if ride is accepted - handled by stable effect
    if (activeRide?.status === 'accepted') {
      console.log('🗺️ Client: Skipping duplicate map ready camera movement - ride accepted');
      return;
    }
    
    const region = {
      latitude: userLocation.coords.latitude,
      longitude: userLocation.coords.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };

    setTimeout(() => {
      mapRef.current?.animateToRegion(region, 1000);
    }, 300);
  }
}, [isMapReady, userLocation, activeRide?.status]);

// Calculate bearing between two points
  const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  };

  // Calculate route-based heading (follow route direction, not GPS) - Enhanced for Google Maps
  const calculateRouteHeading = useCallback((): number => {
    if (!snappedDriverLocation) return driverHeading;

    // Use snapped location for more accurate heading
    const currentLocation = {
      lat: snappedDriverLocation.latitude,
      lng: snappedDriverLocation.longitude
    };

    // Determine which route to use based on ride status
    const activeRoute = activeRide?.status === 'in_progress' 
      ? pickupToDestinationRoute 
      : driverToPickupRoute;

    if (!activeRoute || activeRoute.length < 2) {
      // Fallback to GPS heading if no route
      return driverHeading;
    }

    // Find closest point on route to snapped location
    let minDistance = Infinity;
    let closestIndex = 0;

    activeRoute.forEach((point, index) => {
      const dist = getDistanceFromLatLonInKm(
        currentLocation.lat,
        currentLocation.lng,
        point.latitude,
        point.longitude
      );
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = index;
      }
    });

    // Enhanced look-ahead: 50-100 meters to prevent jittering
    let lookAheadIndex = closestIndex;
    let lookAheadDistance = 0;
    const minLookAhead = 0.08; // 80 meters for smoother heading
    const maxLookAhead = 0.15; // 150 meters maximum

    while (lookAheadIndex < activeRoute.length - 1 && lookAheadDistance < minLookAhead) {
      lookAheadIndex++;
      lookAheadDistance += getDistanceFromLatLonInKm(
        activeRoute[lookAheadIndex - 1].latitude,
        activeRoute[lookAheadIndex - 1].longitude,
        activeRoute[lookAheadIndex].latitude,
        activeRoute[lookAheadIndex].longitude
      );
    }

    // If we can't look far enough ahead, use the next available point
    if (lookAheadIndex >= activeRoute.length - 1 && closestIndex < activeRoute.length - 1) {
      lookAheadIndex = closestIndex + 1;
    }
    
    const aheadPoint = activeRoute[lookAheadIndex];
    
    return calculateBearing(
      currentLocation.lat,
      currentLocation.lng,
      aheadPoint.latitude,
      aheadPoint.longitude
    );
  }, [snappedDriverLocation, activeRide?.status, pickupToDestinationRoute, driverToPickupRoute, driverHeading]);

  // Update navigation data (ETA, distance, instructions)
  const updateNavigationData = useCallback(() => {
    if (!driverLocation || !activeRide) return;

    const destLat = activeRide.destinationLocation?.lat;
    const destLng = activeRide.destinationLocation?.lng;
    
    if (!destLat || !destLng) return;

    // Calculate distance to destination
    const distanceKm = getDistanceFromLatLonInKm(
      driverLocation.lat,
      driverLocation.lng,
      destLat,
      destLng
    );

    // Estimate time (assume avg speed 30km/h)
    const timeMinutes = Math.ceil((distanceKm / 30) * 60);

    setRemainingDistance(`${distanceKm.toFixed(1)} km`);
    setRemainingTime(`${timeMinutes} min`);

    // Calculate bearing to destination for turn instruction
    const bearing = calculateBearing(
      driverLocation.lat,
      driverLocation.lng,
      destLat,
      destLng
    );

    // Generate turn instruction based on bearing difference
    const headingDiff = (bearing - driverHeading + 360) % 360;
    
    if (headingDiff < 20 || headingDiff > 340) {
      setNavigationInstruction('Continue straight');
    } else if (headingDiff >= 20 && headingDiff < 60) {
      setNavigationInstruction('Turn slight right');
    } else if (headingDiff >= 60 && headingDiff < 120) {
      setNavigationInstruction('Turn right');
    } else if (headingDiff >= 120 && headingDiff < 160) {
      setNavigationInstruction('Turn sharp right');
    } else if (headingDiff >= 200 && headingDiff < 240) {
      setNavigationInstruction('Turn sharp left');
    } else if (headingDiff >= 240 && headingDiff < 300) {
      setNavigationInstruction('Turn left');
    } else if (headingDiff >= 300 && headingDiff <= 340) {
      setNavigationInstruction('Turn slight left');
    } else {
      setNavigationInstruction('Make a U-turn');
    }
  }, [driverLocation, activeRide, driverHeading]);

  // Update navigation data periodically
  useEffect(() => {
    if (isNavigating) {
      updateNavigationData();
      const interval = setInterval(updateNavigationData, 2000);
      return () => clearInterval(interval);
    }
  }, [isNavigating, updateNavigationData]);

  // 🛣️ ENHANCED SNAP TO ROAD FUNCTION - Always align with route start point during rides
  // 🛣️ FIXED SNAP TO ROAD - Ensures marker sits EXACTLY at the start of the blue line
const snapDriverToRoad = useCallback(async (rawLocation: LocationCoord): Promise<LocationCoord> => {
  console.log('🛣️ Client: snapDriverToRoad START');
  console.log('🛣️ Client: Input location:', rawLocation);
  
  try {
    // 1. Identify the active route array being used by the Polyline
    const activeRoute = activeRide?.status === 'in_progress' 
      ? pickupToDestinationRoute 
      : driverToPickupRoute;

    console.log('🛣️ Client: Active route status:', activeRide?.status);
    console.log('🛣️ Client: Active route length:', activeRoute?.length || 0);

    // 2. If we have a route, FORCE the marker to exist ON that route
    if (activeRoute && activeRoute.length > 0) {
      const routeStart = activeRoute[0];
      
      console.log('🛣️ Client: Route start point:', routeStart);
      
      // Calculate distance to the route start
      const distanceToStart = getDistanceFromLatLonInKm(
        rawLocation.latitude, rawLocation.longitude,
        routeStart.latitude, routeStart.longitude
      ) * 1000;

      // MISSION CRITICAL: If the driver is within 50m of the pickup/start, 
      // we force the marker to the EXACT first point of the blue line.
      if (distanceToStart < 50) {
        setSnappedDriverLocation(routeStart);
        setRoadSnappingData({
          lat: routeStart.latitude,
          lng: routeStart.longitude,
          originalLat: rawLocation.latitude,
          originalLng: rawLocation.longitude,
          distance: distanceToStart,
        });
        return routeStart;
      }

      // If further away, find the closest point on the existing blue line
      const snapped = snapToNearestPolylinePoint(rawLocation, activeRoute);
      setSnappedDriverLocation({ latitude: snapped.latitude, longitude: snapped.longitude });
      return { latitude: snapped.latitude, longitude: snapped.longitude };
    }

    // 3. Fallback to Roads API only if no mission is active
    const snappedData = await getNearestRoadLocation(rawLocation.latitude, rawLocation.longitude);
    if (snappedData) {
      const result = { latitude: snappedData.lat, longitude: snappedData.lng };
      setSnappedDriverLocation(result);
      return result;
    }

    return rawLocation;
  } catch (error) {
    return rawLocation;
  }
}, [activeRide?.status, pickupToDestinationRoute, driverToPickupRoute]);

  // 🚀 IMMEDIATE SNAPPING ON APP LOAD - Force driver marker to route start when app restarts
  useEffect(() => {
    if (activeRide && trackedDriverLocation && (activeRide.status === 'accepted' || activeRide.status === 'in_progress')) {
      console.log('🚀 Client: APP LOAD DETECTED - Forcing immediate driver marker snap to route start');
      
      // Force immediate snapping without waiting for GPS updates
      const rawLocation = {
        latitude: trackedDriverLocation.latitude,
        longitude: trackedDriverLocation.longitude
      };
      
      snapDriverToRoad(rawLocation);
    }
  }, [activeRide?.rideId, activeRide?.status, trackedDriverLocation, snapDriverToRoad]);

  // 🛣️ SNAP CLIENT LOCATION TO ROAD - Same as Driver map
  const snapClientToRoad = useCallback(async (rawClientLocation: LocationCoord): Promise<LocationCoord> => {
    console.log('🛣️ Client: snapClientToRoad START');
    console.log('🛣️ Client: Input location:', rawClientLocation);
    
    try {
      console.log('🛣️ Client: Calling getNearestRoadLocation API...');
      const snappedData = await getNearestRoadLocation(rawClientLocation.latitude, rawClientLocation.longitude);
      
      console.log('🛣️ Client: API response received:', snappedData);
      
      if (snappedData && snappedData.lat && snappedData.lng) {
        const result = { latitude: snappedData.lat, longitude: snappedData.lng };
        console.log('🛣️ Client: Setting snappedClientLocation state to:', result);
        setSnappedClientLocation(result);
        console.log('🛣️ Client: Client snapped to road successfully:', result);
        console.log('🛣️ Client: Client offset distance:', snappedData.distance, 'meters');
        return result;
      }

      console.warn('🛣️ Client: No valid road data found for client, using raw location');
      console.log('🛣️ Client: snappedData was:', snappedData);
      return rawClientLocation;
    } catch (error) {
      console.error('🛣️ Client: Failed to snap client location to road:', error);
      console.warn('🛣️ Client: Using raw client location as fallback');
      return rawClientLocation;
    }
  }, []);

  // 🛣️ SNAP CLIENT PICKUP LOCATION TO ROAD - When ride is accepted
  useEffect(() => {
    if (activeRide && activeRide.status === 'accepted' && activeRide.pickupLocation) {
      const clientRawLocation = {
        latitude: activeRide.pickupLocation.lat,
        longitude: activeRide.pickupLocation.lng,
      };
      console.log('🛣️ Client: Ride accepted, snapping client pickup location to road:', clientRawLocation);
      snapClientToRoad(clientRawLocation);
    }
  }, [activeRide?.rideId, activeRide?.status, activeRide?.pickupLocation, snapClientToRoad]);

  // 🛣️ SNAP DRIVER LOCATION TO ROAD - When driver location is first received
  useEffect(() => {
    if (activeRide && trackedDriverLocation && activeRide.status === 'accepted') {
      const driverRawLocation = {
        latitude: trackedDriverLocation.latitude,
        longitude: trackedDriverLocation.longitude,
      };
      console.log('🛣️ Client: Driver location received, snapping to road:', driverRawLocation);
      snapDriverToRoad(driverRawLocation);
    }
  }, [activeRide?.rideId, activeRide?.status, trackedDriverLocation, snapDriverToRoad]);

  // 🧭 REAL-TIME NAVIGATION INSTRUCTIONS - Google Maps style turn-by-turn
  useEffect(() => {
    if (!isNavigating || !trackedDriverLocation || routeSteps.length === 0) {
      return;
    }

    // Find current step based on driver position
    const updateCurrentInstruction = () => {
      const driverPos = snappedDriverLocation || trackedDriverLocation;
      
      // Find which step we're currently on
      let newStepIndex = currentStepIndex;
      let minDistance = Infinity;
      
      for (let i = currentStepIndex; i < routeSteps.length; i++) {
        const step = routeSteps[i];
        const distanceToStep = getDistanceFromLatLonInKm(
          driverPos.latitude, driverPos.longitude,
          step.startCoord.latitude, step.startCoord.longitude
        ) * 1000; // Convert to meters
        
        // If we're close to the start of this step, update current step
        if (distanceToStep < 50 && distanceToStep < minDistance) {
          minDistance = distanceToStep;
          newStepIndex = i;
        }
        
        // If we've passed this step, move to next
        if (distanceToStep > step.distanceMeters) {
          newStepIndex = Math.min(i + 1, routeSteps.length - 1);
        }
      }
      
      if (newStepIndex !== currentStepIndex) {
        setCurrentStepIndex(newStepIndex);
        console.log('🧭 Navigation: Advanced to step', newStepIndex);
      }
      
      // Update instruction and distance for current step
      if (newStepIndex < routeSteps.length) {
        const currentStep = routeSteps[newStepIndex];
        const distanceToNextTurn = getDistanceFromLatLonInKm(
          driverPos.latitude, driverPos.longitude,
          currentStep.startCoord.latitude, currentStep.startCoord.longitude
        ) * 1000;
        
        setNavigationInstruction(currentStep.instruction || 'Continue straight');
        setRemainingDistance(`${Math.round(distanceToNextTurn)}m`);
        
        console.log('🧭 Navigation:', currentStep.instruction, `in ${Math.round(distanceToNextTurn)}m`);
      }
    };

    updateCurrentInstruction();
    const interval = setInterval(updateCurrentInstruction, 2000); // Update every 2 seconds
    
    return () => clearInterval(interval);
  }, [isNavigating, trackedDriverLocation, snappedDriverLocation, routeSteps, currentStepIndex]);

  // 🧭 DEVICE HEADING (COMPASS) MONITORING
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    
    const startHeadingMonitoring = async () => {
      try {
        subscription = await Location.watchHeadingAsync((heading) => {
          const headingDegrees = Math.round(heading.trueHeading || heading.magHeading || 0);
          setDeviceHeading(headingDegrees);
          console.log('🧭 Device heading updated:', headingDegrees);
        });
      } catch (error) {
        console.error('🧭 Error monitoring heading:', error);
      }
    };
    
    if (isNavigating) {
      startHeadingMonitoring();
    }
    
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [isNavigating]);

  // 📷 SMOOTH CAMERA FOLLOWING - Google Maps Navigation Style
 // 📷 GOOGLE MAPS NAVIGATION STYLE CAMERA
const updateNavigationCamera = useCallback(async () => {
  if (!mapRef.current || !isNavigating || isUserInteracting) return;
  
  const now = Date.now();
  if (now - lastCameraUpdate.current < 200) return; // Throttle to 5fps
  lastCameraUpdate.current = now;
  
  // Use snapped driver location for camera (road-snapped position)
  const targetLocation = snappedDriverLocation || trackedDriverLocation;
  if (!targetLocation) return;
  
  // Calculate route-based heading with improved look-ahead
  const routeHeading = calculateRouteHeading();
  
  // Smooth heading transition with acceleration/deceleration
  let smoothHeading = routeHeading;
  if (lastCameraHeading.current !== 0) {
    const headingDiff = ((routeHeading - lastCameraHeading.current + 540) % 360) - 180;
    // Use smaller interpolation for smoother rotation
    smoothHeading = lastCameraHeading.current + headingDiff * 0.1;
    smoothHeading = (smoothHeading + 360) % 360;
  }
  lastCameraHeading.current = smoothHeading;
  
  // 🎬 GOOGLE MAPS NAVIGATION CAMERA - 3D Perspective with proper zoom levels
  // Adjust zoom based on speed (closer at low speed, further at high speed)
  const speed = locationData?.speed || 0; // m/s
  let zoomLevel = 19; // Default street level
  
  if (speed > 15) { // > 54 km/h
    zoomLevel = 17; // Zoom out for highway
  } else if (speed > 8) { // > 28 km/h
    zoomLevel = 18; // Medium zoom
  }
  
  mapRef.current.animateCamera({
    center: {
      latitude: targetLocation.latitude,
      longitude: targetLocation.longitude,
    },
    pitch: 65,        // Google Maps Navigation angle
    heading: smoothHeading, // Points "up" the road
    zoom: zoomLevel,
    altitude: 200,
  }, { duration: 400 }); // Slightly longer for smoother feel
  
  setCameraHeading(smoothHeading);
}, [isNavigating, isUserInteracting, snappedDriverLocation, trackedDriverLocation, calculateRouteHeading, locationData?.speed]);

  // 🔄 CAMERA UPDATE INTERVAL - Reduced frequency to prevent blocking
  useEffect(() => {
    if (isNavigating && !isUserInteracting) {
      cameraUpdateInterval.current = setInterval(updateNavigationCamera, 1000); // Slower updates (1 second)
      currentZoom.current = 19;
      targetZoom.current = 19;
    } else {
      if (cameraUpdateInterval.current) {
        clearInterval(cameraUpdateInterval.current);
        cameraUpdateInterval.current = null;
      }
    }
    
    return () => {
      if (cameraUpdateInterval.current) {
        clearInterval(cameraUpdateInterval.current);
      }
    };
  }, [isNavigating, isUserInteracting, updateNavigationCamera]);

  // 🎯 SMOOTH ANIMATION WHEN SNAPPED LOCATION CHANGES - Always use snapped
  useEffect(() => {
    if (snappedDriverLocation && (activeRide?.status === 'accepted' || activeRide?.status === 'in_progress')) {
      console.log('🎯 Snapped location updated:', snappedDriverLocation);
      
      // ALWAYS update animated position to snapped location
      if (!animatedDriverPositionRef.current) {
        console.log('🎬 Initializing animated driver position to SNAPPED location:', snappedDriverLocation);
        animatedDriverPositionRef.current = snappedDriverLocation;
        return;
      }
      
      // Animate from current animated position to new snapped position
      const fromPosition = animatedDriverPositionRef.current;
      const toPosition = snappedDriverLocation;
      
      // Always animate if positions are different
      const distance = getDistanceFromLatLonInKm(
        fromPosition.latitude,
        fromPosition.longitude,
        toPosition.latitude,
        toPosition.longitude
      );
      
      if (distance > 0.0001) { // Even small movements animate (10cm)
        console.log('🎬 Driver position changed, updating animation ref');
        animatedDriverPositionRef.current = snappedDriverLocation;
      } else {
        // Direct update for very small changes
        animatedDriverPositionRef.current = snappedDriverLocation;
      }
    }
  }, [snappedDriverLocation, activeRide?.status]);

  // 🎯 ENHANCED GPS UPDATE HANDLING - Snap every update
  useEffect(() => {
    if (trackedDriverLocation && (activeRide?.status === 'accepted' || activeRide?.status === 'in_progress')) {
      console.log('🎯 GPS update received, snapping to road:', trackedDriverLocation);
      
      // Debug: Check if routes exist
      if (activeRide?.status === 'in_progress') {
        console.log('🛣️ IN_PROGRESS - Checking routes:');
        console.log('  - pickupToDestinationRoute length:', pickupToDestinationRoute?.length || 0);
        console.log('  - driverToPickupRoute length:', driverToPickupRoute?.length || 0);
        console.log('  - isNavigating:', isNavigating);
      }
      
      // Snap EVERY GPS update to road
      snapDriverToRoad(trackedDriverLocation)
        .then(snappedLocation => {
          console.log('✅ GPS location snapped successfully:', snappedLocation);
        })
        .catch(error => {
          console.error('❌ Failed to snap GPS location:', error);
        });
    }
  }, [trackedDriverLocation, activeRide?.status, snapDriverToRoad, pickupToDestinationRoute, driverToPickupRoute, isNavigating]);

  // Debug: Log snapped vs raw location
  useEffect(() => {
    if (snappedDriverLocation && trackedDriverLocation) {
      const distance = getDistanceFromLatLonInKm(
        trackedDriverLocation.latitude,
        trackedDriverLocation.longitude,
        snappedDriverLocation.latitude,
        snappedDriverLocation.longitude
      );
      console.log('🔍 Location comparison:');
      console.log('  Raw GPS:', trackedDriverLocation);
      console.log('  Snapped:', snappedDriverLocation);
      console.log('  Distance from road:', `${distance.toFixed(3)}km`);
    }
  }, [snappedDriverLocation, trackedDriverLocation]);

  // Map interaction handling - Improved for client side
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      setIsUserInteracting(true);
      setShowRecenterButton(true);
      console.log('🤚 User started interacting with map');
    },
    onPanResponderRelease: () => {
      // Resume camera following after 3 seconds of no interaction
      setTimeout(() => {
        setIsUserInteracting(false);
        setShowRecenterButton(false);
        console.log('🔄 Resuming camera following after user interaction');
      }, 3000);
    },
  });

  // Handle re-center button press
  const handleRecenter = useCallback(() => {
    setIsUserInteracting(false);
    if (driverLocation && mapRef.current) {
      // Reset heading to route-based heading
      const routeHeading = calculateRouteHeading();
      lastCameraHeading.current = routeHeading;
      currentZoom.current = 19;
      targetZoom.current = 19;
      
      mapRef.current.animateCamera({
        center: {
          latitude: driverLocation.lat,
          longitude: driverLocation.lng,
        },
        pitch: 65,
        heading: routeHeading,
        zoom: 19,
      }, { duration: 500 });
    }
  }, [driverLocation, calculateRouteHeading]);

  // ✅ FIXED: NEW SINGLE EFFECT FOR ACCEPTED STATUS - PROFESSIONAL CLOSE ZOOM
  // Fixed: Now works WITHOUT requiring route to be loaded first
  // Also uses driverLocation prop as fallback when trackedDriverLocation is not yet available
  // Also handles both 'accepted' and 'driver_arriving' statuses
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;
    
    // Check for any active ride status that indicates driver has accepted
    const isAcceptedStatus = activeRide?.status === 'accepted' || activeRide?.status === 'driver_arriving';
    
    if (!isAcceptedStatus) return;
    
    console.log('🗺️ CLIENT: Accepted status detected:', activeRide?.status);
    
    // Need pickup location - try trackedDriverLocation first, then fallback to driverLocation prop
    if (!activeRide?.pickupLocation) return;
    
    // Try trackedDriverLocation first (from useMissionTracking), fallback to driverLocation prop (from socket)
    const driverLoc = trackedDriverLocation 
      ? { latitude: trackedDriverLocation.latitude, longitude: trackedDriverLocation.longitude }
      : (driverLocation ? { latitude: driverLocation.lat, longitude: driverLocation.lng } : null);
    
    // If we don't have driver location yet, we can't zoom to show both
    if (!driverLoc) {
      console.log('🗺️ CLIENT: No driver location yet, skipping zoom');
      return;
    }
    
    console.log('🗺️ CLIENT: Zooming to show driver and client');
    
    // Disable navigation mode for accepted status
    setIsNavigating(false);
    setIsUserInteracting(false);
    
    // Get both positions
    const driverPos = driverLoc;
    
    const clientPos = {
      latitude: activeRide.pickupLocation?.lat || 0,
      longitude: activeRide.pickupLocation?.lng || 0,
    };
    
    console.log('🗺️ Client: Driver pos:', driverPos);
    console.log('🗺️ Client: Client pos:', clientPos);
    
    // Use fitToCoordinates to automatically fit both markers with proper padding
    setTimeout(() => {
      try {
        mapRef.current?.fitToCoordinates([driverPos, clientPos], {
          edgePadding: { 
            top: 150,
            right: 80,
            bottom: 350,
            left: 80
          },
          animated: true,
        });
        console.log('🗺️ Client: Map zoomed using fitToCoordinates');
      } catch (error) {
        console.error('🗺️ Client: fitToCoordinates error:', error);
        
        // Fallback: manual delta calculation
        const distance = getDistanceFromLatLonInKm(
          driverPos.latitude, driverPos.longitude,
          clientPos.latitude, clientPos.longitude
        );
        
        const centerLat = (driverPos.latitude + clientPos.latitude) / 2;
        const centerLng = (driverPos.longitude + clientPos.longitude) / 2;
        
        let latitudeDelta = distance < 0.5 ? 0.008 : distance < 1 ? 0.015 : distance < 2 ? 0.025 : distance < 5 ? 0.04 : 0.06;
        let longitudeDelta = latitudeDelta;
        
        try {
          mapRef.current?.animateToRegion({
            latitude: centerLat,
            longitude: centerLng,
            latitudeDelta: latitudeDelta * 1.2,
            longitudeDelta: longitudeDelta * 1.2,
          }, 1000);
        } catch (fallbackError) {
          console.error('🗺️ Client: Fallback also failed:', fallbackError);
        }
      }
    }, 500);
    
  }, [activeRide?.status, isMapReady, trackedDriverLocation, driverLocation, activeRide?.pickupLocation]);

  // 🎯 ZOOM WHEN FIRST DRIVER LOCATION ARRIVES - Also works without isMapReady check
  const [hasZoomedOnAccept, setHasZoomedOnAccept] = useState(false);
  
  useEffect(() => {
    // Check for any active ride status that indicates driver has accepted
    const isAcceptedStatus = activeRide?.status === 'accepted' || activeRide?.status === 'driver_arriving';
    
    console.log('🗺️ CLIENT: Effect triggered - status:', activeRide?.status, 'isAccepted:', isAcceptedStatus, 'hasZoomed:', hasZoomedOnAccept);
    
    if (!isAcceptedStatus || hasZoomedOnAccept) return;
    if (!activeRide?.pickupLocation) return;
    
    const driverLoc = trackedDriverLocation 
      ? { latitude: trackedDriverLocation.latitude, longitude: trackedDriverLocation.longitude }
      : (driverLocation ? { latitude: driverLocation.lat, longitude: driverLocation.lng } : null);
    
    console.log('🗺️ CLIENT: Driver location:', driverLoc, 'tracked:', trackedDriverLocation, 'prop:', driverLocation);
    
    if (!driverLoc) return;
    
    console.log('🗺️ CLIENT: First driver location received - zooming map');
    
    const driverPos = driverLoc;
    const clientPos = {
      latitude: activeRide.pickupLocation?.lat || 0,
      longitude: activeRide.pickupLocation?.lng || 0,
    };
    
    // Try to zoom even if mapRef might not be fully ready
    const mapToUse = mapRef?.current;
    if (!mapToUse) {
      console.log('🗺️ CLIENT: mapRef not ready yet, will retry...');
      return;
    }
    
    try {
      mapToUse.fitToCoordinates([driverPos, clientPos], {
        edgePadding: { 
          top: 150,
          right: 80,
          bottom: 350,
          left: 80
        },
        animated: true,
      });
      console.log('🗺️ CLIENT: Zoomed on first driver location SUCCESS');
      setHasZoomedOnAccept(true);
    } catch (error) {
      console.error('🗺️ CLIENT: Zoom on first location failed:', error);
    }
    
  }, [trackedDriverLocation, driverLocation, activeRide?.status, activeRide?.pickupLocation, hasZoomedOnAccept]);
  
  // Reset zoom flag when ride is completed or cleared
  useEffect(() => {
    if (!activeRide || activeRide.status === 'completed') {
      setHasZoomedOnAccept(false);
    }
  }, [activeRide?.status]);

  // Fit map to show route based on ride status - FIXED: Skip accepted status
  useEffect(() => {
    if (!mapRef.current || !MapView || !isMapReady) return;

    // Don't fit to coordinates if navigating
    if (isNavigating) return;

    // SKIP ACCEPTED/DRIVER_ARRIVING STATUS - This is handled by the new stable effect above
    const isAcceptedStatus = activeRide?.status === 'accepted' || activeRide?.status === 'driver_arriving';
    if (isAcceptedStatus) {
      console.log('🗺️ Client: Skipping camera effect for accepted status - handled by stable effect');
      return;
    }

    const rideStatus = activeRide?.status;
    const pickupLat = activeRide?.pickupLocation?.lat || userLocation?.coords.latitude || 0;
    const pickupLng = activeRide?.pickupLocation?.lng || userLocation?.coords.longitude || 0;
    const destLat = activeRide?.destinationLocation?.lat;
    const destLng = activeRide?.destinationLocation?.lng;

    // When ride is in_progress: show first-person navigation following driver
    if (rideStatus === 'in_progress' && destLat && destLng) {
      console.log('📍 Client: Switching to first-person navigation (in_progress):', {
        driverLocation: trackedDriverLocation,
        destination: { lat: destLat, lng: destLng }
      });

      // Enable navigation mode
      setIsNavigating(true);
      
      // Set first-person view following DRIVER (not user)
      const targetLocation = snappedDriverLocation || trackedDriverLocation;
      if (targetLocation && mapRef.current) {
        const routeHeading = calculateRouteHeading();
        
        setTimeout(() => {
          mapRef.current?.animateCamera({
            center: { 
              latitude: targetLocation.latitude, 
              longitude: targetLocation.longitude 
            },
            pitch: 75,        // Google Maps Navigation 3D angle
            heading: routeHeading,  // Direction of travel
            zoom: 19,         // Street-level zoom
            altitude: 200,    // Low-to-ground street view
          }, 1000);
        }, 500);
      }
    }
  }, [activeRide?.status, isMapReady, isNavigating, trackedDriverLocation, snappedDriverLocation, calculateRouteHeading, userLocation]);

  return (
    <View style={styles.container}>
      {/* Top Bar with Profile Icon - Only show during active ride */}
      {activeRide && (
        <View style={[styles.topBar, isNavigating && styles.topBarNavigating]}>
          <View style={{ width: 40 }} />
          <TouchableOpacity onPress={onProfile} style={styles.profileButton}>
            <Text style={styles.profileIcon}>👤</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Navigation Banner */}
      <NavigationBanner
        instruction={navigationInstruction}
        distance={remainingDistance}
        isVisible={isNavigating}
      />

      {/* Map View - Google Maps */}
      {MapView ? (
        <View style={StyleSheet.absoluteFillObject} {...panResponder.panHandlers}>
          <MapView
            ref={mapRef}
            onMapReady={() => setIsMapReady(true)}
            initialRegion={mapRegion}
            style={StyleSheet.absoluteFillObject}
            provider={PROVIDER_GOOGLE}
            showsUserLocation={false}
            showsMyLocationButton={false}
            onRegionChangeComplete={(region: any) => setMapRegion(region)}
          >
            {/* Pickup Location Marker (Client) - Hide when ride is in progress */}
            {Marker && activeRide?.status !== 'in_progress' && (
              <Marker
                coordinate={snappedClientLocation || {
                  latitude: activeRide?.pickupLocation?.lat || userLocation?.coords.latitude || 0,
                  longitude: activeRide?.pickupLocation?.lng || userLocation?.coords.longitude || 0,
                }}
                anchor={{ x: 0.5, y: 1 }}
                title={activeRide ? "Pickup Location" : "Your Location"}
              >
                <View style={activeRide ? styles.pickupMarker : styles.userMarker}>
                  <View style={activeRide ? styles.pickupMarkerDot : styles.userMarkerDot} />
                </View>
              </Marker>
            )}

            {/* 🛣️ CLIENT GPS-to-Road Connection Line - Dotted line showing "walk" from building to road */}
            {snappedClientLocation && activeRide?.pickupLocation && Polyline && (
              <Polyline
                coordinates={[
                  {
                    latitude: activeRide.pickupLocation.lat,
                    longitude: activeRide.pickupLocation.lng,
                  },
                  {
                    latitude: snappedClientLocation.latitude,
                    longitude: snappedClientLocation.longitude,
                  },
                ]}
                strokeColor="#FF6B6B" // Red color for client connection
                strokeWidth={2}
                lineDashPattern={[5, 5]} // Creates dotted effect
                lineCap="round"
                lineJoin="round"
              />
            )}

            {/* Driver Location Marker - Always show if active ride exists */}
            {activeRide && Marker && (
              <>
                {/* DEBUG: Log driver marker render data */}
                {console.log('🔍 Client: Driver marker render check:', {
                  'trackedDriverLocation': trackedDriverLocation,
                  'snappedDriverLocation': snappedDriverLocation,
                  'animatedDriverPositionRef': animatedDriverPositionRef.current,
                  'roadSnappingData': roadSnappingData,
                  'Final coordinate': animatedDriverPositionRef.current || snappedDriverLocation || trackedDriverLocation || {latitude: 0, longitude: 0}
                })}
                <Marker
                  key={`driver-${Math.round((snappedDriverLocation || trackedDriverLocation || {latitude: 0, longitude: 0}).latitude * 10000)}-${Math.round((snappedDriverLocation || trackedDriverLocation || {latitude: 0, longitude: 0}).longitude * 10000)}`}
                  coordinate={animatedDriverPositionRef.current || snappedDriverLocation || trackedDriverLocation || {latitude: 0, longitude: 0}}
                  anchor={{ x: 0.5, y: 0.5 }}
                  title="Driver"
                  zIndex={999} // Ensure it sits ABOVE the blue line
                  description="Driver (snapped to road)"
                  flat={true}
                >
                {isNavigating ? (
                  <RotatingArrowMarker heading={deviceHeading || cameraHeading || 0} />
                ) : (
                  <View style={[
                    styles.driverMarker,
                    styles.driverMarkerSnapped // Always green when snapped
                  ]}>
                    <Text style={styles.driverMarkerIcon}>🚗</Text>
                  </View>
                )}
                </Marker>
              </>
            )}

            {/* GPS-to-Road Connection Line - Show dotted line from raw GPS to snapped road position */}
            {roadSnappingData && roadSnappingData.distance > 5 && Polyline && (
              <Polyline
                coordinates={[
                  { latitude: roadSnappingData.originalLat, longitude: roadSnappingData.originalLng },
                  { latitude: roadSnappingData.lat, longitude: roadSnappingData.lng },
                ]}
                strokeColor="#808080"
                strokeWidth={2}
                lineDashPattern={[5, 5]}
                lineCap="round"
                lineJoin="round"
              />
            )}

            {/* Route from user location to selected destination */}
            {selectedDestination?.routeData?.coordinates && (
              <RoutePolyline
                coordinates={selectedDestination.routeData.coordinates}
                strokeColor="#185ADC"
                strokeWidth={4}
                isVisible={true}
              />
            )}

            {/* Route from pickup to destination when ride is in_progress */}
            {activeRide && activeRide.status === 'in_progress' && pickupToDestinationRoute && Marker && (
              <>
                <Polyline
                  coordinates={pickupToDestinationRoute}
                  strokeColor="#1E40AF" // Professional blue - same as driver map
                  strokeWidth={8} // Thicker like Google Maps road width
                  zIndex={998} // High z-index to ensure visibility (driver marker is 999)
                  lineCap="round"
                  lineJoin="round"
                />
              </>
            )}

            {/* Destination Marker - shown when ride is in progress */}
            {activeRide && activeRide.status === 'in_progress' && Marker && activeRide.destinationLocation && (
              <Marker
                coordinate={{
                  latitude: activeRide.destinationLocation.lat,
                  longitude: activeRide.destinationLocation.lng,
                }}
                anchor={{ x: 0.5, y: 1 }}
                title="Destination"
              >
                <View style={styles.destinationMarker}>
                  <View style={[styles.pickupMarkerDot, { backgroundColor: '#22C55E' }]} />
                </View>
              </Marker>
            )}

            {/* Route Polyline from Driver to Pickup (Client) - shown when driver is going to pickup */}
            {activeRide && trackedDriverLocation && Polyline && (!activeRide.status || activeRide.status === 'accepted' || activeRide.status === 'driver_arrived') && (
              <Polyline
                key={`route-${Math.round(trackedDriverLocation.latitude * 1000)}-${Math.round(trackedDriverLocation.longitude * 1000)}`}
                coordinates={driverToPickupRoute || [
                  { latitude: trackedDriverLocation.latitude, longitude: trackedDriverLocation.longitude },
                  {
                    latitude: activeRide?.pickupLocation?.lat || userLocation?.coords.latitude || 0,
                    longitude: activeRide?.pickupLocation?.lng || userLocation?.coords.longitude || 0
                  },
                ]}
                strokeColor="#185ADC"
                strokeWidth={8}
              />
            )}

            {/* Route Polyline from Pickup to Destination - shown when ride is in progress (driver going to destination) */}
            {activeRide && Polyline && activeRide.status === 'in_progress' && (
              <Polyline
                coordinates={pickupToDestinationRoute || [
                  {
                    latitude: activeRide?.pickupLocation?.lat || userLocation?.coords.latitude || 0,
                    longitude: activeRide?.pickupLocation?.lng || userLocation?.coords.longitude || 0
                  },
                  {
                    latitude: activeRide?.destinationLocation?.lat || 0,
                    longitude: activeRide?.destinationLocation?.lng || 0
                  },
                ]}
                strokeColor="#22C55E"
                strokeWidth={4}
              />
            )}
          </MapView>
        </View>
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.mapPlaceholder]}>
          <Text translationKey="mapLoading" style={styles.mapPlaceholderText} />
        </View>
      )}

      {/* Re-center Button */}
      <RecenterButton onPress={handleRecenter} isVisible={showRecenterButton} />

      {/* Active Ride Bottom Sheet - always show during ride */}
      <ActiveRideBottomSheet
        visible={!!activeRide}
        rideData={activeRide || null}
        driverLocation={driverLocation}
        language={language}
        onCallDriver={() => {
          console.log('📞 Calling driver:', activeRide?.driverPhone);
          const phone = activeRide?.driverPhone || '+213000000000';
          Linking.openURL(`tel:${phone}`);
        }}
        onCancel={() => {
          if (activeRide?.status === 'completed') {
            onCancelRide?.();
          } else {
            setShowCancelModal(true);
          }
        }}
      />

      {/* Debug: show active ride info */}
      {activeRide && (
        <View style={{ position: 'absolute', top: 100, left: 10, backgroundColor: 'rgba(0,0,0,0.7)', padding: 10, borderRadius: 5, zIndex: 9999 }}>
          <Text style={{ color: 'white', fontSize: 12 }}>
            Ride: {activeRide.rideId}{'\n'}
            Status: {activeRide.status}{'\n'}
            Nav: {isNavigating ? 'ON' : 'OFF'}
          </Text>
        </View>
      )}

      {/* Cancel Mission Modal */}
      <CancelMissionModal
        visible={showCancelModal}
        onConfirm={() => {
          setShowCancelModal(false);
          onCancelRide?.();
        }}
        onCancel={() => setShowCancelModal(false)}
        language={language}
      />

      {/* Driver Section (Top) - Only show when no active ride */}
      {!activeRide && (
        <View style={styles.driverSection}>
          {/* Header row: logo + profile icon */}
          <View style={[styles.driverSectionHeader, isRTL && styles.driverSectionHeaderRTL]}>
            <Image
              source={require('../../assets/header_logo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <TouchableOpacity onPress={onProfile} style={styles.profileButton}>
              <Text style={styles.profileIcon}>👤</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.driverCard, isRTL && styles.driverCardRTL]}>
            <View style={[styles.driverCardContent, isRTL && styles.driverCardContentRTL]}>
              <Text 
                translationKey="wantToBeDriver" 
                style={[styles.driverTitle, isRTL && styles.textRTL]} 
              />
              <TouchableOpacity 
                style={[styles.requestButton, isRTL && styles.requestButtonRTL]} 
                onPress={onBecomeDriver}
              >
                <Text 
                  translationKey="requestNow" 
                  style={[styles.requestButtonText, isRTL && styles.requestButtonTextRTL]} 
                />
              </TouchableOpacity>
            </View>
            <Image
              source={require('../../assets/camion.png')}
              style={[styles.driverImage, isRTL && styles.driverImageRTL]}
              resizeMode="contain"
            />
          </View>
        </View>
      )}

      {/* Destination Section (Bottom) - Only show when no active ride */}
      {!activeRide && (
        <View style={styles.destinationSection}>
          <View style={styles.dragHandle} />
          <Text translationKey="whereToGo" style={[styles.destinationTitle, isRTL && styles.textRTL]} />
          <Text translationKey="fillDestination" style={[styles.destinationSubtitle, isRTL && styles.textRTL]} />
          <TouchableOpacity style={styles.destinationButton} onPress={onSelectAddress}>
            <Text style={[styles.destinationText, selectedDestination && styles.destinationTextSelected]}>
              {selectedDestination?.placeDescription || t('destination')}
            </Text>
            <Image
              source={require('../../assets/arrow-left.png')}
              style={[styles.arrowIcon, isRTL && styles.arrowIconRTL]}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  topBarNavigating: {
    top: 100, // Move down when navigation banner is showing
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileIcon: {
    color: '#185ADC',
    fontSize: 20,
  },
  userMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#185ADC',
    borderWidth: 3,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
  },
  pickupMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#185ADC',
    borderWidth: 3,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pickupMarkerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'white',
  },
  destinationMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22C55E',
    borderWidth: 3,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  driverMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#185ADC',
    borderWidth: 3,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  driverMarkerSnapped: {
    backgroundColor: '#28a745', // Green when snapped to road
    borderColor: '#1e7e34', // Darker green border
  },
  driverMarkerIcon: {
    fontSize: 22,
  },
  arrowMarkerContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#185ADC',
    borderWidth: 3,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  arrowMarker: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholder: {
    backgroundColor: '#E8EEFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: {
    fontSize: 16,
    color: '#000',
  },
  // Navigation Banner Styles
  navigationBanner: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 1000,
    backgroundColor: '#185ADC',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  navigationBannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navigationInstruction: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    flex: 1,
  },
  navigationDistance: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FEC846',
  },
  // Navigation Panel Styles
  navigationPanel: {
    position: 'absolute',
    bottom: 280,
    left: 16,
    right: 16,
    zIndex: 1000,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  navigationPanelContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationStat: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  navigationStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#185ADC',
  },
  navigationStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  navigationDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
  },
  driverSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  driverSectionHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  headerLogo: {
    width: 70,
    height: 24,
  },
  driverCard: {
    backgroundColor: '#185ADC',
    flexDirection: 'row',
    marginHorizontal: 24,
    paddingStart: 24,
    paddingTop: 16,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    marginTop: 17,
    minHeight: 150,
  },
  driverCardContent: {
    flex: 1,
    zIndex: 999,
    alignItems: 'flex-start',
    paddingBottom: 10,
  },
  driverTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: 'white',
    flexShrink: 1,
  },
  requestButton: {
    backgroundColor: '#FEC846',
    marginTop: 14,
    borderRadius: 12,
    padding: 10,
  },
  requestButtonText: {
    fontWeight: '500',
    fontSize: 14,
    color: '#000',
    textAlign: 'center',
  },
  driverImage: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    height: 140,
    width: 186,
  },
  driverCardRTL: {
    flexDirection: 'row-reverse',
    paddingStart: 0,
    paddingEnd: 24,
  },
  driverCardContentRTL: {
    alignItems: 'flex-end',
  },
  driverImageRTL: {
    right: 'auto',
    left: 0,
  },
  requestButtonRTL: {
    alignSelf: 'flex-end',
  },
  requestButtonTextRTL: {
    textAlign: 'right',
  },
  destinationSection: {
    position: 'absolute',
    bottom: 53,
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    borderRadius: 33,
    marginHorizontal: 16,
  },
  dragHandle: {
    height: 2,
    backgroundColor: '#00000033',
    borderRadius: 2,
    width: 106,
    alignSelf: 'center',
  },
  destinationTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 18,
    color: '#000',
  },
  destinationSubtitle: {
    fontSize: 14,
    color: '#000000B8',
    marginTop: 4,
  },
  destinationButton: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#185ADC',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  destinationText: {
    flex: 1,
    fontSize: 14,
    color: '#00000080',
  },
  destinationTextSelected: {
    color: '#000000E0',
  },
  arrowIcon: {
    height: 24,
    width: 24,
  },
  textRTL: {
    textAlign: 'right',
  },
  arrowIconRTL: {
    // transform: [{ scale: -1 }], // Temporarily removed to fix syntax error
  },
  driverSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});

export default HomeScreen;