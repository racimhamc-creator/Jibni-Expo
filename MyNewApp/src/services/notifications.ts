import { Language } from '../utils/translations';

// Notification message translations for all supported languages
export const notificationMessages = {
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
  rideCancelledByClient: {
    en: "You cancelled the ride",
    fr: "Vous avez annulé la course",
    ar: "لقد قمت بإلغاء الرحلة"
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
  rideAcceptedByClient: {
    en: "Client accepted your ride",
    fr: "Le client a accepté votre course",
    ar: "العميل قبل رحلتك"
  },
  rideRejectedByClient: {
    en: "Client rejected your ride",
    fr: "Le client a rejeté votre course", 
    ar: "العميل رفض رحلتك"
  },
  rideTimeout: {
    en: "Ride request expired",
    fr: "La demande de course a expiré",
    ar: "انتهت صلاحية طلب الرحلة"
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

// Type for notification keys
export type NotificationKey = keyof typeof notificationMessages;

// Helper function to get notification message in the correct language
export function getNotificationMessage(
  key: NotificationKey, 
  language: Language = 'en'
): string {
  const messages = notificationMessages[key];
  
  if (!messages) {
    console.warn(`Notification key "${key}" not found`);
    return key;
  }
  
  // Return message in requested language, fallback to English if not available
  return messages[language] || messages.en || key;
}

// Helper function to get notification title and body
export function getNotificationContent(
  key: NotificationKey,
  language: Language = 'en',
  customData?: Record<string, any>
): { title: string; body: string } {
  const message = getNotificationMessage(key, language);
  
  // For most notifications, use the same message for title and body
  // This can be customized per notification type if needed
  switch (key) {
    case 'rideAccepted':
      return {
        title: message,
        body: getNotificationMessage('driverFound', language)
      };
      
    case 'rideRequest':
      return {
        title: message,
        body: customData?.pickupAddress 
          ? `Pickup: ${customData.pickupAddress}`
          : "New ride request available"
      };
      
    case 'driverApproved':
      return {
        title: "Driver Request Approved",
        body: message
      };
      
    case 'driverRejected':
      return {
        title: "Driver Request Not Approved", 
        body: message
      };
      
    default:
      return {
        title: message,
        body: message
      };
  }
}

// Helper function to get user's language preference
export async function getUserLanguage(userId: string): Promise<Language> {
  try {
    // This would typically call your backend API to get user preferences
    // For now, we'll use the stored language or default to English
    const { storage } = await import('../services/storage');
    const savedLanguage = await storage.getLanguage();
    
    if (savedLanguage && ['en', 'fr', 'ar'].includes(savedLanguage)) {
      return savedLanguage as Language;
    }
    
    return 'en'; // Default fallback
  } catch (error) {
    console.error('Error getting user language:', error);
    return 'en'; // Default fallback
  }
}

// Backend helper function to send notification in user's language
export async function sendNotificationToUser(
  userId: string,
  notificationKey: NotificationKey,
  customData?: Record<string, any>
): Promise<{ title: string; body: string; language: Language }> {
  const language = await getUserLanguage(userId);
  const content = getNotificationContent(notificationKey, language, customData);
  
  return {
    ...content,
    language
  };
}
