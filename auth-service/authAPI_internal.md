# Auth Service - Internal API Documentation

## Overview
Auth Service menyediakan API internal untuk komunikasi antar service dalam ekosistem ATMA. API ini digunakan oleh **Assessment Service**, **Archive Service**, **Analysis Worker**, dan service internal lainnya untuk verifikasi token dan manajemen user.

**Service Information:**
- **Service Name:** auth-service
- **Internal Port:** 3001
- **Internal Base URL:** `http://localhost:3001/`
- **Version:** 1.0.0

## Internal Authentication
Semua endpoint internal menggunakan service authentication dengan header khusus.

**Required Headers:**
```
X-Internal-Service: true
X-Service-Key: <internal_service_secret_key>
```

**Service Key:** Didefinisikan dalam environment variable `INTERNAL_SERVICE_KEY`

---

## 🔐 Token Verification - Internal Endpoints

### POST /auth/verify-token
Memverifikasi validitas JWT token user untuk service-to-service communication.

**Authentication:** Public (no authentication required)
**Used by:** Assessment Service, Archive Service, Analysis Worker

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "username": "johndoe",
      "user_type": "user",
      "is_active": true,
      "token_balance": 100,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Response Invalid Token (200):**
```json
{
  "success": true,
  "data": {
    "valid": false,
    "error": "Invalid or expired token"
  }
}
```

**Validation Errors (400):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": ["Token is required"]
  }
}
```

---

## 💰 Token Balance Management - Internal Endpoints

### PUT /auth/token-balance
Update user token balance untuk service-to-service communication.

**Authentication:** Internal Service Authentication Required
**Used by:** Assessment Service, Archive Service

**Headers:**
```
X-Internal-Service: true
X-Service-Key: <internal_service_secret_key>
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 50,
  "operation": "subtract"
}
```

**Request Parameters:**
- `userId` (string, required): UUID of the user
- `amount` (number, required): Amount to add/subtract (positive integer)
- `operation` (string, required): Either "add" or "subtract"

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "previousBalance": 100,
    "newBalance": 50,
    "operation": "subtract",
    "amount": 50,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

**Response User Not Found (404):**
```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found"
  }
}
```

**Response Insufficient Balance (400):**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient token balance"
  }
}
```

**Authentication Errors (401):**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Internal service access required"
  }
}
```

**Validation Errors (400):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      "User ID is required",
      "Amount must be a positive number",
      "Operation must be either 'add' or 'subtract'"
    ]
  }
}
```

---

## 🔧 Service Integration Examples

### Assessment Service Integration
```javascript
// Verify user token before processing assessment
const verifyUserToken = async (token) => {
  const response = await fetch('http://localhost:3001/auth/verify-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ token })
  });
  
  const result = await response.json();
  return result.data.valid ? result.data.user : null;
};

// Deduct tokens after assessment completion
const deductTokens = async (userId, amount) => {
  const response = await fetch('http://localhost:3001/auth/token-balance', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Service': 'true',
      'X-Service-Key': process.env.INTERNAL_SERVICE_KEY
    },
    body: JSON.stringify({
      userId,
      amount,
      operation: 'subtract'
    })
  });
  
  return await response.json();
};
```

### Archive Service Integration
```javascript
// Verify admin token for admin endpoints
const verifyAdminAccess = async (token) => {
  const response = await fetch('http://localhost:3001/auth/verify-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ token })
  });
  
  const result = await response.json();
  if (result.data.valid && result.data.user.user_type === 'admin') {
    return result.data.user;
  }
  return null;
};
```

---

## 📋 Error Codes Reference

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `USER_NOT_FOUND` | User not found in database | 404 |
| `INSUFFICIENT_BALANCE` | User has insufficient token balance | 400 |
| `UNAUTHORIZED` | Missing or invalid internal service authentication | 401 |
| `INVALID_TOKEN` | JWT token is invalid or expired | 200 (in verify-token response) |
| `INTERNAL_ERROR` | Internal server error | 500 |

---

## 🔒 Security Notes

1. **Service Key Protection:** Pastikan `INTERNAL_SERVICE_KEY` disimpan dengan aman dan tidak di-commit ke repository
2. **Network Security:** Internal endpoints hanya boleh diakses dari dalam network internal
3. **Rate Limiting:** Implementasikan rate limiting pada service level untuk mencegah abuse
4. **Logging:** Semua internal service calls di-log untuk audit trail
5. **Token Validation:** Selalu validasi token sebelum melakukan operasi yang memerlukan user context

---

## 📞 Service Discovery

**Health Check Endpoint:**
```
GET http://localhost:3001/health
```

**Service Info:**
```
GET http://localhost:3001/
```

**Response:**
```json
{
  "success": true,
  "message": "ATMA Auth Service is running",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```
