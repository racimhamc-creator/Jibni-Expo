import React, { useState, useEffect, useRef, useCallback } from 'react';

import { useFonts, Cairo_400Regular, Cairo_700Bold } from '@expo-google-fonts/cairo';
import * as SplashScreen from 'expo-splash-screen';

import SplashScreenComponent from './src/components/splash/SplashScreen';

import SelectLanguageScreen from './src/components/language/SelectLanguageScreen';

import LoginScreen from './src/components/auth/LoginScreen';

import VerifyOtpScreen from './src/components/auth/VerifyOtpScreen';

import PermissionsScreen from './src/components/auth/PermissionsScreen';

import HomeScreen from './src/components/home/HomeScreen';

import AddressAutocompleteScreen from './src/components/home/AddressAutocompleteScreen';

import ProfileScreen from './src/components/profile/ProfileScreen';

import BecomeDriverScreen from './src/components/becomeDriver/BecomeDriverScreen';

import TermsScreen from './src/components/becomeDriver/TermsScreen';

import DriverHomeScreen from './src/components/driverHome/DriverHomeScreen';

import SearchingForDriver from './src/components/home/SearchingForDriver';

import DriverSelection from './src/components/home/DriverSelection';

import DriverNotFound from './src/components/home/DriverNotFound';

import OfflineScreen from './src/components/common/OfflineScreen';

import RatingModal from './src/components/common/RatingModal';

import RideCancelledBanner from './src/components/common/RideCancelledBanner';

import RideCompletionConfirmModal from './src/components/common/RideCompletionConfirmModal';

import BannedScreen from './src/components/common/BannedScreen';

import { Alert, Platform, TouchableOpacity, Text, StyleSheet, View, Linking } from 'react-native';

import * as Location from 'expo-location';

import NetInfo from '@react-native-community/netinfo';

import AsyncStorage from '@react-native-async-storage/async-storage';

import * as Notifications from 'expo-notifications';

import { api } from './src/services/api';

import { storage } from './src/services/storage';

import { socketService } from './src/services/socket';
import { getRoadRoute, LocationCoord, fetchGoogleDirectionsAndLog } from './src/services/directions';

import { LanguageProvider } from './src/contexts/LanguageContext';

import { ThemeProvider } from './src/contexts/ThemeContext';

import { Language, getTranslation } from './src/utils/translations';

import { getNotificationContent } from './src/services/notifications';



// Configure how notifications are handled when app is in foreground

Notifications.setNotificationHandler({

handleNotification: async () => ({

shouldShowAlert: true,

shouldPlaySound: true,

shouldSetBadge: false,

shouldShowBanner: true,

shouldShowList: true,

}),

});





type Screen = 'splash' | 'language' | 'login' | 'verify-otp' | 'permissions' | 'home' | 'address-autocomplete' | 'profile' | 'become-driver' | 'terms' | 'driver-home' | 'searching-driver' | 'banned';

// Simple Error Boundary to catch JS errors
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>Something went wrong</Text>
          <Text style={{ textAlign: 'center', color: '#666' }}>{this.state.error?.message || 'An unexpected error occurred'}</Text>
          <TouchableOpacity 
            onPress={() => (global as any).clearAllData ? (global as any).clearAllData() : null}
            style={{ marginTop: 20, padding: 15, backgroundColor: '#185ADC', borderRadius: 8 }}
          >
            <Text style={{ color: '#fff' }}>Reset App Data</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {

const [fontsLoaded, fontError] = useFonts({
  'Cairo-Regular': Cairo_400Regular,
  'Cairo-Bold': Cairo_700Bold,
});

// Manage splash screen based on app readiness
useEffect(() => {
  async function prepare() {
    try {
      if (fontsLoaded || fontError) {
        await SplashScreen.hideAsync();
      }
    } catch (e) {
      console.warn(e);
    }
  }
  prepare();
}, [fontsLoaded, fontError]);

const [currentScreen, setCurrentScreen] = useState<Screen>('splash');

const [selectedLanguage, setSelectedLanguage] = useState<'fr' | 'en' | 'ar'>('ar');
const selectedLanguageRef = useRef<Language>(selectedLanguage);

const [phone, setPhone] = useState('');

const [isCheckingAuth, setIsCheckingAuth] = useState(true);

const [isBanned, setIsBanned] = useState(false);


// Active ride state for real-time tracking

const [activeRide, setActiveRide] = useState<any>(null);

const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);

// Clear all stored data for testing (temporary)
const clearAllStoredData = async () => {
  try {
    console.log('🧹 Clearing all stored data...');
    
    // Clear ALL AsyncStorage keys
    const keys = await AsyncStorage.getAllKeys();
    console.log('🗂️ Found keys:', keys);
    
    if (keys.length > 0) {
      await AsyncStorage.multiRemove(keys);
      console.log('🗂️ Cleared all AsyncStorage keys');
    }
    
    // Clear specific storage service methods
    await storage.clearActiveMission();
    await storage.clearAuth();
    await storage.removeLanguage();
    
    // Clear any remaining specific keys
    await AsyncStorage.removeItem('@jibni:driverBgTrackingEnabled');
    await AsyncStorage.removeItem('@jibni:activeMission');
    await AsyncStorage.removeItem('@jibni:token');
    await AsyncStorage.removeItem('@jibni:refreshToken');
    await AsyncStorage.removeItem('@jibni:user');
    await AsyncStorage.removeItem('@jibni:language');
    
    console.log('✅ All stored data cleared successfully');
    
    // Force app restart by reloading
    setTimeout(() => {
      // Reset all app state to initial values
      setActiveRide(null);
      setDriverLocation(null);
      setSelectedDestination(null);
      setIsSearchingDriver(false);
      setShowDriverSelection(false);
      setShowDriverNotFound(false);
      setAvailableDrivers([]);
      setCurrentScreen('login');
      setIsCheckingAuth(false);
      setIsBanned(false);
      
      console.log('🔄 App state reset to initial values');
    }, 100);
    
  } catch (error) {
    console.error('❌ Failed to clear stored data:', error);
  }
};

