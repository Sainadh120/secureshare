#!/bin/bash
set -e

API_URL="http://127.0.0.1:8000"
USERNAME="mahesh"
PASSWORD="your_password"   # 🔹 change this to your real password

echo "🔑 Logging in..."
TOKEN=$(curl -s -X POST "$API_URL/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$USERNAME&password=$PASSWORD" | jq -r .access_token)

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi
echo "✅ Got token."

echo "🤖 Training model..."
TRAIN_RESPONSE=$(curl -s -X POST "$API_URL/ml/train?model_name=iris_classifier" \
  -H "Authorization: Bearer $TOKEN")

echo "📊 Train Response: $TRAIN_RESPONSE"

echo "📂 Listing models..."
LIST_RESPONSE=$(curl -s -X GET "$API_URL/ml/models" \
  -H "Authorization: Bearer $TOKEN")

echo "📜 Models:"
echo "$LIST_RESPONSE" | jq .
