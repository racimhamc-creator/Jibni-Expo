// Backend Notification Translation Service
// This provides Arabic, French, and English translations for push notifications

export type Language = 'en' | 'fr' | 'ar';

export interface NotificationContent {
  title: string;
  body: string;
  language: Language;
}

// Notification translations for all supported languages
export const notificationTranslations = {
  // Driver arrived notifications
  driverArrived: {
    en: {
      title: '📍 Driver Arrived!',
      body: 'Your driver has arrived at the pickup location.'
    },
    fr: {
      title: '📍 Chauffeur Arrivé!',
      body: 'Votre chauffeur est arrivé au point de prise en charge.'
    },
    ar: {
      title: '📍 وصول السائق!',
      body: 'لقد وصل سائقك إلى موقع الاستلام.'
    }
  },

  // Ride accepted notifications  
  rideAccepted: {
    en: {
      title: '🚗 Driver Assigned!',
      body: 'Your driver is on the way to pickup location.'
    },
    fr: {
      title: '🚗 Chauffeur Assigné!',
      body: 'Votre chauffeur est en route vers le point de prise en charge.'
    },
    ar: {
      title: '🚗 تم تعيين السائق!',
      body: 'سائقك في طريقه إلى موقع الاستلام.'
    }
  },

  // Ride started notifications
  rideStarted: {
    en: {
      title: '🚀 Ride Started!',
      body: 'Your ride has started. Enjoy your trip!'
    },
    fr: {
      title: '🚀 Course Commencée!',
      body: 'Votre course a commencé. Bon voyage!'
    },
    ar: {
      title: '🚀 بدأت الرحلة!',
      body: 'لقد بدأت رحلتك. استمتع برحلتك!'
    }
  },

  // Ride completed notifications
  rideCompleted: {
    en: {
      title: '✅ Ride Completed!',
      body: 'You have arrived at your destination. Thank you for riding with us!'
    },
    fr: {
      title: '✅ Course Terminée!',
      body: 'Vous êtes arrivé à destination. Merci d\'avoir voyagé avec nous!'
    },
    ar: {
      title: '✅ انتهت الرحلة!',
      body: 'لقد وصلت إلى وجهتك. شكراً للركوب معنا!'
    }
  },

  // Ride completion request notifications
  completionRequested: {
    en: {
      title: '🏁 Ride Completion',
      body: 'The driver has marked the ride as complete. Please confirm.'
    },
    fr: {
      title: '🏁 Achèvement de Course',
      body: 'Le chauffeur a marqué la course comme terminée. Veuillez confirmer.'
    },
    ar: {
      title: '🏁 إكمال الرحلة',
      body: 'قام السائق بتحديد الرحلة كمكتملة. يرجى التأكيد.'
    }
  },

  // Ride cancelled notifications
  rideCancelledByDriver: {
    en: {
      title: '🚫 Ride Cancelled',
      body: 'The driver cancelled the ride. Please request a new ride.'
    },
    fr: {
      title: '🚫 Course Annulée',
      body: 'Le chauffeur a annulé la course. Veuillez demander une nouvelle course.'
    },
    ar: {
      title: '🚫 تم إلغاء الرحلة',
      body: 'قام السائق بإلغاء الرحلة. يرجى طلب رحلة جديدة.'
    }
  },

  // Driver approved notifications
  driverApproved: {
    en: {
      title: '🎉 Driver Request Approved!',
      body: 'Congratulations! Your driver request has been approved.'
    },
    fr: {
      title: '🎉 Demande de Chauffeur Approuvée!',
      body: 'Félicitations ! Votre demande de chauffeur a été approuvée.'
    },
    ar: {
      title: '🎉 تمت الموافقة على طلب السائق!',
      body: 'تهانينا! تمت الموافقة على طلبك لتصبح سائقاً.'
    }
  },

  // Driver rejected notifications
  driverRejected: {
    en: {
      title: '❌ Driver Request Not Approved',
      body: 'Your driver request was not approved. Please contact support.'
    },
    fr: {
      title: '❌ Demande de Chauffeur Non Approuvée',
      body: 'Votre demande de chauffeur n\'a pas été approuvée. Veuillez contacter le support.'
    },
    ar: {
      title: '❌ لم تتم الموافقة على طلب السائق',
      body: 'لم تتم الموافقة على طلبك لتصبح سائقاً. يرجى التواصل مع الدعم.'
    }
  },

  // No driver found notifications
  noDriverFound: {
    en: {
      title: 'No Drivers Available',
      body: 'Please try again shortly.'
    },
    fr: {
      title: 'Aucun Chauffeur Disponible',
      body: 'Veuillez réessayer sous peu.'
    },
    ar: {
      title: 'لا يوجد سائقين متاحين',
      body: 'يرجى المحاولة مرة أخرى قريباً.'
    }
  },

  // Driver cancelled notifications
  driverCancelled: {
    en: {
      title: '🚫 Ride Cancelled',
      body: 'The driver cancelled the ride. Please request again.'
    },
    fr: {
      title: '🚫 Course Annulée',
      body: 'Le chauffeur a annulé la course. Veuillez demander une nouvelle course.'
    },
    ar: {
      title: '🚫 تم إلغاء الرحلة',
      body: 'قام السائق بإلغاء الرحلة. يرجى طلب رحلة جديدة.'
    }
  },

  // Ride request notifications (to drivers)
  rideRequest: {
    en: {
      title: 'New Ride Request! 🚗',
      body: 'Trip: {{distance}}km | Earnings: {{price}} DZD'
    },
    fr: {
      title: 'Nouvelle Demande de Course! 🚗',
      body: 'Trajet: {{distance}}km | Gains: {{price}} DZD'
    },
    ar: {
      title: 'طلب رحلة جديد! 🚗',
      body: 'المسافة: {{distance}}كم | الأرباح: {{price}} دينار'
    }
  }
};

// Get translated notification content
export function getTranslatedNotification(
  notificationKey: keyof typeof notificationTranslations,
  language: Language = 'en'
): NotificationContent {
  const translation = notificationTranslations[notificationKey];
  
  if (!translation) {
    // Fallback to English if notification key not found
    console.warn(`Notification key "${notificationKey}" not found`);
    return {
      title: notificationKey,
      body: notificationKey,
      language: 'en'
    };
  }

  const languageTranslation = translation[language];
  
  if (!languageTranslation) {
    // Fallback to English if language not supported
    console.warn(`Language "${language}" not supported for notification "${notificationKey}"`);
    return {
      title: translation.en.title,
      body: translation.en.body,
      language: 'en'
    };
  }

  return {
    title: languageTranslation.title,
    body: languageTranslation.body,
    language
  };
}

// Helper function to get user language with fallback
export function getUserLanguage(userLanguage?: string): Language {
  if (!userLanguage) return 'en';
  
  const validLanguages: Language[] = ['en', 'fr', 'ar'];
  if (validLanguages.includes(userLanguage as Language)) {
    return userLanguage as Language;
  }
  
  return 'en'; // Default fallback
}

// Helper function to replace template variables in notification text
export function replaceTemplateVariables(
  text: string, 
  variables: Record<string, string | number>
): string {
  let result = text;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), String(value));
  }
  
  return result;
}
