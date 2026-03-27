#!/bin/bash
BASE_URL="https://preview-chat-3286341f-bf13-4a10-be2d-eea782660c9d.space.z.ai"
COOKIE_FILE="/tmp/project-test-cookies.txt"
PROJECT_ID="proj-his-001"

rm -f $COOKIE_FILE

echo "Testing Project APIs with Authentication"
echo "========================================="

# Step 1: Login
CSRF=$(curl -s -c $COOKIE_FILE -b $COOKIE_FILE "$BASE_URL/api/auth/csrf" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)
curl -s -c $COOKIE_FILE -b $COOKIE_FILE -X POST "$BASE_URL/api/auth/callback/credentials" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "email=admin@schema-architect.com&password=Admin123!&csrfToken=$CSRF" > /dev/null

# Verify login
SESSION=$(curl -s -b $COOKIE_FILE "$BASE_URL/api/auth/session")
echo "Logged in as: $(echo $SESSION | grep -o '"name":"[^"]*"' | cut -d'"' -f4)"

# Step 2: Test project-status API
echo ""
echo "1. Project Status API:"
STATUS=$(curl -s -b $COOKIE_FILE "$BASE_URL/api/project-status?projectId=$PROJECT_ID")
echo "   Project Name: $(echo $STATUS | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('project',{}).get('name',d.get('error','unknown')))")"
echo "   Files: $(echo $STATUS | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('counts',{}).get('files','?'))")"

# Step 3: Test project tables API
echo ""
echo "2. Project Tables API:"
TABLES=$(curl -s -b $COOKIE_FILE "$BASE_URL/api/project/$PROJECT_ID/tables")
echo "   Result: $(echo $TABLES | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('tables',[])) if isinstance(d,dict) else 'error')")"

# Step 4: Test project views API  
echo ""
echo "3. Project Views API:"
VIEWS=$(curl -s -b $COOKIE_FILE "$BASE_URL/api/project/$PROJECT_ID/views")
echo "   Result: $(echo $VIEWS | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('views',[])) if isinstance(d,dict) else 'error')")"

# Step 5: Test files API
echo ""
echo "4. Files API:"
FILES=$(curl -s -b $COOKIE_FILE "$BASE_URL/api/projects/files?projectId=$PROJECT_ID")
echo "   Files count: $(echo $FILES | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('files',[])) if isinstance(d,dict) else 'error')")"

rm -f $COOKIE_FILE
echo ""
echo "Test Complete!"
