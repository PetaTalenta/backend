# ATMA API Gateway - External API Documentation

## Overview
ATMA API Gateway adalah entry point tunggal untuk semua komunikasi dengan backend services. Gateway ini mengelola routing, authentication, rate limiting, dan security untuk seluruh sistem ATMA (AI-Driven Talent Mapping Assessment).

**Gateway Information:**
- **Service Name:** api-gateway
- **Port:** 3000
- **Base URL:** `http://localhost:3000`
- **Version:** 1.0.0

## 🏗️ Architecture Overview

```
Client Application
       ↓
API Gateway (Port 3000)
       ↓
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│  Auth Service   │ Archive Service │Assessment Service│Notification Svc │
│   (Port 3001)   │   (Port 3002)   │   (Port 3003)   │   (Port 3005)   │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

## 🔐 Authentication

### JWT Token Authentication
Sebagian besar endpoint memerlukan JWT token yang diperoleh dari login.

**Header Required:**
```
Authorization: Bearer <jwt_token>
```

### Internal Service Authentication
Untuk komunikasi antar service (tidak untuk client):
```
X-Service-Key: <internal_service_key>
X-Internal-Service: true
```

## 📊 Rate Limiting

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| General Gateway | 5000 requests | 15 minutes |
| Auth Endpoints | 100 requests | 15 minutes |
| Admin Endpoints | 50 requests | 15 minutes |
| Assessment Endpoints | 100 requests | 15 minutes |
| Archive Endpoints | 5000 requests | 15 minutes |

## 🌐 CORS Configuration

**Allowed Origins:**
- `http://localhost:3000`
- `http://localhost:8080`
- `http://localhost:5173`

**Allowed Methods:** GET, POST, PUT, DELETE, OPTIONS
**Allowed Headers:** Content-Type, Authorization, X-Service-Key, X-Internal-Service

---

## 🔐 Authentication & User Management

### Public Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "myPassword1"
}
```

**Validation Rules:**
- **email**: Valid email format, maximum 255 characters, required
- **password**: Minimum 8 characters, must contain at least one letter and one number, required

#### Batch Register Users
```http
POST /api/auth/register/batch
Content-Type: application/json

{
  "users": [
    {"email": "user1@example.com", "password": "myPassword1"},
    {"email": "user2@example.com", "password": "anotherPass2"}
  ]
}
```

**Validation Rules:**
- **users**: Array of user objects, maximum 50 users per batch, required
- Each user object follows same validation as single registration
- Duplicate emails within batch are not allowed

#### User Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "myPassword1"
}
```

**Validation Rules:**
- **email**: Valid email format, required
- **password**: Required (no specific format validation for login)

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "user_type": "user",
      "token_balance": 100
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Protected User Endpoints

#### Get User Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

#### Update User Profile
```http
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "johndoe",
  "full_name": "John Doe",
  "school_id": 1,
  "date_of_birth": "1990-01-15",
  "gender": "male"
}
```

**Validation Rules:**
- **username**: Alphanumeric only, 3-100 characters, optional
- **email**: Valid email format, maximum 255 characters, optional
- **full_name**: Maximum 100 characters, optional
- **school_id**: Positive integer, optional
- **date_of_birth**: ISO date format (YYYY-MM-DD), cannot be future date, optional
- **gender**: Must be one of: "male", "female", "other", "prefer_not_to_say", optional

#### Delete User Profile
```http
DELETE /api/auth/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Profile deleted successfully"
}
```

**⚠️ Note:** This endpoint only deletes the user profile (user_profiles table), not the user account itself. For complete user account deletion, use the DELETE /api/auth/account endpoint.

#### Delete User Account
```http
DELETE /api/auth/account
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Account deleted successfully",
  "data": {
    "deletedAt": "2024-01-15T10:30:00.000Z",
    "originalEmail": "user@example.com"
  }
}
```

