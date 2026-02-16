import { Profile } from '../models/Profile.js';

interface NotificationPayload {
  to: string; // Expo push token
  sound?: string;
  title: string;
  body: string;
  data?: any;
  badge?: number;
}

/**
 * Send push notification using Expo Push Notification API Setup With FCM Token
 */
export const sendPushNotification = async (
  pushToken: string,
  title: string,
  body: string,
  data?: any
): Promise<boolean> => {
  try {
    const message: NotificationPayload = {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data: data || {},
      badge: 1,
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json() as any;
    
    if (result.data?.status === 'ok') {
      console.log(`✅ Push notification sent successfully to ${pushToken.substring(0, 20)}...`);
      return true;
    } else {
      console.error('❌ Failed to send push notification:', result);
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    return false;
  }
};

/**
 * Send notification to a user by their userId
 */
export const sendNotificationToUser = async (
  userId: string,
  title: string,
  body: string,
  data?: any
): Promise<boolean> => {
  try {
    console.log(`🔍 Looking for FCM token for user ${userId}`);
    
    // Try finding by string userId first
    let profile = await Profile.findOne({ userId });
    
    // If not found, try with ObjectId
    if (!profile) {
      try {
        const mongoose = await import('mongoose');
        if (mongoose.default.Types.ObjectId.isValid(userId)) {
          profile = await Profile.findOne({ userId: new mongoose.default.Types.ObjectId(userId) });
        }
      } catch (e) {
        console.log('Not a valid ObjectId, using string userId');
      }
    }
    
    if (!profile) {
      console.warn(`⚠️ No profile found for user ${userId}`);
      return false;
    }
    
    console.log(`📱 Profile found for user ${userId}:`, {
      hasFcmToken: !!profile.fcmToken,
      fcmToken: profile.fcmToken ? profile.fcmToken.substring(0, 20) + '...' : 'none'
    });
    
    if (!profile.fcmToken) {
      console.warn(`⚠️ No FCM token found for user ${userId}`);
      return false;
    }

    return await sendPushNotification(profile.fcmToken, title, body, data);
  } catch (error) {
    console.error('❌ Error sending notification to user:', error);
    return false;
  }
};

/**
 * Send driver approval notification
 */
export const sendDriverApprovalNotification = async (userId: string): Promise<boolean> => {
  const title = '🎉 Driver Request Approved!';
  const body = 'Congratulations! Your driver request has been approved. You can now start accepting missions.';
  const data = {
    type: 'driver_approved',
    screen: 'home',
  };

  return await sendNotificationToUser(userId, title, body, data);
};

/**
 * Send driver rejection notification
 */
export const sendDriverRejectionNotification = async (
  userId: string,
  reason?: string
): Promise<boolean> => {
  const title = 'Driver Request Update';
  const body = reason
    ? `Your driver request was not approved. Reason: ${reason}`
    : 'Your driver request was not approved. Please contact support for more information.';
  const data = {
    type: 'driver_rejected',
    screen: 'become-driver',
    reason,
  };

  return await sendNotificationToUser(userId, title, body, data);
};
