#!/bin/bash

# Jibni Production Deployment Script
# Simple deployment helper

echo "🚀 Jibni Production Deployment"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Creating .env template..."
    echo "EXPO_PUBLIC_API_URL=http://192.168.1.100:8080" > .env
    echo "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here" >> .env
    echo ""
    echo -e "${YELLOW}⚠️  Please edit .env and set your values:${NC}"
    echo "   1. Open .env in your editor"
    echo "   2. Set EXPO_PUBLIC_API_URL to your backend URL"
    echo "   3. Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ .env file found${NC}"
echo ""

# Show current configuration
echo "Current development configuration:"
grep "EXPO_PUBLIC" .env | grep -v "^#"
echo ""

# Ask for production URL
echo -e "${YELLOW}Production Deployment${NC}"
echo "---------------------"
echo "Enter your Railway backend URL for production build:"
echo "(e.g., https://jibni-api.up.railway.app)"
read -p "Production API URL: " PROD_URL

if [ -z "$PROD_URL" ]; then
    echo -e "${RED}❌ Production URL is required${NC}"
    exit 1
fi

echo ""
echo "Choose build type:"
echo "1. Preview APK (for testing with production backend)"
echo "2. Production AAB (for Play Store)"
read -p "Enter choice (1 or 2): " BUILD_CHOICE

echo ""

if [ "$BUILD_CHOICE" = "1" ]; then
    echo -e "${YELLOW}Building Preview APK...${NC}"
    echo "This will take 10-15 minutes"
    echo ""
    eas build --platform android --profile preview-apk \
        --env EXPO_PUBLIC_API_URL="$PROD_URL"
      
elif [ "$BUILD_CHOICE" = "2" ]; then
    echo -e "${YELLOW}Building Production AAB...${NC}"
    echo "This will take 15-20 minutes"
    echo ""
    eas build --platform android --profile production \
        --env EXPO_PUBLIC_API_URL="$PROD_URL"
else
    echo -e "${RED}Invalid choice${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ Build Started!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "You'll receive an email when the build is ready."
echo ""
echo "To check build status:"
echo "  eas build:list"
echo ""
echo "To set permanent production variables in EAS:"
echo "  1. Go to https://expo.dev"
echo "  2. Open your project"
echo "  3. Go to Environment Variables"
echo "  4. Add EXPO_PUBLIC_API_URL = $PROD_URL"
echo ""