const updateRideRoute = useCallback(async (ride: any) => {
  if (!ride?.rideId || !ride?.pickupLocation || !ride?.destinationLocation) return;
  if (ride.polylineCoords?.length) return; // already hydrated

  try {
    const pickup: LocationCoord = {
      latitude: ride.pickupLocation.lat,
      longitude: ride.pickupLocation.lng,
    };
    const destination: LocationCoord = {
      latitude: ride.destinationLocation.lat,
      longitude: ride.destinationLocation.lng,
    };

    const route = await getRoadRoute(pickup, destination);
    const distanceKm = route.distance ? Number((route.distance / 1000).toFixed(2)) : 0;
    const etaMinutes = route.duration ? Math.max(1, Math.round(route.duration / 60)) : 0;

    setActiveRide((prev: any) => {
      if (!prev || prev.rideId !== ride.rideId) return prev;
      return {
        ...prev,
        routeMetrics: {
          distanceKm,
          etaMinutes,
        },
        polylineCoords: route.coordinates,
        encodedPolyline: route.encodedPolyline,
      };
    });
  } catch (error) {
    console.error('Failed to fetch Google route for ride:', ride?.rideId, error);
  }
}, [setActiveRide]);


useEffect(() => {
  if (!activeRide || !activeRide.pickupLocation || !activeRide.destinationLocation) return;
  if (activeRide.polylineCoords?.length) return;
  updateRideRoute(activeRide);
}, [activeRide, updateRideRoute]);

// Make clearAllStoredData available globally for testing
if (__DEV__) {
  (global as any).clearAllData = clearAllStoredData;
  console.log('🔧 DEBUG: clearAllData() available in console');
}

// Ride completion confirmation state
const [showCompletionConfirm, setShowCompletionConfirm] = useState(false);

// Rating modal state

const [showRatingModal, setShowRatingModal] = useState(false);

const [showRideCancelledBanner, setShowRideCancelledBanner] = useState(false);
const [rideCancelledBannerMessage, setRideCancelledBannerMessage] = useState<string | undefined>(undefined);
const rideCancelledBannerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

const [completedRideId, setCompletedRideId] = useState<string | null>(null);

const [driverName, setDriverName] = useState<string>('your driver');

const [driverId, setDriverId] = useState<string>('');



// Network connection state

const [isConnected, setIsConnected] = useState(true);

const [showOfflineScreen, setShowOfflineScreen] = useState(false);



// Load saved language on app start

useEffect(() => {

const loadLanguage = async () => {

try {

const savedLanguage = await storage.getLanguage();

if (savedLanguage && ['fr', 'en', 'ar'].includes(savedLanguage)) {

setSelectedLanguage(savedLanguage as 'fr' | 'en' | 'ar');

console.log('🌐 Loaded saved language:', savedLanguage);

}

} catch (error) {

console.error('Error loading language:', error);

}

};

loadLanguage();

}, []);


// Monitor network connection

useEffect(() => {

const unsubscribe = NetInfo.addEventListener((state) => {

const connected = state.isConnected ?? true;

console.log('🌐 Network state:', { connected, type: state.type });


if (!connected && isConnected) {

console.log('❌ Connection lost - showing offline screen');

setShowOfflineScreen(true);

} else if (connected && !isConnected) {

console.log('✅ Connection restored');

setShowOfflineScreen(false);

}


setIsConnected(connected);

});



NetInfo.fetch().then((state) => {

const connected = state.isConnected ?? true;

setIsConnected(connected);

setShowOfflineScreen(!connected);

});



return () => unsubscribe();

}, [isConnected]);



const handleRetryConnection = () => {

NetInfo.fetch().then((state) => {

if (state.isConnected) {

setShowOfflineScreen(false);

setIsConnected(true);

} else {

// Still offline - keep showing offline screen

Alert.alert(

selectedLanguage === 'ar' ? 'لا يوجد اتصال' :

selectedLanguage === 'fr' ? 'Pas de connexion' :

'No Connection',

selectedLanguage === 'ar' ? 'يرجى التحقق من إعدادات الشبكة' :

selectedLanguage === 'fr' ? 'Veuillez vérifier vos paramètets réseau' :

'Please check your network settings'

);

}

});

};



// Handle cancel ride (for active rides)

const resetRideState = useCallback(() => {
  setActiveRide(null);
  setDriverLocation(null);
  setSelectedDestination(null);
  setIsSearchingDriver(false);
  setShowDriverSelection(false);
  setShowDriverNotFound(false);
  setAvailableDrivers([]);
  setCompletedRideId(null);
  setShowRatingModal(false);
}, []);

const handleCancelRide = useCallback(() => {
  if (activeRide?.rideId && activeRide?.status && activeRide.status !== 'completed') {
    socketService.cancelRide(activeRide.rideId, 'Client cancelled');
  }
  resetRideState();
}, [activeRide, resetRideState]);

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

