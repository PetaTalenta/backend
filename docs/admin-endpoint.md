# Admin Service Direct Database Endpoints

## Overview

This document describes the request and response parameters for the admin service endpoints that use direct database access. These endpoints are available at `/admin/direct/*` and provide comprehensive admin functionality with direct PostgreSQL database access.

## Authentication

All endpoints (except login) require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

**Testing Credentials:**
- Email: `superadmin@atma.com`
- Password: `admin123`
- User Type: `admin`

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
        "activity_type": "token_balance_update",
        "activity_data": {
          "userId": "uuid",
          "action": "add|deduct",
          "amount": 5,
          "endpoint": "/admin/direct/users/uuid/tokens/add",
          "method": "POST",
          "statusCode": 200,
          "success": true,
          "description": "Admin updated token balance for user: uuid"
        },
        "ip_address": "127.0.0.1",
        "user_agent": "curl/7.68.0",
        "created_at": "2025-10-11T01:07:30.432Z",
        "admin": {
          "id": "uuid",
          "email": "superadmin@futureguide.com",
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

**Query Parameters:**
- `period` (optional): `daily`, `weekly`, `monthly` (default: `daily`)
- `startDate` (optional): ISO date string (default: 30 days ago)
- `endDate` (optional): ISO date string (default: current date)

**Response:**
```json
{
  "success": true,
  "data": {
    "registrationDistribution": [
      {
        "registration_period": "Last 7 days",
        "user_count": "4",
        "percentage": "1.26"
      },
      {
        "registration_period": "Last 30 days",
        "user_count": "214",
        "percentage": "67.51"
      },
      {
        "registration_period": "Last 90 days",
        "user_count": "216",
        "percentage": "68.14"
      },
      {
        "registration_period": "Older than 90 days",
        "user_count": "101",
        "percentage": "31.86"
      }
    ],
    "tokenDistribution": [
      {
        "token_range": "0 tokens",
        "user_count": "279",
        "percentage": "88.01"
      },
      {
        "token_range": "1-10 tokens",
        "user_count": "32",
        "percentage": "10.09"
      },
      {
        "token_range": "11-50 tokens",
        "user_count": "5",
        "percentage": "1.58"
      },
      {
        "token_range": "50+ tokens",
        "user_count": "1",
        "percentage": "0.32"
      }
    ],
    "activitySegmentation": [
      {
        "activity_level": "No activity",
        "user_count": "136",
        "percentage": "42.90"
      },
      {
        "activity_level": "Low activity (1-5 jobs)",
        "user_count": "179",
        "percentage": "56.47"
      },
      {
        "activity_level": "Medium activity (6-20 jobs)",
        "user_count": "1",
        "percentage": "0.32"
      },
      {
        "activity_level": "High activity (50+ jobs)",
        "user_count": "1",
        "percentage": "0.32"
      }
    ]
  }
}
```

#### GET `/admin/direct/analytics/users/retention`
Get user retention analysis.

### Assessment Management Endpoints

#### GET `/admin/direct/assessments/overview`
Get assessment overview and statistics.

**Query Parameters:**
- `period` (optional): `daily`, `weekly`, `monthly` (default: `daily`)
- `startDate` (optional): ISO date string (default: 30 days ago)
- `endDate` (optional): ISO date string (default: current date)

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalAssessments": 936,
      "periodAssessments": 459,
      "completionRate": "49.04"
    },
    "statusDistribution": [
      {
        "status": "failed",
        "count": 11
      },
      {
        "status": "completed",
        "count": 590
      },
      {
        "status": "deleted",
        "count": 1
      }
    ],
    "trends": [
      {
        "period": "2025-09-23T00:00:00.000Z",
        "completedAssessments": 1,
        "uniqueUsers": 1,
        "avgProcessingTime": "81.34"
      },
      {
        "period": "2025-09-24T00:00:00.000Z",
        "completedAssessments": 2,
        "uniqueUsers": 1,
        "avgProcessingTime": "44.26"
      }
    ],
    "topUsers": [
      {
        "id": "f843ce6b-0f41-4e3a-9c53-055ba85e4c61",
        "email": "kasykoi@gmail.com",
        "username": "rayinail updated",
        "assessment_count": "149",
        "avg_score": null
      }
    ]
  }
}
```

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

**Query Parameters:**
- `period` (optional): `daily`, `weekly`, `monthly` (default: `daily`)
- `startDate` (optional): ISO date string (default: 30 days ago)
- `endDate` (optional): ISO date string (default: current date)

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionTrends": [],
    "consumptionTrends": [
      {
        "period": "2025-09-24T00:00:00.000Z",
        "usage_events": "9",
        "total_consumed": "7674",
        "avg_per_event": "852.6666666666666667",
        "active_users": "1"
      }
    ],
    "topConsumers": [
      {
        "id": "f843ce6b-0f41-4e3a-9c53-055ba85e4c61",
        "email": "kasykoi@gmail.com",
        "username": "rayinail updated",
        "current_balance": 99999980,
        "total_consumed": "244276",
        "usage_count": "110",
        "avg_per_use": "2220.6909090909090909"
      }
    ],
    "efficiencyMetrics": [
      {
        "model_used": "meta-llama/llama-3.2-3b-instruct:free",
        "event_count": "96",
        "total_tokens": "189490",
        "avg_tokens_per_event": "1973.8541666666666667",
        "total_cost": "0.000000"
      }
    ]
  }
}
```