**⚠️ Important Notes:**
- This endpoint performs **soft delete** by changing the user's email to format `deleted_{timestamp}_{original_email}`
- User's token balance will be reset to 0
- User's `is_active` status will be set to `false`
- User profile will also be automatically deleted
- This operation cannot be undone, ensure confirmation before deleting account
- After account deletion, user cannot login with this account anymore

#### Change Password
```http
POST /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldPassword1",
  "newPassword": "newPassword2"
}
```

**Validation Rules:**
- **currentPassword**: Required
- **newPassword**: Minimum 8 characters, must contain at least one letter and one number, required

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

#### Get Token Balance
```http
GET /api/auth/token-balance
Authorization: Bearer <token>
```

### School Management

#### Get Schools
```http
GET /api/auth/schools
Authorization: Bearer <token>
```

#### Create School
```http
POST /api/auth/schools
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "SMA Negeri 1 Jakarta",
  "address": "Jl. Sudirman No. 1",
  "city": "Jakarta",
  "province": "DKI Jakarta"
}
```

**Validation Rules:**
- **name**: Maximum 200 characters, required
- **address**: Optional
- **city**: Maximum 100 characters, optional
- **province**: Maximum 100 characters, optional

#### Get Schools by Location
```http
GET /api/auth/schools/by-location?city=Jakarta
Authorization: Bearer <token>
```

#### Get School Users
```http
GET /api/auth/schools/:schoolId/users
Authorization: Bearer <token>
```

---

## 👨‍💼 Admin Management

### Admin Authentication

#### Admin Login
```http
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "Admin123!"
}
```

**Validation Rules:**
- **username**: Required (can be username or email)
- **password**: Required (no specific format validation for login)

### Protected Admin Endpoints

#### Get Admin Profile
```http
GET /api/admin/profile
Authorization: Bearer <admin_token>
```

#### Register New Admin (Superadmin only)
```http
POST /api/admin/register
Authorization: Bearer <superadmin_token>
Content-Type: application/json

{
  "username": "newadmin",
  "email": "newadmin@atma.com",
  "password": "NewAdmin123!",
  "full_name": "New Admin",
  "user_type": "admin"
}
```

**Validation Rules:**
- **username**: Alphanumeric only, 3-100 characters, required
- **email**: Valid email format, maximum 255 characters, required
- **password**: Minimum 8 characters, maximum 128 characters, must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&), required
- **full_name**: Maximum 255 characters, optional
- **user_type**: Must be one of: "admin", "superadmin", "moderator", defaults to "admin"

### Admin User Management

#### Get All Users (Admin Only)
```http
GET /api/archive/admin/users?page=1&limit=10&search=user@example.com
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `search`: Search by email or username
- `user_type`: Filter by user type (user, admin, superadmin, moderator)
- `is_active`: Filter by active status (true/false)

#### Get User by ID (Admin Only)
```http
GET /api/archive/admin/users/:userId
Authorization: Bearer <admin_token>
```

#### Update User Token Balance (Admin Only)
```http
PUT /api/archive/admin/users/:userId/token-balance
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "token_balance": 100
}
```

**Validation Rules:**
- **token_balance**: Integer, minimum 0, required

#### Delete User (Admin Only)
```http
DELETE /api/archive/admin/users/:userId
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": {
    "deletedUser": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "originalEmail": "user@example.com",
      "deletedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**⚠️ Important Notes:**
- **Soft Delete:** User email is changed to `deleted_{timestamp}_{original_email}` format
- **Token Reset:** User token balance is reset to 0
- **Role Requirement:** Only admin or superadmin roles can delete users
- **Irreversible:** This operation cannot be undone
- **Service:** Handled by Archive Service via API Gateway

---

## 🎯 Assessment Service

