#!/bin/bash

# Test Script to Update User Language
# This script tests the language update API endpoint

echo "🧪 Testing Language Update API..."

# Test updating user language to Arabic
echo "📝 Updating user language to Arabic..."
curl -X PUT http://localhost:3000/api/users/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "language": "ar"
  }'

echo -e "\n\n📝 Updating user language to French..."
curl -X PUT http://localhost:3000/api/users/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "language": "fr"
  }'

echo -e "\n\n📝 Updating user language to English..."
curl -X PUT http://localhost:3000/api/users/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "language": "en"
  }'

echo -e "\n\n✅ Language update test complete!"
echo "📝 Replace YOUR_JWT_TOKEN with actual JWT token from your app"
echo "🔍 Check backend logs for: 🌍 Updated user XXX language to: ar"
