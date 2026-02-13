# Fresh Expo Project Setup - Step by Step

## Step 1: Create Fresh Expo Project

Run this in your terminal:

```bash
cd /Users/mostarlens/Desktop/Jibni-Expo
npx create-expo-app@latest Frontend-Fresh --template blank-typescript
```

## Step 2: Navigate to Project

```bash
cd Frontend-Fresh
```

## Step 3: Install Expo Router

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants
```

## Step 4: Install Core Dependencies

```bash
npm install @tanstack/react-query zustand @shopify/restyle react-i18next i18next
```

## Step 5: Install UI Dependencies

```bash
npm install @gorhom/bottom-sheet react-hook-form @hookform/resolvers zod
```

## Step 6: Install Expo Packages

```bash
npx expo install expo-location expo-image-picker expo-media-library expo-notifications expo-device expo-clipboard expo-status-bar expo-system-ui
```

## Step 7: Install React Native Packages

```bash
npm install react-native-blasted-image react-native-keyboard-aware-scroll-view react-native-otp-textinput react-native-svg
```

## Step 8: Install Additional Packages

```bash
npm install libphonenumber-js luxon socket.io-client
```

## Step 9: Install Dev Dependencies

```bash
npm install --save-dev @types/react @types/react-native
```

## Step 10: Install Maps (Optional - requires dev build)

```bash
npx expo install react-native-maps
npx expo install expo-dev-client
```

## Step 11: Install Reanimated (Optional - requires dev build)

```bash
npx expo install react-native-reanimated
```

## After Installation

Once all packages are installed, we'll:
1. Set up the app structure
2. Copy UI components
3. Copy screens
4. Set up services
5. Set up stores
6. Copy translations
7. Copy assets

Run the commands above, then let me know when you're ready for the next step!
