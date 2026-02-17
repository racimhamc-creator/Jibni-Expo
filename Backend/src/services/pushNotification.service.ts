import { Expo } from 'expo-server-sdk';
import { Profile } from '../models/Profile.js';

// Initialize Expo SDK
const expo = new Expo();

// Your Expo project credentials
const EXPO_OWNER = process.env.EXPO_OWNER || 'nabilhcm29';
const EXPO_SLUG = process.env.EXPO_SLUG || 'MyNewApp';
const EXPERIENCE_ID = `@${EXPO_OWNER}/${EXPO_SLUG}`;

interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export class PushNotificationService {
  /**
   * Send push notification to a driver Using FCM System Arch
   */
  static async sendToDriver(
    driverId: string,
    message: PushMessage
  ): Promise<void> {
    try {
      console.log(`📱 Looking for FCM token for driver ${driverId}`);
      
      // Get driver's FCM token from profile
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

      // Check if token is valid Expo push token or FCM token
      const isExpoToken = Expo.isExpoPushToken(token);
      const isFCMToken = token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken') || token.length > 100;
      
      if (!token || (!isExpoToken && !isFCMToken)) {
        console.log(`❌ Invalid push token for driver ${driverId}:`, token.substring(0, 30));
        return;
      }
      
      console.log(`✅ Token type for driver ${driverId}:`, isExpoToken ? 'Expo' : 'FCM');

      // Create notification
      const notification: any = {
        to: token,
        sound: 'default',
        title: message.title,
        body: message.body,
        data: message.data || {},
        priority: 'high',
        channelId: 'ride-requests',
        _displayInForeground: true,
        _experienceId: EXPERIENCE_ID,
      };

      console.log(`📤 Sending push to driver ${driverId}:`, {
        title: message.title,
        token: token.substring(0, 30) + '...'
      });

      // Send notification
      const chunks = expo.chunkPushNotifications([notification]);
      
      for (const chunk of chunks) {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log(`📱 Push sent to driver ${driverId}:`, ticketChunk);
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
      // Get client's FCM token from profile
      const profile = await Profile.findOne({ userId: clientId });
      
      if (!profile?.fcmToken) {
        console.log(`No FCM token for client ${clientId}`);
        return;
      }

      const token = profile.fcmToken as string;

      // Check if token is valid Expo push token or FCM token
      const isExpoToken = Expo.isExpoPushToken(token);
      const isFCMToken = token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken') || token.length > 100;
      
      if (!isExpoToken && !isFCMToken) {
        console.error(`Invalid push token for client ${clientId}:`, token.substring(0, 30));
        return;
      }

      const notification: any = {
        to: token,
        sound: 'default',
        title: message.title,
        body: message.body,
        data: message.data || {},
        priority: 'high',
        channelId: 'ride-updates',
        _displayInForeground: true,
        _experienceId: EXPERIENCE_ID,
      };

      const chunks = expo.chunkPushNotifications([notification]);
      
      for (const chunk of chunks) {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log(`📱 Push sent to client ${clientId}:`, ticketChunk);
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
      // Get all profiles with FCM tokens
      const profiles = await Profile.find({
        userId: { $in: userIds },
        fcmToken: { $exists: true, $ne: null },
      });

      const tokens = profiles
        .map((p) => p.fcmToken)
        .filter((token): token is string => {
          if (!token) return false;
          const isExpoToken = Expo.isExpoPushToken(token);
          const isFCMToken = token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken') || token.length > 100;
          return isExpoToken || isFCMToken;
        });

      if (tokens.length === 0) {
        console.log('No valid FCM tokens for bulk send');
        return;
      }

      const notifications: any[] = tokens.map((token) => ({
        to: token,
        sound: 'default',
        title: message.title,
        body: message.body,
        data: message.data || {},
        priority: 'high',
        _experienceId: EXPERIENCE_ID,
      }));

      const chunks = expo.chunkPushNotifications(notifications);

      for (const chunk of chunks) {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log('📱 Bulk push sent:', ticketChunk);
      }
    } catch (error) {
      console.error('Error sending bulk push:', error);
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
