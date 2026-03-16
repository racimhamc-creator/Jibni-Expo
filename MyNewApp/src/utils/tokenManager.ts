import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from '../services/api';

export async function getAndRegisterToken(): Promise<string | null> {
  try {
    const isProduction = !Constants.appOwnership || Constants.appOwnership === 'standalone';
    let token: string | null = null;

    if (isProduction && Platform.OS === 'android') {
      try {
        const messaging = require('@react-native-firebase/messaging').default;
        const fcmToken = await messaging().getToken();
        token = fcmToken;
        console.log('🔥 Firebase FCM token generated:', fcmToken.substring(0, 30) + '...');
      } catch (firebaseError) {
        console.log('⚠️ Firebase not available, falling back to Expo token');
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: 'f5594dc1-c2f6-41cc-8012-24fd342ac7d5',
        });
        token = tokenData.data;
        console.log('📱 Expo Push token generated:', token.substring(0, 30) + '...');
      }
    } else {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'f5594dc1-c2f6-41cc-8012-24fd342ac7d5',
      });
      token = tokenData.data;
      console.log('📱 Expo Push token generated:', token.substring(0, 30) + '...');
    }

    if (token) {
      await api.updateFCMToken(token);
      console.log('✅ Token registered with backend');
    }

    return token;
  } catch (error) {
    console.error('❌ Error generating/registering token:', error);
    return null;
  }
}

export function getTokenType(): string {
  const isProduction = !Constants.appOwnership || Constants.appOwnership === 'standalone';
  return isProduction && Platform.OS === 'android' ? 'Firebase' : 'Expo';
}
