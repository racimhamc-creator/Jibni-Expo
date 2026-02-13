# Assets Directory

This directory contains app assets like icons, splash screens, etc.

## Required Assets

The following assets are referenced in `app.json`:

- `icon.png` - App icon (1024x1024px)
- `splash.png` - Splash screen (2048x2048px recommended)
- `adaptive-icon.png` - Android adaptive icon (1024x1024px)
- `favicon.png` - Web favicon (48x48px)
- `notification-icon.png` - Notification icon (96x96px)

## Quick Setup

### Option 1: Use Expo's Asset Generator
Run this command to generate placeholder assets:
```bash
npx expo-asset-generator
```

### Option 2: Create Simple Placeholders
You can create simple colored squares as placeholders:

1. **icon.png** - 1024x1024px blue square with "J" text
2. **splash.png** - 2048x2048px blue background
3. **adaptive-icon.png** - 1024x1024px blue square
4. **favicon.png** - 48x48px blue square
5. **notification-icon.png** - 96x96px blue square

### Option 3: Use Online Tools
- Use [Canva](https://www.canva.com) or [Figma](https://www.figma.com) to create icons
- Export as PNG with the required dimensions
- Use [Expo Asset Generator](https://www.npmjs.com/package/expo-asset-generator) for automated generation

## Temporary Fix

If you want to run the app without assets, you can temporarily comment out asset references in `app.json`, but this is not recommended for production.