const getRideCancellationMessage = useCallback((cancelledBy?: string) => {
  const language = selectedLanguageRef.current;
  if (cancelledBy === 'driver') {
    return getTranslation('rideCancelledByDriver', language);
  }
  if (cancelledBy === 'client') {
    return getTranslation('rideCancelledByClient', language);
  }
  return getTranslation('rideCancelled', language);
}, []);



// Helper function to route based on user role

const routeBasedOnRole = async (skipPermissions: boolean = false) => {

const user = await storage.getUser();

if (user?.role === 'driver') {

setCurrentScreen('driver-home');

} else if (skipPermissions) {

setCurrentScreen('home');

} else {

setCurrentScreen('permissions');

}

};



// Check if user is already authenticated on app start

useEffect(() => {

const checkAuth = async () => {

try {

const token = await storage.getToken();

const user = await storage.getUser();


if (token && user) {

// Refresh user data FIRST to get updated role and ban status
let updatedUser = user; // Use cached user as fallback

try {

updatedUser = await api.getCurrentUser();

} catch (error) {

console.error('Failed to refresh user data:', error);

// Continue with cached user data instead of crashing

}


// Check if user is banned

if (updatedUser.banned) {

console.log('🚫 User is banned');

setIsBanned(true);

setCurrentScreen('banned');

setIsCheckingAuth(false);

return;

}


await storage.setUser(updatedUser);

console.log('✅ User data refreshed on app start, role:', updatedUser.role);

console.log('✅ User ID:', updatedUser._id);


// Now connect socket with updated role

await socketService.connect();

console.log('✅ Socket connected for user:', updatedUser._id, 'role:', updatedUser.role);

// Sync latest active mission from backend after socket connect
try {
  const mission = await api.getActiveMission();
  console.log('🧩 App restore: backend /missions/active:', mission?.missionId, mission?.status);

  if (mission) {
    const mappedStatus =
      mission.status === 'pending' ? 'searching_driver' :
      mission.status === 'accepted' ? 'driver_arriving' :
      mission.status === 'in_progress' ? 'ride_started' :
      mission.status === 'completed' ? 'ride_completed' :
      mission.status;

    // Restore UI for both client and driver based on role
    if (updatedUser.role !== 'driver') {
      setActiveRide({
        rideId: mission.rideId || mission.missionId,
        driverId: mission.driverId,
        driverPhone: mission.driverPhone,
        status: mappedStatus,
        pickupLocation: mission.pickupLocation,
        destinationLocation: mission.destinationLocation,
        pricing: mission.pricing,
        eta: mission.eta,
        distance: mission.distance,
      });
    }
    // Driver restoration is handled inside DriverHomeScreen on mount
  } else {
    await storage.clearActiveMission();
  }
} catch (e) {
  console.warn('⚠️ App restore: backend /missions/active failed:', e);
}


// Route based on updated role

if (updatedUser.role === 'driver') {

setCurrentScreen('driver-home');

} else {

setCurrentScreen('home');

}

} else {

// User not authenticated, go to language selection

setCurrentScreen('language');

}

} catch (error) {

console.error('Error checking auth:', error);

setCurrentScreen('language');

} finally {

setIsCheckingAuth(false);

}

};



checkAuth();

}, []);



// Listen for driver approval/rejection events

useEffect(() => {

// Set up socket listeners for driver approval/rejection

socketService.onDriverApproved(async (data) => {

console.log('🎉 Driver approved event received:', data);


// Update user data

try {

const updatedUser = await api.getCurrentUser();

await storage.setUser(updatedUser);

console.log('✅ User data updated after approval, role:', updatedUser.role);


// IMPORTANT: Disconnect and reconnect socket with new role

console.log('🔄 Reconnecting socket with driver role...');

socketService.disconnect();

await new Promise(resolve => setTimeout(resolve, 500));

await socketService.connect();

console.log('✅ Socket reconnected as driver');


// Show alert

Alert.alert(

'🎉 Congratulations!',

'Your driver request has been approved. You can now start accepting missions.',

[

{

text: 'OK',

onPress: () => {

// Navigate to driver home

setCurrentScreen('driver-home');

}

}

]

);

} catch (error) {

console.error('Error updating user after approval:', error);

}

});



socketService.onDriverRejected((data) => {

console.log('❌ Driver rejected event received:', data);


// Update user data to clear isDriverRequested

storage.getUser().then(async (user) => {

if (user) {

user.isDriverRequested = false;

await storage.setUser(user);

}

});


Alert.alert(

'Request Not Approved',

data.reason || 'Your driver request was not approved. Please contact support for more information.',

[{ text: 'OK' }]

);

});



return () => {

// Cleanup listeners when component unmounts

socketService.off('driver_approved');

socketService.off('driver_rejected');

};

}, []);



const handleSplashComplete = async () => {

if (!isCheckingAuth) {

const token = await storage.getToken();

const user = await storage.getUser();

if (token && user) {

// Route based on user role

await routeBasedOnRole(true);

} else {

setCurrentScreen('language');

}

}

};



const handleLanguageSelect = async (language: 'fr' | 'en' | 'ar') => {

setSelectedLanguage(language);

await storage.setLanguage(language);

console.log('Selected language:', language);

setCurrentScreen('login');

};



