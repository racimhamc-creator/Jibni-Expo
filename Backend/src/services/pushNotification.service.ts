import { Profile } from '../models/Profile.js';
import admin from 'firebase-admin';

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

// Deduplication: Track recently sent notifications (in-memory)
const recentNotifications = new Map<string, number>();
const NOTIFICATION_COOLDOWN_MS = 5000; // 5 seconds cooldown

interface PushMessage {
  title: string;
  body: string;
  sound?: string;
  data?: Record<string, any>;
}

/**
 * Check if notification was recently sent (deduplication)
 */
function wasRecentlyNotified(notificationKey: string): boolean {
  const lastSent = recentNotifications.get(notificationKey);
  if (lastSent && Date.now() - lastSent < NOTIFICATION_COOLDOWN_MS) {
    console.log(`⏭️ Notification deduplicated: ${notificationKey}`);
    return true;
  }
  recentNotifications.set(notificationKey, Date.now());
  
  // Cleanup old entries
  if (recentNotifications.size > 1000) {
    const now = Date.now();
    for (const [key, timestamp] of recentNotifications) {
      if (now - timestamp > NOTIFICATION_COOLDOWN_MS * 2) {
        recentNotifications.delete(key);
      }
    }
  }
  return false;
}

export class PushNotificationService {
  /**
   * Send push notification using Firebase Admin SDK (FCM only)
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
        },
        data: Object.entries(message.data || {}).reduce((acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        }, {} as Record<string, string>),
        android: {
          notification: {
            channelId: channelId,
            priority: 'high' as const,
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: message.title,
                body: message.body,
              },
              sound: 'default',
              badge: 1,
            },
          },
          headers: {
            'apns-priority': '10',
            'apns-push-type': 'alert',
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
   * Send push notification to a driver (FCM only with deduplication)
   */
  static async sendToDriver(
    driverId: string,
    message: PushMessage,
    deduplicationKey?: string
  ): Promise<void> {
    try {
      // Deduplication check
      if (deduplicationKey && wasRecentlyNotified(deduplicationKey)) {
        return;
      }

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

      console.log(`📤 Sending FCM push to driver ${driverId}:`, {
        title: message.title,
        token: token.substring(0, 30) + '...'
      });

      try {
        // Always use FCM
        console.log('🔥 Using Firebase Admin SDK for FCM token');
        await this.sendFCM(token, message, 'ride-requests');
      } catch (sendError) {
        console.error(`❌ Error sending push to driver ${driverId}:`, sendError);
      }
    } catch (error) {
      console.error('❌ Error sending push to driver:', error);
    }
  }

  /**
   * Send push notification to a client (FCM only with deduplication)
   */
  static async sendToClient(
    clientId: string,
    message: PushMessage,
    deduplicationKey?: string
  ): Promise<void> {
    try {
      // Deduplication check
      const key = deduplicationKey || `client:${clientId}:${message.title}`;
      if (wasRecentlyNotified(key)) {
        return;
      }

      const profile = await Profile.findOne({ userId: clientId });
      
      if (!profile?.fcmToken) {
        console.log(`❌ No FCM token for client ${clientId}`);
        return;
      }

      const token = profile.fcmToken as string;

      try {
        // Always use FCM
        console.log('🔥 Using Firebase Admin SDK for FCM token');
        await this.sendFCM(token, message, 'ride-updates');
      } catch (sendError) {
        console.error(`❌ Error sending push to client ${clientId}:`, sendError);
      }
    } catch (error) {
      console.error('Error sending push to client:', error);
    }
  }

  /**
   * Send to multiple recipients (FCM only)
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
        // Always use FCM
        await this.sendFCM(token, message, 'default');
      }
    } catch (error) {
      console.error('Error sending bulk push:', error);
    }
  }

  /**
   * Send notification directly to a specific token (FCM only)
   */
  static async sendToToken(
    token: string,
    message: PushMessage,
    deduplicationKey?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Deduplication check
      if (deduplicationKey && wasRecentlyNotified(deduplicationKey)) {
        return { success: true, message: 'Notification deduplicated' };
      }

      // Always use FCM
      console.log('🔥 Using Firebase Admin SDK for FCM token');
      await this.sendFCM(token, message, 'default');
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
