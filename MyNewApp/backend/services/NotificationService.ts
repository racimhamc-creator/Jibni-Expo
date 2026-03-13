// Backend Notification Service with Language Support
// This would be implemented in your Node.js/Express backend

import admin from 'firebase-admin';
import { User } from '../models/User';

// Import notification messages from frontend (copy the structure)
const notificationMessages = {
  // Client notifications
  rideAccepted: {
    en: "Your driver is on the way",
    fr: "Votre chauffeur est en route", 
    ar: "السائق في الطريق"
  },
  driverArrived: {
    en: "Your driver has arrived",
    fr: "Votre chauffeur est arrivé",
    ar: "وصل السائق"
  },
  rideStarted: {
    en: "Your ride has started",
    fr: "Votre trajet a commencé",
    ar: "بدأت الرحلة"
  },
  rideCompleted: {
    en: "Your ride has been completed",
    fr: "Votre trajet est terminé",
    ar: "تمت الرحلة بنجاح"
  },
  rideCancelledByDriver: {
    en: "The driver cancelled the ride. Please request another ride.",
    fr: "Le chauffeur a annulé la course. Veuillez en demander une nouvelle.",
    ar: "قام السائق بإلغاء الرحلة. يرجى طلب رحلة جديدة."
  },
  driverFound: {
    en: "Driver found! Your ride is confirmed.",
    fr: "Chauffeur trouvé ! Votre course est confirmée.",
    ar: "تم العثور على سائق! تم تأكيد رحلتك."
  },
  noDriverFound: {
    en: "No drivers available. Please try again later.",
    fr: "Aucun chauffeur disponible. Veuillez réessayer plus tard.",
    ar: "لا يوجد سائقين متاحين. يرجى المحاولة مرة أخرى لاحقاً."
  },
  
  // Driver notifications
  rideRequest: {
    en: "New ride request!",
    fr: "Nouvelle demande de course !",
    ar: "طلب رحلة جديد!"
  },
  driverApproved: {
    en: "Congratulations! Your driver request has been approved.",
    fr: "Félicitations ! Votre demande de chauffeur a été approuvée.",
    ar: "تهانينا! تمت الموافقة على طلبك لتصبح سائقاً."
  },
  driverRejected: {
    en: "Your driver request was not approved. Please contact support.",
    fr: "Votre demande de chauffeur n'a pas été approuvée. Veuillez contacter le support.",
    ar: "لم تتم الموافقة على طلبك لتصبح سائقاً. يرجى التواصل مع الدعم."
  },
  
  // General notifications
  paymentReceived: {
    en: "Payment received successfully",
    fr: "Paiement reçu avec succès",
    ar: "تم استلام الدفعة بنجاح"
  },
  ratingReceived: {
    en: "Thank you for your rating!",
    fr: "Merci pour votre note !",
    ar: "شكراً لتقييمك!"
  },
  accountBanned: {
    en: "Your account has been banned. Please contact support.",
    fr: "Votre compte a été banni. Veuillez contacter le support.",
    ar: "تم حظر حسابك. يرجى التواصل مع الدعم."
  }
} as const;

export type NotificationKey = keyof typeof notificationMessages;
export type Language = 'en' | 'fr' | 'ar';

// Initialize Firebase Admin SDK (do this once in your app startup)
export function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        // Your Firebase service account credentials
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
}

// Get notification content in user's language
export function getNotificationForUser(
  user: User,
  notificationKey: NotificationKey,
  customData?: Record<string, any>
): { title: string; body: string; language: string } {
  // DEBUG: Log user information
  console.log("🔍 DEBUG: User ID:", user._id);
  console.log("🔍 DEBUG: User language from database:", user.language);
  console.log("🔍 DEBUG: Notification key:", notificationKey);
  
  const language = user.language || 'en'; // Default to English
  console.log("🔍 DEBUG: Final language used:", language);
  
  const messages = notificationMessages[notificationKey];
  console.log("🔍 DEBUG: Available messages for key:", messages);
  
  if (!messages) {
    console.warn(`❌ Notification key "${notificationKey}" not found`);
    return {
      title: notificationKey,
      body: notificationKey,
      language: 'en'
    };
  }
  
  // Get message in user's language, fallback to English
  const message = messages[language] || messages.en || notificationKey;
  console.log("🔍 DEBUG: Selected message:", message);
  console.log("🔍 DEBUG: messages[language]:", messages[language]);
  console.log("🔍 DEBUG: messages.en:", messages.en);
  
  // Customize based on notification type
  switch (notificationKey) {
    case 'rideRequest':
      const rideRequestBody = customData?.pickupAddress 
        ? `Pickup: ${customData.pickupAddress}`
        : customData?.price
        ? `New ride: ${customData.price} DZD`
        : "New ride request available";
      
      console.log("🔍 DEBUG: rideRequest body:", rideRequestBody);
      
      return {
        title: message,
        body: rideRequestBody,
        language
      };
      
    case 'driverApproved':
      console.log("🔍 DEBUG: driverApproved - fixing hardcoded title!");
      return {
        title: message, // ✅ FIXED: Use translated message instead of hardcoded English
        body: message,
        language
      };
      
    case 'driverRejected':
      console.log("🔍 DEBUG: driverRejected - fixing hardcoded title!");
      return {
        title: message, // ✅ FIXED: Use translated message instead of hardcoded English
        body: message,
        language
      };
      
    case 'rideAccepted':
      const rideAcceptedBody = getNotificationMessage('driverFound', language);
      console.log("🔍 DEBUG: rideAccepted body:", rideAcceptedBody);
      
      return {
        title: message,
        body: rideAcceptedBody,
        language
      };
      
    default:
      console.log("🔍 DEBUG: default case - using message for both title and body");
      return {
        title: message,
        body: message,
        language
      };
  }
}