#### POST `/admin/direct/tokens/bulk-operations`
Perform bulk token operations.

### Job Monitoring Endpoints

#### GET `/admin/direct/jobs/monitor`
Get job monitoring dashboard data.

#### GET `/admin/direct/jobs/queue/status`
Get job queue status information.

#### GET `/admin/direct/jobs/analytics`
Get job processing analytics.

**Query Parameters:**
- `period` (optional): `daily`, `weekly`, `monthly`, `hourly` (default: `daily`)
- `startDate` (optional): ISO date string (default: 7 days ago)
- `endDate` (optional): ISO date string (default: current date)

**Response:**
```json
{
  "success": true,
  "data": {
    "volumeTrends": [
      {
        "period": "2025-10-04T00:00:00.000Z",
        "total_jobs": "4",
        "completed": "4",
        "failed": "0",
        "processing": "0",
        "pending": "0",
        "unique_users": "1"
      }
    ],
    "performanceTrends": [
      {
        "period": "2025-10-04T00:00:00.000Z",
        "completed_jobs": "4",
        "avg_processing_time": "2.0237500000000000",
        "min_processing_time": "2.011000",
        "max_processing_time": "2.037000"
      }
    ],
    "successRateAnalysis": [
      {
        "period": "2025-10-04T00:00:00.000Z",
        "total_jobs": "4",
        "successful_jobs": "4",
        "success_rate": "100.00"
      }
    ],
    "topUsers": [
      {
        "id": "f843ce6b-0f41-4e3a-9c53-055ba85e4c61",
        "email": "kasykoi@gmail.com",
        "username": "rayinail updated",
        "job_count": "35",
        "completed_jobs": "35",
        "failed_jobs": "0",
        "success_rate": "100.00"
      }
    ]
  }
}
```

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

**Query Parameters:** None

**Response:**
```json
{
  "success": true,
  "data": {
    "connectionStats": {
      "connectionStatus": "error",
      "error": "relation \"archive.sequelizemeta\" does not exist",
      "lastChecked": "2025-10-11T05:52:25.613Z"
    },
    "queryStats": [
      {
        "schemaname": "archive",
        "tablename": "analysis_jobs",
        "inserts": "1061",
        "updates": "10",
        "deletes": "0",
        "live_tuples": "1061",
        "dead_tuples": "10",
        "last_vacuum": null,
        "last_autovacuum": null,
        "last_analyze": null,
        "last_autoanalyze": "2025-10-11T04:34:47.983Z"
      }
    ],
    "sizeStats": {
      "database_size": "23 MB",
      "database_size_bytes": "23678099"
    },
    "indexStats": [
      {
        "schemaname": "auth",
        "tablename": "users",
        "indexname": "users_pkey",
        "index_scans": "676",
        "tuples_read": "678",
        "tuples_fetched": "676"
      }
    ],
    "lastUpdated": "2025-10-11T05:52:25.630Z"
  }
}
```

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