const handleSendOtp = async (phoneNumber: string) => {

setPhone(phoneNumber);

try {

const response = await api.sendOTP(phoneNumber);


// Check if user was authenticated directly (no OTP required)

if (response.status === 'success' && !response.requiresOTP && response.user && response.token && response.refreshToken) {

// Check if user is banned (check nested profile)

const isUserBanned = response.user.banned || response.user.profile?.banned;

if (isUserBanned) {

console.log('🚫 User is banned');

setIsBanned(true);

setCurrentScreen('banned');

return;

}


// User exists and is verified - authenticate directly

await storage.setToken(response.token);

await storage.setRefreshToken(response.refreshToken);

await storage.setUser(response.user);


Alert.alert('Success', 'Logged in successfully!');

// Route to appropriate screen based on role

await routeBasedOnRole(false);

} else {

// OTP required

Alert.alert('OTP Sent', response.message || 'Please check your phone for the verification code');

setCurrentScreen('verify-otp');

}

} catch (error: any) {

Alert.alert('Error', error.message || 'Failed to send OTP');

}

};



const handleVerifyOtp = async (code: string) => {

try {

const response = await api.verifyOTP(phone, code);


// Check if user is banned

if (response.user?.banned) {

console.log('🚫 User is banned');

setIsBanned(true);

setCurrentScreen('banned');

return;

}


// Store tokens and user data

await storage.setToken(response.token);

await storage.setRefreshToken(response.refreshToken);

await storage.setUser(response.user);


// Connect socket after successful login

await socketService.connect();


// Register FCM token after successful login

try {

const tokenData = await Notifications.getExpoPushTokenAsync({

projectId: 'f5594dc1-c2f6-41cc-8012-24fd342ac7d5',

});

await api.updateFCMToken(tokenData.data);

console.log('✅ FCM token registered after login');

} catch (fcmError) {

console.log('ℹ️ Could not register FCM token:', fcmError);

}

// Sync language preference to backend for push notifications
try {
  await api.updateProfile({ language: selectedLanguage });
  console.log('✅ Language preference synced to backend on login:', selectedLanguage);
} catch (error) {
  console.warn('⚠️ Failed to sync language to backend on login:', error);
}


Alert.alert('Success', 'OTP verified successfully!');

// Route based on user role

await routeBasedOnRole(false);

} catch (error: any) {

// Show actual error - don't bypass authentication

console.error('OTP verification failed:', error);

Alert.alert('Error', error.message || 'Invalid OTP. Please try again.');

}

};



const handlePermissionsContinue = async () => {

// Route based on user role after permissions

await routeBasedOnRole(true);

};


// Listen for socket events (driver acceptance, etc.)

