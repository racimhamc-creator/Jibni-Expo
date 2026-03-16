import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { 
  Alert, 
  View, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  Platform, 
  Text, 
  Linking,
  Animated,
  Dimensions,
  PanResponder
} from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import Svg, { Path } from 'react-native-svg';
import NavigationArrowMarker from '../common/NavigationArrowMarker';
import AvailabilitySection from './AvailabilitySection';
import RequestSection from './RequestSection';
import { getAndRegisterToken } from '../../utils/tokenManager';
import AcceptedMissionSection from './AcceptedMissionSection';
import MissionTracking from './MissionTracking';
import DriverActiveMissionSheet from './DriverActiveMissionSheet';
import MissionHistoryScreen from './MissionHistoryScreen';
import CancelMissionModal from '../common/CancelMissionModal';
import RideSuccessScreen from '../common/RideSuccessScreen';
import DemoMissionModal from './DemoMissionModal';
import DriverReconfirmModal from '../common/DriverReconfirmModal';
import LogoutConfirmModal from '../common/LogoutConfirmModal';
import SimulationBanner from '../common/SimulationBanner';
import NavigationBanner from '../common/NavigationBanner';
import RideCancelledBanner from '../common/RideCancelledBanner';
import { NavigationHeader } from '../navigation/NavigationHeader';
import { useNavigationStep } from '../../hooks/useNavigationStep';
import { RouteStep } from '../../services/directions';
import { api } from '../../services/api';
import { socketService } from '../../services/socket';
import { storage } from '../../services/storage';
import { snapToRoad } from '../../services/roadsService';
import { rideSimulation, MockRide } from '../../services/rideSimulation';
import { useDriverLocation } from '../../hooks/useDriverLocation';
import { DriverState } from '../../services/driverArrivalService';
import { startDriverBackgroundLocationUpdates, stopDriverBackgroundLocationUpdates } from '../../services/backgroundDriverLocation';
import { useTheme } from '../../contexts/ThemeContext';
import { GOOGLE_MAPS_API_KEY } from '../../config/maps';

// Calculate zoom level based on actual distance between two points
const calculateZoomDeltas = (point1: any, point2: any) => {
  // Extract coordinates from any format
  const lat1 = point1.latitude || point1.lat;
  const lng1 = point1.longitude || point1.lng;
  const lat2 = point2.latitude || point2.lat;
  const lng2 = point2.longitude || point2.lng;

  // Calculate the difference in degrees
  const latDelta = Math.abs(lat2 - lat1);
  const lngDelta = Math.abs(lng2 - lng1);

  // Add 30% padding for breathing room
  const paddedLatDelta = latDelta * 1.3;
  const paddedLngDelta = lngDelta * 1.3;

  // Clamp to sensible bounds
  // Min: 0.01 degree (about 1km)
  // Max: 0.5 degree (about 50km)
  return {
    latitudeDelta: Math.max(0.01, Math.min(0.5, paddedLatDelta)),
    longitudeDelta: Math.max(0.01, Math.min(0.5, paddedLngDelta)),
  };
};

// Convert any location format to standard {latitude, longitude}
const normalizeLocation = (location: any) => {
  return {
    latitude: location.latitude ?? location.lat ?? location.x ?? 0,
    longitude: location.longitude ?? location.lng ?? location.y ?? 0,
  };
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const calculateBearing = (from: LocationCoord, to: LocationCoord): number => {
  const φ1 = toRadians(from.latitude);
  const φ2 = toRadians(to.latitude);
  const Δλ = toRadians(to.longitude - from.longitude);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return (θ * (180 / Math.PI) + 360) % 360;
};

const fetchMissionRouteMetrics = async (
  driverCoord?: LocationCoord | null,
  pickupCoord?: LocationCoord | null,
): Promise<{ distanceKm?: number; etaMinutes?: number; headingDirection?: number }> => {
  if (!driverCoord || !pickupCoord) {
    return {};
  }

  try {
    const route = await getRoadRoute(driverCoord, pickupCoord);
    const distanceKm = route.distance > 0 ? route.distance / 1000 : undefined;
    const etaMinutes = route.duration > 0 ? Math.max(1, Math.round(route.duration / 60)) : undefined;
    const headingDirection = calculateBearing(driverCoord, pickupCoord);
    return { distanceKm, etaMinutes, headingDirection };
  } catch (error) {
    console.warn('[DriverHomeScreen] Failed to fetch mission route metrics:', error);
    return {};
  }
};

const fetchTripRouteMetrics = async (
  pickupCoord?: LocationCoord | null,
  destinationCoord?: LocationCoord | null,
): Promise<{ tripDistanceKm?: number; tripEtaMinutes?: number }> => {
  if (!pickupCoord || !destinationCoord) {
    return {};
  }

  try {
    const route = await getRoadRoute(pickupCoord, destinationCoord);
    const tripDistanceKm = route.distance > 0 ? route.distance / 1000 : undefined;
    const tripEtaMinutes = route.duration > 0 ? Math.max(1, Math.round(route.duration / 60)) : undefined;
    return { tripDistanceKm, tripEtaMinutes };
  } catch (error) {
    console.warn('[DriverHomeScreen] Failed to fetch trip route metrics:', error);
    return {};
  }
};

const reverseGeocodeAddress = async (lat: number, lng: number): Promise<string | null> => {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('[DriverHomeScreen] Skipping reverse geocode - API key missing');
    return null;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();
    if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
      const result = data.results[0];
      return result.formatted_address || result.plus_code?.compound_code || null;
    }
  } catch (error) {
    console.warn('[DriverHomeScreen] Reverse geocode failed:', error);
  }
  return null;
};


// Conditionally import MapView - fallback if not available
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
let PROVIDER_GOOGLE: any = null;

try {
  const maps = require('react-native-maps');
  MapView = maps.default || maps;
  Marker = maps.Marker || (maps.default && maps.default.Marker);
  Polyline = maps.Polyline || (maps.default && maps.default.Polyline);
  PROVIDER_GOOGLE = Platform.OS === 'android' ? (maps.PROVIDER_GOOGLE || 'google') : undefined;
} catch (error) {
  console.warn('react-native-maps not available, using placeholder');
}

import { Language, getTranslation, getFontFamily } from '../../utils/translations';
import { getRoadRoute, LocationCoord, getDistanceFromLatLonInKm, fetchGoogleDirectionsAndLog } from '../../services/directions';
import { getNearestRoadLocation, shouldSnapToRoad, NearestRoadLocation } from '../../services/roadsService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DriverHomeScreenProps {
  onLogout: () => void;
  language?: Language;
}

// Legacy Rotating Arrow Marker - replaced by NavigationArrowMarker
const RotatingArrowMarker: React.FC<{ heading: number }> = ({ heading }) => {
  return (
    <View style={styles.arrowMarkerContainer}>
      <View 
        style={[
          styles.arrowMarker,
          { transform: [{ rotate: `${heading}deg` }] }
        ]}
      >
        <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 2L4.5 20.29L12 17L19.5 20.29L12 2Z"
            fill="#185ADC"
            stroke="white"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    </View>
  );
};

