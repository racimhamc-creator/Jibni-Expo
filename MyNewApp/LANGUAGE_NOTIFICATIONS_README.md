# Language-Based Push Notifications Implementation

This document explains how to implement language-based push notifications for the Jibni ride-sharing app.

## Overview

All push notifications are automatically sent in the same language the user selected in the app. The system stores the user's language preference and uses it to send localized notifications.

## Implementation Details

### 1. Frontend Changes

#### Notification Translation Service (`src/services/notifications.ts`)

Created a comprehensive translation system with:

- **Notification Types**: All ride-related notifications (ride accepted, driver arrived, ride started, etc.)
- **Language Support**: English (en), French (fr), Arabic (ar)
- **Fallback Behavior**: Defaults to English if language is missing

```typescript
export const notificationMessages = {
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
  // ... more notifications
};
```

#### Language Context Updates (`src/contexts/LanguageContext.tsx`)

Modified to automatically sync language preference to backend:

```typescript
const setLanguage = async (lang: Language) => {
  setLanguageState(lang);
  await storage.setLanguage(lang);
  
  // Sync language preference to backend for push notifications
  try {
    await api.updateProfile({ language: lang });
    console.log('✅ Language preference synced to backend:', lang);
  } catch (error) {
    console.warn('⚠️ Failed to sync language to backend:', error);
  }
};
```

#### API Service Updates (`src/services/api.ts`)

Added language parameter to profile updates:

```typescript
async updateProfile(data: { 
  // ... existing fields
  language?: string;
}): Promise<any>
```

#### App Integration (`App.tsx`)

- **Login Sync**: Language is synced to backend on successful login
- **Notification Updates**: Uses translation system for local notifications

### 2. Backend Implementation

#### User Model

Add `language` field to user schema:

```javascript
const userSchema = new mongoose.Schema({
  // ... existing fields
  language: {
    type: String,
    enum: ['en', 'fr', 'ar'],
    default: 'en'
  },
  fcmToken: String
});
```

#### Notification Service

Create a service to handle localized notifications:

```javascript
// Use the notificationMessages from frontend
import { notificationMessages } from '../src/services/notifications';

export function getNotificationForUser(user, notificationKey) {
  const language = user.language || 'en';
  const messages = notificationMessages[notificationKey];
  
  return {
    title: messages[language] || messages.en,
    body: messages[language] || messages.en,
    language
  };
}
```

#### FCM Integration

Example notification sending:

```javascript
export async function sendPushNotification(user, notificationKey, customData) {
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
      ...customData
    }
  };
  
  await admin.messaging().send(message);
}
```

### 3. Supported Notifications

#### Client Notifications
- `rideAccepted` - Driver confirmed the ride
- `driverArrived` - Driver reached pickup location
- `rideStarted` - Ride began (driver picked up client)
- `rideCompleted` - Ride finished successfully
- `rideCancelledByDriver` - Driver cancelled the ride
- `driverFound` - Driver found and assigned
- `noDriverFound` - No drivers available

#### Driver Notifications
- `rideRequest` - New ride request received
- `rideAcceptedByClient` - Client accepted the ride
- `rideRejectedByClient` - Client rejected the ride
- `rideTimeout` - Ride request expired
- `driverApproved` - Driver application approved
- `driverRejected` - Driver application rejected

#### General Notifications
- `paymentReceived` - Payment processed successfully
- `ratingReceived` - Thank you for rating
- `accountBanned` - Account has been banned

## Usage Examples

### Frontend Usage

```typescript
import { getNotificationContent } from '../services/notifications';

// Get localized notification content
const notification = getNotificationContent('rideAccepted', 'ar');
console.log(notification.title); // "السائق في الطريق"
console.log(notification.body); // "تم العثور على سائق! تم تأكيد رحلتك."
```

### Backend Usage

```javascript
// In socket handlers or API endpoints
await sendPushNotification(clientUser, 'driverArrived', {
  rideId: '12345'
});
```

## Language Storage

### Local Storage
- **Key**: `@jibni:language`
- **Value**: `'en' | 'fr' | 'ar'`
- **Persistence**: AsyncStorage on device

### Backend Storage
- **Field**: `user.language`
- **Default**: `'en'`
- **Sync**: Automatically updated when user changes language

## Fallback Behavior

1. **Missing Language**: If user's language is not supported, defaults to English
2. **Missing Notification**: If notification key doesn't exist, returns the key name
3. **Network Errors**: Language sync failures don't prevent app usage

## Testing

### Frontend Testing
```typescript
// Test different languages
const enNotification = getNotificationContent('rideAccepted', 'en');
const frNotification = getNotificationContent('rideAccepted', 'fr');
const arNotification = getNotificationContent('rideAccepted', 'ar');

// Test fallback
const fallbackNotification = getNotificationContent('rideAccepted', 'de'); // Falls back to 'en'
```

### Backend Testing
```javascript
// Test with different user languages
const englishUser = { language: 'en', fcmToken: '...' };
const frenchUser = { language: 'fr', fcmToken: '...' };
const arabicUser = { language: 'ar', fcmToken: '...' };

await sendPushNotification(englishUser, 'rideAccepted');
await sendPushNotification(frenchUser, 'rideAccepted');
await sendPushNotification(arabicUser, 'rideAccepted');
```

## Benefits

1. **User Experience**: Notifications always appear in user's preferred language
2. **Consistency**: Same language across app and notifications
3. **Maintainability**: Centralized translation system
4. **Scalability**: Easy to add new languages and notification types
5. **Reliability**: Graceful fallbacks prevent broken notifications

## Future Enhancements

1. **Dynamic Language Loading**: Load translations from backend
2. **Template System**: More sophisticated notification templates
3. **Analytics**: Track notification engagement by language
4. **A/B Testing**: Test different notification messages per language
5. **Regional Variations**: Support for different dialects (e.g., fr-FR, fr-CA)
