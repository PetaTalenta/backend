# Admin Service Direct Database Endpoints

## Overview

This document describes the request and response parameters for the admin service endpoints that use direct database access. These endpoints are available at `/admin/direct/*` and provide comprehensive admin functionality with direct PostgreSQL database access.

## Authentication

All endpoints (except login) require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

## Endpoints

## Phase 1: Core Admin Endpoints

### 1. Admin Authentication

#### POST `/admin/direct/login`
Admin login endpoint.

**Request Body:**
```json
{
  "email": "string (required, email format)",
  "password": "string (required, min 6 characters)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "string|null",
      "email": "string",
      "user_type": "admin",
      "is_active": true,
      "token_balance": 0,
      "last_login": "2025-10-11T01:07:30.432Z",
      "created_at": "2025-10-11T01:07:07.518Z",
      "updated_at": "2025-10-11T01:07:30.436Z"
    },
    "token": "jwt_token_string",
    "expiresIn": "24h"
  }
}
```

#### GET `/admin/direct/profile`
Get admin profile information.

**Request:** No body required.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "string|null",
    "email": "string",
    "user_type": "admin",
    "is_active": true,
    "token_balance": 0,
    "last_login": "2025-10-11T01:07:30.432Z",
    "created_at": "2025-10-11T01:07:07.518Z",
    "updated_at": "2025-10-11T01:07:30.443Z"
  }
}
```

#### PUT `/admin/direct/profile`
Update admin profile.

**Request Body:**
```json
{
  "username": "string (optional, alphanumeric, 3-100 chars)",
  "email": "string (optional, email format)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "string|null",
    "email": "string",
    "user_type": "admin",
    "is_active": true,
    "token_balance": 0,
    "last_login": "2025-10-11T01:07:30.432Z",
    "created_at": "2025-10-11T01:07:07.518Z",
    "updated_at": "2025-10-11T01:07:30.443Z"
  }
}
```

#### POST `/admin/direct/logout`
Admin logout.

**Request:** No body required.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 2. User Management

#### GET `/admin/direct/users`
Get paginated user list with filtering.

**Query Parameters:**
```
page: number (optional, default: 1, min: 1)
limit: number (optional, default: 10, min: 1, max: 100)
search: string (optional, searches email and username)
userType: string (optional, values: "user", "admin")
isActive: string (optional, values: "true", "false")
sortBy: string (optional, values: "created_at", "email", "username", "token_balance", default: "created_at")
sortOrder: string (optional, values: "ASC", "DESC", default: "DESC")
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "username": "string|null",
        "email": "string",
        "user_type": "user|admin",
        "is_active": true,
        "token_balance": 0,
        "last_login": "2025-10-11T01:07:30.432Z|null",
        "created_at": "2025-10-11T01:07:07.518Z",
        "updated_at": "2025-10-11T01:07:30.443Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 315,
      "totalPages": 32,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### GET `/admin/direct/users/:userId`
Get detailed user profile with statistics.

**Path Parameters:**
```
userId: uuid (required)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "string|null",
    "email": "string",
    "user_type": "user|admin",
    "is_active": true,
    "token_balance": 16,
    "last_login": "2025-10-11T01:07:30.432Z|null",
    "created_at": "2025-10-11T01:07:07.518Z",
    "updated_at": "2025-10-11T01:07:30.443Z",
    "statistics": {
      "totalJobs": 0,
      "totalResults": 0,
      "lastActivity": {
        "date": "2025-10-11T01:07:30.432Z",
        "status": "completed"
      } | null
    }
  }
}
```

#### PUT `/admin/direct/users/:userId/profile`
Update user information.

**Path Parameters:**
```
userId: uuid (required)
```

**Request Body:**
```json
{
  "username": "string (optional, alphanumeric, 3-100 chars)",
  "email": "string (optional, email format)",
  "is_active": "boolean (optional)",
  "user_type": "string (optional, values: 'user', 'admin')"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "string|null",
    "email": "string",
    "user_type": "user|admin",
    "is_active": true,
    "token_balance": 16,
    "last_login": "2025-10-11T01:07:30.432Z|null",
    "created_at": "2025-10-11T01:07:07.518Z",
    "updated_at": "2025-10-11T01:07:30.443Z"
  }
}
```