// Navigation Bottom Panel Component
const NavigationPanel: React.FC<{
  eta: string;
  distance: string;
  language: Language;
  isRTL: boolean;
  onExit: () => void;
}> = ({ eta, distance, language, isRTL, onExit }) => {
  const min = getTranslation('min', language);
  const km = getTranslation('km', language);
  
  return (
    <View style={[styles.navPanel, isRTL && styles.navPanelRTL]}>
      <View style={styles.navPanelInfo}>
        <View style={styles.navPanelSection}>
          <Text style={styles.navPanelValue}>{eta}</Text>
          <Text style={styles.navPanelLabel}>{min}</Text>
        </View>
        <View style={styles.navPanelDivider} />
        <View style={styles.navPanelSection}>
          <Text style={styles.navPanelValue}>{distance}</Text>
          <Text style={styles.navPanelLabel}>{km}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.navPanelExitButton} onPress={onExit}>
        <Text style={styles.navPanelExitText}>
          {language === 'ar' ? 'خروج' : language === 'fr' ? 'Quitter' : 'Exit'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Re-center Button Component
const RecenterButton: React.FC<{
  onPress: () => void;
  visible: boolean;
}> = ({ onPress, visible }) => {
  if (!visible) return null;
  
  return (
    <TouchableOpacity style={styles.recenterButton} onPress={onPress}>
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 8C9.79 8 8 9.79 8 12C8 14.21 9.79 16 12 16C14.21 16 16 14.21 16 12C16 9.79 14.21 8 12 8ZM12 14C10.9 14 10 13.1 10 12C10 10.9 10.9 10 12 10C13.1 10 14 10.9 14 12C14 13.1 13.1 14 12 14ZM12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z"
          fill="#185ADC"
        />
        <Path
          d="M12 6V8M12 16V18M6 12H8M16 12H18"
          stroke="#185ADC"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </Svg>
    </TouchableOpacity>
  );
};

const DriverHomeScreen: React.FC<DriverHomeScreenProps> = ({ onLogout, language = 'ar' }) => {
  const { mapStyle, toggleMapTheme, isDarkMode } = useTheme();
  const fontFamily = getFontFamily(language);
  const boldFontFamily = getFontFamily(language, 'bold');
  const mapRef = useRef<any>(null);
  const currentLocationRef = useRef<Location.LocationObject | null>(null);
  const navigationCameraRef = useRef<NodeJS.Timeout | null>(null);
  const lastCameraUpdateRef = useRef<number>(0);
  const lastLocationForHeading = useRef<Location.LocationObject | null>(null);
  const currentZoom = useRef<number>(19);
  const targetZoom = useRef<number>(19);
  const lastCameraHeading = useRef<number>(0);
  const pushTokenRef = useRef<string | null>(null);
  const listenersRegisteredRef = useRef(false);
  const currentRideStateRef = useRef<any>(null);
  const driverArrivalNotifiedRef = useRef(false);

  // ✅ FIX 1: iOS animation lock ref — prevents stacking animateCamera calls
  const isNavigationAnimatingRef = useRef<boolean>(false);

  // 🎬 Simulation State
  const [simulationState, setSimulationState] = useState(rideSimulation.getState());
  const [mockRide, setMockRide] = useState<MockRide | null>(null);

  // Navigation Mode State
  const [isNavigating, setIsNavigating] = useState(false);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [currentHeading, setCurrentHeading] = useState(0);
  const [deviceHeading, setDeviceHeading] = useState(0);
  const [navigationInstruction, setNavigationInstruction] = useState('');
  const [remainingDistance, setRemainingDistance] = useState('0');
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]); // Store turn-by-turn instructions
  const [currentStepIndex, setCurrentStepIndex] = useState(0); // Track current step
  const [currentManeuver, setCurrentManeuver] = useState(''); // Current maneuver for banner icon
  const [remainingTime, setRemainingTime] = useState('0');

  const [showRideCancelledBanner, setShowRideCancelledBanner] = useState(false);
  const [rideCancelledBannerMessage, setRideCancelledBannerMessage] = useState<string | undefined>(undefined);
  const rideCancelledBannerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [missionStatus, setMissionStatus] = useState<'new_request' | 'accepted' | 'on_the_way' | 'withdrawal' | 'arriving' | 'in_progress'>('new_request');
  const [currentRide, setCurrentRide] = useState<any>(null);

  // Persist ride state to storage for app restart recovery
  useEffect(() => {
    const persistRideState = async () => {
      if (currentRide && missionStatus !== 'new_request') {
        const rideState = {
          rideId: currentRide.rideId,
          status: missionStatus,
          currentRide: currentRide,
          driverLocation: currentLocationRef.current ? {
            lat: currentLocationRef.current.coords.latitude,
            lng: currentLocationRef.current.coords.longitude,
          } : null,
          // Ride metrics
          eta: currentRide.eta,
          distanceTravelled: currentRide.distanceTravelled,
          totalFare: currentRide.totalFare,
        };
        await storage.setActiveRideState(rideState);
        console.log('💾 Driver: Persisted ride state to storage:', rideState);
      } else if (missionStatus === 'new_request' || !currentRide) {
        await storage.clearActiveRideState();
        console.log('💾 Driver: Cleared ride state from storage');
      }
    };
    
    persistRideState();
  }, [currentRide, missionStatus]);

  const showRideCancelledBannerMessage = useCallback((message?: string) => {
    if (rideCancelledBannerTimeoutRef.current) {
      clearTimeout(rideCancelledBannerTimeoutRef.current);
    }
    setRideCancelledBannerMessage(message);
    setShowRideCancelledBanner(true);
    rideCancelledBannerTimeoutRef.current = setTimeout(() => {
      setShowRideCancelledBanner(false);
      setRideCancelledBannerMessage(undefined);
      rideCancelledBannerTimeoutRef.current = null;
    }, 5000);
  }, []);

  const dismissRideCancelledBanner = useCallback(() => {
    if (rideCancelledBannerTimeoutRef.current) {
      clearTimeout(rideCancelledBannerTimeoutRef.current);
      rideCancelledBannerTimeoutRef.current = null;
    }
    setShowRideCancelledBanner(false);
    setRideCancelledBannerMessage(undefined);
  }, []);

  useEffect(() => {
    return () => {
      if (rideCancelledBannerTimeoutRef.current) {
        clearTimeout(rideCancelledBannerTimeoutRef.current);
        rideCancelledBannerTimeoutRef.current = null;
      }
    };
  }, []);

  // Restore ride on app startup
  useEffect(() => {
    const restoreDriverRide = async () => {
      try {
        // First try to restore from storage for instant UI
        const storedRide = await storage.getActiveRideState();
        console.log('🔄 Driver: Stored ride state:', storedRide);
        
        // Then fetch from API for authoritative state
        const response = await api.getActiveRide();
        const backendRide = response?.data;
        console.log('🔄 Driver: Backend ride state:', backendRide);
        
        if (backendRide && backendRide.rideId && backendRide.isDriver) {
          // Restore driver ride with all metrics
          setCurrentRide({
            rideId: backendRide.rideId,
            status: backendRide.status,
            pickupLocation: backendRide.pickupLocation,
            destinationLocation: backendRide.destinationLocation,
            pricing: backendRide.pricing,
            eta: backendRide.eta,
            distance: backendRide.distance,
            clientId: backendRide.clientId,
            clientName: backendRide.clientName,
            clientPhone: backendRide.clientPhone,
            clientLocation: backendRide.clientLocation,
            // Ride metrics
            distanceTravelled: backendRide.distanceTravelled || 0,
            currentEta: backendRide.currentEta || backendRide.eta?.clientToDestination || 0,
            totalFare: backendRide.totalFare || backendRide.pricing?.totalPrice || 0,
          });
          
          // Map backend status to mission status
          const statusMap: Record<string, typeof missionStatus> = {
            'accepted': 'accepted',
            'driver_arrived': 'arriving',
            'in_progress': 'in_progress',
          };
          const mappedStatus = statusMap[backendRide.status];
          if (mappedStatus) {
            setMissionStatus(mappedStatus);
          }
          
          console.log('🔄 Driver ride restored with metrics:', {
            distanceTravelled: backendRide.distanceTravelled,
            currentEta: backendRide.currentEta,
            totalFare: backendRide.totalFare,
          });
        }
      } catch (error) {
        console.error('🔄 Driver: Error restoring ride:', error);
      }
    };
    
    restoreDriverRide();
  }, []);

  // NEW: Use the professional driver location tracking hook
  const { 
    locationData, 
    isTracking, 
    startTracking, 
    stopTracking,
    driverState,
    arrivalConfirmed,
    distanceToPickup,
    gpsAccuracy,
    confirmArrivalManual,
  } = useDriverLocation({
    accuracy: Location.Accuracy.Highest,
    timeInterval: 1000,
    distanceInterval: 5,
    jitterThreshold: 2, // meters
    enableAveraging: false,
    currentRide, // Pass currentRide for arrival detection
  });

  // Initialize with Algeria coordinates as fallback - more zoomed in
  const [mapRegion, setMapRegion] = useState({
    latitude: 28.0339,
    longitude: 1.6596,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });
  const [isMapReady, setIsMapReady] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [snappedDriverLocation, setSnappedDriverLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [roadSnappingData, setRoadSnappingData] = useState<NearestRoadLocation | null>(null);
  const [previousLocation, setPreviousLocation] = useState<{latitude: number; longitude: number} | null>(null);
  
  // NEW: Sync currentLocation with professional tracking hook
  useEffect(() => {
    if (locationData) {
      // Convert hook data to LocationObject format for compatibility
      const locationObject: Location.LocationObject = {
        coords: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          altitude: null,
          accuracy: null,
          altitudeAccuracy: null,
          heading: locationData.heading || null,
          speed: locationData.speed ?? 0,
        },
        timestamp: locationData.timestamp,
      };
      setCurrentLocation(locationObject);
    }
  }, [locationData]);
  
  // Road route states
  const [driverToClientRoute, setDriverToClientRoute] = useState<LocationCoord[] | null>(null);
  const [clientToDestinationRoute, setClientToDestinationRoute] = useState<LocationCoord[] | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  
  // Smooth driver marker animation refs (like Client side)
  const animatedDriverPositionRef = useRef<{latitude: number; longitude: number} | null>(null);
  const driverAnimationProgress = useRef<number>(0);
  const driverAnimationStart = useRef<{latitude: number; longitude: number} | null>(null);
  const driverAnimationEnd = useRef<{latitude: number; longitude: number} | null>(null);
  
  // 🛣️ SNAP DRIVER LOCATION TO ROAD - Use Google Roads API for professional road snapping
  useEffect(() => {
    if (currentLocation && (missionStatus === 'accepted' || missionStatus === 'on_the_way' || missionStatus === 'arriving' || missionStatus === 'in_progress')) {
      console.log('🛣️ Driver: Snapping location to road:', currentLocation.coords);
      
      const rawLocation = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude
      };
      
      // Performance optimization: Re-enabled with lower threshold to reduce lag but still responsive
      if (!shouldSnapToRoad(
        previousLocation?.latitude || 0,
        previousLocation?.longitude || 0,
        rawLocation.latitude,
        rawLocation.longitude
      )) {
        console.log('🛣️ Driver: Movement too small, skipping road snapping (performance optimization)');
        return;
      }
      
      console.log('🛣️ Driver: Movement sufficient, proceeding with road snapping');
      
      // Update previous location for next optimization check
      setPreviousLocation(rawLocation);
      
      // PRIORITY 1: Snap to route polyline when route exists (Uber-style)
      // This ensures driver marker stays ON the blue line, not just on any road
      const snapToRoad = () => {
        // Use route polyline snapping for perfect alignment with the blue line
        if ((missionStatus === 'accepted' || missionStatus === 'on_the_way' || missionStatus === 'arriving') && driverToClientRoute && driverToClientRoute.length > 0) {
          console.log('🛣️ Driver: Snapping to pickup route polyline');
          snapToRoutePolyline();
          return;
        }
        
        if (missionStatus === 'in_progress' && clientToDestinationRoute && clientToDestinationRoute.length > 0) {
          console.log('🛣️ Driver: Snapping to destination route polyline');
          snapToRoutePolyline();
          return;
        }
        
        // Fallback: Use Google Roads API if no route
        getNearestRoadLocation(rawLocation.latitude, rawLocation.longitude)
          .then(snappedData => {
            if (snappedData) {
              console.log('🛣️ Driver: Snapped to road via Google Roads API:', snappedData);
              setRoadSnappingData(snappedData);
              setSnappedDriverLocation({
                latitude: snappedData.lat,
                longitude: snappedData.lng
              });
            }
          })
          .catch(error => {
            console.error('🛣️ Driver: Roads API error:', error);
          });
      };
      
      snapToRoad();
    }
  }, [currentLocation, missionStatus, clientToDestinationRoute, driverToClientRoute, previousLocation]);

  // 🛣️ SNAP CLIENT LOCATION TO ROAD - Fix client showing inside buildings
  const snapClientToRoad = useCallback(async (rawClientLocation: {latitude: number; longitude: number}): Promise<{latitude: number; longitude: number}> => {
    console.log('🛣️ Driver: snapClientToRoad START');
    console.log('🛣️ Driver: Input location:', rawClientLocation);
    
    try {
      console.log('🛣️ Driver: Calling getNearestRoadLocation API...');
      const snappedData = await getNearestRoadLocation(rawClientLocation.latitude, rawClientLocation.longitude);
      
      console.log('🛣️ Driver: API response received:', snappedData);
      
      if (snappedData && snappedData.lat && snappedData.lng) {
        const result = { latitude: snappedData.lat, longitude: snappedData.lng };
        console.log('🛣️ Driver: Setting snappedClientLocation state to:', result);
        setSnappedClientLocation(result);
        console.log('🛣️ Driver: Client snapped to road successfully:', result);
        console.log('🛣️ Driver: Client offset distance:', snappedData.distance, 'meters');
        return result;
      }

      console.warn('🛣️ Driver: No valid road data found for client, using raw location');
      console.log('🛣️ Driver: snappedData was:', snappedData);
      return rawClientLocation;
    } catch (error) {
      console.error('🛣️ Driver: Failed to snap client location to road:', error);
      console.warn('🛣️ Driver: Using raw client location as fallback');
      return rawClientLocation;
    }
  }, []);

  //  IMMEDIATE ROAD SNAPPING ON APP LOAD - Fix for app restart during ride
  useEffect(() => {
    if (currentLocation && (missionStatus === 'accepted' || missionStatus === 'on_the_way' || missionStatus === 'arriving' || missionStatus === 'in_progress')) {
      console.log(' Driver: App loaded with active ride, immediate road snapping');
      
      // ALWAYS use route start point for perfect alignment with blue line
      if ((missionStatus === 'accepted' || missionStatus === 'on_the_way' || missionStatus === 'arriving') && driverToClientRoute && driverToClientRoute.length > 0) {
        const routeStartPoint = driverToClientRoute[0];
        console.log('🚀 Driver: App load - Forcing driver to pickup route start point:', routeStartPoint);
        setSnappedDriverLocation(routeStartPoint);
        
        // Calculate distance for dotted line display
        const distance = getDistanceFromLatLonInKm(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude,
          routeStartPoint.latitude,
          routeStartPoint.longitude
        ) * 1000; // Convert to meters
        
        setRoadSnappingData({
          lat: routeStartPoint.latitude,
          lng: routeStartPoint.longitude,
          originalLat: currentLocation.coords.latitude,
          originalLng: currentLocation.coords.longitude,
          distance,
        });
        return;
      }
      
      if (missionStatus === 'in_progress' && clientToDestinationRoute && clientToDestinationRoute.length > 0) {
        const routeStartPoint = clientToDestinationRoute[0];
        console.log('🚀 Driver: App load - Forcing driver to destination route start point:', routeStartPoint);
        setSnappedDriverLocation(routeStartPoint);
        
        // Calculate distance for dotted line display
        const distance = getDistanceFromLatLonInKm(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude,
          routeStartPoint.latitude,
          routeStartPoint.longitude
        ) * 1000; // Convert to meters
        
        setRoadSnappingData({
          lat: routeStartPoint.latitude,
          lng: routeStartPoint.longitude,
          originalLat: currentLocation.coords.latitude,
          originalLng: currentLocation.coords.longitude,
          distance,
        });
        return;
      }
      
      // Fallback to raw location if no route
      console.log('🚀 Driver: App load - No route available, using raw location');
      setSnappedDriverLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
      setRoadSnappingData(null);
    }
  }, []); // Run only once on app load
    
  // Fallback: Snap to route polyline if Roads API fails
  const snapToRoutePolyline = () => {
    if (!currentLocation) return;
    
    const rawLocation = {
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude
    };
    
    // PRIORITY 2: If navigation is active and route exists, snap to route polyline
    if (missionStatus === 'in_progress' && clientToDestinationRoute && clientToDestinationRoute.length > 0) {
      console.log('🛣️ Driver: Snapping to client->destination route polyline (', clientToDestinationRoute.length, 'points)');
      
      // Find the closest point on the route polyline
      let minDistance = Infinity;
      let closestIndex = 0;
      
      clientToDestinationRoute.forEach((point, index) => {
        const distance = getDistanceFromLatLonInKm(
          rawLocation.latitude,
          rawLocation.longitude,
          point.latitude,
          point.longitude
        );
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });
      
      const snappedPoint = clientToDestinationRoute[closestIndex];
      
      console.log('🛣️ DEBUG - Driver raw location:', rawLocation);
      console.log('🛣️ DEBUG - Closest route point:', snappedPoint);
      console.log('🛣️ DEBUG - Distance to route:', (minDistance * 1000).toFixed(2), 'meters');
      console.log('🛣️ DEBUG - Closest index:', closestIndex, 'of', clientToDestinationRoute.length);
      
      // ALWAYS snap to the route - this ensures marker stays ON the blue line
      setSnappedDriverLocation(snappedPoint);
      
      // Trim the route to show only remaining path (from driver to destination)
      // This makes the blue line start exactly where the driver marker is
      const remainingRoute = clientToDestinationRoute.slice(closestIndex);
      if (remainingRoute.length > 1) {
        // Only update if significantly different to avoid flicker
        const currentStart = clientToDestinationRoute[0];
        const newStart = remainingRoute[0];
        const startDiff = getDistanceFromLatLonInKm(
          currentStart.latitude, currentStart.longitude,
          newStart.latitude, newStart.longitude
        );
        if (startDiff > 0.01) { // Only update if moved more than 10m
          console.log('🛣️ Trimming route - removing', closestIndex, 'points behind driver');
          setClientToDestinationRoute(remainingRoute);
        }
      }
      
      return;
    }
    
    // PRIORITY 3: If going to pickup, snap to driver->client route
    if ((missionStatus === 'accepted' || missionStatus === 'on_the_way' || missionStatus === 'arriving') && driverToClientRoute && driverToClientRoute.length > 0) {
      console.log('🛣️ Driver: Snapping to driver->client route polyline (', driverToClientRoute.length, 'points)');
      
      // IMPORTANT: Snap to the FIRST point of the route (where the blue line starts)
      const routeStartPoint = driverToClientRoute[0];
      const distanceToStart = getDistanceFromLatLonInKm(
        rawLocation.latitude,
        rawLocation.longitude,
        routeStartPoint.latitude,
        routeStartPoint.longitude
      );
      
      // If driver is close to route start (<50m), use the exact start point
      if (distanceToStart < 0.05) { // 50 meters
        console.log('🛣️ Driver: Close to route start, using exact start point');
        setSnappedDriverLocation(routeStartPoint);
        return;
      }
      
      // Otherwise, find the nearest point on the route polyline
      let minDistance = Infinity;
      let nearestPoint = driverToClientRoute[0];
      
      driverToClientRoute.forEach((point) => {
        const distance = getDistanceFromLatLonInKm(
          rawLocation.latitude,
          rawLocation.longitude,
          point.latitude,
          point.longitude
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearestPoint = point;
        }
      });
      
      setSnappedDriverLocation(nearestPoint);
      console.log('🛣️ Driver: Snapped to route polyline:', nearestPoint, `(${minDistance * 1000}km away)`);
      return;
    }
    
    // PRIORITY 4: Fallback to raw location
    console.log('🛣️ Driver: No route available, using raw location');
    setSnappedDriverLocation(rawLocation);
    setRoadSnappingData(null);
  };
  
  // Keep ref in sync with state for location updates
  useEffect(() => {
    currentLocationRef.current = currentLocation;
  }, [currentLocation]);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [availability, setAvailability] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Request states
  const [request, setRequest] = useState<any>(null);
  const [isAccepted, setIsAccepted] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false); // Prevent double clicks
  const [isRejecting, setIsRejecting] = useState(false);
  const [isStartingRide, setIsStartingRide] = useState(false); // Loading state for Start Ride button
  const [clientLocation, setClientLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [snappedClientLocation, setSnappedClientLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  
  // 🔍 DEBUG: Monitor snappedClientLocation state changes
  useEffect(() => {
    console.log('🔍 Driver: snappedClientLocation state changed:', snappedClientLocation);
    console.log('🔍 Driver: clientLocation (raw) state:', clientLocation);
    console.log('🔍 Driver: isAccepted state:', isAccepted);
  }, [snappedClientLocation, clientLocation, isAccepted]);
  
  // Mission tracking state
  const [showMissionTracking, setShowMissionTracking] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Get current navigation step based on driver location
  const { currentStep, nextStep } = useNavigationStep({
    driverLocation: currentLocation ? {
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
    } : null,
    routeSteps,
    isNavigating: true, // Always calculate step when route exists
  });
  const [showDemoMission, setShowDemoMission] = useState(false);
  const [showMissionHistory, setShowMissionHistory] = useState(false);

  const [showReconfirmModal, setShowReconfirmModal] = useState(false);
  const [isWaitingForClientConfirm, setIsWaitingForClientConfirm] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false); // Add showLogoutModal state

  const isRTL = useMemo(() => language === 'ar', [language]);

  // 🎬 SMOOTH DRIVER MARKER ANIMATION - Animate between positions like Client side
  useEffect(() => {
    if (snappedDriverLocation && (missionStatus === 'accepted' || missionStatus === 'on_the_way' || missionStatus === 'arriving' || missionStatus === 'in_progress')) {
      console.log('🎬 Driver: Snapped location updated:', snappedDriverLocation);
      
      // ALWAYS update animated position to snapped location
      if (!animatedDriverPositionRef.current) {
        console.log('🎬 Initializing animated driver position:', snappedDriverLocation);
        animatedDriverPositionRef.current = snappedDriverLocation;
        return;
      }
      
      // Animate from current animated position to new snapped position
      const fromPosition = animatedDriverPositionRef.current;
      const toPosition = snappedDriverLocation;
      
      // Calculate distance to determine if animation is needed
      const distance = getDistanceFromLatLonInKm(
        fromPosition.latitude,
        fromPosition.longitude,
        toPosition.latitude,
        toPosition.longitude
      );
      
      if (distance > 0.0001) { // Even small movements animate (10cm)
        console.log('🎬 Driver position changed, updating animation ref:', distance * 1000, 'meters');
        animatedDriverPositionRef.current = snappedDriverLocation;
      } else {
        // Direct update for very small changes
        animatedDriverPositionRef.current = snappedDriverLocation;
      }
    }
  }, [snappedDriverLocation, missionStatus]);

  // Restore active mission from backend on mount (Driver)
  useEffect(() => {
    const restore = async () => {
      try {
        // TEMPORARILY COMMENTED OUT: Prevent fetching old mission data
        // const mission = await api.getActiveMission();
        // console.log('🧩 Driver restore: backend /missions/active:', mission?.missionId, mission?.status);

        // if (mission) {
        //   setCurrentRide(mission);
        //   setIsAccepted(true);

        //   if (mission.status === 'in_progress') setMissionStatus('in_progress');
        //   else if (mission.status === 'accepted' || mission.status === 'pending') setMissionStatus('accepted');
        //   else if (mission.status === 'completed') setMissionStatus('completed' as any);

        //   if (mission.pickupLocation?.lat && mission.pickupLocation?.lng) {
        //     setClientLocation({ latitude: mission.pickupLocation.lat, longitude: mission.pickupLocation.lng });
        //   }

        //   if (mission.destinationLocation?.lat && mission.destinationLocation?.lng) {
        //     setDestinationLocation({ latitude: mission.destinationLocation.lat, longitude: mission.destinationLocation.lng });
        //   }

        //   console.log('🧩 Driver restore: mission restored from backend');
        // }

        console.log('🧩 Driver restore: API call commented out - no mission restoration');
      } catch (error) {
        console.error('🧩 Driver restore error:', error);
      }
    };

    restore();
  }, []);

  // PART 2 — BACKGROUND DRIVER LOCATION UPDATES
  // Run only when driver is online OR has an active mission.
  useEffect(() => {
    const shouldRun = availability || isAccepted;

    const sync = async () => {
      try {
        await storage.setDriverBgTrackingEnabled(shouldRun);
        if (shouldRun) await startDriverBackgroundLocationUpdates();
        else await stopDriverBackgroundLocationUpdates();
      } catch (e) {
        console.warn('⚠️ Background tracking sync failed:', e);
      }
    };

    sync();
  }, [availability, isAccepted]);

  useEffect(() => {
    currentRideStateRef.current = currentRide;
    driverArrivalNotifiedRef.current = false;
  }, [currentRide]);

  useEffect(() => {
    if (!currentRide) {
      driverArrivalNotifiedRef.current = false;
    }
  }, [currentRide?.rideId]);

  // Enable navigation mode when ride is accepted or in progress
  useEffect(() => {
    const navigationStatuses = ['accepted', 'on_the_way', 'arriving', 'in_progress'];
    const hasRoute = (driverToClientRoute && driverToClientRoute.length > 0) || 
                     (clientToDestinationRoute && clientToDestinationRoute.length > 0);
    
    if (navigationStatuses.includes(missionStatus) && hasRoute) {
      // Auto-enable navigation mode when driver is navigating to pickup or destination
      setIsNavigating(true);
      
      // Calculate initial navigation data
      updateNavigationData();
    } else if (!navigationStatuses.includes(missionStatus)) {
      setIsNavigating(false);
      setIsUserInteracting(false);
      if (navigationCameraRef.current) {
        clearInterval(navigationCameraRef.current);
        navigationCameraRef.current = null;
      }
    }
  }, [missionStatus, driverToClientRoute, clientToDestinationRoute]);

  // Local fallback arrival detection to ensure quick status updates on driver app
  useEffect(() => {
    if (!currentRide?.rideId || !clientLocation || !currentLocation) return;
    if (driverArrivalNotifiedRef.current) return;

    const activeStatuses: typeof missionStatus[] = ['accepted', 'on_the_way', 'arriving'];
    if (!activeStatuses.includes(missionStatus)) return;

    const distanceKm = getDistanceFromLatLonInKm(
      currentLocation.coords.latitude,
      currentLocation.coords.longitude,
      clientLocation.latitude,
      clientLocation.longitude
    );
    const distanceMeters = distanceKm * 1000;

    if (distanceMeters <= 30) {
      try {
        console.log('🚗 Local arrival detection triggered at', distanceMeters.toFixed(2), 'm');
        socketService.driverArrived(currentRide.rideId);
        driverArrivalNotifiedRef.current = true;
        setMissionStatus('arriving');
      } catch (error) {
        console.error('Failed to emit driver_arrived from fallback detection:', error);
        driverArrivalNotifiedRef.current = false;
      }
    }
  }, [currentRide?.rideId, currentLocation, clientLocation, missionStatus]);

  // Calculate route-based heading (follow route direction, not GPS)
  const calculateRouteHeading = useCallback((): number => {
    if (!currentLocation) return currentHeading;

    // Determine which route to use based on mission status
    const activeRoute = missionStatus === 'in_progress' 
      ? clientToDestinationRoute 
      : driverToClientRoute;

    if (!activeRoute || activeRoute.length < 2) {
      // Fallback to GPS heading if no route
      return currentLocation.coords.heading !== null && currentLocation.coords.heading !== undefined 
        ? currentLocation.coords.heading 
        : currentHeading;
    }

    const { latitude, longitude } = currentLocation.coords;

    // Find closest point on route
    let minDistance = Infinity;
    let closestIndex = 0;

    activeRoute.forEach((point, index) => {
      const dist = getDistanceFromLatLonInKm(
        latitude,
        longitude,
        point.latitude,
        point.longitude
      );
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = index;
      }
    });

    // Look ahead on the route (at least 50 meters ahead)
    let lookAheadIndex = closestIndex;
    let lookAheadDistance = 0;
    const minLookAhead = 0.05; // 50 meters

    while (lookAheadIndex < activeRoute.length - 1 && lookAheadDistance < minLookAhead) {
      lookAheadIndex++;
      lookAheadDistance += getDistanceFromLatLonInKm(
        activeRoute[lookAheadIndex - 1].latitude,
        activeRoute[lookAheadIndex - 1].longitude,
        activeRoute[lookAheadIndex].latitude,
        activeRoute[lookAheadIndex].longitude
      );
    }

    if (lookAheadIndex >= activeRoute.length) {
      lookAheadIndex = activeRoute.length - 1;
    }

    // Calculate bearing from current position to look-ahead point
    const currentPoint = activeRoute[closestIndex];
    const aheadPoint = activeRoute[lookAheadIndex];
    
    return calculateBearing(
      latitude,
      longitude,
      aheadPoint.latitude,
      aheadPoint.longitude
    );
  }, [currentLocation, currentHeading, missionStatus, clientToDestinationRoute, driverToClientRoute]);

  // Smooth zoom interpolation
  const updateZoom = useCallback(() => {
    const zoomDiff = targetZoom.current - currentZoom.current;
    if (Math.abs(zoomDiff) > 0.01) {
      // Smooth interpolation (easing)
      currentZoom.current += zoomDiff * 0.15;
      currentZoom.current = Math.max(17, Math.min(19, currentZoom.current));
    } else {
      currentZoom.current = targetZoom.current;
    }
  }, []);

  // ✅ FIX 2: updateNavigationCamera — throttle is now platform-aware,
  // and we skip the call if an animation is already in flight on iOS.
  // ✅ FIXED: updateNavigationCamera with proper iOS handling
