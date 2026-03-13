// Backend notification service example
// This would be implemented in your Node.js/Express backend

import { notificationMessages, NotificationKey } from '../src/services/notifications';

// User model should have a language field
interface User {
  _id: string;
  phoneNumber: string;
  language?: 'en' | 'fr' | 'ar';
  fcmToken?: string;
  // ... other fields
}

// Backend helper function to get notification content in user's language
export function getNotificationForUser(
  user: User,
  notificationKey: NotificationKey,
  customData?: Record<string, any>
): { title: string; body: string; language: string } {
  const language = user.language || 'en'; // Default to English
  
  const messages = notificationMessages[notificationKey];
  if (!messages) {
    console.warn(`Notification key "${notificationKey}" not found`);
    return {
      title: notificationKey,
      body: notificationKey,
      language: 'en'
    };
  }
  
  // Get message in user's language, fallback to English
  const message = messages[language] || messages.en || notificationKey;
  
  // Customize based on notification type
  switch (notificationKey) {
    case 'rideRequest':
      return {
        title: message,
        body: customData?.pickupAddress 
          ? `Pickup: ${customData.pickupAddress}`
          : "New ride request available",
        language
      };
      
    case 'driverApproved':
      return {
        title: "Driver Request Approved",
        body: message,
        language
      };
      
    case 'driverRejected':
      return {
        title: "Driver Request Not Approved", 
        body: message,
        language
      };
      
    default:
      return {
        title: message,
        body: message,
        language
      };
  }
}

// Example: Send push notification to user
export async function sendPushNotification(
  user: User,
  notificationKey: NotificationKey,
  customData?: Record<string, any>
): Promise<void> {
  if (!user.fcmToken) {
    console.warn(`User ${user._id} has no FCM token`);
    return;
  }
  
  const notification = getNotificationForUser(user, notificationKey, customData);
  
  const message = {
    token: user.fcmToken,
    notification: {
      title: notification.title,
      body: notification.body,
      sound: 'default',
    },
    data: {
      type: notificationKey,
      language: notification.language,
      userId: user._id,
      ...customData
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
  };
  
  try {
    // Use Firebase Admin SDK to send notification
    await admin.messaging().send(message);
    console.log(`✅ Notification sent to user ${user._id} in ${notification.language}`);
  } catch (error) {
    console.error(`❌ Failed to send notification to user ${user._id}:`, error);
  }
}

// Example usage in socket handlers:
export const handleRideAccepted = async (rideId: string, clientId: string) => {
  try {
    // Get client user data
    const client = await User.findById(clientId);
    if (!client) return;
    
    // Send notification in client's preferred language
    await sendPushNotification(client, 'rideAccepted', {
      rideId,
      driverName: 'John Doe' // Would come from driver data
    });
    
  } catch (error) {
    console.error('Error sending ride accepted notification:', error);
  }
};

export const handleDriverArrived = async (rideId: string, clientId: string) => {
  try {
    const client = await User.findById(clientId);
    if (!client) return;
    
    await sendPushNotification(client, 'driverArrived', { rideId });
    
  } catch (error) {
    console.error('Error sending driver arrived notification:', error);
  }
};

export const handleRideStarted = async (rideId: string, clientId: string) => {
  try {
    const client = await User.findById(clientId);
    if (!client) return;
    
    await sendPushNotification(client, 'rideStarted', { rideId });
    
  } catch (error) {
    console.error('Error sending ride started notification:', error);
  }
};

export const handleRideCompleted = async (rideId: string, clientId: string) => {
  try {
    const client = await User.findById(clientId);
    if (!client) return;
    
    await sendPushNotification(client, 'rideCompleted', { rideId });
    
  } catch (error) {
    console.error('Error sending ride completed notification:', error);
  }
};

// Driver notifications
export const handleRideRequest = async (driverId: string, rideData: any) => {
  try {
    const driver = await User.findById(driverId);
    if (!driver) return;
    
    await sendPushNotification(driver, 'rideRequest', {
      rideId: rideData.rideId,
      pickupAddress: rideData.pickupLocation?.address,
      price: rideData.pricing?.totalPrice
    });
    
  } catch (error) {
    console.error('Error sending ride request notification:', error);
  }
};

export const handleDriverApproval = async (driverId: string, approved: boolean) => {
  try {
    const driver = await User.findById(driverId);
    if (!driver) return;
    
    const notificationKey = approved ? 'driverApproved' : 'driverRejected';
    await sendPushNotification(driver, notificationKey);
    
  } catch (error) {
    console.error('Error sending driver approval notification:', error);
  }
};
