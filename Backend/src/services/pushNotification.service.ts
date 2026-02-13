import { Expo } from 'expo-server-sdk';
import { Profile } from '../models/Profile.js';

// Initialize Expo SDK
const expo = new Expo();

interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export class PushNotificationService {
  /**
   * Send push notification to a driver
   */
  static async sendToDriver(
    driverId: string,
    message: PushMessage
  ): Promise<void> {
    try {
      // Get driver's FCM token from profile
      const profile = await Profile.findOne({ userId: driverId });
      
      if (!profile?.fcmToken) {
        console.log(`No FCM token for driver ${driverId}`);
        return;
      }

      const token = profile.fcmToken;

      // Check if token is valid Expo push token
      if (!Expo.isExpoPushToken(token)) {
        console.error(`Invalid Expo push token for driver ${driverId}`);
        return;
      }

      // Create notification
      const notification = {
        to: token,
        sound: 'default',
        title: message.title,
        body: message.body,
        data: message.data || {},
        priority: 'high',
        channelId: 'ride-requests',
      };

      // Send notification
      const chunks = expo.chunkPushNotifications([notification]);
      
      for (const chunk of chunks) {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log(`📱 Push sent to driver ${driverId}:`, ticketChunk);
      }
    } catch (error) {
      console.error('Error sending push to driver:', error);
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

      const token = profile.fcmToken;

      if (!Expo.isExpoPushToken(token)) {
        console.error(`Invalid Expo push token for client ${clientId}`);
        return;
      }

      const notification = {
        to: token,
        sound: 'default',
        title: message.title,
        body: message.body,
        data: message.data || {},
        priority: 'high',
        channelId: 'ride-updates',
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
        .filter((token): token is string => !!token && Expo.isExpoPushToken(token));

      if (tokens.length === 0) {
        console.log('No valid FCM tokens for bulk send');
        return;
      }

      const notifications = tokens.map((token) => ({
        to: token,
        sound: 'default',
        title: message.title,
        body: message.body,
        data: message.data || {},
        priority: 'high',
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
