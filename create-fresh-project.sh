#!/bin/bash

# Script to create a fresh Expo project
echo "🚀 Creating fresh Expo project..."

cd /Users/mostarlens/Desktop/Jibni-Expo

# Remove old project if exists
rm -rf Frontend-Fresh

# Create new Expo project with TypeScript
npx create-expo-app@latest Frontend-Fresh --template blank-typescript

echo "✅ Project created!"
echo "Next steps:"
echo "1. cd Frontend-Fresh"
echo "2. npm install"
echo "3. npx expo install expo-router"
