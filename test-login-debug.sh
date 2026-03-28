#!/bin/bash
BASE_URL="https://preview-chat-3286341f-bf13-4a10-be2d-eea782660c9d.space.z.ai"
COOKIE_FILE="/tmp/login-debug-cookies.txt"

rm -f $COOKIE_FILE

echo "Testing Login Flow Step by Step"
echo "================================"

# Step 1: Get CSRF token
echo ""
echo "1. Getting CSRF token..."
CSRF_RESPONSE=$(curl -s -c $COOKIE_FILE -b $COOKIE_FILE "$BASE_URL/api/auth/csrf")
echo "CSRF Response: $CSRF_RESPONSE"

CSRF_TOKEN=$(echo $CSRF_RESPONSE | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)
echo "Extracted Token: $CSRF_TOKEN"

# Step 2: Get providers
echo ""
echo "2. Getting providers..."
PROVIDERS=$(curl -s "$BASE_URL/api/auth/providers")
echo "Providers: $PROVIDERS"

# Step 3: Login
echo ""
echo "3. Attempting login..."
LOGIN_RESPONSE=$(curl -s -c $COOKIE_FILE -b $COOKIE_FILE -L \
    -X POST "$BASE_URL/api/auth/callback/credentials" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "email=admin%40schema-architect.com&password=Admin123%21&csrfToken=$CSRF_TOKEN")

# Check for error in response
if echo "$LOGIN_RESPONSE" | grep -q "CredentialsSignin"; then
    echo "ERROR: CredentialsSignin - Invalid credentials"
elif echo "$LOGIN_RESPONSE" | grep -q "Configuration"; then
    echo "ERROR: Configuration error"
elif echo "$LOGIN_RESPONSE" | grep -q "Welcome back"; then
    echo "RESULT: Login page returned (likely error)"
else
    echo "RESULT: Unexpected response"
fi

# Step 4: Check cookies
echo ""
echo "4. Cookies stored:"
cat $COOKIE_FILE | grep -v "^#" | grep -v "^$"

# Step 5: Check session
echo ""
echo "5. Checking session..."
SESSION=$(curl -s -b $COOKIE_FILE "$BASE_URL/api/auth/session")
echo "Session: $SESSION"

rm -f $COOKIE_FILE
