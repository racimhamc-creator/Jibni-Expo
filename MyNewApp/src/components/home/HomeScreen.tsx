import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Linking,
  Animated,
  PanResponder,
  Platform,
} from "react-native";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import Svg, { Path } from "react-native-svg";
import NavigationArrowMarker from "../common/NavigationArrowMarker";
import DriverStatusMarker from "../common/DriverStatusMarker";
import { socketService } from "../../services/socket";
import { api } from "../../services/api";
import {
  getRoadRoute,
  getDistanceFromLatLonInKm,
  LocationCoord,
} from "../../services/directions";
import {
  snapToRoad,
  getNearestRoadLocation,
  shouldSnapToRoad,
  NearestRoadLocation,
  snapToNearestPolylinePoint,
} from "../../services/roadsService";
import ActiveRideBottomSheet from "./ActiveRideBottomSheet";
import CancelMissionModal from "../common/CancelMissionModal";
import RideSuccessScreen from "../common/RideSuccessScreen";
import { Language, getTranslation } from "../../utils/translations";
import Text from "../ui/Text";
import { useLanguage } from "../../contexts/LanguageContext";
import { useMissionTracking } from "../../hooks/useMissionTracking";
import {
  DISTANCE_THRESHOLD,
  formatDistance,
  formatETA,
} from "../../utils/distanceUtils";
import RoutePolyline from "../map/RoutePolyline";
import { useDriverAnimation } from "../../hooks/useDriverAnimation";
import { getTotalRouteDistance } from "../../utils/routeUtils";
import { useTheme } from "../../contexts/ThemeContext";
import { NavigationHeader } from "../navigation/NavigationHeader";
import { useNavigationStep } from "../../hooks/useNavigationStep";
import { RouteStep } from "../../services/directions";

// 🎮 SIMULATION MODE - Development/Testing only
// Completely separate from production ride logic
import { useDriverSimulation } from "../../hooks/useDriverSimulation";
import { SimulationControls, SimulationMarkers } from "../SimulationControls";

/**
 * 🔧 UTILITY FUNCTIONS - Add these at TOP of your file (after imports)
 * They don't go inside your component!
 */

// Calculate zoom level based on actual distance between two points
const calculateZoomDeltas = (point1: any, point2: any) => {
  // Extract coordinates from any formatf
  const lat1 = point1.latitude || point1.lat;
  const lng1 = point1.longitude || point1.lng;
  const lat2 = point2.latitude || point2.lat;
  const lng2 = point2.longitude || point2.lng;

  // Calculate the difference in degrees
  const latDelta = Math.abs(lat2 - lat1);
  const lngDelta = Math.abs(lng2 - lng1);

  // Add LESS padding for TIGHTER zoom (was 1.3, now 1.1)
  const paddedLatDelta = latDelta * 1.1;
  const paddedLngDelta = lngDelta * 1.1;

  // Clamp to TIGHTER bounds
  // Min: 0.005 degree (about 500m - was 0.01)
  // Max: 0.3 degree (about 30km - was 0.5)
  return {
    latitudeDelta: Math.max(0.005, Math.min(0.3, paddedLatDelta)),
    longitudeDelta: Math.max(0.005, Math.min(0.3, paddedLngDelta)),
  };
};

// Convert any location format to standard {latitude, longitude}
const normalizeLocation = (location: any) => {
  return {
    latitude: location.latitude ?? location.lat ?? location.x ?? 0,
    longitude: location.longitude ?? location.lng ?? location.y ?? 0,
  };
};

const { width: deviceWidth, height: deviceHeight } = Dimensions.get("window");

// Import Google Maps
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
let PROVIDER_GOOGLE: any = null;

