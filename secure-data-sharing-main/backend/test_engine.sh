#!/bin/bash
# This script tests the FULL ML engine with the corrected FORM-DATA login.

set -e # Exit immediately if any command fails.

# --- Configuration ---
BASE_URL="http://127.0.0.1:8000"
USERNAME="mahesh"
PASSWORD="mysecret"
TEST_FILE="iris.csv"
TEST_FILE_PATH="/c/Users/ju/OneDrive/Desktop/$TEST_FILE"
MODEL_NAME="iris_production_model"
TARGET_COLUMN="species"

echo_step() {
    echo ""
    echo "--- $1 ---"
}

# --- 1. Register User (in case DB was wiped) ---
echo_step "Registering user '$USERNAME' to ensure they exist..."
curl -s -X POST "$BASE_URL/users/register" \
     -H "Content-Type: application/json" \
     -d "{\"username\": \"$USERNAME\", \"password\": \"$PASSWORD\"}" > /dev/null || true
echo "✅ User registration step complete."

# --- 2. Login and Get Token ---
echo_step "Logging in..."
# ✅ THIS IS THE CORRECTED COMMAND TO SEND FORM DATA
TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$USERNAME&password=$PASSWORD")

TOKEN=$(echo "$TOKEN_RESPONSE" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')

if [ -z "$TOKEN" ]; then
  echo "❌ ERROR: Login failed. The server did not return a valid token."
  echo "   Server's Actual Response: $TOKEN_RESPONSE"
  exit 1
fi
echo "✅ Login successful."

# --- 3. Upload Dataset ---
echo_step "Uploading dataset '$TEST_FILE'..."
curl -s -X POST "$BASE_URL/files/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$TEST_FILE_PATH" > /dev/null
echo "✅ Dataset uploaded."

# --- 4. Train Model and Get its ID ---
echo_step "Training model '$MODEL_NAME'..."
TRAIN_RESPONSE=$(curl -s -X POST "$BASE_URL/ml/train?model_name=$MODEL_NAME&dataset_filename=$TEST_FILE&target_column=$TARGET_COLUMN" \
  -H "Authorization: Bearer $TOKEN")

MODEL_ID=$(echo "$TRAIN_RESPONSE" | sed -n 's/.*"id":\([0-9]*\),.*/\1/p')

if [ -z "$MODEL_ID" ]; then
    echo "❌ ERROR: Failed to train model or get its ID. Server response:"
    echo "$TRAIN_RESPONSE"
    exit 1
fi
echo "✅ Model trained successfully! Model ID: $MODEL_ID"
echo "   Accuracy: $(echo "$TRAIN_RESPONSE" | sed -n 's/.*"accuracy":\([0-9.]*\),.*/\1/p')"

# --- 5. Make a Prediction ---
echo_step "Making a prediction with Model ID: $MODEL_ID..."
PREDICT_RESPONSE=$(curl -s -X POST "$BASE_URL/ml/predict/$MODEL_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data": {"sepal_length": 5.1, "sepal_width": 3.5, "petal_length": 1.4, "petal_width": 0.2}}')

echo "🎯 Prediction Result: $PREDICT_RESPONSE"

# --- 6. Clean Up ---
echo_step "Cleaning up..."
curl -s -X DELETE "$BASE_URL/files/delete/$TEST_FILE" -H "Authorization: Bearer $TOKEN" > /dev/null
echo "✅ Deleted uploaded file: $TEST_FILE"
curl -s -X DELETE "$BASE_URL/ml/models/$MODEL_ID" -H "Authorization: Bearer $TOKEN" > /dev/null
echo "✅ Deleted trained model from registry: Model ID $MODEL_ID"

echo ""
echo "🎉🎉🎉"
echo "Full pipeline test complete!"
echo "🎉🎉🎉"
