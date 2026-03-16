import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from '../services/api';

export async function getAndRegisterToken(): Promise<string | null> {
  try {
    const isProduction = !Constants.appOwnership || Constants.appOwnership === 'standalone';
    let token: string | null = null;

    if (isProduction) {
      // PRODUCTION: Use native Firebase FCM for both Android and iOS
      try {
        const messaging = require('@react-native-firebase/messaging').default;
        const fcmToken = await messaging().getToken();
        token = fcmToken;
        console.log('🔥 Firebase FCM token generated:', fcmToken.substring(0, 30) + '...');
        console.log('📱 Platform:', Platform.OS);
      } catch (firebaseError) {
        console.log('⚠️ Firebase not available on', Platform.os, ', falling back to Expo token');
        console.log('Firebase error:', firebaseError);
        // Fallback to Expo push token only if Firebase fails
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: 'f5594dc1-c2f6-41cc-8012-24fd342ac7d5',
        });
        token = tokenData.data;
        console.log('📱 Expo Push token (fallback):', token.substring(0, 30) + '...');
      }
    } else {
      // DEVELOPMENT: Use Expo Push Token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'f5594dc1-c2f6-41cc-8012-24fd342ac7d5',
      });
      token = tokenData.data;
      console.log('📱 Expo Push token (dev mode):', token.substring(0, 30) + '...');
    }

    if (token) {
      try {
        await api.updateFCMToken(token);
        console.log('✅ Token registered with backend');
      } catch (apiError) {
        console.log('ℹ️ Token registration skipped (user not logged in):', apiError instanceof Error ? apiError.message : 'Unknown error');
        // Don't throw - token registration should fail silently for non-logged-in users
      }
    }

    return token;
  } catch (error) {
    console.error('❌ Error generating/registering token:', error);
    return null;
  }
}

export function getTokenType(): string {
  const isProduction = !Constants.appOwnership || Constants.appOwnership === 'standalone';
  if (isProduction) {
    return 'Firebase FCM';
  }
  return 'Expo (dev mode)';
}