try {
  const maps = require("react-native-maps");
  MapView = maps.default || maps;
  Marker = maps.Marker || (maps.default && maps.default.Marker);
  Polyline = maps.Polyline || (maps.default && maps.default.Polyline);
  PROVIDER_GOOGLE = Platform.OS === 'android' ? (maps.PROVIDER_GOOGLE || "google") : undefined;
} catch (error) {
  console.warn("react-native-maps not available, using placeholder");
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

type RideStatus = "accepted" | "driver_arrived" | "in_progress" | "completed";

// Legacy Rotating Arrow Marker - replaced by NavigationArrowMarker for in_progress
const RotatingArrowMarker: React.FC<{ heading: number }> = ({ heading }) => {
  return (
    <View style={styles.arrowMarkerContainer}>
      <View
        style={[
          styles.arrowMarker,
          { transform: [{ rotate: `${heading}deg` }] },
        ]}
      >
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
  language = "ar",
  selectedDestination,
}) => {
  const { t, isRTL } = useLanguage();
  const { mapStyle, toggleMapTheme, isDarkMode } = useTheme();
  const mapRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [userLocation, setUserLocation] =
    useState<Location.LocationObject | null>(null);
  const [locationPermissionGranted, setLocationPermissionGranted] =
    useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);

  const locationData = useRef<{ speed: number }>({ speed: 0 });

  // 🎮 SIMULATION MODE - Development/Testing only
  // Initialize simulation hook (completely separate from production logic)
  const {
    isSimulating,
    isPaused: isSimulationPaused,
    simulationProgress,
    simulatedDriverLocation,
    simulationRoute,
    simulationHeading,
    startSimulation,
    stopSimulation,
    pauseSimulation,
    resumeSimulation,
  } = useDriverSimulation();

  // NEW: Use professional mission tracking hook with jitter handling
  // When simulating, use simulated location instead of real GPS
  const {
    driverLocation: realTrackedDriverLocation,
    eta,
    distance,
    isTracking,
  } = useMissionTracking({
    rideId: activeRide?.rideId,
    enableAutoFollow: true,
    distanceThreshold: DISTANCE_THRESHOLD,
    jitterThreshold: 2, // meters
    enableAveraging: false, // Can be enabled for more smoothing
    clientLocation: activeRide?.pickupLocation
      ? {
          lat: activeRide.pickupLocation.lat,
          lng: activeRide.pickupLocation.lng,
        }
      : userLocation
        ? {
            lat: userLocation.coords.latitude,
            lng: userLocation.coords.longitude,
          }
        : null,
    destinationLocation: activeRide?.destinationLocation
      ? {
          lat: activeRide.destinationLocation.lat,
          lng: activeRide.destinationLocation.lng,
        }
      : null,
  });

  // 🎮 SIMULATION: Merge simulated and real driver locations
  // When simulating, use simulated location. Otherwise use real GPS.
  const trackedDriverLocation = useMemo(() => {
    if (isSimulating && simulatedDriverLocation) {
      return {
        ...simulatedDriverLocation,
        speed: 16.67, // 60 km/h in m/s
        heading: 0,
        timestamp: Date.now(),
      };
    }
    return realTrackedDriverLocation;
  }, [isSimulating, simulatedDriverLocation, realTrackedDriverLocation]);

  useEffect(() => {
    if (trackedDriverLocation?.speed) {
      locationData.current.speed = trackedDriverLocation.speed;
    }
  }, [trackedDriverLocation]);

  // Debug: Log trackedDriverLocation changes
  useEffect(() => {
    if (trackedDriverLocation) {
      console.log("🏠 HomeScreen: trackedDriverLocation updated:", {
        latitude: trackedDriverLocation.latitude,
        longitude: trackedDriverLocation.longitude,
        heading: trackedDriverLocation.heading,
        source: isSimulating ? "SIMULATION" : "REAL_GPS",
      });
    }
  }, [trackedDriverLocation, isSimulating]);

  // Debug logging
  useEffect(() => {
    if (activeRide) {
      console.log(
        "🏠 HomeScreen - activeRide:",
        activeRide.rideId,
        "status:",
        activeRide.status,
      );
      console.log("🏠 HomeScreen - pickupLocation:", activeRide.pickupLocation);
      console.log(
        "🏠 HomeScreen - destinationLocation:",
        activeRide.destinationLocation,
      );
      console.log("🏠 HomeScreen - eta:", activeRide.eta);
      console.log("🏠 HomeScreen - distance:", activeRide.distance);
      console.log(
        "🏠 HomeScreen - useMissionTracking rideId:",
        activeRide.rideId,
      );
    }
    if (driverLocation) {
      console.log("🏠 HomeScreen - driverLocation:", driverLocation);
    }
    if (trackedDriverLocation) {
      console.log(
        "🏠 HomeScreen - trackedDriverLocation:",
        trackedDriverLocation,
      );
    }
  }, [activeRide, driverLocation, trackedDriverLocation]);

  // 🚀 SOCKET LISTENERS - Real-time driver location updates
  const [internalDriverLocation, setInternalDriverLocation] =
    useState<any>(null);
  const [internalActiveRide, setInternalActiveRide] = useState<any>(null);

  // Sync props with internal state
  useEffect(() => {
    setInternalDriverLocation(driverLocation);
  }, [driverLocation]);

  // Sync props with internal state - but don't overwrite socket-driven status updates
  useEffect(() => {
    if (!activeRide) {
      setInternalActiveRide(null);
      return;
    }
    
    setInternalActiveRide((prev: any) => {
      // If we have a previous internal state with a newer status from socket, keep it
      if (prev?.status && activeRide?.status) {
        const statusFlow = ['accepted', 'driver_arriving', 'driver_arrived', 'in_progress', 'completed'];
        const prevStatusIndex = statusFlow.indexOf(prev.status);
        const propStatusIndex = statusFlow.indexOf(activeRide.status);
        
        // If socket has already advanced the status beyond what prop says, don't overwrite
        if (prevStatusIndex > propStatusIndex) {
          console.log('🛡️ CLIENT: Protecting socket-driven status update:', prev.status);
          return prev;
        }
      }
      
      // Otherwise, use the prop value
      return activeRide;
    });
  }, [activeRide]);

  const isRideInProgressOrAccepted = !!internalActiveRide && ['accepted', 'driver_arriving', 'driver_arrived', 'in_progress'].includes(internalActiveRide.status || '');


  useEffect(() => {
    console.log("🗺️ CLIENT: Setting up general socket listeners");

    // Listen for ride requests (when client requests a ride)
    const handleRideRequest = (data: any) => {
      console.log("🗺️ CLIENT: Ride request created:", data);
      if (data.rideId) {
        setInternalActiveRide({
          rideId: data.rideId,
          status: "searching",
          pickupLocation: data.pickupLocation,
          destinationLocation: data.destinationLocation,
          pricing: data.pricing,
          eta: data.eta,
          distance: data.distance,
        });
      }
    };

    // Listen for ride status updates (when driver accepts)
    const handleRideUpdate = (data: any) => {
      console.log("🗺️ CLIENT: Ride update received:", data);
      setInternalActiveRide((prev) => {
        if (prev?.rideId === data.rideId) {
          // 🚫 FIXED: Prevent status regression
          // Don't allow status to go backwards in the ride flow
          const statusFlow = ['accepted', 'driver_arriving', 'driver_arrived', 'in_progress', 'completed'];
          const currentStatusIndex = statusFlow.indexOf(prev.status);
          const newStatusIndex = statusFlow.indexOf(data.status);
          
          // Only update status if it's moving forward or if it's the same status
          if (newStatusIndex >= currentStatusIndex || newStatusIndex === -1) {
            return { ...prev, ...data };
          } else {
            console.log(`🗺️ CLIENT: Ignoring status regression: ${prev.status} → ${data.status}`);
            return { ...prev, ...data, status: prev.status }; // Keep current status
          }
        }
        return data;
      });
    };

    // Listen for driver location updates - general fallback
    const handleDriverLocationUpdate = (location: any) => {
      console.log("🗺️ CLIENT: DRIVER LOCATION RECEIVED (general):", location);

      // Convert coordinate format if needed
      const normalizedLocation = {
        latitude: location.latitude || location.lat,
        longitude: location.longitude || location.lng,
        heading: location.heading,
        speed: location.speed,
      };

      console.log("🗺️ CLIENT: NORMALIZED driver location:", normalizedLocation);

      // Update internal state
      setInternalDriverLocation(normalizedLocation);
      console.log("🗺️ CLIENT: internalDriverLocation state updated");
    };

    // Subscribe to general events
    socketService.on("ride_request_created", handleRideRequest);
    socketService.on("ride_update", handleRideUpdate);
    socketService.on("driver_location_update", handleDriverLocationUpdate);

    return () => {
      console.log("🗺️ CLIENT: Cleaning up general socket listeners");
      socketService.off("ride_request_created", handleRideRequest);
      socketService.off("ride_update", handleRideUpdate);
      socketService.off("driver_location_update", handleDriverLocationUpdate);
    };
  }, []);

  useEffect(() => {
    if (!internalActiveRide?.rideId) return;

    console.log(
      "🗺️ CLIENT: Setting up ride-specific listeners for:",
      internalActiveRide.rideId,
    );

    // Listen for driver location updates - ride-specific event
    const handleDriverLocationUpdate = (location: any) => {
      console.log(
        "🗺️ CLIENT: DRIVER LOCATION RECEIVED (ride-specific):",
        location,
      );

      // Convert coordinate format if needed
      const normalizedLocation = {
        latitude: location.latitude || location.lat,
        longitude: location.longitude || location.lng,
        heading: location.heading,
        speed: location.speed,
      };

      console.log("🗺️ CLIENT: NORMALIZED driver location:", normalizedLocation);

      // Update internal state
      setInternalDriverLocation(normalizedLocation);
      console.log("🗺️ CLIENT: internalDriverLocation state updated");
    };

    // Listen for driver arrived event - STATIC EVENT NAME (backend emits to room)
    const handleDriverArrived = (data: any) => {
      console.log("🚗 CLIENT: Driver arrived event received:", data);
      setInternalActiveRide((prev: any) => {
        if (prev?.rideId === data.rideId) {
          // 🚫 Prevent status regression
          const statusFlow = ['accepted', 'driver_arriving', 'driver_arrived', 'in_progress', 'completed'];
          const currentStatusIndex = statusFlow.indexOf(prev.status);
          const newStatusIndex = statusFlow.indexOf('driver_arrived');
          
          if (newStatusIndex >= currentStatusIndex) {
            console.log("🚗 CLIENT: Updating ride status to driver_arrived");
            return { ...prev, status: 'driver_arrived' };
          } else {
            console.log(`🚗 CLIENT: Ignoring status regression: ${prev.status} → driver_arrived`);
            return prev;
          }
        }
        return prev;
      });
    };

    // Listen for ride status updates
    const handleRideUpdate = (data: any) => {
      console.log("🗺️ CLIENT: Ride update received (ride-specific):", data);
      setInternalActiveRide((prev) => {
        if (prev?.rideId === data.rideId) {
          // 🚫 FIXED: Prevent status regression
          const statusFlow = ['accepted', 'driver_arriving', 'driver_arrived', 'in_progress', 'completed'];
          const currentStatusIndex = statusFlow.indexOf(prev.status);
          const newStatusIndex = statusFlow.indexOf(data.status);
          
          if (newStatusIndex >= currentStatusIndex || newStatusIndex === -1) {
            return { ...prev, ...data };
          } else {
            console.log(`🗺️ CLIENT: Ignoring status regression (ride-specific): ${prev.status} → ${data.status}`);
            return { ...prev, ...data, status: prev.status };
          }
        }
        return { ...prev, ...data };
      });
    };

    // Listen for ride cancelled event
    const handleRideCancelled = (data: any) => {
      console.log("🚫 CLIENT: Ride cancelled event received in HomeScreen:", data);
      if (data.rideId === internalActiveRide?.rideId) {
        setInternalActiveRide(null);
      }
    };

    // Subscribe to ride-specific events
    // Join the ride room first (required to receive events)
    socketService.joinRideRoom(internalActiveRide.rideId);
    console.log("🚪 CLIENT: Joined ride room:", internalActiveRide.rideId);
    
    // Listen for STATIC event names (backend emits to room)
    // Note: Only 'driver_arrived' and 'ride_completed' are emitted by backend to rooms
    socketService.on('driver_arrived', handleDriverArrived);
    socketService.on('ride_cancelled', handleRideCancelled);

    return () => {
      console.log(
        "🗺️ CLIENT: Cleaning up listeners for ride:",
        internalActiveRide.rideId,
      );
      // Leave the ride room on cleanup
      socketService.leaveRideRoom(internalActiveRide.rideId);
      
      // Remove STATIC event listeners
      socketService.off('driver_arrived', handleDriverArrived);
      socketService.off('ride_cancelled', handleRideCancelled);
    };
  }, [internalActiveRide?.rideId]);

  // Refs for camera follow throttling
  const hasFittedRef = useRef(false);
  const zoomAttemptRef = useRef(0);
  const lastCameraUpdate = useRef<number>(0);      // used by fit effect (5s throttle)
  const lastNavCameraUpdate = useRef<number>(0);   // used by navigation camera (200ms throttle)
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  // Initialize with Algeria coordinates as fallback
  const [mapRegion, setMapRegion] = useState({
    latitude: 28.0339,
    longitude: 1.6596,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // Additional Navigation Camera State (new variables only)
  const [showRecenterButton, setShowRecenterButton] = useState(false);
  const [snappedDriverLocation, setSnappedDriverLocation] =
    useState<LocationCoord | null>(null);
  const [snappedClientLocation, setSnappedClientLocation] =
    useState<LocationCoord | null>(null);
  const [roadSnappingData, setRoadSnappingData] =
    useState<NearestRoadLocation | null>(null);
  const [previousDriverLocation, setPreviousDriverLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [cameraHeading, setCameraHeading] = useState(0);
  const [deviceHeading, setDeviceHeading] = useState(0);

  // Smooth driver marker animation refs
  const animatedDriverPositionRef = useRef<LocationCoord | null>(null);
  const driverAnimationProgress = useRef<number>(0);
  const driverAnimationStart = useRef<LocationCoord | null>(null);
  const driverAnimationEnd = useRef<LocationCoord | null>(null);

  // Road route states
  const [driverToPickupRoute, setDriverToPickupRoute] = useState<
    LocationCoord[] | null
  >(null);
  const [pickupToDestinationRoute, setPickupToDestinationRoute] = useState<
    LocationCoord[] | null
  >(null);
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]); // Store turn-by-turn instructions
  const [currentStepIndex, setCurrentStepIndex] = useState(0); // Track current step
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // 🎯 CLIENT MAP CAMERA - Updated to support In Progress & Zoom Out
  useEffect(() => {
    if (!isMapReady || !mapRef.current || !internalActiveRide) return;
    
    // Ensure we have both locations
    if (!internalActiveRide.pickupLocation || !internalActiveRide.destinationLocation) return;

    const status = internalActiveRide.status;
    const isMissionActive = 
      status === "accepted" || 
      status === "driver_arriving" || 
      status === "driver_arrived" || 
      status === "in_progress";

    if (!isMissionActive || isUserInteracting) return;

    // --- START: PRESERVED DRIVER SOURCE LOGIC ---
    const hasRoute = driverToPickupRoute && driverToPickupRoute.length > 0;
    let driverSource: LocationCoord | null = null;
    
    if (animatedDriverPositionRef.current) {
      driverSource = animatedDriverPositionRef.current;
    } else if (snappedDriverLocation) {
      driverSource = snappedDriverLocation;
    } else if (trackedDriverLocation) {
      if (hasRoute && status !== "in_progress") {
        console.log("🗺️ CLIENT: Waiting for driver snap before fitting camera");
        return;
      }
      driverSource = trackedDriverLocation;
    } else if (internalDriverLocation) {
      driverSource = internalDriverLocation;
    }
    // --- END: PRESERVED DRIVER SOURCE LOGIC ---

    if (!driverSource) return;

    const now = Date.now();
    const isFirstFit = !hasFittedRef.current;
    
    // Throttle follow updates to every 5s, but allow first fit immediately
    if (!isFirstFit && now - lastCameraUpdate.current < 5000) return;

    const driverCoords = {
      latitude: driverSource.latitude,
      longitude: driverSource.longitude,
    };

    // 🎯 DYNAMIC TARGET: If in_progress, target is Destination. Otherwise, target is Pickup.
    const targetLocation = status === "in_progress" 
      ? internalActiveRide.destinationLocation 
      : internalActiveRide.pickupLocation;

    const targetCoords = {
      latitude: targetLocation?.lat ?? targetLocation?.latitude ?? 0,
      longitude: targetLocation?.lng ?? targetLocation?.longitude ?? 0,
    };

    // 🚩 THE FIX: Ensure we don't fit if coords are invalid
    if (driverCoords.latitude && targetCoords.latitude) {
      mapRef.current.fitToCoordinates([driverCoords, targetCoords], {
        edgePadding: { top: 100, right: 80, bottom: 380, left: 80 },
        animated: true,
      });
    }

    // 🎯 ZOOM OUT: Increase padding to "shrink" the map view into the visible area
    mapRef.current.fitToCoordinates([driverCoords, targetCoords], {
      edgePadding: { 
        top: 100,    // Space from status bar
        right: 80,   // Space from right edge
        bottom: 380, // 👈 HIGH PADDING: Pushes the route above your Bottom Sheet
        left: 80     // Space from left edge
      },
      animated: true,
    });

    lastCameraUpdate.current = now;
    hasFittedRef.current = true;
  }, [
    isMapReady,
    internalActiveRide?.status,
    internalActiveRide?.pickupLocation,
    internalActiveRide?.destinationLocation,
    trackedDriverLocation,
    snappedDriverLocation,
    isUserInteracting,
    driverToPickupRoute,
    pickupToDestinationRoute // Added dependency
  ]);

  // Driver animation for pickup route (accepted status)
  const { animatedPosition: animatedDriverPosition, isAnimating } =
    useDriverAnimation({
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
      setRemainingTime("Arrived");
    }

    // Calculate remaining distance
    if (driverToPickupRoute && animatedDriverPosition.progress < 1) {
      const totalDistance = getTotalRouteDistance(driverToPickupRoute);
      const remainingDistanceMeters =
        (1 - animatedDriverPosition.progress) * totalDistance;
      setRemainingDistance(formatDistance(remainingDistanceMeters));
    }
  }, [animatedDriverPosition, activeRide, driverToPickupRoute]);

  // 🧭 Update navigation instruction based on route steps and driver position
  const [currentManeuver, setCurrentManeuver] = useState<string>("");

  useEffect(() => {
    if (!activeRide || activeRide.status !== "in_progress") return;
    if (!routeSteps || routeSteps.length === 0) return;
    if (!trackedDriverLocation) return;

    const driverLat = trackedDriverLocation.latitude ?? (trackedDriverLocation as any).lat ?? 0;
    const driverLng = trackedDriverLocation.longitude ?? (trackedDriverLocation as any).lng ?? 0;

    // Find the next step ahead of driver
    let foundNextStep = false;

    for (let i = currentStepIndex; i < routeSteps.length; i++) {
      const step = routeSteps[i];
      const stepLat = step.startCoord?.latitude ?? step.location?.lat ?? 0;
      const stepLng = step.startCoord?.longitude ?? step.location?.lng ?? 0;

      const distanceToStep = getDistanceFromLatLonInKm(driverLat, driverLng, stepLat, stepLng);

      // If within 250m of step start, show this instruction
      if (distanceToStep < 0.25) {
        foundNextStep = true;

        // Format distance
        let distanceText = "";
        if (distanceToStep < 0.05) {
          distanceText = "now";
        } else if (distanceToStep < 1) {
          distanceText = `${Math.round(distanceToStep * 1000)} m`;
        } else {
          distanceText = `${distanceToStep.toFixed(1)} km`;
        }

        // Clean instruction (remove HTML)
        const instruction = step.instruction?.replace(/<[^>]*>?/gm, '') || "Continue straight";

        // Extract just the turn action (e.g., "Turn left", "Continue straight")
        let simpleInstruction = instruction;
        if (instruction.toLowerCase().includes("turn left")) simpleInstruction = "Turn left";
        else if (instruction.toLowerCase().includes("turn right")) simpleInstruction = "Turn right";
        else if (instruction.toLowerCase().includes("continue") || instruction.toLowerCase().includes("straight")) simpleInstruction = "Continue straight";
        else if (instruction.toLowerCase().includes("roundabout")) simpleInstruction = "Roundabout";
        else if (instruction.toLowerCase().includes("merge")) simpleInstruction = "Merge";
        else if (instruction.toLowerCase().includes("uturn")) simpleInstruction = "U-turn";

        // Update banner
        if (distanceText === "now") {
          setNavigationInstruction(`${simpleInstruction} now`);
        } else {
          setNavigationInstruction(`${simpleInstruction} in ${distanceText}`);
        }
        setRemainingDistance(distanceText === "now" ? "0 m" : distanceText);
        setCurrentManeuver(step.maneuver || "");

        // Move to next step if very close (within 30m)
        if (distanceToStep < 0.03 && currentStepIndex < routeSteps.length - 1) {
          setCurrentStepIndex(i + 1);
        }

        break;
      }
    }

    // If no step found within 250m, show approaching destination
    if (!foundNextStep && activeRide.destinationLocation) {
      const destLat = activeRide.destinationLocation.lat;
      const destLng = activeRide.destinationLocation.lng;
      const distanceToDest = getDistanceFromLatLonInKm(driverLat, driverLng, destLat, destLng);

      if (distanceToDest < 0.5) {
        setNavigationInstruction("Approaching destination");
        setRemainingDistance(distanceToDest < 0.1 ? "100 m" : `${Math.round(distanceToDest * 1000)} m`);
        setCurrentManeuver("arrive");
      }
    }
  }, [trackedDriverLocation, routeSteps, currentStepIndex, activeRide]);

  // Navigation mode states
  const [isNavigating, setIsNavigating] = useState(false);
  const [driverHeading, setDriverHeading] = useState(0);
  const [navigationInstruction, setNavigationInstruction] =
    useState("Continue straight");
  const [remainingDistance, setRemainingDistance] = useState("0 km");
  const [remainingTime, setRemainingTime] = useState("0 min");
  const cameraUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const currentZoom = useRef<number>(19);
  const targetZoom = useRef<number>(19);
  const lastCameraHeading = useRef<number>(0);

  // Get current navigation step based on driver location
  const { currentStep, nextStep } = useNavigationStep({
    driverLocation: snappedDriverLocation || trackedDriverLocation,
    routeSteps,
    isNavigating: isNavigating && activeRide?.status === 'in_progress',
  });

  // Get user's current location on mount
  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();

        if (status !== "granted") {
          console.log("Location permission not granted");
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
          // Don't move camera during any active ride pickup phase
          const isPickupPhase =
            internalActiveRide?.status === "accepted" ||
            internalActiveRide?.status === "driver_arriving" ||
            internalActiveRide?.status === "driver_arrived";
          if (!isPickupPhase) {
            mapRef.current.animateToRegion(newRegion, 1000);
          }
        }
      } catch (error) {
        console.error("Error getting location:", error);
        setLocationPermissionGranted(false);
      }
    };

    getCurrentLocation();
  }, []);

  // Center map on user location when map becomes ready
  useEffect(() => {
    if (isMapReady && userLocation && mapRef.current) {
      const isPickupPhase =
        internalActiveRide?.status === "accepted" ||
        internalActiveRide?.status === "driver_arriving" ||
        internalActiveRide?.status === "driver_arrived";
      if (isPickupPhase) return;

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

    // SNAP both start and end points to road for consistent marker-line connection
    const [snappedStart, snappedEnd] = await Promise.all([
      getNearestRoadLocation(
        trackedDriverLocation.latitude,
        trackedDriverLocation.longitude,
      ),
      activeRide.pickupLocation
        ? getNearestRoadLocation(
            activeRide.pickupLocation.lat,
            activeRide.pickupLocation.lng,
          )
        : Promise.resolve(null),
    ]);

    const start: LocationCoord = snappedStart
      ? { latitude: snappedStart.lat, longitude: snappedStart.lng }
      : {
          latitude: trackedDriverLocation.latitude,
          longitude: trackedDriverLocation.longitude,
        };

    const end: LocationCoord = snappedEnd
      ? { latitude: snappedEnd.lat, longitude: snappedEnd.lng }
      : {
          latitude: activeRide.pickupLocation?.lat || 0,
          longitude: activeRide.pickupLocation?.lng || 0,
        };

    // Also update snapped client location to match route end point
    if (snappedEnd) {
      setSnappedClientLocation({
        latitude: snappedEnd.lat,
        longitude: snappedEnd.lng,
      });
    }

    const route = await getRoadRoute(start, end);
    setDriverToPickupRoute(route.coordinates);
    setRouteSteps(route.steps || []); // Store turn-by-turn instructions
    setCurrentStepIndex(0); // Reset to first step
  }, [trackedDriverLocation, activeRide]);

  // Fetch road route from pickup to destination when ride starts
  const fetchPickupToDestinationRoute = useCallback(async () => {
    console.log("🛣️ fetchPickupToDestinationRoute called");
    console.log("🛣️ activeRide:", activeRide?.rideId, "status:", activeRide?.status);
    
    if (!activeRide || activeRide.status !== "in_progress") {
      console.log("🛣️ Early return: no active ride or status not in_progress");
      return;
    }

    // Use pickup location from ride data (always available)
    const pickupLat = activeRide.pickupLocation?.lat;
    const pickupLng = activeRide.pickupLocation?.lng;
    const destLat = activeRide.destinationLocation?.lat;
    const destLng = activeRide.destinationLocation?.lng;

    console.log("🛣️ Pickup:", pickupLat, pickupLng);
    console.log("🛣️ Destination:", destLat, destLng);

    if (!pickupLat || !pickupLng || !destLat || !destLng) {
      console.log("🛣️ Early return: missing coordinates");
      return;
    }

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

      console.log("🛣️ Fetching route from pickup to destination...");
      const route = await getRoadRoute(start, end);
      console.log(
        "🛣️ Pickup->Destination route fetched:",
        route.coordinates.length,
        "points",
      );
      console.log("🛣️ First 3 coordinates:", route.coordinates.slice(0, 3));
      console.log("🛣️ Last 3 coordinates:", route.coordinates.slice(-3));
      
      setPickupToDestinationRoute(route.coordinates);
      setRouteSteps(route.steps || []);
      setCurrentStepIndex(0);
      
      console.log("🛣️ ✅ Route state updated - polyline should render now");
    } catch (error) {
      console.error("🛣️ Failed to fetch destination route:", error);
    } finally {
      setIsLoadingRoute(false);
    }
  }, [activeRide]);

  // Fetch driver to pickup route when locations change - STABILITY FIX
  useEffect(() => {
    if (
      activeRide &&
      trackedDriverLocation &&
      activeRide.status !== "in_progress"
    ) {
      // Only fetch route if we don't have one yet, or if driver moved significantly (>100m)
      if (!driverToPickupRoute || driverToPickupRoute.length === 0) {
        console.log(
          "🛣️ Client: No route exists, fetching initial driver-to-pickup route",
        );
        fetchDriverToPickupRoute();
      } else {
        // Check if driver moved significantly from route start
        const routeStart = driverToPickupRoute[0];
        const distanceFromStart =
          getDistanceFromLatLonInKm(
            trackedDriverLocation.latitude,
            trackedDriverLocation.longitude,
            routeStart.latitude,
            routeStart.longitude,
          ) * 1000;

        // Only recalculate if driver moved more than 100m from route start
        if (distanceFromStart > 100) {
          console.log(
            "🛣️ Client: Driver moved significantly (>100m), recalcating route",
          );
          fetchDriverToPickupRoute();
        } else {
          console.log(
            "🛣️ Client: Driver movement minor, keeping existing route for stability",
          );
        }
      }
    }
  }, [
    activeRide?.rideId,
    activeRide?.status,
    trackedDriverLocation?.latitude,
    trackedDriverLocation?.longitude,
    fetchDriverToPickupRoute,
    driverToPickupRoute,
  ]);

  // Fetch pickup to destination route when ride starts
  useEffect(() => {
    console.log("🛣️ Client: useEffect triggered - checking conditions", {
      hasActiveRide: !!activeRide,
      status: activeRide?.status,
      rideId: activeRide?.rideId,
      routeLength: pickupToDestinationRoute?.length || 0
    });
    
    const fetchRoute = async () => {
      if (!activeRide) {
        console.log("🛣️ Client: No active ride");
        return;
      }
      
      if (activeRide.status !== "in_progress") {
        console.log("🛣️ Client: Status is not in_progress:", activeRide.status);
        return;
      }
      
      if (pickupToDestinationRoute && pickupToDestinationRoute.length > 0) {
        console.log("🛣️ Client: Already have route with", pickupToDestinationRoute.length, "points");
        return;
      }

      const pickupLat = activeRide.pickupLocation?.lat;
      const pickupLng = activeRide.pickupLocation?.lng;
      const destLat = activeRide.destinationLocation?.lat;
      const destLng = activeRide.destinationLocation?.lng;

      console.log("🛣️ Client: Fetching route from pickup", {pickupLat, pickupLng}, "to destination", {destLat, destLng});

      if (!pickupLat || !pickupLng || !destLat || !destLng) {
        console.log("🛣️ Client: Missing coordinates, cannot fetch route");
        return;
      }

      setIsLoadingRoute(true);
      try {
        const start: LocationCoord = { latitude: pickupLat, longitude: pickupLng };
        const end: LocationCoord = { latitude: destLat, longitude: destLng };

        console.log("🛣️ Client: Calling getRoadRoute API...");
        const route = await getRoadRoute(start, end);
        console.log("🛣️ Client: ✅ Route fetched successfully with", route.coordinates.length, "points");
        
        setPickupToDestinationRoute(route.coordinates);
        setRouteSteps(route.steps || []);
        setCurrentStepIndex(0);
        console.log("🛣️ Client: ✅ Route state updated");
      } catch (error) {
        console.error("🛣️ Client: ❌ Failed to fetch route:", error);
      } finally {
        setIsLoadingRoute(false);
      }
    };

    fetchRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeRide?.rideId,
    activeRide?.status,
    activeRide?.pickupLocation?.lat,
    activeRide?.pickupLocation?.lng,
    activeRide?.destinationLocation?.lat,
    activeRide?.destinationLocation?.lng,
  ]);

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
    const isAcceptedStatus =
      activeRide?.status === "accepted" ||
      activeRide?.status === "driver_arriving";
    if (isAcceptedStatus) {
      console.log(
        "🗺️ Client: Skipping auto-navigation mode for accepted status - prevents camera movements",
      );
      setIsNavigating(false); // Explicitly disable navigation for accepted status
    } else if (activeRide?.status === "in_progress") {
      setIsNavigating(true); // Only enable for in_progress
    } else if (!activeRide || activeRide.status === "completed") {
      setIsNavigating(false);
    }
  }, [activeRide?.status]);

  // Watch for completed status to show success screen
  useEffect(() => {
    if (activeRide?.status === "completed" && !showSuccessScreen) {
      setShowSuccessScreen(true);
    }
  }, [activeRide?.status, showSuccessScreen]);

  // Handle success screen close
  const handleSuccessClose = useCallback(() => {
    setShowSuccessScreen(false);
    onCancelRide?.();
  }, [onCancelRide]);



  // Calculate driver heading based on location changes
  const lastDriverLocation = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (trackedDriverLocation && lastDriverLocation.current) {
      const lat1 = lastDriverLocation.current.lat;
      const lon1 = lastDriverLocation.current.lng;
      const lat2 = trackedDriverLocation.latitude;
      const lon2 = trackedDriverLocation.longitude;

      // Calculate bearing
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const lat1Rad = (lat1 * Math.PI) / 180;
      const lat2Rad = (lat2 * Math.PI) / 180;

      const y = Math.sin(dLon) * Math.cos(lat2Rad);
      const x =
        Math.cos(lat1Rad) * Math.sin(lat2Rad) -
        Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

      let bearing = (Math.atan2(y, x) * 180) / Math.PI;
      bearing = (bearing + 360) % 360;

      // Only update heading if moved enough
      const distance = getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2);
      if (distance > 0.001) {
        // Moved more than 1 meter
        setDriverHeading(bearing);
      }
    }
    lastDriverLocation.current = trackedDriverLocation
      ? {
          lat: trackedDriverLocation.latitude,
          lng: trackedDriverLocation.longitude,
        }
      : null;
  }, [trackedDriverLocation]);

  // Calculate bearing between two points
  const calculateBearing = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number => {
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const lat1Rad = (lat1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

    let bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
  };

  // Calculate route-based heading (follow route direction, not GPS) - Enhanced for Google Maps
  const calculateRouteHeading = useCallback((): number => {
    if (!snappedDriverLocation) return driverHeading;

    // Use snapped location for more accurate heading
    const currentLocation = {
      lat: snappedDriverLocation.latitude,
      lng: snappedDriverLocation.longitude,
    };

    // Determine which route to use based on ride status
    const activeRoute =
      activeRide?.status === "in_progress"
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
        point.longitude,
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

    while (
      lookAheadIndex < activeRoute.length - 1 &&
      lookAheadDistance < minLookAhead
    ) {
      lookAheadIndex++;
      lookAheadDistance += getDistanceFromLatLonInKm(
        activeRoute[lookAheadIndex - 1].latitude,
        activeRoute[lookAheadIndex - 1].longitude,
        activeRoute[lookAheadIndex].latitude,
        activeRoute[lookAheadIndex].longitude,
      );
    }

    // If we can't look far enough ahead, use the next available point
    if (
      lookAheadIndex >= activeRoute.length - 1 &&
      closestIndex < activeRoute.length - 1
    ) {
      lookAheadIndex = closestIndex + 1;
    }

    const aheadPoint = activeRoute[lookAheadIndex];

    return calculateBearing(
      currentLocation.lat,
      currentLocation.lng,
      aheadPoint.latitude,
      aheadPoint.longitude,
    );
  }, [
    snappedDriverLocation,
    activeRide?.status,
    pickupToDestinationRoute,
    driverToPickupRoute,
    driverHeading,
  ]);

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
      destLng,
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
      destLng,
    );

    // Generate turn instruction based on bearing difference
    const headingDiff = (bearing - driverHeading + 360) % 360;

    if (headingDiff < 20 || headingDiff > 340) {
      setNavigationInstruction("Continue straight");
    } else if (headingDiff >= 20 && headingDiff < 60) {
      setNavigationInstruction("Turn slight right");
    } else if (headingDiff >= 60 && headingDiff < 120) {
      setNavigationInstruction("Turn right");
    } else if (headingDiff >= 120 && headingDiff < 160) {
      setNavigationInstruction("Turn sharp right");
    } else if (headingDiff >= 200 && headingDiff < 240) {
      setNavigationInstruction("Turn sharp left");
    } else if (headingDiff >= 240 && headingDiff < 300) {
      setNavigationInstruction("Turn left");
    } else if (headingDiff >= 300 && headingDiff <= 340) {
      setNavigationInstruction("Turn slight left");
    } else {
      setNavigationInstruction("Make a U-turn");
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
  // 🛣️ FIXED SNAP TO ROAD - Ensures marker sits EXACTLY on the route polyline
  const snapDriverToRoad = useCallback(
    async (rawLocation: LocationCoord): Promise<LocationCoord> => {
      console.log("🛣️ Client: snapDriverToRoad START");
      console.log("🛣️ Client: Input location:", rawLocation);

      try {
        // 1. Identify the active route array being used by the Polyline
        const activeRoute =
          activeRide?.status === "in_progress"
            ? pickupToDestinationRoute
            : driverToPickupRoute;

        console.log("🛣️ Client: Active route status:", activeRide?.status);
        console.log(
          "🛣️ Client: Active route length:",
          activeRoute?.length || 0,
        );

        // 2. If we have a route, ALWAYS snap marker to the closest point on that route
        // This locks the driver to the route polyline (Uber-style)
        if (activeRoute && activeRoute.length > 0) {
          // Find closest point on the route polyline
          const snapped = snapToNearestPolylinePoint(rawLocation, activeRoute);
          
          console.log("🛣️ Client: Snapped to route polyline:", snapped);
          
          setSnappedDriverLocation({
            latitude: snapped.latitude,
            longitude: snapped.longitude,
          });
          
          // Calculate distance from raw GPS to snapped point for debugging
          const snapDistance = getDistanceFromLatLonInKm(
            rawLocation.latitude,
            rawLocation.longitude,
            snapped.latitude,
            snapped.longitude,
          ) * 1000;
          
          setRoadSnappingData({
            lat: snapped.latitude,
            lng: snapped.longitude,
            originalLat: rawLocation.latitude,
            originalLng: rawLocation.longitude,
            distance: snapDistance,
          });
          
          return { latitude: snapped.latitude, longitude: snapped.longitude };
        }

        // 3. Fallback to Roads API only if no route exists yet
        console.log("🛣️ Client: No route yet, falling back to Roads API");
        const snappedData = await getNearestRoadLocation(
          rawLocation.latitude,
          rawLocation.longitude,
        );
        if (snappedData) {
          const result = {
            latitude: snappedData.lat,
            longitude: snappedData.lng,
          };
          setSnappedDriverLocation(result);
          return result;
        }

        return rawLocation;
      } catch (error) {
        console.error("🛣️ Client: snapDriverToRoad error:", error);
        return rawLocation;
      }
    },
    [activeRide?.status, pickupToDestinationRoute, driverToPickupRoute],
  );

  // 🚀 IMMEDIATE SNAPPING ON APP LOAD - Force driver marker to route start when app restarts
  useEffect(() => {
    if (
      activeRide &&
      trackedDriverLocation &&
      (activeRide.status === "accepted" || activeRide.status === "in_progress")
    ) {
      console.log(
        "🚀 Client: APP LOAD DETECTED - Forcing immediate driver marker snap to route start",
      );

      // Force immediate snapping without waiting for GPS updates
      const rawLocation = {
        latitude: trackedDriverLocation.latitude,
        longitude: trackedDriverLocation.longitude,
      };

      snapDriverToRoad(rawLocation);
    }
  }, [
    activeRide?.rideId,
    activeRide?.status,
    trackedDriverLocation,
    snapDriverToRoad,
  ]);

  // 🛣️ SNAP CLIENT LOCATION TO ROAD - Same priority as Driver map
  // Priority 1: Route polyline (snap to nearest point on route, same as driver)
  // Priority 2: Google Roads API
  const snapClientToRoad = useCallback(
    async (rawClientLocation: LocationCoord, routePolyline?: LocationCoord[]): Promise<LocationCoord> => {
      console.log("🛣️ Client: snapClientToRoad START");
      console.log("🛣️ Client: Input location:", rawClientLocation);

      // PRIORITY 1: Snap to route polyline (Uber-style, same as driver)
      // Use snapToNearestPolylinePoint to find closest point on route (like driver)
      if (routePolyline && routePolyline.length > 0) {
        const snapped = snapToNearestPolylinePoint(rawClientLocation, routePolyline);
        const distanceKm = getDistanceFromLatLonInKm(
          rawClientLocation.latitude,
          rawClientLocation.longitude,
          snapped.latitude,
          snapped.longitude,
        );
        const distanceMeters = distanceKm * 1000;
        console.log("🛣️ Client: Route polyline snapping - snapped to:", snapped);
        console.log("🛣️ Client: Route snap distance:", distanceMeters.toFixed(2), "meters");

        const result = { latitude: snapped.latitude, longitude: snapped.longitude };
        setSnappedClientLocation(result);
        setRoadSnappingData({
          lat: snapped.latitude,
          lng: snapped.longitude,
          originalLat: rawClientLocation.latitude,
          originalLng: rawClientLocation.longitude,
          distance: distanceMeters,
        });
        return result;
      }

      // PRIORITY 2: Google Roads API fallback
      try {
        console.log("🛣️ Client: No route available, falling back to Google Roads API...");
        const snappedData = await getNearestRoadLocation(
          rawClientLocation.latitude,
          rawClientLocation.longitude,
        );

        console.log("🛣️ Client: API response received:", snappedData);

        if (snappedData && snappedData.lat && snappedData.lng) {
          const result = {
            latitude: snappedData.lat,
            longitude: snappedData.lng,
          };
          console.log(
            "🛣️ Client: Setting snappedClientLocation state to:",
            result,
          );
          setSnappedClientLocation(result);
          console.log(
            "🛣️ Client: Client snapped to road successfully:",
            result,
          );
          console.log(
            "🛣️ Client: Client offset distance:",
            snappedData.distance,
            "meters",
          );
          return result;
        }

        console.warn(
          "🛣️ Client: No valid road data found for client, using raw location",
        );
        console.log("🛣️ Client: snappedData was:", snappedData);
        return rawClientLocation;
      } catch (error) {
        console.error(
          "🛣️ Client: Failed to snap client location to road:",
          error,
        );
        console.warn("🛣️ Client: Using raw client location as fallback");
        return rawClientLocation;
      }
    },
    [],
  );

  // 🛣️ SNAP CLIENT PICKUP LOCATION TO ROAD - Same priority as Driver
  // Triggers for: accepted, driver_arriving, driver_arrived (not in_progress - client marker hidden)
  // Priority 1: Route polyline, Priority 2: Google Roads API
  useEffect(() => {
    if (
      activeRide &&
      activeRide.pickupLocation &&
      (activeRide.status === "accepted" ||
        activeRide.status === "driver_arriving" ||
        activeRide.status === "driver_arrived")
    ) {
      const clientRawLocation = {
        latitude: activeRide.pickupLocation.lat,
        longitude: activeRide.pickupLocation.lng,
      };
      console.log(
        "🛣️ Client: Snapping client pickup location to road for status:",
        activeRide.status,
        clientRawLocation,
      );
      // Pass route polyline for priority-1 snapping (same as driver)
      snapClientToRoad(clientRawLocation, driverToPickupRoute ?? undefined);
    }
  }, [
    activeRide?.rideId,
    activeRide?.status,
    activeRide?.pickupLocation,
    snapClientToRoad,
    driverToPickupRoute,
  ]);

  // 🛣️ SNAP DRIVER LOCATION TO ROAD - When driver location is first received
  useEffect(() => {
    if (
      activeRide &&
      trackedDriverLocation &&
      (activeRide.status === "accepted" ||
        activeRide.status === "driver_arriving" ||
        activeRide.status === "driver_arrived")
    ) {
      const driverRawLocation = {
        latitude: trackedDriverLocation.latitude,
        longitude: trackedDriverLocation.longitude,
      };
      console.log(
        "🛣️ Client: Driver location received, snapping to road:",
        driverRawLocation,
      );
      snapDriverToRoad(driverRawLocation);
    }
  }, [
    activeRide?.rideId,
    activeRide?.status,
    trackedDriverLocation,
    snapDriverToRoad,
  ]);

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
        const distanceToStep =
          getDistanceFromLatLonInKm(
            driverPos.latitude,
            driverPos.longitude,
            step.startCoord.latitude,
            step.startCoord.longitude,
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
        console.log("🧭 Navigation: Advanced to step", newStepIndex);
      }

      // Update instruction and distance for current step
      if (newStepIndex < routeSteps.length) {
        const currentStep = routeSteps[newStepIndex];
        const distanceToNextTurn =
          getDistanceFromLatLonInKm(
            driverPos.latitude,
            driverPos.longitude,
            currentStep.startCoord.latitude,
            currentStep.startCoord.longitude,
          ) * 1000;

        setNavigationInstruction(
          currentStep.instruction || "Continue straight",
        );
        setRemainingDistance(`${Math.round(distanceToNextTurn)}m`);

        console.log(
          "🧭 Navigation:",
          currentStep.instruction,
          `in ${Math.round(distanceToNextTurn)}m`,
        );
      }
    };

    updateCurrentInstruction();
    const interval = setInterval(updateCurrentInstruction, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [
    isNavigating,
    trackedDriverLocation,
    snappedDriverLocation,
    routeSteps,
    currentStepIndex,
  ]);

  // 🧭 DEVICE HEADING (COMPASS) MONITORING
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const startHeadingMonitoring = async () => {
      try {
        subscription = await Location.watchHeadingAsync((heading) => {
          const headingDegrees = Math.round(
            heading.trueHeading || heading.magHeading || 0,
          );
          setDeviceHeading(headingDegrees);
          console.log("🧭 Device heading updated:", headingDegrees);
        });
      } catch (error) {
        console.error("🧭 Error monitoring heading:", error);
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
    if (now - lastNavCameraUpdate.current < 200) return; // Throttle to 5fps
    lastNavCameraUpdate.current = now;

    // Use snapped driver location for camera (road-snapped position)
    const targetLocation = snappedDriverLocation || trackedDriverLocation;
    if (!targetLocation) return;

    // Calculate route-based heading with improved look-ahead
    const routeHeading = calculateRouteHeading();

    // Smooth heading transition with acceleration/deceleration
    let smoothHeading = routeHeading;
    if (lastCameraHeading.current !== 0) {
      const headingDiff =
        ((routeHeading - lastCameraHeading.current + 540) % 360) - 180;
      // Use smaller interpolation for smoother rotation
      smoothHeading = lastCameraHeading.current + headingDiff * 0.1;
      smoothHeading = (smoothHeading + 360) % 360;
    }
    lastCameraHeading.current = smoothHeading;

    // 🎬 GOOGLE MAPS NAVIGATION CAMERA - 3D Perspective with proper zoom levels
    // Adjust zoom based on speed (closer at low speed, further at high speed)
    const speed = locationData?.speed || 0; // m/s
    let zoomLevel = 19; // Default street level

    if (speed > 15) {
      // > 54 km/h
      zoomLevel = 17; // Zoom out for highway
    } else if (speed > 8) {
      // > 28 km/h
      zoomLevel = 18; // Medium zoom
    }

    mapRef.current.animateCamera(
      {
        center: {
          latitude: targetLocation.latitude,
          longitude: targetLocation.longitude,
        },
        pitch: 65, // Google Maps Navigation angle
        heading: smoothHeading, // Points "up" the road
        zoom: zoomLevel,
        altitude: 200,
      },
      { duration: 400 },
    ); // Slightly longer for smoother feel

    setCameraHeading(smoothHeading);
  }, [
    isNavigating,
    isUserInteracting,
    snappedDriverLocation,
    trackedDriverLocation,
    calculateRouteHeading,
    locationData?.speed,
  ]);

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
    if (
      snappedDriverLocation &&
      (activeRide?.status === "accepted" ||
        activeRide?.status === "in_progress")
    ) {
      console.log("🎯 Snapped location updated:", snappedDriverLocation);

      // ALWAYS update animated position to snapped location
      if (!animatedDriverPositionRef.current) {
        console.log(
          "🎬 Initializing animated driver position to SNAPPED location:",
          snappedDriverLocation,
        );
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
        toPosition.longitude,
      );

      if (distance > 0.0001) {
        // Even small movements animate (10cm)
        console.log("🎬 Driver position changed, updating animation ref");
        animatedDriverPositionRef.current = snappedDriverLocation;
      } else {
        // Direct update for very small changes
        animatedDriverPositionRef.current = snappedDriverLocation;
      }
    }
  }, [snappedDriverLocation, activeRide?.status]);

  // 🗺️ CAMERA FOLLOW FOR IN_PROGRESS - follow live driver position/heading
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;
    if (activeRide?.status !== "in_progress") return;
    if (isUserInteracting) return;

    const driverPos = snappedDriverLocation || trackedDriverLocation;
    if (!driverPos) return;

    const headingFromDriver =
      driverPos.heading ?? (driverPos as any).bearing ?? cameraHeading ?? 0;

    const fastSmoothHeading = (() => {
      if (lastCameraHeading.current === 0) return headingFromDriver;
      const diff = ((headingFromDriver - lastCameraHeading.current + 540) % 360) - 180;
      let interpolated = lastCameraHeading.current + diff * 0.2;
      interpolated = (interpolated + 360) % 360;
      return interpolated;
    })();

    lastCameraHeading.current = fastSmoothHeading;
    setCameraHeading(fastSmoothHeading);

    const headingRad = (fastSmoothHeading * Math.PI) / 180;
    const offsetDistance = 0.00005; // ~5m offset to keep marker near center
    const cameraLat =
      (driverPos.latitude ?? (driverPos as any).lat ?? 0) - Math.cos(headingRad) * offsetDistance;
    const cameraLng =
      (driverPos.longitude ?? (driverPos as any).lng ?? 0) - Math.sin(headingRad) * offsetDistance;

    mapRef.current.animateCamera(
      {
        center: { latitude: cameraLat, longitude: cameraLng },
        heading: fastSmoothHeading,
        pitch: 60,
        zoom: 19,
        altitude: 120,
      },
      { duration: 400 },
    );

    animatedDriverPositionRef.current = {
      latitude: driverPos.latitude ?? (driverPos as any).lat ?? 0,
      longitude: driverPos.longitude ?? (driverPos as any).lng ?? 0,
    };
  }, [
    activeRide?.status,
    snappedDriverLocation,
    trackedDriverLocation,
    isMapReady,
    isUserInteracting,
  ]);

  // 🎮 SIMULATION CAMERA FOLLOW - First-person chase view (like Google Maps)
  useEffect(() => {
    if (!isSimulating || !mapRef.current || !isMapReady) return;
    if (isUserInteracting) return; // Don't interrupt user interaction
    if (!simulatedDriverLocation) return;

    // Throttle camera updates (same as real ride: 200ms)
    const now = Date.now();
    if (now - lastNavCameraUpdate.current < 200) return;
    lastNavCameraUpdate.current = now;

    // Calculate position behind the driver for chase view
    // Offset camera 50m behind and slightly above
    const headingRad = (simulationHeading * Math.PI) / 180;
    const offsetDistance = 0.00045; // ~50m in degrees
    const cameraLat = simulatedDriverLocation.latitude - Math.cos(headingRad) * offsetDistance;
    const cameraLng = simulatedDriverLocation.longitude - Math.sin(headingRad) * offsetDistance;

    // First-person chase camera (positioned behind driver, looking forward)
    mapRef.current.animateCamera({
      center: {
        latitude: cameraLat,
        longitude: cameraLng,
      },
      heading: simulationHeading, // Camera points in same direction as driver
      pitch: 65, // Tilted up for street-level view
      zoom: 19, // Close zoom
      altitude: 100, // Slight elevation
    }, { duration: 800 }); // Smooth animation

    console.log("🎮 SIMULATION: First-person camera following driver");
  }, [isSimulating, simulatedDriverLocation, simulationHeading, isMapReady, isUserInteracting]);

  // 🎯 ENHANCED GPS UPDATE HANDLING - Snap every update
  useEffect(() => {
    if (
      trackedDriverLocation &&
      (activeRide?.status === "accepted" ||
        activeRide?.status === "in_progress")
    ) {
      console.log(
        "🎯 GPS update received, snapping to road:",
        trackedDriverLocation,
      );

      // Debug: Check if routes exist
      if (activeRide?.status === "in_progress") {
        console.log("🛣️ IN_PROGRESS - Checking routes:");
        console.log(
          "  - pickupToDestinationRoute length:",
          pickupToDestinationRoute?.length || 0,
        );
        console.log(
          "  - driverToPickupRoute length:",
          driverToPickupRoute?.length || 0,
        );
        console.log("  - isNavigating:", isNavigating);
      }

      // Snap EVERY GPS update to road
      snapDriverToRoad(trackedDriverLocation)
        .then((snappedLocation) => {
          console.log("✅ GPS location snapped successfully:", snappedLocation);
        })
        .catch((error) => {
          console.error("❌ Failed to snap GPS location:", error);
        });
    }
  }, [
    trackedDriverLocation,
    activeRide?.status,
    snapDriverToRoad,
    pickupToDestinationRoute,
    driverToPickupRoute,
    isNavigating,
  ]);

  // Debug: Log snapped vs raw location
  useEffect(() => {
    if (snappedDriverLocation && trackedDriverLocation) {
      const distance = getDistanceFromLatLonInKm(
        trackedDriverLocation.latitude,
        trackedDriverLocation.longitude,
        snappedDriverLocation.latitude,
        snappedDriverLocation.longitude,
      );
      console.log("🔍 Location comparison:");
      console.log("  Raw GPS:", trackedDriverLocation);
      console.log("  Snapped:", snappedDriverLocation);
      console.log("  Distance from road:", `${distance.toFixed(3)}km`);
    }
  }, [snappedDriverLocation, trackedDriverLocation]);

  // Map interaction handling - Improved for client side
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      setIsUserInteracting(true);
      setShowRecenterButton(true);
      console.log("🤚 User started interacting with map");
    },
    onPanResponderRelease: () => {
      // Resume camera following after 3 seconds of no interaction
      setTimeout(() => {
        setIsUserInteracting(false);
        setShowRecenterButton(false);
        console.log("🔄 Resuming camera following after user interaction");
      }, 3000);
    },
  });

  // Handle re-center button press - Fit to show route using polyline