### 3. Token Management

#### POST `/admin/direct/users/:userId/tokens/add`
Add tokens to user account.

**Path Parameters:**
```
userId: uuid (required)
```

**Request Body:**
```json
{
  "amount": "number (required, integer, min: 1)",
  "reason": "string (optional, max: 255 chars)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "previousBalance": 14,
    "addedAmount": 5,
    "newBalance": 19,
    "reason": "Testing token addition v2"
  }
}
```

#### POST `/admin/direct/users/:userId/tokens/deduct`
Deduct tokens from user account.

**Path Parameters:**
```
userId: uuid (required)
```

**Request Body:**
```json
{
  "amount": "number (required, integer, min: 1)",
  "reason": "string (optional, max: 255 chars)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "previousBalance": 19,
    "deductedAmount": 3,
    "newBalance": 16,
    "reason": "Testing token deduction"
  }
}
```

#### GET `/admin/direct/users/:userId/tokens/history`
Get token transaction history for user.

**Path Parameters:**
```
userId: uuid (required)
```

**Query Parameters:**
```
page: number (optional, default: 1, min: 1)
limit: number (optional, default: 10, min: 1, max: 100)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "admin_id": "uuid",
        "activity_type": "token_balance_update",
        "activity_description": "Admin updated token balance for user: uuid",
        "metadata": {
          "userId": "uuid",
          "action": "add|deduct",
          "amount": 5,
          "endpoint": "/admin/direct/users/uuid/tokens/add",
          "method": "POST",
          "statusCode": 200,
          "success": true
        },
        "ip_address": "127.0.0.1",
        "user_agent": "curl/7.68.0",
        "created_at": "2025-10-11T01:07:30.432Z",
        "admin": {
          "id": "uuid",
          "email": "superadmin@atma.com",
          "username": null
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 2,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

### 4. Health Check

#### GET `/admin/direct/health/db`
Database connection health check.

**Request:** No parameters required.

**Response:**
```json
{
  "success": true,
  "message": "Direct database connection is healthy",
  "timestamp": "2025-10-11T01:06:41.131Z",
  "service": "admin-service-direct-db"
}
```

## Phase 2: Advanced Admin Endpoints & Analytics

### Analytics Endpoints

#### GET `/admin/direct/analytics/users/overview`
Get comprehensive user analytics overview.

**Query Parameters:**
- `period` (optional): `daily`, `weekly`, `monthly` (default: `daily`)
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 315,
      "activeUsers": 194,
      "newRegistrations": 215,
      "activeUserRate": "61.59"
    },
    "trends": [...],
    "distribution": [...]
  }
}
```

#### GET `/admin/direct/analytics/users/activity`
Get user activity analytics.

#### GET `/admin/direct/analytics/users/demographics`
Get user demographic analysis.

#### GET `/admin/direct/analytics/users/retention`
Get user retention analysis.

### Assessment Management Endpoints

#### GET `/admin/direct/assessments/overview`
Get assessment overview and statistics.

#### GET `/admin/direct/assessments/:resultId/details`
Get detailed assessment result analysis.

#### GET `/admin/direct/assessments/raw-analysis`
Get raw analysis data for assessments.

#### GET `/admin/direct/assessments/performance`
Get assessment performance metrics.

#### GET `/admin/direct/assessments/trends`
Get assessment trend analysis.

### Token Management Endpoints

#### GET `/admin/direct/tokens/overview`
Get token usage overview and statistics.

#### GET `/admin/direct/tokens/transactions`
Get token transaction history.

#### GET `/admin/direct/tokens/analytics`
Get token usage analytics.

#### POST `/admin/direct/tokens/bulk-operations`
Perform bulk token operations.

### Job Monitoring Endpoints

#### GET `/admin/direct/jobs/monitor`
Get job monitoring dashboard data.

#### GET `/admin/direct/jobs/queue/status`
Get job queue status information.

#### GET `/admin/direct/jobs/analytics`
Get job processing analytics.