const updateNavigationCamera = useCallback(() => {
  if (!mapRef.current || !currentLocation || !isNavigating || !isMapReady || isUserInteracting) return;

  // iOS: skip if animation is still running
  if (isNavigationAnimatingRef.current) return;

  const now = Date.now();
  // Dynamic throttle based on platform
  const throttleMs = Platform.OS === 'ios' ? 600 : 200; // Reduced from 800ms for smoother feel
  if (now - lastCameraUpdateRef.current < throttleMs) return;
  lastCameraUpdateRef.current = now;

  const { latitude, longitude } = currentLocation.coords;
  const speed = currentLocation.coords.speed || 0;
  
  // Calculate route-based heading
  const routeHeading = calculateRouteHeading();
  
  // Smooth heading transition with better interpolation
  let smoothHeading = routeHeading;
  if (lastCameraHeading.current !== 0) {
    const headingDiff = ((routeHeading - lastCameraHeading.current + 540) % 360) - 180;
    // More aggressive interpolation for faster turns, smoother for small adjustments
    const interpolationFactor = Math.abs(headingDiff) > 90 ? 0.4 : 0.2;
    smoothHeading = lastCameraHeading.current + headingDiff * interpolationFactor;
    smoothHeading = (smoothHeading + 360) % 360;
  }
  lastCameraHeading.current = smoothHeading;

  // Dynamic zoom based on speed
  targetZoom.current = speed > 15 ? 17 : speed > 8 ? 18 : 19;
  updateZoom();

  // Calculate position behind the driver for first-person chase view
  // Offset camera 50m behind (like simulation)
  const headingRad = (smoothHeading * Math.PI) / 180;
  const offsetDistance = 0.00045; // ~50m in degrees
  const cameraLat = latitude - Math.cos(headingRad) * offsetDistance;
  const cameraLng = longitude - Math.sin(headingRad) * offsetDistance;

  // iOS gets a longer duration but not too long to miss updates
  const animDuration = Platform.OS === 'ios' ? 500 : 300;

  try {
    isNavigationAnimatingRef.current = true;
    
    // First-person chase camera - positioned behind driver
    mapRef.current.animateCamera({
      center: { latitude: cameraLat, longitude: cameraLng },
      pitch: 65,
      heading: smoothHeading,
      zoom: currentZoom.current,
      altitude: 100,
    }, { duration: animDuration });

    // Release the lock after animation completes
    setTimeout(() => {
      isNavigationAnimatingRef.current = false;
    }, animDuration + 100);
  } catch (error) {
    console.error('🗺️ Navigation camera error:', error);
    isNavigationAnimatingRef.current = false;
  }
}, [currentLocation, isNavigating, isMapReady, isUserInteracting, calculateRouteHeading, updateZoom]);

  // ✅ FIX 3: Navigation camera loop — interval is now platform-aware,
  // and iOS waits 800ms before starting the first update so the
  // ride-acceptance zoom animation has time to finish first.