const handleRecenter = useCallback(() => {
  setIsUserInteracting(false);
  setShowRecenterButton(false);

  // 1. Determine the target destination based on status
  const isProgress = activeRide?.status === "in_progress";
  const activeRoute = isProgress ? pickupToDestinationRoute : driverToPickupRoute;
  
  // 2. Identify the Driver (The "Start" of the blue line)
  const driverPos = snappedDriverLocation || trackedDriverLocation || internalDriverLocation;

  if (activeRoute && activeRoute.length > 0) {
    // ✅ OPTION A: Fit the whole route (Overview Mode)
    mapRef.current.fitToCoordinates(activeRoute, {
      edgePadding: { top: 100, right: 80, bottom: 380, left: 80 },
      animated: true,
    });
  } else if (driverPos) {
    // ⚠️ FALLBACK: If route isn't ready, center on the Driver so the user isn't lost
    mapRef.current.animateToRegion({
      latitude: driverPos.latitude,
      longitude: driverPos.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }, 1000);
  }
}, [activeRide, pickupToDestinationRoute, driverToPickupRoute, snappedDriverLocation, trackedDriverLocation]);

  // ============================================
  // 🎯 PROFESSIONAL MAP ZOOM SOLUTION - Dynamic Distance-Based Zoom
  // ============================================

  // UTILITY: Calculate zoom deltas from actual distance
  const calculateZoomDeltas = (point1: any, point2: any) => {
    /**
     * Calculate the geographic distance and determine appropriate zoom level
     * This ensures the map fits both driver and client properly
     */

    const lat1 = point1.latitude || point1.lat;
    const lng1 = point1.longitude || point1.lng;
    const lat2 = point2.latitude || point2.lat;
    const lng2 = point2.longitude || point2.lng;

    // Calculate distance in degrees (approximate)
    const latDelta = Math.abs(lat2 - lat1);
    const lngDelta = Math.abs(lng2 - lng1);

    // Add LESS padding for TIGHTER zoom (was 1.3, now 1.1)
    const paddedLatDelta = latDelta * 1.1;
    const paddedLngDelta = lngDelta * 1.1;

    // TIGHTER bounds for closer zoom
    // Min: 0.005 degree (about 500m - was 0.01)
    // Max: 0.3 degree (about 30km - was 0.5)
    return {
      latitudeDelta: Math.max(0.005, Math.min(0.3, paddedLatDelta)),
      longitudeDelta: Math.max(0.005, Math.min(0.3, paddedLngDelta)),
    };
  };

  // ============================================
  // UTILITY: Normalize location coordinates
  // ============================================
  const normalizeLocation = (location: any) => {
    /**
     * Converts any location format to standard {latitude, longitude}
     * Handles: {lat, lng}, {latitude, longitude}, {x, y}, etc.
     */
    return {
      latitude: location.latitude ?? location.lat ?? location.x ?? 0,
      longitude: location.longitude ?? location.lng ?? location.y ?? 0,
    };
  };

  // Reset camera fit guard when ride leaves accepted statuses or rideId changes
  useEffect(() => {
    const isAcceptedStatus =
      internalActiveRide?.status === "accepted" ||
      internalActiveRide?.status === "driver_arriving" ||
      internalActiveRide?.status === "driver_arrived";
    if (!isAcceptedStatus) {
      hasFittedRef.current = false;
      zoomAttemptRef.current = 0;
    }
  }, [internalActiveRide?.status, internalActiveRide?.rideId]);

  // Fit map to show route based on ride status - FIXED: Skip accepted status
  useEffect(() => {
    if (!mapRef.current || !MapView || !isMapReady) return;

    // Don't fit to coordinates if navigating
    if (isNavigating) return;

    // SKIP all accepted/pickup statuses - handled by the fit effect
    const isAcceptedStatus =
      activeRide?.status === "accepted" ||
      activeRide?.status === "driver_arriving" ||
      activeRide?.status === "driver_arrived";
    if (isAcceptedStatus) return;

    const rideStatus = activeRide?.status;
    const pickupLat =
      activeRide?.pickupLocation?.lat || userLocation?.coords.latitude || 0;
    const pickupLng =
      activeRide?.pickupLocation?.lng || userLocation?.coords.longitude || 0;
    const destLat = activeRide?.destinationLocation?.lat;
    const destLng = activeRide?.destinationLocation?.lng;

    // When ride is in_progress: show first-person navigation following driver
    if (rideStatus === "in_progress" && destLat && destLng) {
      console.log(
        "📍 Client: Switching to first-person navigation (in_progress):",
        {
          driverLocation: trackedDriverLocation,
          destination: { lat: destLat, lng: destLng },
        },
      );

      // Enable navigation mode
      setIsNavigating(true);

      // Set first-person view following DRIVER (not user)
      const targetLocation = snappedDriverLocation || trackedDriverLocation;
      if (targetLocation && mapRef.current) {
        const routeHeading = calculateRouteHeading();

        setTimeout(() => {
          mapRef.current?.animateCamera(
            {
              center: {
                latitude: targetLocation.latitude,
                longitude: targetLocation.longitude,
              },
              pitch: 75, // Google Maps Navigation 3D angle
              heading: routeHeading, // Direction of travel
              zoom: 19, // Street-level zoom
              altitude: 200, // Low-to-ground street view
            },
            1000,
          );
        }, 500);
      }
    }
  }, [
    activeRide?.status,
    isMapReady,
    isNavigating,
    trackedDriverLocation,
    snappedDriverLocation,
    calculateRouteHeading,
    userLocation,
  ]);

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

      {/* Navigation Header - Turn by Turn (hidden when success screen is shown) */}
      {activeRide && currentStep && !showSuccessScreen && (
        <NavigationHeader
          currentStep={currentStep}
          nextStep={nextStep}
          language={language}
        />
      )}

      {/* Map View - Google Maps */}
      {MapView ? (
        <View
          style={StyleSheet.absoluteFillObject}
          {...panResponder.panHandlers}
        >
          <MapView
            ref={mapRef}
            onMapReady={() => setIsMapReady(true)}
            initialRegion={mapRegion}
            style={StyleSheet.absoluteFillObject}
            provider={PROVIDER_GOOGLE}
            customMapStyle={mapStyle}
            showsUserLocation={false}
            showsMyLocationButton={false}
            onRegionChangeComplete={(region: any) => setMapRegion(region)}
          >
            {/* Pickup Location Marker (Client) - Hide when ride is in progress */}
            {Marker && activeRide?.status !== "in_progress" && (
              <Marker
                coordinate={
                  snappedClientLocation || {
                    latitude:
                      activeRide?.pickupLocation?.lat ||
                      userLocation?.coords.latitude ||
                      0,
                    longitude:
                      activeRide?.pickupLocation?.lng ||
                      userLocation?.coords.longitude ||
                      0,
                  }
                }
                anchor={{ x: 0.5, y: 1 }}
                title={activeRide ? "Pickup Location" : "Your Location"}
              >
                <View
                  style={activeRide ? styles.pickupMarker : styles.userMarker}
                >
                  <View
                    style={
                      activeRide ? styles.pickupMarkerDot : styles.userMarkerDot
                    }
                  />
                </View>
              </Marker>
            )}

            {/* 🛣️ CLIENT GPS-to-Road Connection Line - Dotted line showing "walk" from building to road */}
            {snappedClientLocation &&
              activeRide?.pickupLocation &&
              Polyline && (
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
                {console.log("🔍 Client: Driver marker render check:", {
                  trackedDriverLocation: trackedDriverLocation,
                  snappedDriverLocation: snappedDriverLocation,
                  animatedDriverPositionRef: animatedDriverPositionRef.current,
                  roadSnappingData: roadSnappingData,
                  "Final coordinate": animatedDriverPositionRef.current ||
                    snappedDriverLocation ||
                    trackedDriverLocation || { latitude: 0, longitude: 0 },
                })}
                <Marker
                  key={`driver-${Math.round((snappedDriverLocation || trackedDriverLocation || { latitude: 0, longitude: 0 }).latitude * 10000)}-${Math.round((snappedDriverLocation || trackedDriverLocation || { latitude: 0, longitude: 0 }).longitude * 10000)}`}
                  coordinate={
                    animatedDriverPositionRef.current ||
                    snappedDriverLocation ||
                    trackedDriverLocation || { latitude: 0, longitude: 0 }
                  }
                  anchor={{ x: 0.5, y: 0.5 }}
                  title="Driver"
                  zIndex={999} // Ensure it sits ABOVE the blue line
                  description="Driver (snapped to road)"
                  flat={true}
                >
                  {/* Use DriverStatusMarker for consistent Google Maps style markers */}
                  <DriverStatusMarker 
                    heading={deviceHeading || cameraHeading || 0}
                    status={activeRide?.status as any || 'accepted'}
                    size={44}
                  />
                </Marker>
              </>
            )}

            {/* GPS-to-Road Connection Line - Show dotted line from raw GPS to snapped road position */}
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
                lineDashPattern={[5, 5]}
                lineCap="round"
                lineJoin="round"
              />
            )}

            {/* Route from user location to selected destination */}
            {selectedDestination?.routeData?.coordinates && !activeRide && (
              <RoutePolyline
                coordinates={selectedDestination.routeData.coordinates}
                strokeColor="#185ADC"
                strokeWidth={4}
                isVisible={true}
              />
            )}

            {/* Destination Marker - shown when ride is in progress */}
            {activeRide &&
              activeRide.status === "in_progress" &&
              Marker &&
              activeRide.destinationLocation && (
                <Marker
                  coordinate={{
                    latitude: activeRide.destinationLocation.lat,
                    longitude: activeRide.destinationLocation.lng,
                  }}
                  anchor={{ x: 0.5, y: 1 }}
                  title="Destination"
                >
                  <View style={styles.destinationMarker}>
                    <View
                      style={[
                        styles.pickupMarkerDot,
                        { backgroundColor: "#22C55E" },
                      ]}
                    />
                  </View>
                </Marker>
              )}

            {/* 🛣️ Route Polyline - Combined logic for both driver→pickup and pickup→destination */}
            {activeRide && Polyline && (
              <Polyline
                coordinates={
                  activeRide.status === "in_progress"
                    ? // In Progress Route
                      (pickupToDestinationRoute && pickupToDestinationRoute.length > 0
                        ? pickupToDestinationRoute
                        : activeRide.polylineCoords && activeRide.polylineCoords.length > 1
                          ? activeRide.polylineCoords
                          : [
                              { latitude: activeRide.pickupLocation.lat, longitude: activeRide.pickupLocation.lng },
                              { latitude: activeRide.destinationLocation.lat, longitude: activeRide.destinationLocation.lng }
                            ])
                    : // Driver Coming to Pickup Route
                      (["accepted", "driver_arrived", "driver_arriving"].includes(activeRide.status)
                        ? (driverToPickupRoute && driverToPickupRoute.length > 0 
                            ? driverToPickupRoute 
                            : [
                                { latitude: trackedDriverLocation?.latitude || 0, longitude: trackedDriverLocation?.longitude || 0 },
                                { latitude: activeRide.pickupLocation.lat, longitude: activeRide.pickupLocation.lng }
                              ])
                        : [])
                }
                strokeColor="#185ADC" // Your preferred blue
                strokeWidth={8}
                zIndex={998}
                lineCap="round"
                lineJoin="round"
              />
            )}

            {/* 🎮 SIMULATION MODE - Route Polyline (Development only) */}
            {isSimulating && simulationRoute && Polyline && (
              <Polyline
                coordinates={simulationRoute}
                strokeColor="#9C27B0" // Purple for simulation
                strokeWidth={6}
                zIndex={997}
                lineCap="round"
                lineJoin="round"
              />
            )}

            {/* 🎮 SIMULATION MODE - Markers (Development only) */}
            {isSimulating && (
              <SimulationMarkers
                startLocation={{ latitude: 36.3707, longitude: 2.4755 }} // Default start
                endLocation={{ latitude: 36.5907, longitude: 2.4434 }}   // Default end
                currentPosition={simulatedDriverLocation}
                heading={simulationHeading}
                Marker={Marker}
              />
            )}
          </MapView>
        </View>
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.mapPlaceholder]}>
          <Text translationKey="mapLoading" style={styles.mapPlaceholderText} />
        </View>
      )}

      {/* Re-center Button - Hidden for initial home screen */}
      {/* <RecenterButton onPress={handleRecenter} isVisible={showRecenterButton} /> */}

      {/* Ride Success Screen - shown after ride completion */}
      <RideSuccessScreen
        visible={showSuccessScreen}
        rideData={activeRide}
        language={language}
        onClose={handleSuccessClose}
      />

      {/* 🎮 SIMULATION CONTROLS - Enabled for testing */}
      {!activeRide && (
        <SimulationControls
          isSimulating={isSimulating}
          isPaused={isSimulationPaused}
          progress={simulationProgress}
          onStart={() => {
            // Default simulation: Blida to Tipaza
            startSimulation({
              startLocation: { latitude: 36.3707, longitude: 2.4755 },
              endLocation: { latitude: 36.5907, longitude: 2.4434 },
              speedKmh: 60,
              updateIntervalMs: 1500,
            });
          }}
          onStop={stopSimulation}
          onPause={pauseSimulation}
          onResume={resumeSimulation}
        />
      )}

      {/* Ride Success Screen - shown after ride completion */}
      <RideSuccessScreen
        visible={showSuccessScreen}
        rideData={activeRide}
        language={language}
        onClose={() => {
          setShowSuccessScreen(false);
          onCancelRide?.();
        }}

      />

      {/* Active Ride Bottom Sheet - show during ride, hide when completed */}
      <ActiveRideBottomSheet
        visible={isRideInProgressOrAccepted}
        rideData={internalActiveRide || null}
        driverLocation={driverLocation}
        language={language}
        onCallDriver={() => {
          console.log("📞 Calling driver:", activeRide?.driverPhone);
          const phone = activeRide?.driverPhone || "+213000000000";
          Linking.openURL(`tel:${phone}`);
        }}
        onCancel={() => {
          if (activeRide?.status === "completed") {
            onCancelRide?.();
          } else {
            setShowCancelModal(true);
          }
        }}
      />

      {/* Debug: show active ride info */}
      {activeRide && (
        <View
          style={{
            position: "absolute",
            top: 100,
            left: 10,
            backgroundColor: "rgba(0,0,0,0.7)",
            padding: 10,
            borderRadius: 5,
            zIndex: 9999,
          }}
        >
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
        <View style={[styles.driverSection, { paddingTop: Platform.OS === 'ios' ? 50 : 40 }]}>
          {/* Header row: logo + profile icon */}
          <View
            style={[
              styles.driverSectionHeader,
              { paddingTop: 8 },
              isRTL && styles.driverSectionHeaderRTL,
            ]}
          >
            <Image
              source={require("../../assets/header_logo.png")}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            {Platform.OS === 'android' && (
              <TouchableOpacity onPress={toggleMapTheme} style={styles.themeButton}>
                <Text style={styles.themeButtonText}>
                  {isDarkMode ? "☀️" : "🌙"}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onProfile} style={styles.profileButton}>
              <Text style={styles.profileIcon}>👤</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.driverCard, isRTL && styles.driverCardRTL]}>
            <View
              style={[
                styles.driverCardContent,
                isRTL && styles.driverCardContentRTL,
              ]}
            >
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
                  style={[
                    styles.requestButtonText,
                    isRTL && styles.requestButtonTextRTL,
                  ]}
                />
              </TouchableOpacity>
            </View>
            <Image
              source={require("../../assets/camion.png")}
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
          <Text
            translationKey="whereToGo"
            style={[styles.destinationTitle, isRTL && styles.textRTL]}
          />
          <Text
            translationKey="fillDestination"
            style={[styles.destinationSubtitle, isRTL && styles.textRTL]}
          />
          <TouchableOpacity
            style={styles.destinationButton}
            onPress={onSelectAddress}
          >
            <Text
              style={[
                styles.destinationText,
                selectedDestination && styles.destinationTextSelected,
              ]}
            >
              {selectedDestination?.placeDescription || t("destination")}
            </Text>
            <Image
              source={require("../../assets/arrow-left.png")}
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
    backgroundColor: "#fff",
  },
  topBar: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  topBarNavigating: {
    top: 100, // Move down when navigation banner is showing
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  themeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  themeButtonText: {
    fontSize: 20,
  },
  profileIcon: {
    color: "#185ADC",
    fontSize: 20,
  },
  userMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#185ADC",
    borderWidth: 3,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  userMarkerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "white",
  },
  pickupMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#185ADC",
    borderWidth: 3,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pickupMarkerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "white",
  },
  destinationMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#22C55E",
    borderWidth: 3,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  driverMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#185ADC",
    borderWidth: 3,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  driverMarkerSnapped: {
    backgroundColor: "#28a745", // Green when snapped to road
    borderColor: "#1e7e34", // Darker green border
  },
  driverMarkerIcon: {
    fontSize: 22,
  },
  arrowMarkerContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#185ADC",
    borderWidth: 3,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  arrowMarker: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  mapPlaceholder: {
    backgroundColor: "#E8EEFB",
    justifyContent: "center",
    alignItems: "center",
  },
  mapPlaceholderText: {
    fontSize: 16,
    color: "#000",
  },

  navigationPanel: {
    position: "absolute",
    bottom: 280,
    left: 16,
    right: 16,
    zIndex: 1000,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  navigationPanelContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  navigationStat: {
    alignItems: "center",
    paddingHorizontal: 24,
  },
  navigationStatValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#185ADC",
  },
  navigationStatLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  navigationDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E0E0E0",
  },
  driverSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  driverSectionHeaderRTL: {
    flexDirection: "row-reverse",
  },
  headerLogo: {
    width: 70,
    height: 24,
  },
  driverCard: {
    backgroundColor: "#185ADC",
    flexDirection: "row",
    marginHorizontal: 24,
    paddingStart: 24,
    paddingTop: 16,
    borderRadius: 12,
    alignSelf: "center",
    maxWidth: 400,
    overflow: "hidden",
    marginTop: 17,
    minHeight: 150,
  },
  driverCardContent: {
    flex: 1,
    zIndex: 999,
    alignItems: "flex-start",
    paddingBottom: 10,
  },
  driverTitle: {
    fontSize: 20,
    fontWeight: "500",
    color: "white",
    flexShrink: 1,
  },
  requestButton: {
    backgroundColor: "#FEC846",
    marginTop: 14,
    borderRadius: 12,
    padding: 10,
  },
  requestButtonText: {
    fontWeight: "500",
    fontSize: 14,
    color: "#000",
    textAlign: "center",
  },
  driverImage: {
    position: "absolute",
    bottom: 0,
    right: 0,
    height: 140,
    width: 186,
  },
  driverCardRTL: {
    flexDirection: "row-reverse",
    paddingStart: 0,
    paddingEnd: 24,
  },
  driverCardContentRTL: {
    alignItems: "flex-end",
  },
  driverImageRTL: {
    right: "auto",
    left: 0,
  },
  requestButtonRTL: {
    alignSelf: "flex-end",
  },
  requestButtonTextRTL: {
    textAlign: "right",
  },
  destinationSection: {
    position: "absolute",
    bottom: 53,
    alignSelf: "center",
    width : "95%",
    backgroundColor: "white",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    borderRadius: 33,
    marginHorizontal: 16,
  },
  dragHandle: {
    height: 2,
    backgroundColor: "#00000033",
    borderRadius: 2,
    width: 106,
    alignSelf: "center",
  },
  destinationTitle: {
    fontSize: 24,
    fontWeight: "600",
    marginTop: 18,
    color: "#000",
  },
  destinationSubtitle: {
    fontSize: 14,
    color: "#000000B8",
    marginTop: 4,
  },
  destinationButton: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#185ADC",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  destinationText: {
    flex: 1,
    fontSize: 14,
    color: "#00000080",
  },
  destinationTextSelected: {
    color: "#000000E0",
  },
  arrowIcon: {
    height: 24,
    width: 24,
  },
  textRTL: {
    textAlign: "right",
  },
  arrowIconRTL: {
    transform: [{ scaleX: -1 }],
  },
  driverSection: {
    position: "absolute",
    top: Platform.OS === 'ios' ? 50 : 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  recenterButton: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -25,
    marginTop: -25,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 9999,
  },
});

export default HomeScreen;
