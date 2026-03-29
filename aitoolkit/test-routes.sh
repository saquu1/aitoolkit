#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=========================================="
echo "TESTING API ROUTES"
echo "=========================================="

# API Routes to test - 200, 401, 405 are considered "working"
API_ROUTES=(
  "/api/health"
  "/api/projects"
  "/api/toolkit?action=list-projects"
  "/api/project/cmmtztnf0000p680l9xcj0ol/tables"
  "/api/project/cmmtztnf0000p680l9xcj0ol/component-preview"
  "/api/parsers"
  "/api/generators"
  "/api/intelligence"
  "/api/fk-resolution"
  "/api/schema"
  "/api/validation"
  "/api/export"
  "/api/file-system"
  "/api/file-manager"
  "/api/monitoring"
  "/api/notifications"
  "/api/billing"
  "/api/auth/session"
)

for route in "${API_ROUTES[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$route" 2>/dev/null)
  if [ "$status" = "200" ] || [ "$status" = "201" ] || [ "$status" = "401" ] || [ "$status" = "405" ] || [ "$status" = "400" ]; then
    echo "✅ $route - $status"
  else
    echo "❌ $route - $status"
  fi
done

echo ""
echo "=========================================="
echo "TESTING PAGE ROUTES"
echo "=========================================="

PAGE_ROUTES=(
  "/"
  "/login"
  "/register"
  "/auth/error"
  "/project/cmmtztnf0000p680l9xcj0ol"
  "/project/cmmtztnf0000p680l9xcj0ol/files"
  "/project/cmmtztnf0000p680l9xcj0ol/tables"
  "/project/cmmtztnf0000p680l9xcj0ol/component-preview"
  "/project/cmmtztnf0000p680l9xcj0ol/upload"
  "/project/cmmtztnf0000p680l9xcj0ol/fk-resolution"
  "/project/cmmtztnf0000p680l9xcj0ol/intelligence"
  "/project/cmmtztnf0000p680l9xcj0ol/modules"
  "/project/cmmtztnf0000p680l9xcj0ol/prisma"
  "/project/cmmtztnf0000p680l9xcj0ol/procedures"
  "/project/cmmtztnf0000p680l9xcj0ol/settings"
  "/project/cmmtztnf0000p680l9xcj0ol/views"
)

for route in "${PAGE_ROUTES[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$route" 2>/dev/null)
  # 200 = OK, 302/307 = Redirect (auth required), 401 = Unauthorized
  if [ "$status" = "200" ]; then
    echo "✅ $route - $status (OK)"
  elif [ "$status" = "302" ] || [ "$status" = "307" ]; then
    echo "✅ $route - $status (auth redirect)"
  elif [ "$status" = "401" ]; then
    echo "✅ $route - $status (requires auth)"
  else
    echo "❌ $route - $status"
  fi
done

echo ""
echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo "All routes tested. 302/307 redirects indicate auth is working correctly."
echo "Done!"