#### POST `/admin/direct/jobs/:jobId/retry`
Retry a failed job.

#### DELETE `/admin/direct/jobs/:jobId`
Cancel a pending or processing job.

### System Performance Endpoints

#### GET `/admin/direct/system/metrics`
Get system performance metrics.

#### GET `/admin/direct/system/health`
Get comprehensive system health check.

**Response:**
```json
{
  "success": true,
  "data": {
    "overallStatus": "healthy",
    "components": {
      "database": {
        "status": "healthy",
        "responseTime": 45,
        "lastChecked": "2025-10-11T01:38:20.650Z"
      },
      "jobQueue": {
        "status": "healthy",
        "metrics": {
          "pendingJobs": 0,
          "processingJobs": 0,
          "recentFailures": 0
        }
      },
      "services": {...}
    }
  }
}
```

#### GET `/admin/direct/system/database/stats`
Get database performance statistics.

#### GET `/admin/direct/system/errors`
Get error tracking and analysis.

## Phase 3: Comprehensive Monitoring & Security Features

### Advanced Security Features

#### GET `/admin/direct/security/audit`
Get security audit report.

**Response:**
```json
{
  "success": true,
  "data": {
    "failedLogins": [...],
    "suspiciousIPs": [...],
    "securityStatus": {
      "total_users": "313",
      "active_users": "313",
      "suspended_users": "0",
      "inactive_users": "16"
    }
  }
}
```

#### GET `/admin/direct/security/suspicious-activities`
Get suspicious activity detection.

#### GET `/admin/direct/security/login-patterns`
Get login pattern analysis.

#### POST `/admin/direct/security/user/:userId/suspend`
Suspend user account.

**Request Body:**
```json
{
  "reason": "string (optional)"
}
```

#### POST `/admin/direct/security/user/:userId/activate`
Activate user account.

### Comprehensive Audit Logging

#### GET `/admin/direct/audit/activities`
Get all admin activities.

#### GET `/admin/direct/audit/user/:userId/history`
Get user-specific audit trail.

#### GET `/admin/direct/audit/data-access`
Get data access logging.

#### GET `/admin/direct/audit/exports`
Export audit data.

### Data Analytics & Insights

#### GET `/admin/direct/insights/user-behavior`
Get user behavior analysis.

#### GET `/admin/direct/insights/assessment-effectiveness`
Get assessment effectiveness metrics.

#### GET `/admin/direct/insights/business-metrics`
Get business intelligence metrics.

#### GET `/admin/direct/insights/predictive-analytics`
Get predictive user analytics.

### Advanced Data Management

#### POST `/admin/direct/data/export`
Data export functionality.

**Request Body:**
```json
{
  "dataType": "users|assessments|activities",
  "format": "json|csv",
  "filters": {...}
}
```

#### POST `/admin/direct/data/backup`
Database backup operations.

#### POST `/admin/direct/data/anonymize/:userId`
GDPR compliance data anonymization.

#### GET `/admin/direct/data/integrity-check`
Data integrity verification.

### Real-time Dashboard Features

#### GET `/admin/direct/dashboard/realtime`
Get real-time dashboard data.

#### GET `/admin/direct/dashboard/alerts`
Get system alerts and notifications.

#### GET `/admin/direct/dashboard/kpis`
Get key performance indicators.

#### WebSocket `/admin/direct/dashboard/live`
Live dashboard updates (WebSocket connection).

## Notes

1. All endpoints return consistent error responses with `success: false` and an `error` object containing `code` and `message`.
2. Input validation is performed using Joi schemas with detailed error messages.
3. All database operations are logged for audit purposes.
4. JWT tokens expire after 24 hours by default.
5. Password fields are never returned in responses.
6. All timestamps are in ISO 8601 format (UTC).
7. UUIDs are used for all entity identifiers.
8. Phase 2 and Phase 3 endpoints provide advanced analytics, security, and monitoring capabilities.
9. Some endpoints may return empty results if no data exists in the database.
10. All admin actions are logged to the `archive.user_activity_logs` table for audit purposes.