// Helper function to get notification message
function getNotificationMessage(key: NotificationKey, language: Language): string {
  const messages = notificationMessages[key];
  if (!messages) return key;
  return messages[language] || messages.en || key;
}

// Send push notification to a single user
export async function sendPushNotification(
  user: User,
  notificationKey: NotificationKey,
  customData?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  // DEBUG: Log user fetch verification
  console.log("🔍 DEBUG: sendPushNotification called");
  console.log("🔍 DEBUG: User object received:", {
    _id: user._id,
    language: user.language,
    fcmToken: user.fcmToken ? 'present' : 'missing',
    phoneNumber: user.phoneNumber
  });
  
  if (!user.fcmToken) {
    console.warn(`❌ User ${user._id} has no FCM token`);
    return { success: false, error: 'No FCM token' };
  }
  
  console.log("🔍 DEBUG: Getting notification content...");
  const notification = getNotificationForUser(user, notificationKey, customData);
  
  // DEBUG: Log final notification content
  console.log("🔍 DEBUG: Final notification content:", {
    title: notification.title,
    body: notification.body,
    language: notification.language,
    notificationKey: notificationKey
  });
  
  console.log("🔍 DEBUG: Preparing Firebase message...");
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
      userId: user._id.toString(),
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
  
  console.log("🔍 DEBUG: Firebase message prepared:", {
    token: message.token.substring(0, 10) + '...',
    notificationTitle: message.notification.title,
    notificationBody: message.notification.body,
    dataLanguage: message.data.language,
    dataType: message.data.type
  });
  
  try {
    console.log("🔍 DEBUG: Sending to Firebase...");
    const response = await admin.messaging().send(message);
    console.log(`✅ Notification sent to user ${user._id} (${notification.language}):`, response);
    return { success: true };
  } catch (error: any) {
    console.error(`❌ Failed to send notification to user ${user._id}:`, error);
    
    // Handle specific FCM errors
    if (error.code === 'messaging/registration-token-not-registered') {
      // Token is invalid, remove it from user
      await User.findByIdAndUpdate(user._id, { $unset: { fcmToken: 1 } });
      console.log(`🗑️ Removed invalid FCM token for user ${user._id}`);
    }
    
    return { success: false, error: error.message };
  }
}

// Send push notification to multiple users
export async function sendBulkPushNotifications(
  users: User[],
  notificationKey: NotificationKey,
  customData?: Record<string, any>
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  };
  
  // Process in batches to avoid overwhelming FCM
  const batchSize = 100;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    
    // Send notifications in parallel within batch
    const promises = batch.map(async (user) => {
      const result = await sendPushNotification(user, notificationKey, customData);
      if (result.success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push(`User ${user._id}: ${result.error}`);
      }
    });
    
    await Promise.all(promises);
    
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < users.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`📊 Bulk notification results: ${results.success} success, ${results.failed} failed`);
  return results;
}

// Send notification by user ID
export async function sendNotificationToUserId(
  userId: string,
  notificationKey: NotificationKey,
  customData?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("🔍 DEBUG: sendNotificationToUserId called");
    console.log("🔍 DEBUG: Querying database for user ID:", userId);
    
    const user = await User.findById(userId);
    console.log("🔍 DEBUG: Database query result:", {
      found: !!user,
      userId: user?._id,
      language: user?.language,
      fcmToken: user?.fcmToken ? 'present' : 'missing'
    });
    
    if (!user) {
      console.error('❌ User not found in database:', userId);
      return { success: false, error: 'User not found' };
    }
    
    console.log("🔍 DEBUG: Calling sendPushNotification with fresh user data");
    return await sendPushNotification(user, notificationKey, customData);
  } catch (error: any) {
    console.error(`❌ Error sending notification to user ${userId}:`, error);
    return { success: false, error: error.message };
  }
}

// Send notifications to users by language
export async function sendNotificationsByLanguage(
  language: Language,
  notificationKey: NotificationKey,
  customData?: Record<string, any>
): Promise<{ success: number; failed: number; errors: string[] }> {
  try {
    const users = await User.find({
      language,
      fcmToken: { $exists: true, $ne: '' },
      banned: false
    });
    
    return await sendBulkPushNotifications(users, notificationKey, customData);
  } catch (error: any) {
    console.error(`Error sending notifications to ${language} users:`, error);
    return { success: 0, failed: 0, errors: [error.message] };
  }
}

// Clean up invalid FCM tokens (run periodically)
export async function cleanupInvalidFCMTokens(): Promise<number> {
  try {
    // This would be called when you get registration-token-not-registered errors
    // You can implement a periodic cleanup job here
    const result = await User.updateMany(
      { fcmToken: { $exists: true, $eq: '' } },
      { $unset: { fcmToken: 1 } }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`🧹 Cleaned up ${result.modifiedCount} empty FCM tokens`);
    }
    
    return result.modifiedCount;
  } catch (error) {
    console.error('Error cleaning up FCM tokens:', error);
    return 0;
  }
}
