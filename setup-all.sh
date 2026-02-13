#!/bin/bash

# Complete setup script for fresh Expo project
# Run this after creating the project with: npx create-expo-app@latest Frontend-Fresh --template blank-typescript

cd /Users/mostarlens/Desktop/Jibni-Expo/Frontend-Fresh

echo "📦 Installing Expo Router..."
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants

echo "📦 Installing Core Dependencies..."
npm install @tanstack/react-query zustand @shopify/restyle react-i18next i18next

echo "📦 Installing UI Dependencies..."
npm install @gorhom/bottom-sheet react-hook-form @hookform/resolvers zod

echo "📦 Installing Expo Packages..."
npx expo install expo-location expo-image-picker expo-media-library expo-notifications expo-device expo-clipboard expo-status-bar expo-system-ui

echo "📦 Installing React Native Packages..."
npm install react-native-blasted-image react-native-keyboard-aware-scroll-view react-native-otp-textinput react-native-svg

echo "📦 Installing Additional Packages..."
npm install libphonenumber-js luxon socket.io-client

echo "📦 Installing Dev Dependencies..."
npm install --save-dev @types/react @types/react-native

echo "📦 Installing Maps and Dev Client..."
npx expo install react-native-maps expo-dev-client

echo "📦 Installing Reanimated..."
npx expo install react-native-reanimated

echo "✅ All dependencies installed!"
echo "Next: We'll set up the project structure"
