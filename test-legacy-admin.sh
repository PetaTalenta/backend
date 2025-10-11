#!/bin/bash

echo "=== Testing Legacy Admin Endpoints ==="

# Get admin token
echo "Getting admin token..."
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3007/admin/direct/login \
  -H "Content-Type: application/json" \
  -d '{"email": "superadmin@futureguide.com", "password": "admin123"}')

TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.data.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Failed to get admin token"
    exit 1
fi

echo "✅ Admin token obtained"

# Test legacy admin endpoints
echo ""
echo "Testing legacy admin endpoints..."

echo "1. Testing GET /admin/users"
USERS_RESPONSE=$(curl -s "http://localhost:3007/admin/users?page=1&limit=3" \
  -H "Authorization: Bearer $TOKEN")
USERS_SUCCESS=$(echo "$USERS_RESPONSE" | jq -r '.success // false')

if [ "$USERS_SUCCESS" = "true" ]; then
    echo "✅ Legacy users endpoint working"
    USER_COUNT=$(echo "$USERS_RESPONSE" | jq -r '.data.users | length')
    echo "   Found $USER_COUNT users"
else
    echo "❌ Legacy users endpoint failed"
    echo "   Response: $USERS_RESPONSE"
fi

echo ""
echo "2. Testing GET /admin/jobs"
JOBS_RESPONSE=$(curl -s "http://localhost:3007/admin/jobs?page=1&limit=3" \
  -H "Authorization: Bearer $TOKEN")
JOBS_SUCCESS=$(echo "$JOBS_RESPONSE" | jq -r '.success // false')

if [ "$JOBS_SUCCESS" = "true" ]; then
    echo "✅ Legacy jobs endpoint working"
else
    echo "❌ Legacy jobs endpoint failed"
    echo "   Response: $JOBS_RESPONSE"
fi

echo ""
echo "3. Testing regular user login (to verify users not affected)"
USER_LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "kasykoi@gmail.com", "password": "Anjas123"}')

USER_LOGIN_SUCCESS=$(echo "$USER_LOGIN_RESPONSE" | jq -r '.success // false')

if [ "$USER_LOGIN_SUCCESS" = "true" ]; then
    echo "✅ Regular user login still working"
    USER_EMAIL=$(echo "$USER_LOGIN_RESPONSE" | jq -r '.data.user.email')
    echo "   User: $USER_EMAIL"
else
    echo "❌ Regular user login affected!"
    echo "   Response: $USER_LOGIN_RESPONSE"
fi

echo ""
echo "=== Legacy Endpoints Test Complete ==="