useEffect(() => {

console.log('🔌🔌🔌 CLIENT APP: Setting up socket listeners...');

console.log('🔌 CLIENT APP: Socket connected:', socketService.isConnected());


// Listen for socket connect/disconnect events

socketService.on('connect', () => {

console.log('🔌🔌🔌 CLIENT APP: Socket CONNECTED!');

});

socketService.on('disconnect', (reason) => {

console.log('🔌🔌🔌 CLIENT APP: Socket DISCONNECTED:', reason);

});


// Use callbacks from socket service to ensure we don't miss events

socketService.onDriverFound((data) => {

console.log('🎯 CLIENT: Driver found callback:', JSON.stringify(data, null, 2));

console.log('🎯 CLIENT: Current activeRide:', activeRide);

console.log('🎯 CLIENT: Current currentScreen:', currentScreen);


// Validate data

if (!data || !data.rideId) {

console.error('Invalid driver_found data:', data);

return;

}

setIsSearchingDriver(false);

setShowDriverSelection(false);

const newActiveRide = {

rideId: data.rideId,

driverId: data.driverId,

driverPhone: data.driverPhone,

status: 'accepted',

pickupLocation: data.pickupLocation || { lat: 0, lng: 0, address: '' },

destinationLocation: data.destinationLocation || { lat: 0, lng: 0, address: '' },

pricing: data.pricing,

eta: data.eta,

distance: data.distance,

};

console.log('🎯 Setting activeRide:', newActiveRide);

setActiveRide(newActiveRide);

console.log('🎯 CLIENT APP: Joining ride room:', data.rideId);

socketService.joinRideRoom(data.rideId);

console.log('🎯 CLIENT APP: Joined ride room:', data.rideId);

// UI updates automatically - no alert needed

});



socketService.onDriverLocationUpdate((data) => {

console.log('🎯 CLIENT: Driver location update callback:', data);

if (data && data.location) {

setDriverLocation({

lat: data.location.lat,

lng: data.location.lng,

});

}

});


// Note: ride_started is handled by the direct socket.on listener below (line ~306)

// which properly updates eta, distance, and status


socketService.onRideCompleted((data) => {

console.log('🎯 CLIENT: Ride completed callback:', data);

// Update ride status to show completion UI (keep activeRide to show success screen)

setActiveRide((prev: any) => {

if (prev) {

// Store ride info for rating

setCompletedRideId(prev.rideId);

setDriverName(prev.driverName || 'your driver');

setDriverId(prev.driverId || '');

// Show rating modal after a short delay to let user see success screen

setTimeout(() => {

setShowRatingModal(true);

}, 1500);

return { ...prev, status: 'completed' };

}

return null;

});

setDriverLocation(null);

});


socketService.onDriverArrived((data) => {

console.log('🎯 CLIENT: Driver arrived callback:', data);

if (!data?.rideId) {
  console.error('❌ Invalid driver_arrived data - missing rideId');
  return;
}

setActiveRide((prev: any) => {
  if (!prev) {
    console.warn('⚠️ No active ride to update');
    return null;
  }
  
  if (prev.rideId !== data.rideId) {
    console.warn('⚠️ Ride ID mismatch:', prev.rideId, 'vs', data.rideId);
    return prev;
  }
  
  console.log('✅ CLIENT: Updating ride status to driver_arrived for ride:', data.rideId);
  return { ...prev, status: 'driver_arrived' };
});

// UI updates automatically - no alert needed

});


// Listen for driver requesting ride completion confirmation
socketService.onCompletionRequest((data) => {
  console.log('🏁 CLIENT: Driver requested ride completion confirmation:', data);
  setShowCompletionConfirm(true);
});

socketService.onRideCancelledByDriver((data) => {
  console.log('🚫 CLIENT: Driver cancelled ride callback:', data);

  if (data?.rideId) {
    socketService.leaveRideRoom(data.rideId);
  }

  setActiveRide((prev: any) => {
    if (!prev) return null;
    if (data?.rideId && prev.rideId !== data.rideId) {
      return prev;
    }
    return null;
  });

  setDriverLocation(null);
  setIsSearchingDriver(false);
  setShowDriverSelection(false);
  setShowDriverNotFound(false);
  setSelectedDestination(null);

  showRideCancelledBannerMessage(getRideCancellationMessage('driver'));
});

socketService.onRideCancelled((data: any) => {
  console.log('🚫 CLIENT: Generic ride_cancelled event received:', data);
  
  if (data?.rideId) {
    socketService.leaveRideRoom(data.rideId);
  }

  // Reset state if it matches the current ride
  setActiveRide((prev: any) => {
    if (!prev) return null;
    if (data?.rideId && prev.rideId !== data.rideId) {
      return prev;
    }
    return null;
  });

  setDriverLocation(null);
  setIsSearchingDriver(false);
  setShowDriverSelection(false);
  setShowDriverNotFound(false);
  setSelectedDestination(null);
  
  showRideCancelledBannerMessage(getRideCancellationMessage(data?.cancelledBy));

  // Show notification if it was cancelled by driver
  if (data.cancelledBy === 'driver') {
    const notificationContent = getNotificationContent('rideCancelledByDriver', selectedLanguage as Language);
    Notifications.scheduleNotificationAsync({
      content: {
        title: notificationContent.title,
        body: notificationContent.body,
        sound: true,
        data: { type: 'ride_cancelled_by_driver', rideId: data?.rideId },
      },
      trigger: null,
    }).catch(err => console.warn(err));
  }
});

socketService.onRidePricingUpdated((data: any) => {
  console.log('🎯 CLIENT: ride_pricing_updated received:', data);
  if (!data?.rideId || !data?.pricing) return;
  setActiveRide((prev: any) => {
    if (!prev) return prev;
    if (prev.rideId !== data.rideId) return prev;
    return { ...prev, pricing: data.pricing };
  });
});

// Note: ride_started is handled by the direct socket.on listener below (line ~306)

// which properly updates eta, distance, and status


// Listen for ride started (driver picked up client, going to destination)

console.log('🔌 CLIENT APP: Registering ride_started callback...');

socketService.onRideStarted((data) => {

console.log('🎉🎉🎉 CLIENT APP: ride_started EVENT RECEIVED! 🎉🎉🎉');

console.log('🎉 CLIENT APP: Raw data:', data);


// Update the active ride with new data from server (UI updates automatically)

setActiveRide((prev: any) => {

if (!prev) {

console.log('🎉 CLIENT: No prev activeRide, cannot update');

return null;

}


// Deep merge to ensure new data is properly set

const updated = {

...prev,

status: 'in_progress',

pickupLocation: data.pickupLocation || prev.pickupLocation,

destinationLocation: data.destinationLocation || prev.destinationLocation,

pricing: data.pricing || prev.pricing,

eta: {

...prev.eta,

...data.eta,

},

distance: {

...prev.distance,

...data.distance,

},

};


console.log('🎉 CLIENT: Updating activeRide with:', {

oldEta: prev.eta,

newEta: data.eta,

oldDistance: prev.distance,

newDistance: data.distance,

finalEta: updated.eta,

finalDistance: updated.distance,

});


return updated;

});

});


// Note: ride_completed and driver_arrived are handled by callback methods above

// No alerts needed - UI updates automatically


return () => {

// Note: We don't need to manually off() the event listeners here

// as they're managed by the socket service

console.log('🔌 CLIENT APP: Cleaning up socket listeners');

};

}, []);



const handlePermissionsBack = () => {

setCurrentScreen('verify-otp');

};



const handleSelectAddress = () => {

setCurrentScreen('address-autocomplete');

};



const [selectedDestination, setSelectedDestination] = useState<{ lat: number; lng: number; placeDescription: string } | null>(null);

const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);



const [isSearchingDriver, setIsSearchingDriver] = useState(false);

const [showDriverSelection, setShowDriverSelection] = useState(false);

const [showDriverNotFound, setShowDriverNotFound] = useState(false);

const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);



