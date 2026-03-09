# 🚀 Production Deployment Guide

## 📁 Environment Files (Simplified)

We use **only ONE** environment file for local development:

### `.env` (Local Development)
```bash
# Your backend API URL
EXPO_PUBLIC_API_URL=http://192.168.1.100:8080

# Google Maps API Key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Mapbox (optional)
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token
```

**That's it!** No other env files needed.

---

## 🚀 Production Build

For production builds, you have **2 options**:

### Option 1: Build with Environment Variables (Recommended)

```bash
# Build preview APK with production URL
eas build --platform android --profile preview-apk --env EXPO_PUBLIC_API_URL=https://your-railway-url.up.railway.app --env EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_production_key

# Build production AAB
eas build --platform android --profile production --env EXPO_PUBLIC_API_URL=https://your-railway-url.up.railway.app --env EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_production_key
```

### Option 2: Set in EAS Dashboard (Best for CI/CD)

1. Go to https://expo.dev/accounts/[your-account]/projects/[your-project]/environment-variables
2. Add your production variables:
   - `EXPO_PUBLIC_API_URL` = `https://your-railway-url.up.railway.app`
   - `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` = `your_restricted_api_key`
3. Build normally:
```bash
eas build --platform android --profile production
```

---

## 🔧 Development Workflow

### 1. Local Development
```bash
# Ensure .env exists with local backend URL
cat .env

# Should show:
# EXPO_PUBLIC_API_URL=http://192.168.1.100:8080

# Start development server
npx expo start
```

### 2. Test Production Build Locally
```bash
# Build APK with production backend URL for testing
eas build --platform android --profile preview-apk --env EXPO_PUBLIC_API_URL=https://your-railway-url.up.railway.app
```

### 3. Production Release
```bash
# Set variables in EAS dashboard once, then just:
eas build --platform android --profile production
```

---

## ⚠️ Important Rules

1. **Only use `.env`** for local development
2. **Never commit** `.env` to git (it's in .gitignore)
3. **Production variables** go in EAS dashboard or build command
4. **Always restart** Expo after changing .env

---

## 🐛 Troubleshooting

### "EXPO_PUBLIC_API_URL is not set"
```bash
# Check if .env exists
ls -la .env

# Create it if missing
echo "EXPO_PUBLIC_API_URL=http://192.168.1.100:8080" > .env
echo "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key" >> .env

# Restart Expo
npx expo start
```

### App connects to wrong backend
- Check `.env` file has correct URL
- Make sure you restarted Expo after changing it
- For production builds, check EAS dashboard variables

---

## ✅ Summary

| Environment | Where to set variables |
|-------------|------------------------|
| Local Dev | `.env` file |
| Production Build | EAS dashboard OR `--env` flag in build command |

**Simple as that!** 🎉
