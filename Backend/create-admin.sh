#!/bin/bash

# Admin Account Creation Script
# Usage: ./create-admin.sh +213XXXXXXXXX

if [ -z "$1" ]; then
    echo "Usage: ./create-admin.sh +213XXXXXXXXX"
    echo ""
    echo "Example:"
    echo "  ./create-admin.sh +213555123456"
    exit 1
fi

PHONE=$1

echo "🔧 Creating admin account for $PHONE..."
npx tsx src/scripts/createAdmin.ts "$PHONE"