const handleAddressSelected = async (

destination: { lat: number; lng: number; placeDescription: string },

) => {

console.log('Destination selected:', destination);

setSelectedDestination(destination);

setIsSearchingDriver(true);

setCurrentScreen('home');



// Fetch available drivers from backend

try {

// First, get user's current location for pickup

const { status } = await Location.requestForegroundPermissionsAsync();

let userLocation = { lat: destination.lat, lng: destination.lng }; // Default to destination if no permission

let pickupAddress = destination.placeDescription;



if (status === 'granted') {

const currentLocation = await Location.getCurrentPositionAsync({

accuracy: Location.Accuracy.Balanced,

});

userLocation = {

lat: currentLocation.coords.latitude,

lng: currentLocation.coords.longitude,

};

pickupAddress = 'Current Location';

}



// Store pickup location for DriverSelection

setPickupLocation({

lat: userLocation.lat,

lng: userLocation.lng,

address: pickupAddress,

});



// STEP 1 & 2: Fetch real distance from Google Directions API and log for verification

const clientCoord: LocationCoord = { latitude: userLocation.lat, longitude: userLocation.lng };

const destCoord: LocationCoord = { latitude: destination.lat, longitude: destination.lng };

const googleResult = await fetchGoogleDirectionsAndLog(clientCoord, destCoord, 'Client to destination');

if (googleResult) {

// Store polyline for later (STEP 5 - driver movement preparation)

// googleResult.coordinates can be used for route display and driver animation

}



console.log('Fetching drivers near:', userLocation);

console.log('Going to destination:', destination);



// ✅ Format destination for API call

const destinationLocationFormatted = {

lat: destination.lat,

lng: destination.lng,

address: destination.placeDescription,

};



// ✅ Fetch drivers from backend WITH destination for accurate pricing

// Default vehicle type is 'car' - removed vehicle selector for simplicity

const response = await api.getAvailableDrivers(

userLocation,

destinationLocationFormatted, // ✅ Pass destination

'car' // Default vehicle type

);

console.log('Available drivers response:', response);



// Extract drivers array from response

const drivers = response?.data || [];

console.log('Drivers array:', drivers);



setAvailableDrivers(drivers);

setIsSearchingDriver(false);



if (drivers.length > 0) {

setShowDriverSelection(true);

} else {

setShowDriverNotFound(true);

}

} catch (error: any) {

console.error('Error fetching drivers:', error);

setIsSearchingDriver(false);

Alert.alert('Error', error.message || 'Failed to find drivers');

}

};



const handleCancelSearchingDriver = () => {

setIsSearchingDriver(false);

setShowDriverSelection(false);

setShowDriverNotFound(false);

setSelectedDestination(null);

setAvailableDrivers([]);

};



const handleSelectDriver = (driverId: string) => {

console.log('Selected driver:', driverId);

// Close DriverSelection modal - the activeRide state will show the tracking UI

setShowDriverSelection(false);

setIsSearchingDriver(false);

};



const handleCancelRequest = () => {

console.log('Request cancelled');

// Allow user to select another driver

};



const handleConfirmArrival = () => {

console.log('Driver arrival confirmed');

setShowDriverSelection(false);

const title = selectedLanguage === 'ar' ? 'تم تأكيد الوصول! ✅' :

selectedLanguage === 'fr' ? 'Arrivée confirmée ! ✅' :

'Arrival Confirmed! ✅';

const message = selectedLanguage === 'ar' ? 'تم إكمال عملية السحب بنجاح' :

selectedLanguage === 'fr' ? 'Le remorquage a été effectué avec succès' :

'Towing completed successfully';

Alert.alert(title, message, [{ text: 'OK' }]);

};



// Demo: Simulate finding drivers after 5 seconds (remove in production)

useEffect(() => {

if (isSearchingDriver && __DEV__) {

const timer = setTimeout(() => {

console.log('🚗 Demo: Drivers found!');

setIsSearchingDriver(false);

setShowDriverSelection(true);

}, 5000);

return () => clearTimeout(timer);

}

}, [isSearchingDriver]);



const handleAddressBack = () => {

setCurrentScreen('home');

};



const handleBecomeDriver = () => {

setCurrentScreen('become-driver');

};



const handleProfile = () => {

setCurrentScreen('profile');

};



const handleLogout = async () => {

// Disconnect socket

socketService.disconnect();

// Clear storage

await storage.clear();

setCurrentScreen('language');

};



const handleBecomeDriverSuccess = async () => {

// After becoming driver, user is still a client until admin approves

// So route to home screen

setCurrentScreen('home');

};



const handleResendOtp = async () => {

try {

const response = await api.sendOTP(phone);

Alert.alert('OTP Resent', response.message || 'Please check your phone for the verification code');

} catch (error: any) {

Alert.alert('Error', error.message || 'Failed to resend OTP');

}

};



const handleBack = () => {

setCurrentScreen('login');

};



// Notification setup

const notificationListener = useRef<any>(null);

const responseListener = useRef<any>(null);



