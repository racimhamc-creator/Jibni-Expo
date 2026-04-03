import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from '../services/api';

// Firebase initialization state - COMMENTED OUT FOR DEBUGGING
/*
let firebaseInitialized = false;
let firebaseInitializationAttempted = false;

// Safe Firebase initialization - should be called at app startup
export async function initializeFirebase(): Promise<boolean> {
  if (firebaseInitialized || firebaseInitializationAttempted) {
    return firebaseInitialized;
  }
  
  firebaseInitializationAttempted = true;
  
  try {
    // Try to initialize Firebase
    const firebaseApp = require('firebase/app').default;
    
    // Check if already initialized
    if (!firebaseApp.apps.length) {
      // Firebase app already initialized or needs config
      console.log('🔔 Firebase: Checking initialization status');
    }
    
    firebaseInitialized = true;
    console.log('✅ Firebase: Initialized successfully');
    return true;
  } catch (error) {
    console.log('⚠️ Firebase: Initialization skipped (module not available):', error instanceof Error ? error.message : 'Unknown');
    firebaseInitialized = false;
    return false;
  }
}
*/

// Check if running in production/standalone mode
function isProductionMode(): boolean {
  const appOwnership = Constants.appOwnership;
  return !appOwnership || appOwnership === 'standalone';
}

// Safe FCM token getter - ALWAYS use Firebase FCM on iOS - COMMENTED OUT FOR DEBUGGING
/*
export async function getAndRegisterToken(): Promise<string | null> {
  console.log('🔔 TokenManager: Starting token registration...');
  console.log('🔔 TokenManager: Platform:', Platform.OS);
  console.log('🔔 TokenManager: Is production:', isProductionMode());
  
  let token: string | null = null;
  
  try {
    // ALWAYS try Firebase FCM first on iOS (both production and development)
    if (Platform.OS === 'ios') {
      console.log('🔔 TokenManager: iOS detected - attempting Firebase FCM...');
      
      try {
        const messaging = require('@react-native-firebase/messaging').default;
        const fcmToken = await messaging().getToken();
        
        if (fcmToken) {
          token = fcmToken;
          console.log('✅ TokenManager: Firebase FCM token obtained (iOS):', fcmToken.substring(0, 20) + '...');
        }
      } catch (firebaseError) {
        console.log('⚠️ TokenManager: Firebase FCM failed on iOS:', firebaseError instanceof Error ? firebaseError.message : 'Unknown');
        console.log('🔔 TokenManager: Falling back to Expo Push Token...');
        
        // Fallback to Expo Push Token
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: 'f5594dc1-c2f6-41cc-8012-24fd342ac7d5',
        });
        token = tokenData.data;
        console.log('✅ TokenManager: Expo Push Token (fallback):', token.substring(0, 20) + '...');
      }
    } else if (isProductionMode()) {
      // ANDROID PRODUCTION: Try Firebase FCM first, fallback to Expo
      console.log('🔔 TokenManager: Android production - attempting Firebase FCM...');
      
      try {
        const messaging = require('@react-native-firebase/messaging').default;
        const fcmToken = await messaging().getToken();
        
        if (fcmToken) {
          token = fcmToken;
          console.log('✅ TokenManager: Firebase FCM token obtained (Android):', fcmToken.substring(0, 20) + '...');
        }
      } catch (firebaseError) {
        console.log('⚠️ TokenManager: Firebase FCM failed on Android:', firebaseError instanceof Error ? firebaseError.message : 'Unknown');
        console.log('🔔 TokenManager: Falling back to Expo Push Token...');
        
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: 'f5594dc1-c2f6-41cc-8012-24fd342ac7d5',
        });
        token = tokenData.data;
        console.log('✅ TokenManager: Expo Push Token (fallback):', token.substring(0, 20) + '...');
      }
    } else {
      // ANDROID DEVELOPMENT: Use Expo Push Token only
      console.log('🔔 TokenManager: Android dev mode - using Expo Push Token...');
      
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'f5594dc1-c2f6-41cc-8012-24fd342ac7d5',
      });
      token = tokenData.data;
      console.log('✅ TokenManager: Expo Push Token (dev):', token.substring(0, 20) + '...');
    }
    
    // Register token with backend if available
    if (token) {
      try {
        await api.updateFCMToken(token);
        console.log('✅ TokenManager: Token registered with backend');
      } catch (apiError) {
        console.log('ℹ️ TokenManager: Token registration skipped (user not logged in):', apiError instanceof Error ? apiError.message : 'Unknown');
        // This is NOT an error - user is just not logged in yet
      }
    }
    
    console.log('🔔 TokenManager: Token registration complete, token:', token ? 'YES' : 'NO');
    return token;
    
  } catch (error) {
    console.error('❌ TokenManager: Critical error getting token:', error instanceof Error ? error.message : 'Unknown');
    console.log('🔔 TokenManager: Returning null - app will work without push notifications');
    return null; // Return null instead of throwing - DON'T CRASH
  }
}

// Get token type for display
export function getTokenType(): string {
  const isProduction = isProductionMode();
  if (isProduction) {
    return 'Firebase FCM (with Expo fallback)';
  }
  return 'Expo (dev mode)';
}

// Check if Firebase is available (for other parts of the app)
export function isFirebaseAvailable(): boolean {
  return firebaseInitialized;
}
*/

// DEBUGGING VERSION - No Firebase, no API calls at startup
export async function getAndRegisterToken(): Promise<string | null> {
  console.log('🔔 TokenManager: DEBUG MODE - No token registration');
  return null;
}

export function getTokenType(): string {
  return 'DEBUG MODE (no Firebase)';
}

export function isFirebaseAvailable(): boolean {
  return false;
}

export async function initializeFirebase(): Promise<boolean> {
  console.log('🔔 Firebase: DEBUG MODE - Disabled');
  return false;
}