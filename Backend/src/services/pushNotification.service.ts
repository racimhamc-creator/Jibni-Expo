import { Expo } from 'expo-server-sdk';
import { Profile } from '../models/Profile.js';
import admin from 'firebase-admin';

// Initialize Expo SDK
const expo = new Expo();

// Initialize Firebase Admin SDK for FCM
let firebaseInitialized = false;
try {
  // Check if Firebase is already initialized
  if (!admin.apps.length) {
    const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    
    if (serviceAccountJson) {
      // Parse the JSON from environment variable
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin SDK initialized from env var');
      firebaseInitialized = true;
    } else {
      console.log('⚠️ GOOGLE_APPLICATION_CREDENTIALS_JSON not set');
      console.log('💡 For FCM push notifications:');
      console.log('   1. Go to Firebase Console → Project Settings → Service Accounts');
      console.log('   2. Generate new private key');
      console.log('   3. Add to Railway as GOOGLE_APPLICATION_CREDENTIALS_JSON');
    }
  } else {
    firebaseInitialized = true;
  }
} catch (error) {
  console.warn('⚠️ Firebase Admin SDK initialization failed:', error);
}

// Your Expo project credentials
const EXPO_OWNER = process.env.EXPO_OWNER || 'nabilhcm29';
const EXPO_SLUG = process.env.EXPO_SLUG || 'MyNewApp';
const EXPERIENCE_ID = `@${EXPO_OWNER}/${EXPO_SLUG}`;

interface PushMessage {
  title: string;
  body: string;
  sound?: string; // ✅ FIXED: Add sound property
  data?: Record<string, any>;
}

/**
 * Check if token is an Expo push token
 */
function isExpoToken(token: string): boolean {
  return Expo.isExpoPushToken(token);
}

/**
 * Check if token is a native FCM token (not Expo)
 */
function isNativeFCMToken(token: string): boolean {
  // Native FCM tokens are long strings (typically 152+ chars)
  // They don't start with ExponentPushToken or ExpoPushToken
  return token.length > 100 && 
         !token.startsWith('ExponentPushToken') && 
         !token.startsWith('ExpoPushToken');
}

export class PushNotificationService {
  /**
   * Send push notification using Firebase Admin SDK (for native FCM tokens)
   */
  private static async sendFCM(
    token: string,
    message: PushMessage,
    channelId: string
  ): Promise<void> {
    if (!firebaseInitialized) {
      console.warn('⚠️ Firebase Admin not initialized, skipping FCM send');
      return;
    }

    try {
      const payload = {
        token: token,
        notification: {
          title: message.title,
          body: message.body,
          sound: message.sound || 'default', // ✅ FIXED: Use sound from message
        },
        data: message.data || {},
        android: {
          notification: {
            channelId: channelId,
            priority: 'high' as const,
            sound: message.sound || 'default', // ✅ FIXED: Use sound from message
          },
        },
      };

      const response = await admin.messaging().send(payload);
      console.log('✅ FCM notification sent:', response);
    } catch (error: any) {
      console.error('❌ FCM send error:', error);
      throw error;
    }
  }