useEffect(() => {

// Request notification permissions

const requestPermissions = async () => {

try {

const { status: existingStatus } = await Notifications.getPermissionsAsync();

let finalStatus = existingStatus;


if (existingStatus !== 'granted') {

const { status } = await Notifications.requestPermissionsAsync();

finalStatus = status;

}


if (finalStatus !== 'granted') {

console.log('❌ Notification permission not granted');

return;

}


console.log('✅ Notification permission granted');



// Configure notification channels for Android

if (Platform.OS === 'android') {

// Default channel

await Notifications.setNotificationChannelAsync('default', {

name: 'Default',

importance: Notifications.AndroidImportance.MAX,

vibrationPattern: [0, 250, 250, 250],

lightColor: '#FF231F7C',

sound: 'default',

});


// Ride requests channel (for drivers receiving ride requests)

await Notifications.setNotificationChannelAsync('ride-requests', {

name: 'Ride Requests',

importance: Notifications.AndroidImportance.HIGH,

vibrationPattern: [0, 250, 250, 250],

lightColor: '#185ADC',

sound: 'default',

});


// Ride updates channel (for clients receiving ride status updates)

await Notifications.setNotificationChannelAsync('ride-updates', {

name: 'Ride Updates',

importance: Notifications.AndroidImportance.HIGH,

vibrationPattern: [0, 250, 250, 250],

lightColor: '#22C55E',

sound: 'default',

});


console.log('✅ Notification channels created: default, ride-requests, ride-updates');

}



// Get push token (FCM for production builds)

try {

// Get FCM token for production builds with Firebase
const token = await Notifications.getExpoPushTokenAsync({
  projectId: 'f5594dc1-c2f6-41cc-8012-24fd342ac7d5', // Your EAS project ID
});

console.log('✅ FCM Push token:', token.data);

// Log platform-specific info for debugging
if (Platform.OS === 'ios') {
  console.log('🍎 iOS push token setup complete');
  console.log('📱 Bundle ID:', 'com.nabilhcm29.MyNewApp');
} else {
  console.log('🤖 Android push token setup complete');
}


// Send token to backend

try {

await api.updateFCMToken(token.data);

console.log('✅ FCM token saved to backend');

} catch (error) {

console.warn('⚠️ Failed to save FCM token to backend:', error);

}

} catch (error: any) {

console.log('ℹ️ FCM token not available:', error.message);

console.log('💡 Make sure google-services.json is properly configured');

}

} catch (error) {

console.error('Error setting up notifications:', error);

}

};



requestPermissions();



// Listen for notifications received while app is in foreground

notificationListener.current = Notifications.addNotificationReceivedListener(notification => {

console.log('Notification received:', notification);

const data = notification.request.content.data;


// Show alert for driver approval/rejection when app is in foreground

if (data?.type === 'driver_approved') {

// Refresh user data when approval notification is received

const refreshUserData = async () => {

try {

const updatedUser = await api.getCurrentUser();

await storage.setUser(updatedUser);

console.log('✅ User data refreshed, new role:', updatedUser.role);

// Route based on updated role

if (updatedUser.role === 'driver') {

setCurrentScreen('driver-home');

}

} catch (error) {

console.error('Error refreshing user data:', error);

}

};



Alert.alert(

notification.request.content.title || 'Driver Request Approved!',

notification.request.content.body || 'Congratulations! Your driver request has been approved.',

[{ text: 'OK', onPress: refreshUserData }]

);

} else if (data?.type === 'driver_rejected') {

Alert.alert(

notification.request.content.title || 'Driver Request Update',

notification.request.content.body || 'Your driver request was not approved.',

[{ text: 'OK' }]

);

}

});



// Listen for user tapping on notification

responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {

console.log('Notification tapped:', response);

const data = response.notification.request.content.data;


// Handle navigation based on notification data

if (data?.screen) {

setCurrentScreen(data.screen as Screen);

}


// Handle driver approval notification

if (data?.type === 'driver_approved') {

// Refresh user data from backend to get updated role

const refreshUserData = async () => {

try {

const updatedUser = await api.getCurrentUser();

await storage.setUser(updatedUser);

console.log('✅ User data refreshed, new role:', updatedUser.role);

// Route based on updated role

if (updatedUser.role === 'driver') {

setCurrentScreen('driver-home');

} else {

setCurrentScreen('home');

}

} catch (error) {

console.error('Error refreshing user data:', error);

// Fallback: just navigate to home

setCurrentScreen('home');

}

};



Alert.alert(

'Driver Request Approved!',

'Congratulations! Your driver request has been approved. You can now start accepting missions.',

[{ text: 'OK', onPress: refreshUserData }]

);

}


// Handle driver rejection notification

if (data?.type === 'driver_rejected') {

const reason = typeof data.reason === 'string' ? data.reason : 'Your driver request was not approved. Please contact support for more information.';

Alert.alert(

'Driver Request Update',

reason,

[{ text: 'OK', onPress: () => setCurrentScreen('become-driver') }]

);

}

});



return () => {

// Clean up listeners

if (notificationListener.current) {

notificationListener.current.remove();

}

if (responseListener.current) {

responseListener.current.remove();

}

};

}, []);



// Render current screen

let screenComponent = null;

useEffect(() => {
  selectedLanguageRef.current = selectedLanguage;
}, [selectedLanguage]);