### Submit Assessment
```http
POST /api/assessment/submit
Authorization: Bearer <token>
Content-Type: application/json
X-Idempotency-Key: <unique_key> (optional)

{
  "assessmentName": "AI-Driven Talent Mapping",
  "riasec": {
    "realistic": 75,
    "investigative": 80,
    "artistic": 65,
    "social": 70,
    "enterprising": 85,
    "conventional": 60
  },
  "ocean": {
    "openness": 80,
    "conscientiousness": 75,
    "extraversion": 70,
    "agreeableness": 85,
    "neuroticism": 40
  },
  "viaIs": {
    "creativity": 80,
    "curiosity": 85,
    "judgment": 75,
    "loveOfLearning": 90,
    "perspective": 70,
    "bravery": 65,
    "perseverance": 80,
    "honesty": 85,
    "zest": 75,
    "love": 80,
    "kindness": 85,
    "socialIntelligence": 75,
    "teamwork": 80,
    "fairness": 85,
    "leadership": 70,
    "forgiveness": 75,
    "humility": 80,
    "prudence": 75,
    "selfRegulation": 80,
    "appreciationOfBeauty": 70,
    "gratitude": 85,
    "hope": 80,
    "humor": 75,
    "spirituality": 60
  }
}
```

**Field Validation:**
- `assessmentName` (optional): Must be one of "AI-Driven Talent Mapping", "AI-Based IQ Test", or "Custom Assessment"
- `riasec` (required): RIASEC assessment with 6 dimensions (realistic, investigative, artistic, social, enterprising, conventional)
- `ocean` (required): Big Five personality traits (openness, conscientiousness, extraversion, agreeableness, neuroticism)
- `viaIs` (required): VIA-IS character strengths - all 24 strengths must be provided
- All scores must be integers between 0-100

**Features:**
- **Token Deduction:** Automatically deducts token from user balance
- **Idempotency:** Prevent duplicate submission with idempotency key
- **Queue Position:** Information about position in processing queue
- **Real-time Tracking:** Job ID for tracking status

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "status": "queued",
    "estimatedProcessingTime": "2-5 minutes",
    "queuePosition": 3,
    "tokenCost": 1,
    "remainingTokens": 9
  }
}
```

### Get Assessment Status
```http
GET /api/assessment/status/:jobId
Authorization: Bearer <token>
```

### Get Queue Status
```http
GET /api/assessment/queue/status
Authorization: Bearer <token>
```

### Health Checks
```http
GET /api/assessment/health
GET /api/assessment/health/ready
GET /api/assessment/health/live
GET /api/assessment/health/queue
```

---

## 📊 Archive Service

### Analysis Results

#### Get User Results
```http
GET /api/archive/results?page=1&limit=10&status=completed
Authorization: Bearer <token>
```

#### Get Specific Result
```http
GET /api/archive/results/:id
Authorization: Bearer <token>
```

#### Update Result
```http
PUT /api/archive/results/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "analysis_data": {...},
  "status": "completed"
}
```

#### Delete Result
```http
DELETE /api/archive/results/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Analysis result deleted successfully"
}
```

**⚠️ Note:** Users can only delete their own analysis results.

### Analysis Jobs

#### Get User Jobs
```http
GET /api/archive/jobs?page=1&limit=10&status=completed
Authorization: Bearer <token>
```

#### Get Job Status
```http
GET /api/archive/jobs/:jobId
Authorization: Bearer <token>
```

#### Get Job Statistics
```http
GET /api/archive/jobs/stats
Authorization: Bearer <token>
```

#### Delete/Cancel Job
```http
DELETE /api/archive/jobs/:jobId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Job deleted successfully"
}
```

**⚠️ Note:** Users can only delete/cancel their own analysis jobs.

### Statistics

#### Get User Statistics
```http
GET /api/archive/stats
Authorization: Bearer <token>
```

#### Get User Overview
```http
GET /api/archive/stats/overview
Authorization: Bearer <token>
```

#### Unified Statistics API
```http
GET /api/archive/api/v1/stats?type=user&scope=overview&timeRange=30%20days
Authorization: Bearer <token>
```

**Query Parameters:**
- `type`: user, system, demographic, performance
- `scope`: overview, detailed, analysis, summary
- `timeRange`: "1 day", "7 days", "30 days", "90 days"

---

## � WebSocket Notifications

### Real-time Notifications via WebSocket

ATMA API Gateway menyediakan proxy untuk WebSocket notifications melalui Socket.IO. Semua koneksi WebSocket sekarang melewati API Gateway sebagai single entry point.

#### WebSocket Connection
```javascript
import { io } from 'socket.io-client';