  /**
   * Send push notification using Expo SDK (for Expo tokens)
   */
  private static async sendExpo(
    token: string,
    message: PushMessage,
    channelId: string
  ): Promise<void> {
    const notification: any = {
      to: token,
      sound: message.sound || 'default', // ✅ FIXED: Use sound from message
      title: message.title,
      body: message.body,
      data: message.data || {},
      priority: 'high',
      channelId: channelId,
      _displayInForeground: true,
      _experienceId: EXPERIENCE_ID,
    };

    const chunks = expo.chunkPushNotifications([notification]);
    
    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      
      for (const ticket of ticketChunk) {
        if (ticket.status === 'error') {
          console.error('❌ Expo push error:', ticket.details);
          throw new Error(ticket.message || 'Expo push failed');
        }
      }
    }
  }

  /**
   * Send push notification to a driver
   */
  static async sendToDriver(
    driverId: string,
    message: PushMessage
  ): Promise<void> {
    try {
      console.log(`📱 Looking for FCM token for driver ${driverId}`);
      
      const profile = await Profile.findOne({ userId: driverId });
      
      console.log(`🔍 Profile for driver ${driverId}:`, {
        found: !!profile,
        hasToken: !!profile?.fcmToken,
        token: profile?.fcmToken ? profile.fcmToken.substring(0, 30) + '...' : 'none'
      });
      
      if (!profile?.fcmToken) {
        console.log(`❌ No FCM token for driver ${driverId}`);
        return;
      }

      const token = profile.fcmToken as string;

      console.log(`📤 Sending push to driver ${driverId}:`, {
        title: message.title,
        token: token.substring(0, 30) + '...'
      });

      try {
        if (isNativeFCMToken(token)) {
          // Use Firebase Admin for native FCM tokens
          console.log('🔥 Using Firebase Admin SDK for native FCM token');
          await this.sendFCM(token, message, 'ride-requests');
        } else if (isExpoToken(token)) {
          // Use Expo SDK for Expo tokens
          console.log('📤 Using Expo SDK for Expo token');
          await this.sendExpo(token, message, 'ride-requests');
        } else {
          console.warn(`⚠️ Unknown token format for driver ${driverId}`);
        }
      } catch (sendError) {
        console.error(`❌ Error sending push to driver ${driverId}:`, sendError);
      }
    } catch (error) {
      console.error('❌ Error sending push to driver:', error);
    }
  }

  /**
   * Send push notification to a client
   */
  static async sendToClient(
    clientId: string,
    message: PushMessage
  ): Promise<void> {
    try {
      const profile = await Profile.findOne({ userId: clientId });
      
      if (!profile?.fcmToken) {
        console.log(`No FCM token for client ${clientId}`);
        return;
      }

      const token = profile.fcmToken as string;

      try {
        if (isNativeFCMToken(token)) {
          console.log('🔥 Using Firebase Admin SDK for native FCM token');
          await this.sendFCM(token, message, 'ride-updates');
        } else if (isExpoToken(token)) {
          console.log('📤 Using Expo SDK for Expo token');
          await this.sendExpo(token, message, 'ride-updates');
        } else {
          console.warn(`⚠️ Unknown token format for client ${clientId}`);
        }
      } catch (sendError) {
        console.error(`❌ Error sending push to client ${clientId}:`, sendError);
      }
    } catch (error) {
      console.error('Error sending push to client:', error);
    }
  }

  /**
   * Send to multiple recipients
   */
  static async sendBulk(
    userIds: string[],
    message: PushMessage
  ): Promise<void> {
    try {
      const profiles = await Profile.find({
        userId: { $in: userIds },
        fcmToken: { $exists: true, $ne: null },
      });

      for (const profile of profiles) {
        const token = profile.fcmToken as string;
        
        if (isNativeFCMToken(token)) {
          await this.sendFCM(token, message, 'default');
        } else if (isExpoToken(token)) {
          await this.sendExpo(token, message, 'default');
        }
      }
    } catch (error) {
      console.error('Error sending bulk push:', error);
    }
  }

  /**
   * Send notification directly to a specific token
   */
  static async sendToToken(
    token: string,
    message: PushMessage
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (isNativeFCMToken(token)) {
        console.log('🔥 Using Firebase Admin SDK for native FCM token');
        await this.sendFCM(token, message, 'default');
      } else if (isExpoToken(token)) {
        console.log('📤 Using Expo SDK for Expo token');
        await this.sendExpo(token, message, 'default');
      } else {
        return { success: false, message: 'Unknown token format' };
      }
      return { success: true, message: 'Notification sent successfully' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error sending to token:', errorMessage);
      return { success: false, message: errorMessage };
    }
  }

  /**
   * Update user's FCM token
   */
  static async updateToken(
    userId: string,
    fcmToken: string
  ): Promise<void> {
    try {
      await Profile.findOneAndUpdate(
        { userId },
        { $set: { fcmToken } },
        { upsert: true }
      );
      console.log(`✅ FCM token updated for user ${userId}`);
    } catch (error) {
      console.error('Error updating FCM token:', error);
    }
  }
}
