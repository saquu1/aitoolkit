#!/bin/bash
BASE_URL="https://preview-chat-3286341f-bf13-4a10-be2d-eea782660c9d.space.z.ai"
COOKIE_FILE="/tmp/final-test-cookies.txt"
PROJECT_ID="proj-his-001"

rm -f $COOKIE_FILE

echo "Final API Test with Authentication"
echo "=================================="

# Get CSRF and login
CSRF=$(curl -s -c $COOKIE_FILE -b $COOKIE_FILE "$BASE_URL/api/auth/csrf" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)
curl -s -c $COOKIE_FILE -b $COOKIE_FILE -X POST "$BASE_URL/api/auth/callback/credentials" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "email=admin@schema-architect.com&password=Admin123!&csrfToken=$CSRF" > /dev/null

echo ""
echo "Testing Project APIs:"
echo ""

# Test project status
echo "1. Project Status:"
STATUS=$(curl -s -b $COOKIE_FILE "$BASE_URL/api/project-status?projectId=$PROJECT_ID")
echo "   Status: $(echo $STATUS | head -c 200)..."

# Test tables
echo ""
echo "2. Tables API:"
TABLES=$(curl -s -b $COOKIE_FILE "$BASE_URL/api/project/$PROJECT_ID/tables")
echo "   Result: $(echo $TABLES | head -c 100)..."

# Test views
echo ""
echo "3. Views API:"
VIEWS=$(curl -s -b $COOKIE_FILE "$BASE_URL/api/project/$PROJECT_ID/views")
echo "   Result: $(echo $VIEWS | head -c 100)..."

# Test parsers
echo ""
echo "4. Parsers API:"
PARSERS=$(curl -s -b $COOKIE_FILE "$BASE_URL/api/project/$PROJECT_ID/parsers")
echo "   Result: $(echo $PARSERS | head -c 100)..."

# Test files
echo ""
echo "5. Files API:"
FILES=$(curl -s -b $COOKIE_FILE "$BASE_URL/api/projects/files?projectId=$PROJECT_ID")
echo "   Result: $(echo $FILES | head -c 100)..."

rm -f $COOKIE_FILE
echo ""
echo "Test Complete!"
