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
import AvailabilitySection from './AvailabilitySection';
import RequestSection from './RequestSection';
import AcceptedMissionSection from './AcceptedMissionSection';
import MissionTracking from './MissionTracking';
import DriverActiveMissionSheet from './DriverActiveMissionSheet';
import MissionHistoryScreen from './MissionHistoryScreen';
import CancelMissionModal from '../common/CancelMissionModal';
import DemoMissionModal from './DemoMissionModal';
import DriverReconfirmModal from '../common/DriverReconfirmModal';
import LogoutConfirmModal from '../common/LogoutConfirmModal';
import SimulationBanner from '../common/SimulationBanner';
import { api } from '../../services/api';
import { socketService } from '../../services/socket';
import { storage } from '../../services/storage';
import { snapToRoad } from '../../services/roadsService';
import { rideSimulation, MockRide } from '../../services/rideSimulation';
import { useDriverLocation } from '../../hooks/useDriverLocation';
import { startDriverBackgroundLocationUpdates, stopDriverBackgroundLocationUpdates } from '../../services/backgroundDriverLocation';

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
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE || 'google';
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

// Rotating Arrow Marker Component
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

// Navigation Top Banner Component
const NavigationBanner: React.FC<{
  instruction: string;
  distance: string;
  language: Language;
  isRTL: boolean;
}> = ({ instruction, distance, language, isRTL }) => {
  const getDirectionIcon = (text: string) => {
    if (text.includes('right') || text.includes(' droite') || text.includes('يمين')) return '➡️';
    if (text.includes('left') || text.includes(' gauche') || text.includes('يسار')) return '⬅️';
    if (text.includes('straight') || text.includes(' tout droit') || text.includes('مستقيم')) return '⬆️';
    if (text.includes('roundabout') || text.includes(' rond-point') || text.includes('دوار')) return '🔄';
    if (text.includes('U-turn') || text.includes(' demi-tour') || text.includes('عودة')) return '↩️';
    return '⬆️';
  };

  return (
    <View style={[styles.navBanner, isRTL && styles.navBannerRTL]}>
      <Text style={styles.navBannerIcon}>{getDirectionIcon(instruction)}</Text>
      <View style={styles.navBannerTextContainer}>
        <Text style={styles.navBannerInstruction} numberOfLines={2}>
          {instruction}
        </Text>
        <Text style={styles.navBannerDistance}>{distance}</Text>
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
  const [routeSteps, setRouteSteps] = useState<any[]>([]); // Store turn-by-turn instructions
  const [currentStepIndex, setCurrentStepIndex] = useState(0); // Track current step
  const [remainingTime, setRemainingTime] = useState('0');

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
          speed: locationData.speed || null,
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
      
      // PRIORITY 1: Use Google Roads API for nearest road
      const snapToRoad = async () => {
        try {
          // ALWAYS use route start point for perfect alignment with blue line during rides
          if ((missionStatus === 'accepted' || missionStatus === 'on_the_way' || missionStatus === 'arriving') && driverToClientRoute && driverToClientRoute.length > 0) {
            const routeStartPoint = driverToClientRoute[0];
            console.log('🛣️ Driver: Forcing driver to pickup route start point:', routeStartPoint);
            setSnappedDriverLocation(routeStartPoint);
            
            // Calculate distance for dotted line display
            const distance = getDistanceFromLatLonInKm(
              rawLocation.latitude,
              rawLocation.longitude,
              routeStartPoint.latitude,
              routeStartPoint.longitude
            ) * 1000; // Convert to meters
            
            setRoadSnappingData({
              lat: routeStartPoint.latitude,
              lng: routeStartPoint.longitude,
              originalLat: rawLocation.latitude,
              originalLng: rawLocation.longitude,
              distance,
            });
            return;
          }
          
          if (missionStatus === 'in_progress' && clientToDestinationRoute && clientToDestinationRoute.length > 0) {
            const routeStartPoint = clientToDestinationRoute[0];
            console.log('🛣️ Driver: Forcing driver to destination route start point:', routeStartPoint);
            setSnappedDriverLocation(routeStartPoint);
            
            // Calculate distance for dotted line display
            const distance = getDistanceFromLatLonInKm(
              rawLocation.latitude,
              rawLocation.longitude,
              routeStartPoint.latitude,
              routeStartPoint.longitude
            ) * 1000; // Convert to meters
            
            setRoadSnappingData({
              lat: routeStartPoint.latitude,
              lng: routeStartPoint.longitude,
              originalLat: rawLocation.latitude,
              originalLng: rawLocation.longitude,
              distance,
            });
            return;
          }
          
          // Fallback: Use Google Roads API if no route
          const snappedData = await getNearestRoadLocation(
            rawLocation.latitude,
            rawLocation.longitude
          );
          
          if (snappedData) {
            console.log('🛣️ Driver: Snapped to road via Google Roads API:', snappedData);
            setRoadSnappingData(snappedData);
            setSnappedDriverLocation({
              latitude: snappedData.lat,
              longitude: snappedData.lng
            });
          } else {
            // Fallback to route polyline snapping
            console.log('🛣️ Driver: Roads API failed, using route polyline fallback');
            snapToRoutePolyline();
          }
        } catch (error) {
          console.error('🛣️ Driver: Roads API error, using route polyline fallback:', error);
          snapToRoutePolyline();
        }
      };
      
      snapToRoad();
    }
  }, [currentLocation, missionStatus, clientToDestinationRoute, driverToClientRoute]);

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
      
      // IMPORTANT: Snap to the FIRST point of the route (where the blue line starts)
      // This ensures the driver marker aligns perfectly with the route start
      const routeStartPoint = clientToDestinationRoute[0];
      const distanceToStart = getDistanceFromLatLonInKm(
        rawLocation.latitude,
        rawLocation.longitude,
        routeStartPoint.latitude,
        routeStartPoint.longitude
      );
      
      console.log('🛣️ DEBUG - Route start point:', routeStartPoint);
      console.log('🛣️ DEBUG - Driver raw location:', rawLocation);
      console.log('🛣️ DEBUG - Distance to route start:', (distanceToStart * 1000).toFixed(2), 'meters');
      
      // If driver is close to route start (<50m), use the exact start point
      if (distanceToStart < 0.05) { // 50 meters
        console.log('🛣️ Driver: Close to route start, using exact start point');
        setSnappedDriverLocation(routeStartPoint);
        return;
      }
      
      // Otherwise, find the nearest point on the route polyline
      let minDistance = Infinity;
      let nearestPoint = clientToDestinationRoute[0];
      
      clientToDestinationRoute.forEach((point) => {
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
      
      console.log('🛣️ DEBUG - Nearest point found:', nearestPoint);
      console.log('🛣️ DEBUG - Distance to nearest point:', (minDistance * 1000).toFixed(2), 'meters');
      
      setSnappedDriverLocation(nearestPoint);
      console.log('🛣️ Driver: Snapped to route polyline:', nearestPoint, `(${minDistance * 1000}km away)`);
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
  const [missionStatus, setMissionStatus] = useState<'new_request' | 'accepted' | 'on_the_way' | 'withdrawal' | 'arriving' | 'in_progress'>('new_request');
  const [currentRide, setCurrentRide] = useState<any>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDemoMission, setShowDemoMission] = useState(false);
  const [showMissionHistory, setShowMissionHistory] = useState(false);

  // NEW: Use the professional driver location tracking hook
  const { locationData, isTracking, startTracking, stopTracking } = useDriverLocation({
    accuracy: Location.Accuracy.Highest,
    timeInterval: 1000,
    distanceInterval: 5,
    jitterThreshold: 2, // meters
    enableAveraging: false,
    currentRide, // Pass currentRide for arrival detection
  });
  const [showReconfirmModal, setShowReconfirmModal] = useState(false);
  const [isWaitingForClientConfirm, setIsWaitingForClientConfirm] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false); // Add showLogoutModal state

  const isRTL = useMemo(() => language === 'ar', [language]);

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

  // Enable navigation mode when ride starts
  useEffect(() => {
    if (missionStatus === 'in_progress' && clientToDestinationRoute && clientToDestinationRoute.length > 0) {
      // Auto-enable navigation mode when ride starts
      setIsNavigating(true);
      
      // Calculate initial navigation data
      updateNavigationData();
    } else if (missionStatus !== 'in_progress') {
      setIsNavigating(false);
      setIsUserInteracting(false);
      if (navigationCameraRef.current) {
        clearInterval(navigationCameraRef.current);
        navigationCameraRef.current = null;
      }
    }
  }, [missionStatus, clientToDestinationRoute]);

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

  const { latitude, longitude, speed = 0 } = currentLocation.coords;
  
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

  // iOS gets a longer duration but not too long to miss updates
  const animDuration = Platform.OS === 'ios' ? 500 : 300;

  try {
    isNavigationAnimatingRef.current = true;
    
    // Use animateCamera for iOS, animateToRegion for Android fallback
    if (Platform.OS === 'ios') {
      mapRef.current.animateCamera({
        center: { latitude, longitude },
        pitch: 65,
        heading: smoothHeading,
        zoom: currentZoom.current,
      }, { duration: animDuration });
    } else {
      mapRef.current.animateCamera({
        center: { latitude, longitude },
        pitch: 65,
        heading: smoothHeading,
        zoom: currentZoom.current,
      }, { duration: animDuration });
    }

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

  // Update navigation data (instructions, ETA, distance)
  const updateNavigationData = useCallback(() => {
    if (!currentLocation || !clientToDestinationRoute || clientToDestinationRoute.length === 0) return;

    const currentLat = currentLocation.coords.latitude;
    const currentLng = currentLocation.coords.longitude;

    // Find closest point on route
    let minDistance = Infinity;
    let closestIndex = 0;

    clientToDestinationRoute.forEach((point, index) => {
      const dist = getDistanceFromLatLonInKm(currentLat, currentLng, point.latitude, point.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = index;
      }
    });

    // Calculate remaining distance
    let remainingKm = 0;
    for (let i = closestIndex; i < clientToDestinationRoute.length - 1; i++) {
      remainingKm += getDistanceFromLatLonInKm(
        clientToDestinationRoute[i].latitude,
        clientToDestinationRoute[i].longitude,
        clientToDestinationRoute[i + 1].latitude,
        clientToDestinationRoute[i + 1].longitude
      );
    }

    // Calculate remaining time (assuming average 30 km/h in city)
    const remainingMinutes = Math.round((remainingKm / 30) * 60);

    setRemainingDistance(remainingKm.toFixed(1));
    setRemainingTime(Math.max(1, remainingMinutes).toString());

    // Update instruction based on route progress
    if (closestIndex < clientToDestinationRoute.length - 5) {
      // Look ahead for turn instructions
      const nextPoint = clientToDestinationRoute[closestIndex + 10];
      const currentPoint = clientToDestinationRoute[closestIndex];
      
      // Simple heading-based instruction
      const bearing = calculateBearing(
        currentPoint.latitude,
        currentPoint.longitude,
        nextPoint.latitude,
        nextPoint.longitude
      );
      
      setNavigationInstruction(getTurnInstruction(bearing, language));
    } else {
      setNavigationInstruction(
        language === 'ar' ? 'اقتربت من الوجهة' : 
        language === 'fr' ? 'Vous approchez de la destination' : 
        'Approaching destination'
      );
    }
  }, [currentLocation, clientToDestinationRoute, language]);

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
    console.log('🛣️ clientLocation:', !!clientLocation, clientLocation);
    console.log('🛣️ currentRide?.destinationLocation:', !!currentRide?.destinationLocation, currentRide?.destinationLocation);
    console.log('🛣️ missionStatus:', missionStatus);
    
    if (!clientLocation || !currentRide?.destinationLocation || missionStatus !== 'in_progress') {
      console.log('🛣️ Early return - missing data or wrong status');
      return;
    }
    
    setIsLoadingRoute(true);
    try {
      const start: LocationCoord = {
        latitude: clientLocation.latitude,
        longitude: clientLocation.longitude,
      };
      const end: LocationCoord = {
        latitude: currentRide.destinationLocation.lat,
        longitude: currentRide.destinationLocation.lng,
      };
      
      console.log('🛣️ Fetching route from', start, 'to', end);
      
      const result = await fetchGoogleDirectionsAndLog(start, end, 'Ride');
      console.log('🛣️ fetchGoogleDirectionsAndLog result:', !!result);
      if (result) {
        console.log('🛣️ Google Directions result:', result.coordinates.length, 'points');
        // console.log('🛣️ First 3 points:', result.coordinates.slice(0, 3)); // Hidden to reduce console flood
        setClientToDestinationRoute(result.coordinates);
        // STEP 5: Polyline coordinates stored in clientToDestinationRoute for driver movement
      } else {
        console.log('🛣️ Google Directions returned null - this is the problem!');
        console.log('🛣️ Using fallback getRoadRoute');
        const route = await getRoadRoute(start, end);
        console.log('🛣️ getRoadRoute result:', route.coordinates.length, 'points');
        // console.log('🛣️ getRoadRoute first 3 points:', route.coordinates.slice(0, 3)); // Hidden to reduce console flood
        setClientToDestinationRoute(route.coordinates);
        setRouteSteps(route.steps || []);
      }
    } catch (error) {
      console.error('Failed to fetch destination route:', error);
    } finally {
      setIsLoadingRoute(false);
    }
  }, [clientLocation, currentRide?.destinationLocation, missionStatus]);
  
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
  // ✅ FIXED: NEW SINGLE EFFECT FOR ACCEPTED STATUS - PROFESSIONAL CLOSE ZOOM
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;
    
    // Only run this when status is ACCEPTED
    if (missionStatus !== 'accepted') return;
    
    // Need driver location and client location - route is NOT required for zooming
    if (!currentLocation || !clientLocation) return;
    
    console.log('🗺️ DRIVER: Accepted status - Zooming to show driver and client');
    
    // Disable navigation mode for accepted status
    setIsNavigating(false);
    setIsUserInteracting(false);
    
    // Get both positions
    const driverPos = {
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
    };
    
    const clientPos = {
      latitude: clientLocation.latitude,
      longitude: clientLocation.longitude,
    };
    
    console.log('🗺️ Driver: Driver pos:', driverPos);
    console.log('🗺️ Driver: Client pos:', clientPos);
    
    // Use fitToCoordinates to automatically fit both markers with proper padding
    // This is more reliable than calculating deltas manually
    setTimeout(() => {
      try {
        mapRef.current?.fitToCoordinates([driverPos, clientPos], {
          edgePadding: { 
            top: 150,      // Space for top UI elements
            right: 80,     // Side padding
            bottom: 350,   // Bottom padding for action sheet
            left: 80       // Side padding
          },
          animated: true,
        });
        console.log('🗺️ Driver: Map zoomed to fit both markers using fitToCoordinates');
      } catch (error) {
        console.error('🗺️ Driver: fitToCoordinates error:', error);
        
        // Fallback: manual delta calculation if fitToCoordinates fails
        const distance = getDistanceFromLatLonInKm(
          driverPos.latitude, driverPos.longitude,
          clientPos.latitude, clientPos.longitude
        );
        
        const centerLat = (driverPos.latitude + clientPos.latitude) / 2;
        const centerLng = (driverPos.longitude + clientPos.longitude) / 2;
        
        let latitudeDelta = 0.02;
        let longitudeDelta = 0.02;
        
        if (distance < 0.5) {
          latitudeDelta = 0.008;
          longitudeDelta = 0.008;
        } else if (distance < 1) {
          latitudeDelta = 0.015;
          longitudeDelta = 0.015;
        } else if (distance < 2) {
          latitudeDelta = 0.025;
          longitudeDelta = 0.025;
        } else if (distance < 5) {
          latitudeDelta = 0.04;
          longitudeDelta = 0.04;
        } else {
          latitudeDelta = 0.06;
          longitudeDelta = 0.06;
        }
        
        try {
          mapRef.current?.animateToRegion({
            latitude: centerLat,
            longitude: centerLng,
            latitudeDelta: latitudeDelta * 1.2,
            longitudeDelta: longitudeDelta * 1.2,
          }, 1000);
          console.log('🗺️ Driver: Fallback zoom applied');
        } catch (fallbackError) {
          console.error('🗺️ Driver: Fallback also failed:', fallbackError);
        }
      }
    }, 500); // Shorter delay - don't wait for route
    
  }, [missionStatus, isMapReady, currentLocation, clientLocation]);
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
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
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
      const tokenData = await Notifications.getExpoPushTokenAsync();
      pushTokenRef.current = tokenData.data;
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

  const handleRideRequestEvent = useCallback((data: any) => {
    console.log('📨 New ride request received:', data);
    setCurrentRide(data);
    setShowMissionTracking(true);
    setMissionStatus('new_request');
  }, []);

