#!/bin/bash
BASE_URL="https://preview-chat-3286341f-bf13-4a10-be2d-eea782660c9d.space.z.ai"
COOKIE_FILE="/tmp/login-test-cookies.txt"

echo "Testing Login Flow on Preview Deployment"
echo "========================================="

# Step 1: Get CSRF token
echo ""
echo "1. Getting CSRF token..."
CSRF_RESPONSE=$(curl -s -c $COOKIE_FILE -b $COOKIE_FILE "$BASE_URL/api/auth/csrf" 2>/dev/null)
echo "Response: $CSRF_RESPONSE"

CSRF_TOKEN=$(echo $CSRF_RESPONSE | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)
echo "CSRF Token: $CSRF_TOKEN"

# Step 2: Login with credentials
echo ""
echo "2. Logging in..."
LOGIN_RESPONSE=$(curl -s -c $COOKIE_FILE -b $COOKIE_FILE -L -w "\nHTTP Status: %{http_code}" \
    -X POST "$BASE_URL/api/auth/callback/credentials" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "email=admin@schema-architect.com&password=Admin123!&csrfToken=$CSRF_TOKEN" 2>/dev/null | tail -5)
echo "Login response status: $LOGIN_RESPONSE"

# Step 3: Check session
echo ""
echo "3. Checking session..."
SESSION=$(curl -s -b $COOKIE_FILE "$BASE_URL/api/auth/session" 2>/dev/null)
echo "Session: $SESSION"

# Step 4: Test protected API
echo ""
echo "4. Testing protected API..."
PROJECT_STATUS=$(curl -s -b $COOKIE_FILE "$BASE_URL/api/project-status?projectId=proj-his-001" 2>/dev/null | head -c 300)
echo "Project Status: $PROJECT_STATUS"

rm -f $COOKIE_FILE
