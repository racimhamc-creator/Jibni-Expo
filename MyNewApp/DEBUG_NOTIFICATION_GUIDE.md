# 🔍 Notification System Debugging Guide

## 📋 Debug Logs Added

I've added comprehensive debugging logs throughout the notification system. Here's exactly what to look for:

---

## 🔍 **Step 1: Check User Language in Database**

### Expected Logs:
```
🔍 DEBUG: sendNotificationToUserId called
🔍 DEBUG: Querying database for user ID: 507f1f77bcf86cd799439011
🔍 DEBUG: Database query result: {
  found: true,
  userId: 507f1f77bcf86cd799439011,
  language: 'ar',  // ← This should be 'fr' or 'ar', not 'en'
  fcmToken: 'present'
}
```

### ❌ Problems to Look For:
- `language: 'en'` when user selected French/Arabic
- `language: undefined` or `language: null`
- `found: false` (user not found in database)

---

## 🔍 **Step 2: Translation Message Selection**

### Expected Logs:
```
🔍 DEBUG: User ID: 507f1f77bcf86cd799439011
🔍 DEBUG: User language from database: ar
🔍 DEBUG: Notification key: rideAccepted
🔍 DEBUG: Final language used: ar
🔍 DEBUG: Available messages for key: {
  en: "Your driver is on the way",
  fr: "Votre chauffeur est en route", 
  ar: "السائق في الطريق"
}
🔍 DEBUG: Selected message: السائق في الطريق
🔍 DEBUG: messages[language]: السائق في الطريق
🔍 DEBUG: messages.en: Your driver is on the way
```

### ❌ Problems to Look For:
- `messages[language]: undefined` (translation missing)
- `Selected message: rideAccepted` (fallback to key name)
- `Available messages for key: undefined` (notification key not found)

---

## 🔍 **Step 3: Final Notification Content**

### Expected Logs:
```
🔍 DEBUG: Final notification content: {
  title: "السائق في الطريق",
  body: "تم العثور على سائق! تم تأكيد رحلتك.",
  language: "ar",
  notificationKey: "rideAccepted"
}
```

### ❌ Problems to Look For:
- `title: "Driver Request Approved"` (hardcoded English)
- `title: "Your driver is on the way"` (English instead of translated)
- `body: "New ride request available"` (hardcoded English)

---

## 🔍 **Step 4: Firebase Message**

### Expected Logs:
```
🔍 DEBUG: Firebase message prepared: {
  token: "f1a2b3c4d5...",
  notificationTitle: "السائق في الطريق",
  notificationBody: "تم العثور على سائق! تم تأكيد رحلتك.",
  dataLanguage: "ar",
  dataType: "rideAccepted"
}
```

### ❌ Problems to Look For:
- `notificationTitle: "Driver Request Approved"` (hardcoded)
- `notificationBody: "Your driver is on the way"` (wrong language)

---

## 🛠️ **Common Issues & Solutions**

### Issue 1: User Language Not Saved in Database
**Symptoms:**
```
🔍 DEBUG: User language from database: undefined
🔍 DEBUG: Final language used: en  // Falls back to English
```

**Solution:** Check frontend language sync:
```typescript
// In LanguageContext.tsx
const setLanguage = async (lang: Language) => {
  setLanguageState(lang);
  await storage.setLanguage(lang);
  
  // This should sync to backend
  try {
    await api.updateProfile({ language: lang });
    console.log('✅ Language preference synced to backend:', lang);
  } catch (error) {
    console.warn('⚠️ Failed to sync language to backend:', error);
  }
};
```

### Issue 2: Hardcoded English Titles
**Symptoms:**
```
🔍 DEBUG: driverApproved - fixing hardcoded title!
🔍 DEBUG: Final notification content: {
  title: "Driver Request Approved",  // ❌ Should be translated
  body: "Félicitations ! Votre demande de chauffeur a été approuvée."
}
```

**Solution:** Fixed in code - now uses translated message for title too.

### Issue 3: Missing Translation Keys
**Symptoms:**
```
🔍 DEBUG: Available messages for key: undefined
❌ Notification key "newNotificationType" not found
```

**Solution:** Add missing translation to `notificationMessages` object.

### Issue 4: Wrong User Fetched
**Symptoms:**
```
🔍 DEBUG: Database query result: {
  found: true,
  language: 'en',  // Wrong user or outdated language
}
```

**Solution:** Ensure fresh user fetch:
```typescript
// Always fetch fresh user data
const freshUser = await User.findById(clientId);
```

---

## 🧪 **Testing Steps**

### 1. **Test Language Selection**
```bash
# In app, select French language
# Check logs for:
✅ Language preference synced to backend: fr
```

### 2. **Check Database**
```javascript
// In MongoDB shell
db.users.findOne({_id: ObjectId("507f1f77bcf86cd799439011")})
// Should show: { language: "fr", ... }
```

### 3. **Trigger Notification**
```bash
# Trigger ride_accepted event
# Look for debug logs in sequence:
🔍 DEBUG: sendNotificationToUserId called
🔍 DEBUG: Database query result: { language: "fr", ... }
🔍 DEBUG: Selected message: "Votre chauffeur est en route"
🔍 DEBUG: Final notification content: { title: "Votre chauffeur est en route", ... }
```

---

## 📊 **Expected Results by Language**

### French User:
```
🔍 DEBUG: User language from database: fr
🔍 DEBUG: Selected message: "Votre chauffeur est en route"
🔍 DEBUG: Final notification content: {
  title: "Votre chauffeur est en route",
  body: "Chauffeur trouvé ! Votre course est confirmée."
}
```

### Arabic User:
```
🔍 DEBUG: User language from database: ar
🔍 DEBUG: Selected message: "السائق في الطريق"
🔍 DEBUG: Final notification content: {
  title: "السائق في الطريق",
  body: "تم العثور على سائق! تم تأكيد رحلتك."
}
```

### English User:
```
🔍 DEBUG: User language from database: en
🔍 DEBUG: Selected message: "Your driver is on the way"
🔍 DEBUG: Final notification content: {
  title: "Your driver is on the way",
  body: "Driver found! Your ride is confirmed."
}
```

---

## 🚨 **If Still Not Working**

1. **Check Database Connection:** Ensure MongoDB is connected and user data is accessible
2. **Verify Language Sync:** Check that `api.updateProfile({ language })` is actually being called
3. **Check Translation Object:** Verify `notificationMessages` contains all required keys
4. **Test Fresh Data:** Restart backend to ensure no cached user data

Run these debug logs and share the output - I'll identify exactly where the translation is failing!