// ✅ FIXED: Navigation camera loop with better iOS timing
useEffect(() => {
  if (isNavigating && !isUserInteracting) {
    // Initialize zoom
    currentZoom.current = 19;
    targetZoom.current = 19;
    isNavigationAnimatingRef.current = false;

    // Platform-specific timing
    const intervalMs = Platform.OS === 'ios' ? 600 : 200;
    const startupDelayMs = Platform.OS === 'ios' ? 500 : 0;

    let startupTimer: NodeJS.Timeout | null = null;

    // Initial camera position for iOS
    if (Platform.OS === 'ios' && currentLocation) {
      const { latitude, longitude } = currentLocation.coords;
      const routeHeading = calculateRouteHeading();
      
      // Set initial camera immediately without animation for iOS
      mapRef.current?.animateCamera({
        center: { latitude, longitude },
        pitch: 65,
        heading: routeHeading,
        zoom: 19,
      }, { duration: 300 });
    }

    startupTimer = setTimeout(() => {
      // Clear any pending animation lock
      isNavigationAnimatingRef.current = false;
      
      navigationCameraRef.current = setInterval(() => {
        updateNavigationCamera();
      }, intervalMs);
    }, startupDelayMs);

    return () => {
      if (startupTimer) clearTimeout(startupTimer);
      if (navigationCameraRef.current) {
        clearInterval(navigationCameraRef.current);
        navigationCameraRef.current = null;
      }
      lastCameraHeading.current = 0;
      isNavigationAnimatingRef.current = false;
    };
  }
}, [isNavigating, isUserInteracting, currentLocation, calculateRouteHeading, updateNavigationCamera]);

  // Update navigation data (instructions, ETA, distance) using Google Directions steps
  const updateNavigationData = useCallback(() => {
    if (!currentLocation) return;
    
    const currentLat = currentLocation.coords.latitude;
    const currentLng = currentLocation.coords.longitude;

    // Use Google Directions steps if available
    if (routeSteps && routeSteps.length > 0) {
      // Find the current step based on closest start coordinate
      let currentStepIndex = 0;
      let minDistance = Infinity;
      
      routeSteps.forEach((step, index) => {
        const dist = getDistanceFromLatLonInKm(
          currentLat, 
          currentLng, 
          step.startCoord.latitude, 
          step.startCoord.longitude
        );
        if (dist < minDistance) {
          minDistance = dist;
          currentStepIndex = index;
        }
      });

      const currentStep = routeSteps[currentStepIndex];
      const nextStep = routeSteps[currentStepIndex + 1];
      
      // Calculate remaining distance and time from remaining steps
      let remainingDistanceMeters = 0;
      let remainingDurationSeconds = 0;
      
      for (let i = currentStepIndex; i < routeSteps.length; i++) {
        remainingDistanceMeters += routeSteps[i].distanceMeters;
        remainingDurationSeconds += routeSteps[i].durationSeconds;
      }

      setRemainingDistance((remainingDistanceMeters / 1000).toFixed(1));
      setRemainingTime(Math.max(1, Math.round(remainingDurationSeconds / 60)).toString());

      // Format instruction with distance to next maneuver
      let instruction = currentStep.instruction;
      
      // Add distance to instruction if we're still in current step
      if (minDistance < 0.05) { // Less than 50m from step start
        if (nextStep) {
          instruction = nextStep.instruction;
          const distToNext = Math.round(nextStep.distanceMeters);
          if (distToNext < 1000) {
            instruction += ` in ${distToNext}m`;
          } else {
            instruction += ` in ${(distToNext / 1000).toFixed(1)}km`;
          }
        }
      } else {
        // Still in current step, show distance remaining
        const distRemaining = Math.round(currentStep.distanceMeters * (minDistance / (currentStep.distanceMeters / 1000)));
        if (distRemaining < 1000) {
          instruction += ` in ${distRemaining}m`;
        } else {
          instruction += ` in ${(distRemaining / 1000).toFixed(1)}km`;
        }
      }
      
      setNavigationInstruction(instruction);
      setCurrentStepIndex(currentStepIndex);
      setCurrentManeuver(currentStep.maneuver || '');
      return;
    }

    // Fallback: use route coordinates if no steps available
    const activeRoute = missionStatus === 'in_progress' 
      ? clientToDestinationRoute 
      : driverToClientRoute;
    
    if (!activeRoute || activeRoute.length === 0) return;

    // Find closest point on route
    let minDistance = Infinity;
    let closestIndex = 0;

    activeRoute.forEach((point, index) => {
      const dist = getDistanceFromLatLonInKm(currentLat, currentLng, point.latitude, point.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = index;
      }
    });

    // Calculate remaining distance
    let remainingKm = 0;
    for (let i = closestIndex; i < activeRoute.length - 1; i++) {
      remainingKm += getDistanceFromLatLonInKm(
        activeRoute[i].latitude,
        activeRoute[i].longitude,
        activeRoute[i + 1].latitude,
        activeRoute[i + 1].longitude
      );
    }

    setRemainingDistance(remainingKm.toFixed(1));
    setRemainingTime(Math.max(1, Math.round((remainingKm / 30) * 60)).toString());

    // Fallback instruction
    if (missionStatus === 'in_progress') {
      setNavigationInstruction(
        language === 'ar' ? 'اقتربت من الوجهة' : 
        language === 'fr' ? 'Vous approchez de la destination' : 
        'Approaching destination'
      );
    } else {
      setNavigationInstruction(
        language === 'ar' ? 'اقتربت من موقع الالتقاط' : 
        language === 'fr' ? 'Vous approchez du point de prise en charge' : 
        'Approaching pickup'
      );
    }
  }, [currentLocation, routeSteps, clientToDestinationRoute, driverToClientRoute, missionStatus, language]);

  // Calculate bearing between two points
  const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(y, x);
    return (θ * 180 / Math.PI + 360) % 360;
  };

  // Get turn instruction based on bearing
  const getTurnInstruction = (bearing: number, lang: Language): string => {
    if (bearing >= 315 || bearing < 45) {
      return lang === 'ar' ? 'استمر مستقيماً' : lang === 'fr' ? 'Continuez tout droit' : 'Head straight';
    } else if (bearing >= 45 && bearing < 135) {
      return lang === 'ar' ? 'انعطف يميناً' : lang === 'fr' ? 'Tournez à droite' : 'Turn right';
    } else if (bearing >= 135 && bearing < 225) {
      return lang === 'ar' ? 'استدر للخلف' : lang === 'fr' ? 'Faites demi-tour' : 'Make a U-turn';
    } else {
      return lang === 'ar' ? 'انعطف يساراً' : lang === 'fr' ? 'Tournez à gauche' : 'Turn left';
    }
  };

  // Handle re-center button press
  const handleRecenter = useCallback(() => {
    setIsUserInteracting(false);
    isNavigationAnimatingRef.current = false; // allow camera to resume immediately
    if (currentLocation && mapRef.current) {
      const { latitude, longitude } = currentLocation.coords;
      // Reset heading to route-based heading
      const routeHeading = calculateRouteHeading();
      lastCameraHeading.current = routeHeading;
      currentZoom.current = 19;
      targetZoom.current = 19;
      
      mapRef.current.animateCamera({
        center: { latitude, longitude },
        pitch: 65,
        heading: routeHeading,
        zoom: 19,
      }, { duration: 500 });
    }
  }, [currentLocation, calculateRouteHeading]);

  // Handle map pan/touch to detect user interaction
  const handleMapPanDrag = useCallback(() => {
    if (isNavigating) {
      setIsUserInteracting(true);
    }
  }, [isNavigating]);

  // Fetch road route from driver to client (pickup)
  // STEP 3: When driver accepts - fetch and log driver → client distance/ETA
// Fetch road route from driver to client (pickup)
const fetchDriverToClientRoute = useCallback(async () => {
  if (!currentLocationRef.current || !clientLocation) {
    console.log('🛣️ Cannot fetch route - missing location data');
    return;
  }
  
  if (missionStatus === 'in_progress') {
    console.log('🛣️ Skipping route fetch - already in progress');
    return;
  }
  
  setIsLoadingRoute(true);
  console.log('🛣️ Fetching driver to client route...');
  console.log('🛣️ Driver location:', currentLocationRef.current.coords);
  console.log('🛣️ Client location:', clientLocation);
  
  try {
    const start: LocationCoord = {
      latitude: currentLocationRef.current.coords.latitude,
      longitude: currentLocationRef.current.coords.longitude,
    };
    const end: LocationCoord = {
      latitude: clientLocation.latitude,
      longitude: clientLocation.longitude,
    };
    
    console.log('🛣️ Calling fetchGoogleDirectionsAndLog...');
    const result = await fetchGoogleDirectionsAndLog(start, end, 'Driver to client');
    
    if (result && result.coordinates && result.coordinates.length > 0) {
      console.log('🛣️ Route fetched successfully:', result.coordinates.length, 'points');
      setDriverToClientRoute(result.coordinates);
    } else {
      console.log('🛣️ Google Directions failed, using fallback getRoadRoute');
      const route = await getRoadRoute(start, end);
      console.log('🛣️ Fallback route fetched:', route.coordinates.length, 'points');
      setDriverToClientRoute(route.coordinates);
    }
  } catch (error) {
    console.error('🛣️ Failed to fetch driver to client route:', error);
  } finally {
    setIsLoadingRoute(false);
  }
}, [clientLocation, missionStatus]);
  // Fetch road route from client (pickup) to destination
  // STEP 4: When driver presses Start Ride - fetch and log pickup → destination
  // STEP 5: Store polyline coordinates for later driver movement animation
  const fetchClientToDestinationRoute = useCallback(async () => {
    console.log('🛣️ fetchClientToDestinationRoute called');
    console.log('🛣️ currentLocation:', !!currentLocation, currentLocation);
    console.log('🛣️ clientLocation:', !!clientLocation, clientLocation);
    console.log('🛣️ currentRide?.destinationLocation:', !!currentRide?.destinationLocation, currentRide?.destinationLocation);
    console.log('🛣️ missionStatus:', missionStatus);
    
    if (!currentRide?.destinationLocation || missionStatus !== 'in_progress') {
      console.log('🛣️ Early return - missing data or wrong status');
      return;
    }
    
    // Use driver's current location as start point, not client pickup
    // This ensures the route starts where the driver actually is
    const driverLocation = currentLocation?.coords;
    if (!driverLocation) {
      console.log('🛣️ Early return - no driver location');
      return;
    }
    
    setIsLoadingRoute(true);
    try {
      const start: LocationCoord = {
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
      };
      const end: LocationCoord = {
        latitude: currentRide.destinationLocation.lat,
        longitude: currentRide.destinationLocation.lng,
      };
      
      console.log('🛣️ Fetching route from DRIVER LOCATION', start, 'to', end);
      
      // Use getRoadRoute to get steps for navigation header
      const route = await getRoadRoute(start, end);
      console.log('🛣️ getRoadRoute result:', route.coordinates.length, 'points');
      setClientToDestinationRoute(route.coordinates);
      setRouteSteps(route.steps || []);
    } catch (error) {
      console.error('Failed to fetch destination route:', error);
    } finally {
      setIsLoadingRoute(false);
    }
  }, [currentLocation, clientLocation, currentRide?.destinationLocation, missionStatus]);
  
  // Fetch routes when conditions change
  useEffect(() => {
    if (isAccepted && clientLocation && missionStatus !== 'in_progress') {
      fetchDriverToClientRoute();
    }
  }, [isAccepted, clientLocation, missionStatus, fetchDriverToClientRoute]);
  
  useEffect(() => {
    if (missionStatus === 'in_progress') {
      fetchClientToDestinationRoute();
    }
  }, [missionStatus, fetchClientToDestinationRoute]);
  
  // Clear routes when mission ends
  useEffect(() => {
    if (!isAccepted) {
      setDriverToClientRoute(null);
      setClientToDestinationRoute(null);
      setRouteSteps([]);
    }
  }, [isAccepted]);

  // ✅ FIXED: NEW SINGLE EFFECT FOR ACCEPTED STATUS - NO COMPETING ANIMATIONS
  // ✅ PROFESSIONAL FIX: Single camera fit when ride becomes accepted
  const hasFittedRef = useRef(false);
  