// Connect melalui API Gateway (bukan langsung ke notification service)
const socket = io('http://localhost:3000', {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

// Authentication setelah connect
socket.on('connect', () => {
  socket.emit('authenticate', { token: yourJWTToken });
});

// Listen untuk events
socket.on('authenticated', (data) => {
  console.log('Authenticated:', data.email);
});

socket.on('analysis-started', (data) => {
  console.log('Analysis started:', data);
});

socket.on('analysis-complete', (data) => {
  console.log('Analysis completed:', data);
});

socket.on('analysis-failed', (data) => {
  console.log('Analysis failed:', data);
});

socket.connect();
```

#### WebSocket Endpoints
- **Connection URL**: `http://localhost:3000` (melalui API Gateway)
- **Socket.IO Path**: `/socket.io/*` (di-proxy ke notification service)
- **Authentication**: JWT Token required setelah connect
- **Events**: `analysis-started`, `analysis-complete`, `analysis-failed`

#### Notification Service Health
```http
GET /api/notifications/health
```

**Response:**
```json
{
  "success": true,
  "service": "notification-service",
  "status": "healthy",
  "timestamp": "2024-01-21T10:30:00.000Z",
  "connections": {
    "total": 5,
    "authenticated": 3,
    "users": 3
  }
}
```

---

## �🔍 Health & Monitoring

### Gateway Health
```http
GET /
GET /health
GET /health/detailed
GET /health/ready
GET /health/live
```

### Service-Specific Health
```http
GET /api/auth/health
GET /api/archive/health
GET /api/assessment/health
```

---

## ❌ Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {...}
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (e.g., email exists)
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error
- `503` - Service Unavailable
- `504` - Gateway Timeout

### Common Error Codes
- `VALIDATION_ERROR` (400) - Request validation failed
- `UNAUTHORIZED` (401) - Missing or invalid authentication
- `FORBIDDEN` (403) - Insufficient permissions
- `USER_NOT_FOUND` (404) - User not found
- `EMAIL_EXISTS` (409) - Email already registered
- `USERNAME_EXISTS` (409) - Username already taken
- `INVALID_CREDENTIALS` (401) - Invalid login credentials
- `INSUFFICIENT_TOKENS` (402) - Not enough token balance
- `RATE_LIMIT_EXCEEDED` (429) - Too many requests
- `SERVICE_UNAVAILABLE` (503) - Backend service unavailable
- `GATEWAY_TIMEOUT` (504) - Service request timeout
- `ARCHIVE_SERVICE_ERROR` (503) - Error communicating with Archive Service
- `PROFILE_NOT_FOUND` (404) - User profile not found for deletion
- `ACCESS_DENIED` (403) - User does not have access to the resource
- `INTERNAL_ERROR` (500) - Internal server error

---

## ⚠️ Validation Notes & Important Considerations

### Password Validation Standards
1. **Regular User Passwords:**
   - Registration: Minimum 8 characters, must contain at least one letter and one number
   - Password Change: Same validation as registration

2. **Admin Passwords:**
   - Registration: Minimum 8 characters, maximum 128 characters, must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)
   - Password Change: Currently uses weaker validation (letter + number only) - consider standardizing

### Assessment Data Validation
1. **Score Ranges:** All RIASEC, OCEAN, and VIA-IS scores must be integers between 0-100
2. **Required Fields:** All 6 RIASEC dimensions, all 5 OCEAN traits, and all 24 VIA-IS character strengths must be provided
3. **Assessment Names:** Must be one of the predefined values: "AI-Driven Talent Mapping", "AI-Based IQ Test", or "Custom Assessment"

### Token Balance
- Default token balance is configurable via `DEFAULT_TOKEN_BALANCE` environment variable
- Falls back to 5 if not set
- Each assessment submission costs 1 token

### Rate Limiting Considerations
- Different endpoints have different rate limits
- Auth endpoints are more restrictive to prevent brute force attacks
- Monitor rate limit headers in responses for client-side handling

---

## 🚀 Getting Started

### 1. Register & Login
```javascript
// Register
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'myPassword1'  // Must contain letter + number, min 8 chars
  })
});

// Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'myPassword1'
  })
});

const { data } = await loginResponse.json();
const token = data.token;
```

### 2. Submit Assessment
```javascript
const assessmentResponse = await fetch('/api/assessment/submit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Idempotency-Key': 'unique-key-123'
  },
  body: JSON.stringify({
    assessmentName: 'AI-Driven Talent Mapping',
    riasec: {
      realistic: 75, investigative: 80, artistic: 65,
      social: 70, enterprising: 85, conventional: 60
    },
    ocean: {
      openness: 80, conscientiousness: 75, extraversion: 70,
      agreeableness: 85, neuroticism: 40
    },
    viaIs: {
      creativity: 80, curiosity: 85, judgment: 75,
      loveOfLearning: 90, perspective: 70, bravery: 65,
      perseverance: 80, honesty: 85, zest: 75,
      love: 80, kindness: 85, socialIntelligence: 75,
      teamwork: 80, fairness: 85, leadership: 70,
      forgiveness: 75, humility: 80, prudence: 75,
      selfRegulation: 80, appreciationOfBeauty: 70,
      gratitude: 85, hope: 80, humor: 75, spirituality: 60
    }
  })
});

const { data } = await assessmentResponse.json();
const jobId = data.jobId;
```

### 3. Monitor Progress
```javascript
const checkStatus = async (jobId) => {
  const response = await fetch(`/api/assessment/status/${jobId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const { data } = await response.json();
  return data.status; // 'queued', 'processing', 'completed', 'failed'
};

// Poll every 10 seconds
const pollInterval = setInterval(async () => {
  const status = await checkStatus(jobId);
  
  if (status === 'completed') {
    clearInterval(pollInterval);
    // Get results from archive service
    const results = await fetch(`/api/archive/results/${resultId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }
}, 10000);
```

### 4. Get Results
```javascript
const getResults = async () => {
  const response = await fetch('/api/archive/results', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const { data } = await response.json();
  return data.results;
};
```

---

## 🔒 Security Best Practices

1. **Always use HTTPS in production**
2. **Store JWT tokens securely** (httpOnly cookies recommended)
3. **Implement token refresh mechanism**
4. **Handle rate limiting gracefully**
5. **Validate all user inputs** according to the validation rules specified
6. **Use strong passwords** that meet the validation requirements
7. **Use idempotency keys for critical operations**
8. **Implement proper error handling** and don't expose sensitive information
9. **Monitor token balance before submissions**
10. **Sanitize assessment data** to ensure scores are within valid ranges (0-100)
11. **Implement client-side validation** in addition to server-side validation
12. **Use proper authentication headers** for all protected endpoints
13. **Confirm deletion operations** before calling DELETE endpoints (especially admin user deletion)
14. **Understand deletion types**: Profile deletion vs. complete user deletion (admin only)

---

## 📞 Support & Contact

For technical support or questions about the API:
- **Documentation:** This file and individual service docs
- **Health Checks:** Use `/health` endpoints for service status
- **Error Logs:** Check response error details for debugging

---

**Last Updated:** 2024-01-21
**API Version:** 1.0.0
**Gateway Version:** 1.0.0
