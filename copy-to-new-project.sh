#!/bin/bash

# Script to copy all files from Frontend to Frontend-New
# Run this from the Jibni-Expo directory

echo "Copying project files..."

# Create Frontend-New directory if it doesn't exist
mkdir -p Frontend-New

# Copy all source directories
cp -r Frontend/src Frontend-New/
cp -r Frontend/app Frontend-New/
cp -r Frontend/services Frontend-New/
cp -r Frontend/stores Frontend-New/
cp -r Frontend/hooks Frontend-New/
cp -r Frontend/types Frontend-New/
cp -r Frontend/utils Frontend-New/
cp -r Frontend/assets Frontend-New/

# Copy individual files
cp Frontend/.gitignore Frontend-New/ 2>/dev/null || true
cp Frontend/README.md Frontend-New/ 2>/dev/null || true

echo "✅ Files copied successfully!"
echo "Now run: cd Frontend-New && npm install"
