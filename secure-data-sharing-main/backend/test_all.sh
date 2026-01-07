#!/bin/bash
# This script tests the full Secure ML System pipeline.
# It logs in, uploads a dataset, trains a model, lists all models,
# and finally cleans up by deleting the test file.

set -e # Exit immediately if a command exits with a non-zero status.

# --- Configuration ---
BASE_URL="http://127.0.0.1:8000"
USERNAME="mahesh"
PASSWORD="mysecret" # Change if you used a different password
TEST_FILE="iris.csv"
TEST_FILE_PATH="/c/Users/ju/OneDrive/Desktop/$TEST_FILE"
MODEL_NAME="iris_classifier"

# --- Helper Function for Clean Output ---
echo_step() {
    echo "------------------------------------"
    echo "➡️ $1"
    echo "------------------------------------"
}

# --- 1. Login and Get Token ---
echo_step "Logging in as '$USERNAME'..."
TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$USERNAME&password=$PASSWORD")

TOKEN=$(echo "$TOKEN_RESPONSE" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')

if [ -z "$TOKEN" ]; then
  echo "❌ ERROR: Login failed. Could not get token. Response was:"
  echo "$TOKEN_RESPONSE"
  exit 1
fi
echo "✅ Login successful. Token received."

# --- 2. Upload Dataset ---
echo_step "Uploading dataset '$TEST_FILE'..."
UPLOAD_RESPONSE=$(curl -s -X POST "$BASE_URL/files/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$TEST_FILE_PATH")
echo "✅ Server response: $UPLOAD_RESPONSE"

# --- 3. Train Model ---
echo_step "Training model '$MODEL_NAME'..."
TRAIN_RESPONSE=$(curl -s -X POST "$BASE_URL/ml/train?model_name=$MODEL_NAME" \
  -H "Authorization: Bearer $TOKEN")
echo "✅ Server response: $TRAIN_RESPONSE"

# --- 4. List All Models ---
echo_step "Listing all models for user '$USERNAME'..."
LIST_RESPONSE=$(curl -s -X GET "$BASE_URL/ml/models" \
  -H "Authorization: Bearer $TOKEN")
echo "✅ Server response: $LIST_RESPONSE"

# --- 5. Clean Up ---
echo_step "Cleaning up uploaded file '$TEST_FILE'..."
DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/files/delete/$TEST_FILE" \
  -H "Authorization: Bearer $TOKEN")
echo "✅ Server response: $DELETE_RESPONSE"

echo "------------------------------------"
echo "🎉 All tests completed successfully!"
echo "------------------------------------"