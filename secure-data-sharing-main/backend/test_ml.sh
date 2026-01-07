#!/bin/bash
# Secure ML test script with error handling

set -e  # stop script if any command fails

BASE_URL="http://127.0.0.1:8000"
USERNAME="mahesh"
PASSWORD="mysecret"
FILENAME="iris.csv"
TARGET="species"

# ------------------------
# Helper to check response
# ------------------------
check_response() {
  if [[ "$1" == *"detail"* ]]; then
    echo "❌ Error: $1"
    exit 1
  fi
}

echo "🔑 Logging in..."
TOKEN=$(curl -s -X POST "$BASE_URL/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$USERNAME&password=$PASSWORD" | cut -d '"' -f4)

if [[ -z "$TOKEN" ]]; then
  echo "❌ Failed to get token"
  exit 1
fi
echo "✅ Got token."

echo "📂 Uploading file..."
UPLOAD=$(curl -s -X POST "$BASE_URL/files/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/c/Users/ju/OneDrive/Desktop/$FILENAME")
check_response "$UPLOAD"
echo "✅ File uploaded."

echo "📊 Analyzing dataset..."
ANALYZE=$(curl -s -X GET "$BASE_URL/ml/analyze?filename=$FILENAME" \
  -H "Authorization: Bearer $TOKEN")
check_response "$ANALYZE"
echo "✅ Dataset analyzed."

echo "🤖 Training model..."
TRAIN=$(curl -s -X POST "$BASE_URL/ml/train?filename=$FILENAME&target_column=$TARGET" \
  -H "Authorization: Bearer $TOKEN")
check_response "$TRAIN"
echo "✅ Model trained."

echo "🔮 Making prediction..."
PREDICTION=$(curl -s -X POST "$BASE_URL/ml/predict?filename=$FILENAME&target_column=$TARGET" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data":{"sepal_length":5.1,"sepal_width":3.5,"petal_length":1.4,"petal_width":0.2}}')
check_response "$PREDICTION"

echo "🎯 Final Prediction: $PREDICTION"