**Query Parameters:**
- `period` (optional): `daily`, `weekly`, `monthly` (default: `daily`)
- `startDate` (optional): ISO date string (default: 30 days ago)
- `endDate` (optional): ISO date string (default: current date)
- `cohortPeriod` (optional): `daily`, `weekly`, `monthly` (default: `monthly`)

**Response:**
```json
{
  "success": true,
  "data": {
    "engagementPatterns": [
      {
        "period": "2025-09-23T00:00:00.000Z",
        "active_users": "1",
        "total_jobs": "1",
        "avg_completion_time": "76.4160000000000000",
        "successful_jobs": "1"
      }
    ],
    "retentionAnalysis": [
      {
        "cohort_period": "2025-09-01T00:00:00.000Z",
        "cohort_size": "1",
        "activity_period": "2025-09-01T00:00:00.000Z",
        "retained_users": "1",
        "retention_rate": "100.00"
      }
    ],
    "usageFrequency": [
      {
        "usage_category": "No usage",
        "user_count": "136",
        "percentage": "42.90"
      },
      {
        "usage_category": "1-5 jobs",
        "user_count": "179",
        "percentage": "56.47"
      },
      {
        "usage_category": "6-20 jobs",
        "user_count": "1",
        "percentage": "0.32"
      },
      {
        "usage_category": "50+ jobs",
        "user_count": "1",
        "percentage": "0.32"
      }
    ]
  }
}
```

#### GET `/admin/direct/insights/assessment-effectiveness`
Get assessment effectiveness metrics.

**Query Parameters:**
- `startDate` (optional): ISO date string (default: 30 days ago)
- `endDate` (optional): ISO date string (default: current date)

**Response:**
```json
{
  "success": true,
  "data": {
    "completionRates": {
      "total_jobs": "602",
      "completed_jobs": "430",
      "completion_rate": "71.43",
      "avg_processing_time": "1537.5768618968386023"
    },
    "scoreDistribution": [],
    "assessmentTrends": []
  }
}
```

#### GET `/admin/direct/insights/business-metrics`
Get business intelligence metrics.

**Query Parameters:**
- `startDate` (optional): ISO date string (default: 30 days ago)
- `endDate` (optional): ISO date string (default: current date)

**Response:**
```json
{
  "success": true,
  "data": {
    "userGrowth": [
      {
        "date": "2025-09-11T00:00:00.000Z",
        "new_users": "1",
        "cumulative_users": "1"
      },
      {
        "date": "2025-09-23T00:00:00.000Z",
        "new_users": "1",
        "cumulative_users": "2"
      }
    ],
    "platformUsage": {
      "active_users": "442",
      "total_assessments": "22637",
      "completed_assessments": "22465",
      "avg_processing_time": "6285.1361580667962538",
      "total_tokens_used": "32104684"
    },
    "revenueMetrics": {
      "total_tokens_consumed": "295150",
      "total_cost_credits": "0.000000",
      "paying_users": "6",
      "avg_tokens_per_session": "2324.0157480314960630"
    }
  }
}
```

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

**Query Parameters:** None

**Response:**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "low_token_balances",
        "type": "info",
        "severity": "low",
        "title": "Many Users with Low Token Balances",
        "message": "279 users have less than 10 tokens",
        "timestamp": "2025-10-11T05:58:21.929Z",
        "data": {
          "low_balance_count": "279"
        }
      }
    ],
    "totalAlerts": 1,
    "alertCounts": {
      "high": 0,
      "medium": 0,
      "low": 1
    },
    "lastChecked": "2025-10-11T05:58:21.929Z"
  }
}
```

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