if (!fontsLoaded && !fontError) {
  screenComponent = <SplashScreenComponent onComplete={() => {}} />;
} else if (currentScreen === 'splash' || isCheckingAuth) {

screenComponent = <SplashScreenComponent onComplete={handleSplashComplete} />;

} else if (currentScreen === 'language') {

screenComponent = <SelectLanguageScreen onLanguageSelect={handleLanguageSelect} />;

} else if (currentScreen === 'login') {

screenComponent = <LoginScreen onSendOtp={handleSendOtp} />;

} else if (currentScreen === 'verify-otp') {

screenComponent = (

<VerifyOtpScreen

phone={phone}

onVerifyOtp={handleVerifyOtp}

onResendOtp={handleResendOtp}

onBack={handleBack}

/>

);

} else if (currentScreen === 'permissions') {

screenComponent = (

<PermissionsScreen

onContinue={handlePermissionsContinue}

onBack={handlePermissionsBack}

/>

);

} else if (currentScreen === 'home') {

screenComponent = (

<HomeScreen

onSelectAddress={handleSelectAddress}

onBecomeDriver={handleBecomeDriver}

onProfile={handleProfile}

onCancelRide={handleCancelRide}

activeRide={activeRide}

driverLocation={driverLocation}

language={selectedLanguage}

/>

);

} else if (currentScreen === 'address-autocomplete') {

screenComponent = (

<AddressAutocompleteScreen

onSelect={handleAddressSelected}

onBack={handleAddressBack}

language={selectedLanguage}

/>

);

} else if (currentScreen === 'profile') {

screenComponent = (

<ProfileScreen

onBack={async () => {

// Route back based on user role

await routeBasedOnRole(true);

}}

onLogout={handleLogout}

/>

);

} else if (currentScreen === 'become-driver') {

screenComponent = (

<BecomeDriverScreen

onBack={() => setCurrentScreen('home')}

onSuccess={handleBecomeDriverSuccess}

onViewTerms={() => setCurrentScreen('terms')}

 />

);

} else if (currentScreen === 'terms') {

screenComponent = (

<TermsScreen

onBack={() => setCurrentScreen('become-driver')}

 />

);

} else if (currentScreen === 'driver-home') {

screenComponent = (

<DriverHomeScreen

onLogout={handleLogout}

language={selectedLanguage}

/>

);

} else if (currentScreen === 'banned') {

screenComponent = (

<BannedScreen

language={selectedLanguage}

phoneNumber="+213540619106"

onContactSupport={() => {

storage.clearAuth();

}}

/>

);

}



return (

<LanguageProvider initialLanguage={selectedLanguage}>

<ThemeProvider>

<ErrorBoundary>

<View style={{ flex: 1 }}>

<RideCancelledBanner
  visible={showRideCancelledBanner}
  language={selectedLanguage}
  message={rideCancelledBannerMessage}
  onDismiss={dismissRideCancelledBanner}
/>

{screenComponent}


{/* Searching for Driver Overlay */}

<SearchingForDriver

visible={isSearchingDriver}

onCancel={handleCancelSearchingDriver}

language={selectedLanguage}

/>


{/* Driver Selection Overlay */}

<DriverSelection

visible={showDriverSelection}

drivers={availableDrivers}

pickupLocation={pickupLocation || {

lat: selectedDestination?.lat || 0,

lng: selectedDestination?.lng || 0,

address: 'Current Location'

}}

destinationLocation={{

lat: selectedDestination?.lat || 0,

lng: selectedDestination?.lng || 0,

address: selectedDestination?.placeDescription || ''

}}

onSelectDriver={handleSelectDriver}

onCancel={handleCancelSearchingDriver}

language={selectedLanguage}

/>



{/* Driver NotFound Overlay */}

<DriverNotFound

visible={showDriverNotFound}

onClose={() => setShowDriverNotFound(false)}

onTryAgain={() => {

setShowDriverNotFound(false);

// Retry fetching drivers

if (selectedDestination) {

setIsSearchingDriver(true);

handleAddressSelected(selectedDestination);

}

}}

language={selectedLanguage}

/>



{/* Offline Screen - Shows when no internet connection */}

{showOfflineScreen && (

<View style={styles.offlineOverlay}>

<OfflineScreen

language={selectedLanguage}

onRetry={handleRetryConnection}

/>

</View>

)}



{/* Ride Completion Confirmation Modal - Shows when driver requests completion */}
<RideCompletionConfirmModal
  visible={showCompletionConfirm}
  onConfirm={() => {
    setShowCompletionConfirm(false);
    if (activeRide?.rideId) {
      console.log('✅ CLIENT: Confirming ride completion:', activeRide.rideId);
      socketService.confirmCompleteRide(activeRide.rideId);
    }
  }}
  onDeny={() => {
    setShowCompletionConfirm(false);
    if (activeRide?.rideId) {
      console.log('❌ CLIENT: Denying ride completion:', activeRide.rideId);
      socketService.denyCompleteRide(activeRide.rideId);
    }
  }}
  language={selectedLanguage}
  rideData={activeRide ? {
    destinationAddress: activeRide.destinationLocation?.address,
    price: activeRide.pricing?.totalPrice,
  } : null}
/>

{/* Rating Modal - Shows after ride completion */}

<RatingModal

visible={showRatingModal}

onClose={() => {

setShowRatingModal(false);

setCompletedRideId(null);

setDriverId('');

}}

onSubmit={async (rating, comment) => {

try {

if (completedRideId) {

await api.rateDriver(completedRideId, rating, comment);

console.log('✅ Rating submitted successfully');

}

} catch (error) {

console.error('❌ Failed to submit rating:', error);

} finally {

setShowRatingModal(false);

setCompletedRideId(null);

setDriverId('');

}

}}

driverName={driverName}

driverId={driverId}

rideId={completedRideId || undefined}

/>

</View>

</ErrorBoundary>

</ThemeProvider>

</LanguageProvider>

);

}



const styles = StyleSheet.create({

offlineOverlay: {

position: 'absolute',

top: 0,

left: 0,

right: 0,

bottom: 0,

backgroundColor: 'white',

zIndex: 999999,

},

});