const handleRideAcceptedEvent = useCallback(async (data: any) => {
  console.log('✅ Ride accepted:', data);
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
      const updated = {
        ...prev,
        status: 'in_progress',
        distance: data.distance || prev.distance,
        eta: data.eta || prev.eta,
        pickupLocation: data.pickupLocation || prev.pickupLocation,
        destinationLocation: data.destinationLocation || prev.destinationLocation,
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
    setMissionStatus('completed');
    setIsNavigating(false);
  }, []);

  const handleRideCompletionDeniedEvent = useCallback((data: any) => {
    console.log('❌ Client denied ride completion:', data);
    setIsWaitingForClientConfirm(false);
    setShowReconfirmModal(true);
  }, []);

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
    locationIntervalRef.current = setInterval(() => {
      const location = currentLocationRef.current;
      if (location) {
        socketService.updateLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
        console.log('📍 Sent location update:', location.coords.latitude, location.coords.longitude);
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
      'Cancel Mission',
      'Are you sure you want to cancel this mission?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            setIsAccepted(false);
            setClientLocation(null);
            setIsNavigating(false);
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

      {/* Navigation Top Banner */}
      {isNavigating && (
        <NavigationBanner
          instruction={navigationInstruction}
          distance={`${remainingDistance} km`}
          language={language}
          isRTL={isRTL}
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
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          showsUserLocation={false}
          showsMyLocationButton={false}
          onPanDrag={handleMapPanDrag}
          onRegionChangeComplete={(region: any) => {
            setMapRegion(region);
          }}
        >
          {/* Driver location marker - Use snapped coordinates during missions, raw GPS otherwise */}
          {(snappedDriverLocation || currentLocation) && Marker && (
            <Marker
              coordinate={{
                latitude: snappedDriverLocation?.latitude || currentLocation?.coords.latitude || 0,
                longitude: snappedDriverLocation?.longitude || currentLocation?.coords.longitude || 0,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              title="Your Location"
              description={snappedDriverLocation ? "You are here (snapped to road)" : "You are here"}
            >
              {isNavigating ? (
                <RotatingArrowMarker heading={deviceHeading || currentHeading || 0} />
              ) : (
                <View style={styles.carMarker}>
                  <Text style={styles.carIcon}>🚗</Text>
                </View>
              )}
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
            visible={isAccepted}
            rideData={currentRide}
            missionStatus={missionStatus}
            isWaitingForClientConfirm={isWaitingForClientConfirm}
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
              if (missionStatus === 'completed') {
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
              if (currentRide?.rideId) {
                console.log('🔘🚀 Calling socketService.startRide with:', currentRide.rideId);
                socketService.startRide(currentRide.rideId);
                // Don't set status here - let the socket event handle it
                console.log('🔘🚀 Start ride signal sent - waiting for server confirmation');
              } else {
                console.error('🔘🚀 No currentRide or rideId available');
              }
            }}
          />
        )}
      </>

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
          if (currentRide?.rideId) {
            socketService.driverArrived(currentRide.rideId);
            console.log('📤 Driver arrived at pickup:', currentRide.rideId);
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

      {/* Demo Button */}
      {__DEV__ && !isNavigating && !showDemoMission && (
        <TouchableOpacity
          style={styles.demoButton}
          onPress={() => setShowDemoMission(true)}
        >
          <Text style={[styles.demoButtonText, { fontFamily }]}>🚛 Mission</Text>
        </TouchableOpacity>
      )}

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
  navBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 10000,
  },
  navBannerRTL: {
    flexDirection: 'row-reverse',
  },
  navBannerIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  navBannerTextContainer: {
    flex: 1,
  },
  navBannerInstruction: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  navBannerDistance: {
    fontSize: 14,
    color: '#185ADC',
    marginTop: 4,
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