useEffect(() => {
  // Guard: Already fitted
  if (hasFittedRef.current) {
    console.log('⏭️ DRIVER MAP: Already fitted, skipping');
    return;
  }

  // Guard: Map ready
  if (!isMapReady) {
    console.log('⏳ DRIVER MAP: Waiting for map ready');
    return;
  }

  // Guard: Status check
  if (missionStatus !== 'accepted') {
    console.log('❌ DRIVER MAP: Not accepted status:', missionStatus);
    return;
  }

  // Guard: Have driver location
  if (!currentLocation) {
    console.log('❌ DRIVER MAP: Missing driver location');
    return;
  }

  // Guard: Have client location
  if (!clientLocation) {
    console.log('❌ DRIVER MAP: Missing client location');
    return;
  }

  // ✅ All checks passed
  console.log('✅ DRIVER MAP: All checks passed - zooming');
  hasFittedRef.current = true;

  // NORMALIZE both coordinates (handles any format)
  // Note: currentLocation might be currentLocation.coords
  const driverCoords = normalizeLocation(
    currentLocation.coords || currentLocation
  );
  const clientCoords = normalizeLocation(clientLocation);

  console.log('📍 Driver:', driverCoords);
  console.log('📍 Client:', clientCoords);

  // ✨ CALCULATE deltas based on ACTUAL distance (not static values!)
  const deltas = calculateZoomDeltas(driverCoords, clientCoords);
  const centerLat = (driverCoords.latitude + clientCoords.latitude) / 2;
  const centerLng = (driverCoords.longitude + clientCoords.longitude) / 2;

  const newRegion = {
    latitude: centerLat,
    longitude: centerLng,
    ...deltas, // ✅ DYNAMIC DELTAS instead of hardcoded
  };

  console.log('🔍 Calculated region:', newRegion);

  // Disable navigation mode for accepted status
  setIsNavigating(false);
  setIsUserInteracting(false);

  setTimeout(() => {
    if (mapRef.current) {
      try {
        // Try fitToCoordinates first (Google Maps method)
        mapRef.current.fitToCoordinates([driverCoords, clientCoords], {
          edgePadding: {
            top: 150,
            right: 50,
            bottom: 350,  // ⚠️ INCREASE to 400+ if bottom sheet covers markers
            left: 50,
          },
          animated: true,
        });
        console.log('✅ DRIVER MAP: fitToCoordinates applied');
      } catch (error) {
        // Fallback if fitToCoordinates fails
        console.log('⚠️ DRIVER MAP: fitToCoordinates failed, fallback to animateToRegion');
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    }
  }, 300);

}, [missionStatus, currentLocation, clientLocation, isMapReady]);

// Reset guard when status changes
useEffect(() => {
  if (missionStatus !== 'accepted') {
    hasFittedRef.current = false;
  }
}, [missionStatus]);

// 🎥 CAMERA FOLLOW FOR PICKUP PHASE - Follow driver marker to pickup
useEffect(() => {
  if (!mapRef.current || !isMapReady) return;
  if (!['accepted', 'on_the_way', 'arriving'].includes(missionStatus)) return;
  if (isUserInteracting) return; // Don't interrupt user interaction
  if (!snappedDriverLocation && !currentLocation) return;

  // Get driver position (snapped or raw)
  const driverPos = snappedDriverLocation || {
    latitude: currentLocation?.coords.latitude || 0,
    longitude: currentLocation?.coords.longitude || 0,
  };

  if (!driverPos.latitude) return;

  // Throttle camera updates (200ms like navigation mode)
  const now = Date.now();
  if (now - lastCameraUpdateRef.current < 200) return;
  lastCameraUpdateRef.current = now;

  // Calculate heading to client if available
  let heading = currentHeading;
  if (clientLocation) {
    heading = calculateBearing(
      driverPos.latitude,
      driverPos.longitude,
      clientLocation.latitude,
      clientLocation.longitude
    );
  }

  // Calculate position behind the driver for first-person chase view
  // Offset camera 50m behind (like simulation)
  const headingRad = (heading * Math.PI) / 180;
  const offsetDistance = 0.00045; // ~50m in degrees
  const cameraLat = driverPos.latitude - Math.cos(headingRad) * offsetDistance;
  const cameraLng = driverPos.longitude - Math.sin(headingRad) * offsetDistance;

  // Animate camera to follow driver from behind (first-person chase view)
  mapRef.current.animateCamera({
    center: {
      latitude: cameraLat,
      longitude: cameraLng,
    },
    heading: heading,
    pitch: 65, // Tilted up to see road ahead
    zoom: 19, // Street-level zoom
    altitude: 100, // Slight elevation
  }, { duration: 800 });

  console.log('🗺️ DRIVER PICKUP: First-person camera following driver from behind');
}, [missionStatus, snappedDriverLocation, currentLocation, clientLocation, isMapReady, isUserInteracting, currentHeading]);

  // Zoom map when ride is accepted to show driver → client (pickup)
  // COMMENTED OUT - REPLACED BY NEW SINGLE EFFECT ABOVE
  // useEffect(() => {
  //   if (isMapReady && isAccepted && clientLocation && mapRef.current && missionStatus !== 'in_progress' && !isNavigating) {
  //     const loc = currentLocationRef.current;
  //     if (loc) {
  //       console.log('🗺️ Driver: Fitting map for accepted ride (driver → client)');
  //       setTimeout(() => {
  //         mapRef.current?.fitToCoordinates(
  //           [
  //             { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
  //             clientLocation,
  //           ],
  //           { 
  //             edgePadding: { top: 150, right: 80, bottom: 350, left: 80 }, 
  //             animated: true,
  //           }
  //         );
  //       }, 500);
  //     }
  //   }
  // }, [isAccepted, clientLocation, isMapReady, missionStatus, isNavigating]);

  // Zoom map when ride is in progress to show full route (Pickup → Destination)
  useEffect(() => {
    if (isMapReady && missionStatus === 'in_progress' && mapRef.current && !isNavigating) {
      // Use clientLocation (pickup) and destination from currentRide
      const pickup = clientLocation;
      const destination = currentRide?.destinationLocation || currentRide?.pickupLocation;
      
      console.log('🗺️ Driver: Zooming map for in_progress ride:', { pickup, destination });
      
      if (pickup?.latitude && destination?.lat) {
        setTimeout(() => {
          console.log('🗺️ Driver: Fitting map to show pickup → destination');
          mapRef.current?.fitToCoordinates(
            [
              { latitude: pickup.latitude, longitude: pickup.longitude },
              { latitude: destination.lat, longitude: destination.lng },
            ],
            { 
              edgePadding: { top: 150, right: 80, bottom: 350, left: 80 }, 
              animated: true,
            }
          );
        }, 1000);
      } else {
        console.warn('🗺️ Driver: Cannot zoom - missing coordinates:', { pickup, destination });
      }
    }
  }, [missionStatus, isMapReady, clientLocation, currentRide, isNavigating]);

  // Get user location on mount
  useEffect(() => {
    const getLocation = async () => {
      try {
        let foregroundStatus = await Location.getForegroundPermissionsAsync();
        if (foregroundStatus.status !== 'granted') {
          foregroundStatus = await Location.requestForegroundPermissionsAsync();
        }
        
        if (foregroundStatus.status !== 'granted') {
          console.log('Location permission denied');
          setLocationPermissionGranted(false);
          return;
        }

        setLocationPermissionGranted(true);

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation, // High accuracy for navigation
        });

        setCurrentLocation(location);
        
        // Set initial heading
        if (location.coords.heading) {
          setCurrentHeading(location.coords.heading);
        }

        const { latitude, longitude } = location.coords;
        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        };

        setMapRegion(newRegion);

        // Center map on user location with better zoom
        if (mapRef.current) {
          setTimeout(() => {
            mapRef.current?.animateToRegion(newRegion, 1000);
          }, 500);
        }
      } catch (error) {
        console.error('Error getting location:', error);
        setLocationPermissionGranted(false);
      }
    };

    getLocation();
  }, []);

  // Calculate heading based on location changes (like client side)
  useEffect(() => {
    if (currentLocation && lastLocationForHeading.current) {
      const lat1 = lastLocationForHeading.current.coords.latitude;
      const lon1 = lastLocationForHeading.current.coords.longitude;
      const lat2 = currentLocation.coords.latitude;
      const lon2 = currentLocation.coords.longitude;

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
        setCurrentHeading(bearing);
      }
    }
    lastLocationForHeading.current = currentLocation;
  }, [currentLocation]);

  // Watch location updates for heading and position
  useEffect(() => {
    // NEW: Use professional hook's heading data
    if (locationData?.heading) {
      setCurrentHeading(locationData.heading);
    }
  }, [locationData?.heading]);

  // 🧭 DEVICE HEADING MONITORING - For marker rotation based on phone compass
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    
    const startHeadingMonitoring = async () => {
      try {
        subscription = await Location.watchHeadingAsync((heading) => {
          const headingDegrees = Math.round(heading.trueHeading || heading.magHeading || 0);
          setDeviceHeading(headingDegrees);
          console.log('🧭 Driver: Device heading updated:', headingDegrees);
        });
      } catch (error) {
        console.warn('🧭 Driver: Could not start heading monitoring:', error);
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

  // 🎬 SIMULATION EFFECTS
  useEffect(() => {
    const unsubscribe = rideSimulation.subscribe((state) => {
      setSimulationState(state);
      setMockRide(state.mockRide);

      // Update driver location from simulation
      if (state.driverPosition && state.isActive) {
        console.log('🎬 Simulation driver location update:', state.driverPosition);
        
        // Update currentLocation with simulated position
        const simulatedLocation: Location.LocationObject = {
          coords: {
            latitude: state.driverPosition.latitude,
            longitude: state.driverPosition.longitude,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: 10, // Simulate movement speed
            accuracy: 5, // GPS accuracy in meters
          },
          timestamp: Date.now(),
        };
        
        setCurrentLocation(simulatedLocation);
      }

      // Update mission status based on mock ride
      if (state.mockRide) {
        console.log('🎬 Simulation status update:', state.mockRide.status);
        
        // Map simulation status to app status
        const statusMap: Record<string, any> = {
          'new_request': 'new_request',
          'accepted': 'accepted',
          'driver_arrived': 'arriving',
          'in_progress': 'in_progress',
          'completed': null, // End simulation
        };

        const mappedStatus = statusMap[state.mockRide.status];
        if (mappedStatus) {
          setMissionStatus(mappedStatus);
        } else if (state.mockRide.status === 'completed') {
          // Clean up after completion
          setMissionStatus('new_request');
          setRequest(null);
          setCurrentRide(null);
        }

        // Update currentRide with mock data
        if (state.mockRide.status !== 'completed') {
          setCurrentRide({
            rideId: state.mockRide.rideId,
            status: state.mockRide.status,
            pickupLocation: state.mockRide.pickupLocation,
            destinationLocation: state.mockRide.destinationLocation,
            driverId: state.mockRide.driverId,
            clientId: state.mockRide.clientId,
          });

          // 🎬 Set client location for simulation
          setClientLocation({
            latitude: state.mockRide.pickupLocation.lat,
            longitude: state.mockRide.pickupLocation.lng,
          });

          // 🎬 Fetch routes for simulation
          if (state.driverPosition) {
            const driverPos = {
              latitude: state.driverPosition.latitude,
              longitude: state.driverPosition.longitude,
            };

            if (state.mockRide.status === 'accepted') {
              // Fetch driver to pickup route
              fetchDriverToClientRouteForSimulation(driverPos, {
                latitude: state.mockRide.pickupLocation.lat,
                longitude: state.mockRide.pickupLocation.lng,
              });
            } else if (state.mockRide.status === 'in_progress') {
              // Fetch pickup to destination route
              fetchPickupToDestinationRouteForSimulation(
                {
                  latitude: state.mockRide.pickupLocation.lat,
                  longitude: state.mockRide.pickupLocation.lng,
                },
                {
                  latitude: state.mockRide.destinationLocation.lat,
                  longitude: state.mockRide.destinationLocation.lng,
                }
              );
            }
          }
        }
      }
    });

    return unsubscribe;
  }, []);

  // 🎬 SIMULATION ROUTE FETCHING
  const fetchDriverToClientRouteForSimulation = async (start: LocationCoord, end: LocationCoord) => {
    try {
      console.log('🎬 Fetching driver->pickup route for simulation');
      const route = await getRoadRoute(start, end);
      console.log('🎬 Driver->pickup route fetched:', route.coordinates.length, 'points');
      setDriverToClientRoute(route.coordinates);
    } catch (error) {
      console.error('🎬 Failed to fetch driver->pickup route:', error);
    }
  };

  const fetchPickupToDestinationRouteForSimulation = async (start: LocationCoord, end: LocationCoord) => {
    try {
      console.log('🎬 Fetching pickup->destination route for simulation');
      const route = await getRoadRoute(start, end);
      console.log('🎬 Pickup->destination route fetched:', route.coordinates.length, 'points');
      setClientToDestinationRoute(route.coordinates);
    } catch (error) {
      console.error('🎬 Failed to fetch pickup->destination route:', error);
    }
  };

  // 🎬 SIMULATION CONTROL FUNCTIONS
  const startSimulation = async () => {
    console.log('🎬 Simulation button clicked!');
    console.log('🎬 Current simulation state:', simulationState);
    
    try {
      // Use default locations for testing (Algeria coordinates)
      const pickupLocation = { lat: 36.7538, lng: 3.0588 }; // Algiers
      const destinationLocation = { lat: 36.7473, lng: 3.0894 }; // Nearby destination

      console.log('🎬 Starting simulation with locations:', { pickupLocation, destinationLocation });

      const mockRide = await rideSimulation.startSimulation(
        pickupLocation,
        destinationLocation,
        'driver_sim_001',
        'client_sim_001'
      );

      console.log('🎬 Simulation started successfully:', mockRide);
    } catch (error: any) {
      console.error('🎬 Failed to start simulation:', error);
      Alert.alert('Simulation Error', `Failed to start simulation: ${error?.message || 'Unknown error'}`);
    }
  };

  const stopSimulation = () => {
    rideSimulation.stopSimulation();
    console.log('🎬 Simulation stopped by user');
  };

  // Center map on user location when map becomes ready (only when no active ride)
  useEffect(() => {
    if (isMapReady && currentLocation && mapRef.current && !isNavigating && !isAccepted) {
      const region = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

      setTimeout(() => {
        mapRef.current?.animateToRegion(region, 1000);
      }, 300);
    }
  }, [isMapReady, currentLocation, isNavigating, isAccepted]);

  // Check user role on mount
  useEffect(() => {
    const checkRole = async () => {
      const user = await storage.getUser();
      console.log('👤 DriverHomeScreen - User role:', user?.role);
      if (user?.role !== 'driver') {
        console.error('❌ User is not a driver! Role:', user?.role);
        Alert.alert(
          'Error',
          'You need driver permissions. Please logout and login again.'
        );
      }
    };
    checkRole();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLocationUpdates();
      if (availability) {
        socketService.disconnect();
      }
      if (navigationCameraRef.current) {
        clearInterval(navigationCameraRef.current);
      }
    };
  }, []);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const ensurePushToken = useCallback(async (): Promise<string | null> => {
    if (pushTokenRef.current) return pushTokenRef.current;
    try {
      const token = await getAndRegisterToken();
      pushTokenRef.current = token;
      console.log('📱 Cached driver push token:', pushTokenRef.current?.substring(0, 30) + '...');
    } catch (error) {
      console.log('ℹ️ Could not get push token');
    }
    return pushTokenRef.current;
  }, []);

  const ensureCurrentLocationAsync = useCallback(async (): Promise<Location.LocationObject> => {
    if (currentLocationRef.current) {
      return currentLocationRef.current;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission required to go online');
    }
    const latest = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setCurrentLocation(latest);
    currentLocationRef.current = latest;
    return latest;
  }, []);

  const ensureSocketConnected = useCallback(async () => {
    if (socketService.isConnected()) {
      return;
    }
    console.log('🔌 Socket not connected, connecting...');
    await socketService.connect();
    let attempts = 0;
    while (!socketService.isConnected() && attempts < 10) {
      await wait(300);
      attempts += 1;
    }
    if (!socketService.isConnected()) {
      throw new Error('Failed to connect to server');
    }
  }, []);

  const trackedDriverLocation = locationData
    ? { latitude: locationData.latitude, longitude: locationData.longitude }
    : null;

  const handleRideRequestEvent = useCallback(async (data: any) => {
    console.log('📨 New ride request received (immediate UI):', data);
    
    // STEP 1: Show UI immediately with available data
    const driverCoord =
      snappedDriverLocation ||
      trackedDriverLocation ||
      (currentLocation
        ? {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          }
        : null);
        
    setCurrentRide({
      ...data,
      driverLocation: driverCoord,
      pickupLocationName: data.pickupLocation?.address || getTranslation('pickupLocation', language),
      destinationLocationName: data.destinationLocation?.address || getTranslation('destinationLocation', language),
    });

    setShowMissionTracking(true);
    setMissionStatus('new_request');

    // STEP 2: Enrich data in background
    const pickupCoord = data.pickupLocation
      ? { latitude: data.pickupLocation.lat, longitude: data.pickupLocation.lng }
      : null;
    const destinationCoord = data.destinationLocation
      ? { latitude: data.destinationLocation.lat, longitude: data.destinationLocation.lng }
      : null;

    // Run async tasks without awaiting them to avoid blocking UI
    (async () => {
      try {
        const [driverLocationName, pickupLocationName] = await Promise.all([
          driverCoord ? reverseGeocodeAddress(driverCoord.latitude, driverCoord.longitude) : Promise.resolve(null),
          pickupCoord ? reverseGeocodeAddress(pickupCoord.latitude, pickupCoord.longitude) : Promise.resolve(null),
        ]);

        const routeMetrics = await fetchMissionRouteMetrics(driverCoord, pickupCoord);
        const tripMetrics = await fetchTripRouteMetrics(pickupCoord, destinationCoord);

        const resolvedDriverLocationName =
          driverLocationName || getTranslation('currentLocation', language);
        const resolvedPickupLocationName =
          pickupLocationName || data.pickupLocation?.address || getTranslation('pickupLocation', language);

        const driverLocationText = driverCoord
          ? `${driverCoord.latitude.toFixed(5)}, ${driverCoord.longitude.toFixed(5)}`
          : resolvedDriverLocationName;

        setCurrentRide((prev: any) => {
          if (!prev || prev.rideId !== data.rideId) return prev;
          return {
            ...prev,
            driverLocationText,
            driverLocationName: resolvedDriverLocationName,
            pickupLocationName: resolvedPickupLocationName,
            distanceKm: routeMetrics.distanceKm,
            etaMinutes: routeMetrics.etaMinutes,
            headingDirection: routeMetrics.headingDirection,
            tripDistanceKm: tripMetrics.tripDistanceKm,
            tripEtaMinutes: tripMetrics.tripEtaMinutes,
          };
        });
        console.log('📨 Ride request data enriched in background');
      } catch (err) {
        console.error('❌ Error enriching ride request data:', err);
      }
    })();
  }, [snappedDriverLocation, trackedDriverLocation, currentLocation, language]);

const handleRideAcceptedEvent = useCallback(async (data: any) => {
  console.log('✅ Ride accepted:', data);
  
  // Prevent overriding in_progress status (race condition fix)
  if (missionStatus === 'in_progress') {
    console.log('⚠️ Ignoring ride_accepted_confirmed event - ride already in progress');
    return;
  }
  
  setMissionStatus('accepted');
  setIsAccepted(true);
  setShowMissionTracking(false);

  if (data.rideId) {
    setCurrentRide({
      rideId: data.rideId,
      clientId: data.clientId,
      clientPhone: data.clientPhone,
      pickupLocation: data.pickupLocation,
      destinationLocation: data.destinationLocation,
      pricing: data.pricing,
      eta: data.eta,
      distance: data.distance,
    });
  }

  const fallbackPickup = currentRideStateRef.current?.pickupLocation;
  const pickupLoc = data.pickupLocation || fallbackPickup;
  if (pickupLoc) {
    const clientLoc = {
      latitude: pickupLoc.lat,
      longitude: pickupLoc.lng,
    };
    console.log('🚀 Driver: handleRideAcceptedEvent - Setting client raw location:', clientLoc);
    setClientLocation(clientLoc);
    
    // 🛣️ SNAP CLIENT LOCATION TO ROAD
    console.log('🚀 Driver: handleRideAcceptedEvent - Calling snapClientToRoad...');
    const snappedLocation = await snapClientToRoad(clientLoc);
    console.log('🚀 Driver: handleRideAcceptedEvent - snapClientToRoad returned:', snappedLocation);
    
    // Immediately trigger route fetch
    if (currentLocationRef.current) {
      console.log('🚀 Driver: Triggering route fetch immediately');
      // Small delay to ensure state is updated
      setTimeout(() => {
        fetchDriverToClientRoute();
      }, 100);
    }
  }
}, [snapClientToRoad, fetchDriverToClientRoute]);

  const handleNoDriverFoundEvent = useCallback((data: any) => {
    console.log('❌ No driver found:', data);
    setShowMissionTracking(false);
    setCurrentRide(null);
    setMissionStatus('new_request');
    setIsAccepted(false);
  }, []);

  const handleRideTimeoutEvent = useCallback((data: any) => {
    console.log('⏱️ Ride timeout:', data);
    setShowMissionTracking(false);
    setCurrentRide(null);
  }, []);

  const handleDriverArrivedEvent = useCallback((data: any) => {
    console.log('🚗 Auto-arrival detected:', data);
    setMissionStatus('arriving');
    driverArrivalNotifiedRef.current = true;
  }, []);

  const handleRideStartedEvent = useCallback((data: any) => {
    console.log('🚀 Ride started event received:', data);
    setIsStartingRide(false); // Reset loading state
    setMissionStatus('in_progress');
    setIsNavigating(true);
    
    // Set first-person view immediately on ride start (like Android)
    if (currentLocation && mapRef.current) {
      const { latitude, longitude } = currentLocation.coords;
      const routeHeading = calculateRouteHeading();
      
      console.log('🚀 Setting first-person view for iOS ride start');
      lastCameraHeading.current = routeHeading;
      currentZoom.current = 19;
      targetZoom.current = 19;
      
      // Immediate first-person camera positioning
      setTimeout(() => {
        mapRef.current?.animateCamera({
          center: { latitude, longitude },
          pitch: 65,
          heading: routeHeading,
          zoom: 19,
          altitude: 500,
        }, 1000);
      }, 300);
    }
    
    setCurrentRide((prev: any) => {
      if (!prev) return null;
      const tripDistanceKm = data.distance?.clientToDestination
        ? parseFloat((data.distance.clientToDestination / 1000).toFixed(1))
        : prev.tripDistanceKm;
      const tripEtaMinutes = data.eta?.clientToDestination
        ? Math.max(1, Math.ceil(data.eta.clientToDestination / 60))
        : prev.tripEtaMinutes;
      const updated = {
        ...prev,
        status: 'in_progress',
        distance: data.distance || prev.distance,
        eta: data.eta || prev.eta,
        pickupLocation: data.pickupLocation || prev.pickupLocation,
        destinationLocation: data.destinationLocation || prev.destinationLocation,
        tripDistanceKm,
        tripEtaMinutes,
      };
      console.log('🚀 Driver: Updated currentRide:', updated);
      return updated;
    });
  }, [currentLocation, calculateRouteHeading]);

  const handleRideCompletedEvent = useCallback((data: any) => {
    console.log('✅ Ride completed:', data);
    setIsWaitingForClientConfirm(false);
    setShowReconfirmModal(false);
    setCurrentRide((prev: any) => (prev ? { ...prev, status: 'completed' } : null));
    setMissionStatus('new_request'); // Reset to new_request after completion
    setIsNavigating(false);
    setRouteSteps([]); // Clear route steps to hide navigation header
    setCurrentStepIndex(0); // Reset step index
    setNavigationInstruction(''); // Clear navigation instruction
    setShowSuccessScreen(true); // Show success screen
  }, []);

  const handleRideCompletionDeniedEvent = useCallback((data: any) => {
    console.log('❌ Client denied ride completion:', data);
    setIsWaitingForClientConfirm(false);
    setShowReconfirmModal(true);
  }, []);

  const handleRideCancelledEvent = useCallback((data: any) => {
    console.log('🚫 Ride cancelled by client:', data);
    
    // Reset all ride-related states
    setIsAccepted(false);
    setCurrentRide(null);
    setMissionStatus('new_request');
    setClientLocation(null);
    setSnappedClientLocation(null);
    setIsNavigating(false);
    setShowMissionTracking(false);
    setIsWaitingForClientConfirm(false);
    setShowReconfirmModal(false);
    setShowCancelModal(false);
    setDriverToClientRoute(null);
    setClientToDestinationRoute(null);
    setRouteSteps([]);
    setNavigationInstruction('');

    // Don't show banner if already showing
    if (!showRideCancelledBanner) {
      showRideCancelledBannerMessage(getTranslation('rideCancelledByClient', language));
    }
  }, [language, showRideCancelledBanner]);

  const handleDriverCancelledRideEvent = useCallback((data: any) => {
    console.log('🚫 Driver cancelled ride - confirmation received:', data);
    
    // Reset all ride-related states
    setIsAccepted(false);
    setCurrentRide(null);
    setMissionStatus('new_request');
    setClientLocation(null);
    setSnappedClientLocation(null);
    setIsNavigating(false);
    setShowMissionTracking(false);
    setIsWaitingForClientConfirm(false);
    setShowReconfirmModal(false);
    setShowCancelModal(false);
    setDriverToClientRoute(null);
    setClientToDestinationRoute(null);
    setRouteSteps([]);
    setNavigationInstruction('');
    
    // DON'T show banner - driver already knows they cancelled
  }, []);

  const handleGenericRideCancelledEvent = useCallback((data: any) => {
    console.log('🚫 Generic ride_cancelled event received:', data);

    // Only show banner if client cancelled (not if driver cancelled - they know)
    if (data?.cancelledBy === 'driver') {
      console.log('🚫 Driver initiated cancellation, not showing banner');
      // Just reset state without showing banner
      setIsAccepted(false);
      setCurrentRide(null);
      setMissionStatus('new_request');
      setClientLocation(null);
      setSnappedClientLocation(null);
      setIsNavigating(false);
      setShowMissionTracking(false);
      setIsWaitingForClientConfirm(false);
      setShowReconfirmModal(false);
      setShowCancelModal(false);
      setDriverToClientRoute(null);
      setClientToDestinationRoute(null);
      setRouteSteps([]);
      setNavigationInstruction('');
      return;
    }
    
    // Show banner only if client cancelled
    // Don't show banner if already showing
    if (!showRideCancelledBanner) {
      // Reset all ride-related states
      setIsAccepted(false);
      setCurrentRide(null);
      setMissionStatus('new_request');
      setClientLocation(null);
      setSnappedClientLocation(null);
      setIsNavigating(false);
      setShowMissionTracking(false);
      setIsWaitingForClientConfirm(false);
      setShowReconfirmModal(false);
      setShowCancelModal(false);
      setDriverToClientRoute(null);
      setClientToDestinationRoute(null);
      setRouteSteps([]);
      setNavigationInstruction('');

      showRideCancelledBannerMessage(getTranslation('rideCancelledByClient', language));
    }
  }, [language, showRideCancelledBannerMessage, showRideCancelledBanner]);

  const registerSocketListeners = useCallback(() => {
    if (listenersRegisteredRef.current) return;
    socketService.on('ride_request', handleRideRequestEvent);
    socketService.on('ride_accepted_confirmed', handleRideAcceptedEvent);
    socketService.on('no_driver_found', handleNoDriverFoundEvent);
    socketService.on('ride_timeout', handleRideTimeoutEvent);
    socketService.on('driver_arrived', handleDriverArrivedEvent);
    socketService.on('ride_started', handleRideStartedEvent);
    socketService.on('ride_completed', handleRideCompletedEvent);
    socketService.on('ride_completion_denied', handleRideCompletionDeniedEvent);
    socketService.on('ride_cancelled_by_client', handleRideCancelledEvent);
    socketService.on('ride_cancelled_by_driver', handleDriverCancelledRideEvent);
    socketService.on('ride_cancelled', handleGenericRideCancelledEvent);
    listenersRegisteredRef.current = true;
  }, [
    handleRideRequestEvent,
    handleRideAcceptedEvent,
    handleNoDriverFoundEvent,
    handleRideTimeoutEvent,
    handleDriverArrivedEvent,
    handleRideStartedEvent,
    handleRideCompletedEvent,
    handleRideCompletionDeniedEvent,
    handleRideCancelledEvent,
    handleDriverCancelledRideEvent,
    handleGenericRideCancelledEvent,
  ]);

  const unregisterSocketListeners = useCallback(() => {
    if (!listenersRegisteredRef.current) return;
    socketService.off('ride_request');
    socketService.off('ride_accepted_confirmed');
    socketService.off('no_driver_found');
    socketService.off('ride_timeout');
    socketService.off('driver_arrived');
    socketService.off('ride_started');
    socketService.off('ride_completed');
    socketService.off('ride_completion_denied');
    socketService.off('ride_cancelled_by_client');
    socketService.off('ride_cancelled_by_driver');
    socketService.off('ride_cancelled');
    listenersRegisteredRef.current = false;
  }, []);

  const handleToggleAvailability = async () => {
    if (isLoading) return;
    setIsLoading(true);
    const newAvailability = !availability;
    console.log('Toggling availability:', newAvailability);

    if (newAvailability) {
      setAvailability(true);
      try {
        await Promise.all([startTracking().catch((err) => {
          console.error('startTracking error:', err);
          throw err;
        })]);

        const [location, pushToken] = await Promise.all([
          ensureCurrentLocationAsync(),
          (async () => {
            await ensureSocketConnected();
            return ensurePushToken();
          })(),
        ]);

        // ✅ PERSIST: Update driver status in database
        try {
          await api.setDriverOnline(
            {
              lat: location.coords.latitude,
              lng: location.coords.longitude,
              heading: location.coords.heading ?? undefined,
            },
            undefined
          );
          console.log('💾 Driver online status persisted to database');
        } catch (apiError) {
          console.error('Failed to persist driver online status:', apiError);
          // Continue anyway - socket will handle the real-time part
        }

        registerSocketListeners();
        startLocationUpdates();

        socketService.driverOnline(
          {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          },
          undefined,
          pushToken ?? undefined
        );
      } catch (error: any) {
        console.error('Error toggling availability:', error);
        setAvailability(false);
        Alert.alert('Error', error?.message || 'Failed to go online');
      } finally {
        setIsLoading(false);
      }
    } else {
      setAvailability(false);
      try {
        // ✅ PERSIST: Update driver status in database
        try {
          await api.setDriverOffline();
          console.log('💾 Driver offline status persisted to database');
        } catch (apiError) {
          console.error('Failed to persist driver offline status:', apiError);
          // Continue anyway
        }

        stopLocationUpdates();
        stopTracking();
        unregisterSocketListeners();
        socketService.disconnect();
      } catch (error) {
        console.error('Error toggling availability:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  // Location update interval ref
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const startLocationUpdates = () => {
    // Send location every 5 seconds
    locationIntervalRef.current = setInterval(async () => {
      const location = currentLocationRef.current;
      if (location) {
        const locationData = {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          heading: location.coords.heading ?? undefined,
        };
        
        // Emit to socket for real-time updates
        socketService.updateLocation(locationData);
        
        // Also persist to database for persistence
        try {
          await api.updateDriverLocation(locationData);
        } catch (error) {
          console.warn('Failed to persist location to database:', error);
        }
        
        console.log('📍 Sent location update:', locationData.lat, locationData.lng);
      } else {
        console.warn('⚠️ No current location available for update');
      }
    }, 5000);
    console.log('✅ Location updates started (every 5s)');
  };
  
  const stopLocationUpdates = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
  };

  const handleAcceptRequest = async (missionId: string) => {
    console.log('🚀 Driver: handleAcceptRequest called with missionId:', missionId);
    console.log('🚀 Driver: currentRide data:', currentRide);
    console.log('🚀 Driver: request data:', request);
    setIsAccepting(true);
    try {
      socketService.acceptRide(missionId);
      console.log('Ride accepted via socket:', missionId);
      
      setIsAccepted(true);
      console.log('🚀 Driver: Mission accepted, starting client location snapping');
      
      // 🛣️ CLIENT LOCATION SNAPPING - Find and set client location
      let clientRawLocation = null;
      
      if (currentRide?.pickupLocation?.lat && currentRide?.pickupLocation?.lng) {
        clientRawLocation = {
          latitude: currentRide.pickupLocation.lat,
          longitude: currentRide.pickupLocation.lng,
        };
        console.log('🚀 Driver: Setting client raw location from currentRide:', clientRawLocation);
      } else if (request?.pickup) {
        clientRawLocation = {
          latitude: request.pickup.latitude,
          longitude: request.pickup.longitude,
        };
        console.log('🚀 Driver: Setting client raw location from request:', clientRawLocation);
      } else if (currentLocation) {
        clientRawLocation = {
          latitude: currentLocation.coords.latitude + 0.01,
          longitude: currentLocation.coords.longitude + 0.01,
        };
        console.log('🚀 Driver: Setting fallback client location:', clientRawLocation);
      } else {
        console.error('🚀 Driver: No client location data available!');
        return;
      }
      
      // Set raw client location
      setClientLocation(clientRawLocation);
      
      // 🛣️ Snap client location to road immediately
      console.log('🚀 Driver: Calling snapClientToRoad with location:', clientRawLocation);
      const snappedLocation = await snapClientToRoad(clientRawLocation);
      console.log('🚀 Driver: snapClientToRoad returned:', snappedLocation);
      
    } catch (error: any) {
      console.error('Error accepting request:', error);
      Alert.alert('Error', error.message || 'Failed to accept request');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRejectRequest = async (missionId: string) => {
    setIsRejecting(true);
    try {
      await api.rejectMission(missionId);
      console.log('Mission rejected:', missionId);
      setRequest(null);
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      Alert.alert('Error', error.message || 'Failed to reject request');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleCancelMission = () => {
    Alert.alert(
      language === 'ar' ? 'إلغاء المهمة' : language === 'fr' ? 'Annuler la mission' : 'Cancel Mission',
      language === 'ar' ? 'هل أنت متأكد من إلغاء المهمة؟' : language === 'fr' ? 'Êtes-vous sûr de vouloir annuler cette mission?' : 'Are you sure you want to cancel this mission?',
      [
        { text: language === 'ar' ? 'لا' : language === 'fr' ? 'Non' : 'No', style: 'cancel' },
        {
          text: language === 'ar' ? 'نعم، إلغاء' : language === 'fr' ? 'Oui, annuler' : 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            if (currentRide?.rideId) {
              console.log('🚫 Driver cancelling ride via socket:', currentRide.rideId);
              socketService.driverCancelRide(currentRide.rideId, 'Driver cancelled the ride');
            } else {
              console.warn('🚫 No rideId available for cancellation');
              setIsAccepted(false);
              setClientLocation(null);
              setIsNavigating(false);
            }
          },
        },
      ]
    );
  };

  const handleCallClient = () => {
    Alert.alert('Call Client', 'Calling client...');
  };

  return (
    <View style={styles.container}>
      {/* 🎬 Simulation Banner */}
      {simulationState.isActive && (
        <SimulationBanner onStopSimulation={stopSimulation} />
      )}
      
      {/* Ride Cancelled Banner */}
      <RideCancelledBanner
        visible={showRideCancelledBanner}
        language={language}
        message={rideCancelledBannerMessage}
        onDismiss={dismissRideCancelledBanner}
      />
      
      {/* Driver State Status Banner - shows GPS accuracy and distance to pickup */}
      {currentRide && (missionStatus === 'accepted' || missionStatus === 'on_the_way') && driverState && driverState !== DriverState.FAR && (
        <View style={[
          styles.driverStateBanner,
          driverState === DriverState.ARRIVED && { backgroundColor: '#34C759' },
          driverState === DriverState.NEAR && { backgroundColor: '#FF9500' },
          driverState === DriverState.APPROACHING && { backgroundColor: '#007AFF' },
        ]}>
          <Text style={styles.driverStateText}>
            {driverState === DriverState.APPROACHING && `🚗 ${language === 'ar' ? 'اقترب من العميل' : language === 'fr' ? 'Approaching client' : 'Approaching client'} (${Math.round(distanceToPickup || 0)}m)`}
            {driverState === DriverState.NEAR && `📍 ${language === 'ar' ? 'اقترب جداً' : language === 'fr' ? 'Almost there' : 'Almost there'} (${Math.round(distanceToPickup || 0)}m)`}
            {driverState === DriverState.ARRIVED && `✅ ${language === 'ar' ? 'وصلت' : language === 'fr' ? 'Arrived' : 'Arrived'}`}
          </Text>
          {gpsAccuracy && (
            <Text style={styles.driverStateSubtext}>
              GPS: ±{Math.round(gpsAccuracy)}m
            </Text>
          )}
        </View>
      )}
      
      {/* Header - Hidden during navigation */}
      {!isNavigating && (
        <View
          style={[
            styles.header,
            isRTL && styles.headerRTL,
            { paddingTop: Platform.OS === 'ios' ? 50 : 20 }
          ]}
        >
          <Image
            source={require('../../assets/header_logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          {Platform.OS === 'android' && (
            <TouchableOpacity
              onPress={toggleMapTheme}
              style={styles.themeButton}
            >
              <Text style={styles.themeButtonText}>
                {isDarkMode ? '☀️' : '🌙'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.profileButton}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                stroke="#185ADC"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"
                stroke="#185ADC"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
        </View>
      )}

      {/* Navigation Header - Turn by Turn (hidden when success screen is shown) */}
      {isNavigating && currentStep && !showSuccessScreen && (
        <NavigationHeader
          currentStep={currentStep}
          nextStep={nextStep}
          language={language}
        />
      )}

      {/* Map View */}
      {MapView ? (
        <MapView
          ref={mapRef}
          onMapReady={() => {
            setIsMapReady(true);
            if (mapRef.current && currentLocation) {
              const region = {
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              };
              setTimeout(() => {
                mapRef.current?.animateToRegion(region, 1000);
              }, 300);
            }
          }}
          initialRegion={mapRegion}
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_GOOGLE}
          customMapStyle={mapStyle}
          showsUserLocation={false}
          showsMyLocationButton={false}
          onPanDrag={handleMapPanDrag}
          onRegionChangeComplete={(region: any) => {
            setMapRegion(region);
          }}
        >
          {/* Driver location marker - Use animated coordinates for smooth movement */}
          {(snappedDriverLocation || currentLocation) && Marker && (
            <Marker
              coordinate={{
                latitude: animatedDriverPositionRef.current?.latitude ?? snappedDriverLocation?.latitude ?? currentLocation?.coords.latitude ?? 0,
                longitude: animatedDriverPositionRef.current?.longitude ?? snappedDriverLocation?.longitude ?? currentLocation?.coords.longitude ?? 0,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              title="Your Location"
              description={snappedDriverLocation ? "You are here (snapped to road)" : "You are here"}
            >
              {/* Use NavigationArrowMarker for all navigation states */}
              <NavigationArrowMarker 
                heading={deviceHeading || currentHeading || 0} 
                size={44}
              />
            </Marker>
          )}

          {/* 🛣️ GPS-to-Road Connection Line - Dotted line showing "walk" from building to road */}
          {roadSnappingData && roadSnappingData.distance > 5 && Polyline && (
            <Polyline
              coordinates={[
                {
                  latitude: roadSnappingData.originalLat,
                  longitude: roadSnappingData.originalLng,
                },
                {
                  latitude: roadSnappingData.lat,
                  longitude: roadSnappingData.lng,
                },
              ]}
              strokeColor="#808080"
              strokeWidth={2}
              lineDashPattern={[5, 5]} // Creates dotted effect
              lineCap="round"
              lineJoin="round"
            />
          )}

          {/* Client location marker (pickup location icon) - shown until ride starts */}
          {(() => {
            console.log('🔍 Driver: Client marker render check:');
            console.log('  - isAccepted:', isAccepted);
            console.log('  - missionStatus:', missionStatus);
            console.log('  - clientLocation (raw):', clientLocation);
            console.log('  - snappedClientLocation:', snappedClientLocation);
            console.log('  - Marker component:', !!Marker);
            console.log('  - Final coordinate:', snappedClientLocation || clientLocation);
            return isAccepted && (snappedClientLocation || clientLocation) && Marker && missionStatus !== 'in_progress';
          })() && (
            <Marker
              coordinate={snappedClientLocation || clientLocation}
              anchor={{ x: 0.5, y: 1 }}
              title="Client Location"
              description="Pickup location"
            >
              <View style={styles.pickupMarker}>
                <View style={styles.pickupMarkerDot} />
              </View>
            </Marker>
          )}

          {/* 🛣️ CLIENT GPS-to-Road Connection Line - Dotted line showing "walk" from building to road */}
          {snappedClientLocation && clientLocation && Polyline && (
            <Polyline
              coordinates={[
                {
                  latitude: clientLocation.latitude,
                  longitude: clientLocation.longitude,
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

          {/* 🎬 Simulation Markers - Pickup and Destination */}
          {simulationState.isActive && simulationState.mockRide && Marker && (
            <>
              {/* Pickup Location Marker - Only show if not same as client location */}
              {(!clientLocation || 
                (Math.abs(clientLocation.latitude - simulationState.mockRide.pickupLocation.lat) > 0.001 ||
                 Math.abs(clientLocation.longitude - simulationState.mockRide.pickupLocation.lng) > 0.001)) && (
                <Marker
                  coordinate={{
                    latitude: simulationState.mockRide.pickupLocation.lat,
                    longitude: simulationState.mockRide.pickupLocation.lng,
                  }}
                  anchor={{ x: 0.5, y: 1 }}
                  title="Simulation Pickup"
                  description="Pickup location"
                >
                  <View style={styles.simulationPickupMarker}>
                    <View style={styles.simulationPickupMarkerDot} />
                  </View>
                </Marker>
              )}

              {/* Destination Location Marker */}
              <Marker
                coordinate={{
                  latitude: simulationState.mockRide.destinationLocation.lat,
                  longitude: simulationState.mockRide.destinationLocation.lng,
                }}
                anchor={{ x: 0.5, y: 1 }}
                title="Simulation Destination"
                description="Final destination"
              >
                <View style={styles.simulationDestinationMarker}>
                  <Text style={styles.simulationDestinationMarkerIcon}>🏁</Text>
                </View>
              </Marker>
            </>
          )}

          {/* Route polyline from driver to client - shown when going to pickup */}
          {isAccepted && currentLocation && clientLocation && Polyline && missionStatus !== 'in_progress' && (
            <Polyline
              coordinates={driverToClientRoute || [
                {
                  latitude: currentLocation.coords.latitude,
                  longitude: currentLocation.coords.longitude,
                },
                clientLocation,
              ]}
              strokeColor="#1E40AF" // Professional blue
              strokeWidth={8} // Thicker like Google Maps road width
              lineCap="round"
              lineJoin="round"
            />
          )}

          {/* Route polyline from client to destination - shown when ride is in progress */}
          {isAccepted && clientLocation && Polyline && missionStatus === 'in_progress' && currentRide?.destinationLocation && (
            <Polyline
              coordinates={clientToDestinationRoute || [
                clientLocation,
                {
                  latitude: currentRide.destinationLocation.lat,
                  longitude: currentRide.destinationLocation.lng,
                },
              ]}
              strokeColor="#1E40AF" // Professional blue
              strokeWidth={8} // Thicker like Google Maps road width
              lineCap="round"
              lineJoin="round"
            />
          )}
          
          {/* 🎬 Simulation Debug Info */}
          {simulationState.isActive && console.log('🎬 Simulation active - should show markers and routes')}

          {/* Destination marker - shown when ride is in progress */}
          {isAccepted && currentRide?.destinationLocation && missionStatus === 'in_progress' && Marker && (
            <Marker
              coordinate={{
                latitude: currentRide.destinationLocation.lat,
                longitude: currentRide.destinationLocation.lng,
              }}
              anchor={{ x: 0.5, y: 1 }}
              title="Destination"
              description={currentRide.destinationLocation.address}
            >
              <View style={styles.pickupMarker}>
                <View style={[styles.pickupMarkerDot, { backgroundColor: '#22C55E' }]} />
              </View>
            </Marker>
          )}
        </MapView>
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.mapPlaceholder]}>
          <Text style={[styles.mapPlaceholderText, { fontFamily }]}>Map loading...</Text>
        </View>
      )}

      {/* Re-center Button */}
      <RecenterButton 
        onPress={handleRecenter} 
        visible={isNavigating && isUserInteracting} 
      />

      {/* Bottom Sections - Show DriverActiveMissionSheet even during navigation */}
      <>
        {request && !isAccepted ? (
          <RequestSection
            request={request}
            setRequest={setRequest}
            isAccepting={isAccepting}
            isRejecting={isRejecting}
            onAccept={handleAcceptRequest}
            onReject={handleRejectRequest}
            language={language}
          />
        ) : !isAccepted ? (
          <>
            <AvailabilitySection
              available={availability}
              isToggling={isLoading}
              onToggleAvailability={handleToggleAvailability}
              onMissionPress={() => setShowMissionHistory(true)}
              language={language}
            />
          </>
        ) : (
          <DriverActiveMissionSheet
            visible={isAccepted && !showSuccessScreen}
            rideData={currentRide}
            missionStatus={missionStatus}
            isWaitingForClientConfirm={isWaitingForClientConfirm}
            isStartingRide={isStartingRide}
            language={language}
            onCallClient={() => {
              const phone = currentRide?.clientPhone || '+213000000000';
              Linking.openURL(`tel:${phone}`);
            }}
            onCompleteRide={() => {
              console.log('🔘🏁 COMPLETE RIDE BUTTON PRESSED!');
              console.log('🔘🏁 currentRide:', currentRide);
              console.log('🔘🏁 Socket connected:', socketService.isConnected());
              if (currentRide?.rideId) {
                console.log('🔘🏁 Calling socketService.requestCompleteRide with:', currentRide.rideId);
                socketService.requestCompleteRide(currentRide.rideId);
                console.log('🔘🏁 Ride completion request sent - waiting for client confirmation');
                setIsWaitingForClientConfirm(true);
              } else {
                console.error('🔘🏁 No currentRide or rideId available');
              }
            }}
            onCancel={() => {
              if (missionStatus === 'new_request' && showSuccessScreen) {
                // After ride completion, reset everything
                setIsAccepted(false);
                setCurrentRide(null);
                setMissionStatus('new_request');
                setClientLocation(null);
                setIsNavigating(false);
                setIsWaitingForClientConfirm(false);
              } else if (missionStatus !== 'in_progress') {
                setShowCancelModal(true);
              }
            }}
            onStartRide={() => {
              console.log('🔘🚀 START RIDE BUTTON PRESSED!');
              console.log('🔘🚀 currentRide:', currentRide);
              console.log('🔘🚀 Socket connected:', socketService.isConnected());
              
              // Prevent double clicks
              if (isStartingRide) {
                console.log('🔘🚀 Already starting ride - ignoring duplicate click');
                return;
              }
              
              if (currentRide?.rideId) {
                console.log('🔘🚀 Calling socketService.startRide with:', currentRide.rideId);
                setIsStartingRide(true); // Set loading state
                socketService.startRide(currentRide.rideId);
                console.log('🔘🚀 Start ride signal sent - waiting for server confirmation');
                
                // Safety timeout: reset loading state after 10 seconds if no response
                setTimeout(() => {
                  setIsStartingRide(false);
                  console.log('⚠️ Start ride timeout - resetting loading state');
                }, 10000);
              } else {
                console.error('🔘🚀 No currentRide or rideId available');
              }
            }}
          />
        )}
      </>

      {/* Ride Success Screen - shown after ride completion */}
      <RideSuccessScreen
        visible={showSuccessScreen}
        rideData={currentRide}
        language={language}
        onClose={() => {
          setShowSuccessScreen(false);
          // Reset all navigation and ride states
          setMissionStatus('new_request');
          setCurrentRide(null);
          setIsAccepted(false);
          setClientLocation(null);
          setIsNavigating(false);
          setRouteSteps([]);
          setCurrentStepIndex(0);
          setNavigationInstruction('');
          // Clear any ongoing camera animations
          if (navigationCameraRef.current) {
            clearInterval(navigationCameraRef.current);
            navigationCameraRef.current = null;
          }
        }}

      />

      {/* Cancel Mission Modal */}
      <CancelMissionModal
        visible={showCancelModal}
        onConfirm={() => {
          setShowCancelModal(false);
          handleCancelMission();
        }}
        onCancel={() => setShowCancelModal(false)}
        language={language}
      />

      {/* Driver Reconfirm Modal */}
      <DriverReconfirmModal
        visible={showReconfirmModal}
        onForceComplete={() => {
          setShowReconfirmModal(false);
          if (currentRide?.rideId) {
            console.log('📤 Force completing ride:', currentRide.rideId);
            socketService.completeRide(currentRide.rideId);
          }
        }}
        onCancel={() => {
          setShowReconfirmModal(false);
          setIsWaitingForClientConfirm(false);
        }}
        language={language}
      />

      {/* Mission Tracking */}
      <MissionTracking
        visible={showMissionTracking}
        status={missionStatus}
        rideData={currentRide}
        onAccept={() => {
          if (currentRide?.rideId && !isAccepting) {
            setIsAccepting(true);
            socketService.acceptRide(currentRide.rideId);
            console.log('📤 Accepting ride:', currentRide.rideId);
            setTimeout(() => setIsAccepting(false), 3000);
          }
        }}
        onReject={() => {
          if (currentRide?.rideId) {
            socketService.rejectRide(currentRide.rideId);
            console.log('📤 Rejecting ride:', currentRide.rideId);
          }
          setShowMissionTracking(false);
          setCurrentRide(null);
        }}
        onCallClient={() => Alert.alert('Calling', 'Calling client...')}
        onWithdraw={() => setMissionStatus('withdrawal')}
        onConfirmArrival={() => {
          // Use the new manual arrival function with dual-channel notification
          if (confirmArrivalManual) {
            confirmArrivalManual();
          } else {
            // Fallback to old method
            if (currentRide?.rideId) {
              socketService.driverArrived(currentRide.rideId);
              console.log('📤 Driver arrived at pickup (fallback):', currentRide.rideId);
            }
          }
          setShowMissionTracking(false);
          setMissionStatus('arriving');
        }}
        onClose={() => {
          setShowMissionTracking(false);
          if (currentRide?.rideId && missionStatus === 'accepted') {
            socketService.rejectRide(currentRide.rideId);
          }
        }}
        language={language}
      />

      {/* Mission History Screen */}
      {showMissionHistory && (
        <View style={styles.missionHistoryOverlay}>
          <MissionHistoryScreen
            language={language}
            onBack={() => setShowMissionHistory(false)}
          />
        </View>
      )}

      {/* Logout Confirm Modal */}
      <LogoutConfirmModal
        visible={showLogoutModal}
        onConfirm={() => {
          setShowLogoutModal(false);
          onLogout();
        }}
        onCancel={() => setShowLogoutModal(false)}
        language={language}
      />

      {/* Demo Mission Modal */}
      <DemoMissionModal
        visible={showDemoMission}
        onClose={() => setShowDemoMission(false)}
        language={language}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  driverStateBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 70,
    left: 16,
    right: 16,
    zIndex: 9998,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  driverStateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  driverStateSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  headerLogo: {
    width: 70,
    height: 24,
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
  themeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  themeButtonText: {
    fontSize: 20,
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
  arrowMarkerContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowMarker: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(24, 90, 220, 0.2)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
  },
  navPanel: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 20,
    left: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 10000,
  },
  navPanelRTL: {
    flexDirection: 'row-reverse',
  },
  navPanelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  navPanelSection: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  navPanelDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
  },
  navPanelValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#185ADC',
  },
  navPanelLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  navPanelExitButton: {
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  navPanelExitText: {
    color: '#FF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  recenterButton: {
    position: 'absolute',
    bottom: 140,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 10000,
  },
  carMarker: {
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
  carIcon: {
    fontSize: 22,
  },
  pickupMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'white',
  },
  demoButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#185ADC',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 10000,
  },
  demoButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  missionHistoryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8F9FA',
    zIndex: 100000,
  },
  // 🎬 Simulation Destination Marker Styles
  simulationDestinationMarker: {
    backgroundColor: '#22C55E',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  simulationDestinationMarkerIcon: {
    fontSize: 20,
  },
  // Enhanced pickup marker for simulation
  simulationPickupMarker: {
    backgroundColor: '#3B82F6',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  simulationPickupMarkerDot: {
    backgroundColor: 'white',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

export default DriverHomeScreen;