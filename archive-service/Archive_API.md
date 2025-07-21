# Archive Service API Documentation

## Overview
Archive Service menyediakan API untuk mengelola analysis jobs dan analysis results dalam sistem ATMA (AI-Driven Talent Mapping Assessment).

## Base URL
```
http://localhost:3002/
```

## Authentication
- **User Authentication**: Bearer token untuk endpoint user
- **Service Authentication**: `X-Service-Key` + `X-Internal-Service: true` headers untuk endpoint internal service

## Error Codes
- `400` - Bad Request (validation error, invalid input)
- `401` - Unauthorized (missing/invalid authentication)
- `403` - Forbidden (access denied)
- `404` - Not Found (resource tidak ditemukan)
- `500` - Internal Server Error

---

## Analysis Results Endpoints

### GET archive/results
**Error Codes**: 400, 401, 500  
**Description**: Mendapatkan daftar analysis results untuk user yang terautentikasi

**Query Parameters**:
```
page: number (default: 1)
limit: number (default: 10, max: 100)
status: string (completed|processing|failed)
assessment_name: string (AI-Driven Talent Mapping|AI-Based IQ Test|Custom Assessment)
sort: string (created_at|updated_at, default: created_at)
order: string (asc|desc, default: desc)
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "persona_profile": {
        "archetype": "string",
        "shortSummary": "string",
        "strengths": ["string"],
        "weaknesses": ["string"]
      },
      "status": "completed",
      "assessment_name": "AI-Driven Talent Mapping",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### GET archive/results/:id
**Error Codes**: 400, 401, 403, 404, 500  
**Description**: Mendapatkan analysis result berdasarkan ID

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "assessment_data": {
      "responses": {},
      "metadata": {}
    },
    "persona_profile": {
      "archetype": "string",
      "shortSummary": "string",
      "strengths": ["string"],
      "weaknesses": ["string"],
      "careerRecommendation": [],
      "insights": []
    },
    "status": "completed",
    "assessment_name": "AI-Driven Talent Mapping",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST archive/results
**Error Codes**: 400, 401, 500  
**Description**: Membuat analysis result baru (internal service only)

**Request Body**:
```json
{
  "user_id": "uuid",
  "assessment_data": {
    "responses": {},
    "metadata": {}
  },
  "persona_profile": {
    "archetype": "string",
    "shortSummary": "string",
    "strengths": ["string"],
    "weaknesses": ["string"],
    "careerRecommendation": [],
    "insights": []
  },
  "status": "completed",
  "assessment_name": "AI-Driven Talent Mapping"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Analysis result saved successfully",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "status": "completed",
    "assessment_name": "AI-Driven Talent Mapping",
    "created_at": "2024-01-01T00:00:00.000Z",
    "batched": true
  }
}
```

### POST archive/results/batch
**Error Codes**: 400, 401, 500  
**Description**: Membuat multiple analysis results dalam batch (internal service only)

**Request Body**:
```json
{
  "results": [
    {
      "user_id": "uuid",
      "assessment_data": {},
      "persona_profile": {},
      "status": "completed"
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Batch analysis results processed successfully",
  "data": {
    "total": 5,
    "successful": 4,
    "failed": 1,
    "results": [
      {
        "index": 0,
        "success": true,
        "id": "uuid",
        "user_id": "uuid",
        "status": "completed",
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### PUT archive/results/:id
**Error Codes**: 400, 401, 403, 404, 500  
**Description**: Update analysis result

**Request Body**:
```json
{
  "persona_profile": {
    "archetype": "updated_archetype"
  },
  "status": "completed"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Analysis result updated successfully",
  "data": {
    "id": "uuid",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### DELETE archive/results/:id
**Error Codes**: 400, 401, 403, 404, 500  
**Description**: Hapus analysis result (user only)

**Response**:
```json
{
  "success": true,
  "message": "Analysis result deleted successfully"
}
```

---

## Analysis Jobs Endpoints

### POST archive/jobs
**Error Codes**: 400, 401, 500  
**Description**: Membuat analysis job baru (internal service only)

**Request Body**:
```json
{
  "job_id": "string",
  "user_id": "uuid",
  "assessment_data": {
    "responses": {},
    "metadata": {}
  },
  "assessment_name": "AI-Driven Talent Mapping",
  "status": "queued"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Analysis job created successfully",
  "data": {
    "id": "uuid",
    "job_id": "string",
    "user_id": "uuid",
    "status": "queued",
    "assessment_name": "AI-Driven Talent Mapping",
    "priority": 0,
    "retry_count": 0,
    "max_retries": 3,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET archive/jobs/:jobId
**Error Codes**: 400, 401, 403, 404, 500  
**Description**: Mendapatkan job status berdasarkan job ID

**Response**:
```json
{
  "success": true,
  "message": "Job retrieved successfully",
  "data": {
    "id": "uuid",
    "job_id": "string",
    "user_id": "uuid",
    "status": "processing",
    "assessment_name": "AI-Driven Talent Mapping",
    "result_id": "uuid",
    "error_message": null,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z",
    "completed_at": null,
    "processing_started_at": "2024-01-01T00:05:00.000Z",
    "priority": 0,
    "retry_count": 0,
    "max_retries": 3
  }
}
```

### PUT archive/jobs/:jobId/status
**Error Codes**: 400, 401, 404, 500  
**Description**: Update job status (internal service only)

**Request Body**:
```json
{
  "status": "completed",
  "result_id": "uuid",
  "error_message": null
}
```

**Response**:
```json
{
  "success": true,
  "message": "Job status updated successfully",
  "data": {
    "id": "uuid",
    "job_id": "string",
    "status": "completed",
    "result_id": "uuid",
    "completed_at": "2024-01-01T00:10:00.000Z",
    "updated_at": "2024-01-01T00:10:00.000Z"
  }
}
```

### GET archive/jobs
**Error Codes**: 400, 401, 500  
**Description**: Mendapatkan daftar jobs untuk user yang terautentikasi

**Query Parameters**:
```
page: number (default: 1)
limit: number (default: 10, max: 100)
status: string (queued|processing|completed|failed)
assessment_name: string (AI-Driven Talent Mapping|AI-Based IQ Test|Custom Assessment)
sort: string (created_at|updated_at, default: created_at)
order: string (asc|desc, default: desc)
```

**Response**:
```json
{
  "success": true,
  "message": "Jobs retrieved successfully",
  "data": {
    "jobs": [
      {
        "id": "uuid",
        "job_id": "string",
        "user_id": "uuid",
        "status": "completed",
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 25,
      "limit": 10,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### GET archive/jobs/stats
**Error Codes**: 400, 401, 500
**Description**: Mendapatkan statistik jobs untuk user yang terautentikasi

**Response**:
```json
{
  "success": true,
  "message": "Job statistics retrieved successfully",
  "data": {
    "total_jobs": 100,
    "queued": 5,
    "processing": 2,
    "completed": 85,
    "failed": 8,
    "avg_processing_time_seconds": 45.5
  }
}
```

### DELETE archive/jobs/:jobId
**Error Codes**: 400, 401, 403, 404, 500
**Description**: Hapus/cancel job (user only)

**Response**:
```json
{
  "success": true,
  "message": "Job deleted successfully"
}
```

---

## Batch Processing Endpoints

### GET archive/batch/stats
**Error Codes**: 401, 500
**Description**: Mendapatkan statistik batch processing (internal service only)

**Response**:
```json
{
  "success": true,
  "data": {
    "batch_processing": {
      "queue_size": 15,
      "batch_size": 10,
      "last_processed": "2024-01-01T00:00:00.000Z",
      "processing_interval": 30000
    },
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST archive/batch/process
**Error Codes**: 401, 500
**Description**: Force process current batch (internal service only)

**Response**:
```json
{
  "success": true,
  "message": "Batch processing triggered successfully",
  "data": {
    "before": {
      "queue_size": 15,
      "batch_size": 10
    },
    "after": {
      "queue_size": 5,
      "batch_size": 10
    },
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST archive/batch/clear
**Error Codes**: 401, 500
**Description**: Clear batch queue - emergency operation (internal service only)

**Response**:
```json
{
  "success": true,
  "message": "Batch queue cleared successfully",
  "data": {
    "cleared_items": 15,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Statistics Endpoints

### GET archive/stats
**Error Codes**: 400, 401, 500
**Description**: Get statistics for authenticated user

**Response**:
```json
{
  "success": true,
  "message": "User statistics retrieved successfully",
  "data": {
    "total_analyses": 25,
    "completed_analyses": 23,
    "processing_analyses": 1,
    "failed_analyses": 1,
    "success_rate": 92.0,
    "latest_analysis": "2024-01-01T00:00:00.000Z",
    "archetype_distribution": [
      {
        "archetype": "The Innovator",
        "count": 8
      }
    ]
  }
}
```

### GET archive/stats/overview
**Error Codes**: 400, 401, 500
**Description**: Get overview statistics for authenticated user (frontend accessible)

**Response**:
```json
{
  "success": true,
  "message": "User overview retrieved successfully",
  "data": {
    "user_stats": {
      "total_analyses": 25,
      "completed_analyses": 23,
      "processing_analyses": 1,
      "last_analysis_date": "2024-01-01T00:00:00.000Z"
    },
    "recent_archetypes": [
      {
        "archetype": "The Innovator",
        "date": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### GET archive/stats/summary
**Error Codes**: 401, 500
**Description**: Get summary statistics (internal service only)

**Response**:
```json
{
  "success": true,
  "message": "Summary statistics retrieved successfully",
  "data": {
    "overall": {
      "total_results": 1000,
      "total_users": 250,
      "completed_results": 920,
      "processing_results": 15,
      "failed_results": 65,
      "success_rate": 92.0
    },
    "top_archetypes": [
      {
        "archetype": "The Innovator",
        "count": 150
      }
    ],
    "recent_activity": {
      "results_last_30_days": 120,
      "active_users_last_30_days": 45
    }
  }
}
```

---

## Demographics Endpoints

### GET archive/demographics/overview
**Error Codes**: 401, 500
**Description**: Get overall demographic overview (internal service only)

**Response**:
```json
{
  "success": true,
  "data": {
    "gender_distribution": [
      {
        "gender": "Male",
        "count": 150,
        "percentage": 60.0
      },
      {
        "gender": "Female",
        "count": 100,
        "percentage": 40.0
      }
    ],
    "age_distribution": [
      {
        "age_group": "18-25",
        "count": 120,
        "percentage": 48.0
      }
    ],
    "school_statistics": [
      {
        "school_name": "University A",
        "analysis_count": 50,
        "unique_users": 25
      }
    ],
    "archetype_distribution": [
      {
        "archetype": "The Innovator",
        "count": 80,
        "percentage": 32.0
      }
    ],
    "generated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET archive/demographics/archetype/:archetype
**Error Codes**: 400, 401, 404, 500
**Description**: Get demographic insights for a specific archetype (internal service only)

**Response**:
```json
{
  "success": true,
  "data": {
    "archetype": "The Innovator",
    "gender_distribution": [
      {
        "gender": "Male",
        "count": 50,
        "percentage": 62.5
      }
    ],
    "age_statistics": {
      "avg_age": 22.5,
      "min_age": 18,
      "max_age": 30
    },
    "top_schools": [
      {
        "school_origin": "University A",
        "count": 15,
        "percentage": 18.75
      }
    ],
    "generated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET archive/demographics/schools
**Error Codes**: 401, 500
**Description**: Get school-based analytics (internal service only)

**Query Parameters**:
```
school: string (optional school name filter)
```

**Response**:
```json
{
  "success": true,
  "data": {
    "school_filter": "University A",
    "school_statistics": [
      {
        "school_origin": "University A",
        "total_analyses": 50,
        "unique_users": 25,
        "avg_age": 22.5,
        "most_common_gender": "Male",
        "most_common_archetype": "The Innovator"
      }
    ],
    "archetype_distribution": [
      {
        "school_origin": "University A",
        "archetype": "The Innovator",
        "count": 15
      }
    ],
    "generated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET archive/demographics/optimized
**Error Codes**: 401, 500
**Description**: Get optimized demographic insights using composite indexes (internal service only)

**Query Parameters**:
```
gender: string (filter by gender)
ageMin: number (minimum age)
ageMax: number (maximum age)
schoolOrigin: string (filter by school origin)
archetype: string (filter by archetype)
limit: number (result limit, default: 100)
```

**Response**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "gender": "Male",
        "school_origin": "University A",
        "age": 22,
        "archetype": "The Innovator",
        "count": 5
      }
    ],
    "summary": {
      "totalRecords": 150,
      "uniqueGenders": 2,
      "uniqueSchools": 10,
      "uniqueArchetypes": 8
    }
  }
}
```

### GET archive/demographics/trends
**Error Codes**: 401, 500
**Description**: Get demographic trends over time (internal service only)

**Query Parameters**:
```
period: string (day|week|month|year, default: month)
limit: number (number of periods to include, default: 12)
```

**Response**:
```json
{
  "success": true,
  "data": {
    "trends": [
      {
        "period": "2024-01-01T00:00:00.000Z",
        "unique_users": 25,
        "total_analyses": 50,
        "gender_diversity": 2,
        "school_diversity": 8,
        "avg_age": 22.5
      }
    ],
    "summary": {
      "total_periods": 12,
      "growth_rate": 15.5,
      "peak_period": "2024-01-01T00:00:00.000Z"
    },
    "generated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET archive/demographics/performance
**Error Codes**: 401, 500
**Description**: Get query performance metrics (internal service only)

**Response**:
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "type": "index",
        "table": "analysis_results",
        "suggestion": "Consider adding composite index on (user_id, status, created_at)"
      }
    ],
    "indexEffectiveness": [
      {
        "index_name": "idx_analysis_results_user_status",
        "usage_count": 1500,
        "effectiveness_score": 85.5
      }
    ],
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Health Check Endpoints

### GET archive/health
**Error Codes**: 500
**Description**: Health check endpoint

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "archive-service",
  "version": "1.0.0",
  "database": "connected"
}
```

### GET health/detailed
**Error Codes**: 500
**Description**: Detailed health check with more information

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "service": "archive-service",
  "environment": "development",
  "uptime": 3600,
  "memory": {
    "rss": 50331648,
    "heapTotal": 20971520,
    "heapUsed": 15728640,
    "external": 1048576
  },
  "database": {
    "status": "connected",
    "host": "localhost",
    "port": 5432,
    "database": "atma_db",
    "schema": "archive"
  }
}
```

---

## Admin Endpoints

### GET admin/users
**Error Codes**: 400, 401, 403, 500
**Description**: Get all users with pagination and filtering (admin only)

**Query Parameters**:
```
page: number (default: 1)
limit: number (default: 10, max: 100)
search: string (search by email)
sortBy: string (email|token_balance|created_at|updated_at, default: created_at)
sortOrder: string (ASC|DESC, default: DESC)
```

**Response**:
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "token_balance": 100,
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### GET admin/users/:userId
**Error Codes**: 400, 401, 403, 404, 500
**Description**: Get user by ID with detailed information (admin only)

**Response**:
```json
{
  "success": true,
  "message": "User details retrieved successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "token_balance": 100,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    },
    "statistics": {
      "total_analyses": 25,
      "completed_analyses": 23,
      "processing_analyses": 1,
      "failed_analyses": 1,
      "latest_analysis": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### PUT admin/users/:userId/token-balance
**Error Codes**: 400, 401, 403, 404, 500
**Description**: Update user token balance (admin only)

**Request Body**:
```json
{
  "token_balance": 150,
  "action": "set"
}
```

**Valid actions**: `set` (replace), `add` (increase), `subtract` (decrease)

**Response**:
```json
{
  "success": true,
  "message": "Token balance updated successfully",
  "data": {
    "user_id": "uuid",
    "old_balance": 100,
    "new_balance": 150,
    "action": "set",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### DELETE admin/users/:userId
**Error Codes**: 400, 401, 403, 404, 500
**Description**: Delete user (soft delete, admin/superadmin only)

**Response**:
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": {
    "user_id": "uuid",
    "deleted_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Metrics Endpoints

### GET metrics
**Error Codes**: 401, 500
**Description**: Get application metrics (internal service only)

**Response**:
```json
{
  "success": true,
  "data": {
    "requests": {
      "total": 10000,
      "successful": 9500,
      "failed": 500,
      "averageResponseTime": 150
    },
    "cache": {
      "hits": 8000,
      "misses": 2000,
      "hitRate": 80.0
    },
    "database": {
      "connections": 10,
      "queries": 50000,
      "averageQueryTime": 25
    },
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST metrics/reset
**Error Codes**: 401, 500
**Description**: Reset metrics counters (internal service only)

**Response**:
```json
{
  "success": true,
  "message": "Metrics reset successfully",
  "data": {
    "reset_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET metrics/health
**Error Codes**: 500
**Description**: Comprehensive health check with metrics

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "archive-service",
  "version": "1.0.0",
  "components": {
    "database": "healthy",
    "cache": "healthy",
    "memory": "healthy"
  },
  "metrics": {
    "uptime": 3600,
    "memory_usage": 75.5,
    "cpu_usage": 45.2
  }
}
```

### GET metrics/database
**Error Codes**: 401, 500
**Description**: Get database-specific metrics (internal service only)

**Response**:
```json
{
  "success": true,
  "data": {
    "connections": {
      "active": 8,
      "idle": 2,
      "total": 10
    },
    "queries": {
      "total": 50000,
      "slow_queries": 25,
      "average_time": 25.5
    },
    "tables": {
      "analysis_results": {
        "rows": 10000,
        "size": "50MB"
      }
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET metrics/cache
**Error Codes**: 401, 500
**Description**: Get cache-specific metrics (internal service only)

**Response**:
```json
{
  "success": true,
  "data": {
    "available": true,
    "stats": {
      "hits": 8000,
      "misses": 2000,
      "hit_rate": 80.0,
      "memory_usage": "25MB",
      "keys": 150
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET metrics/performance
**Error Codes**: 401, 500
**Description**: Get performance analysis (internal service only)

**Response**:
```json
{
  "success": true,
  "data": {
    "performance": {
      "average_response_time": 150,
      "p95_response_time": 300,
      "p99_response_time": 500
    },
    "slowQueries": [
      {
        "query": "SELECT * FROM analysis_results WHERE...",
        "duration": 750,
        "timestamp": "2024-01-01T00:00:00.000Z"
      }
    ]
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### POST metrics/cache/invalidate
**Error Codes**: 400, 401, 500
**Description**: Invalidate cache (internal service only)

**Request Body**:
```json
{
  "pattern": "demographics"
}
```

**Valid patterns**: `demographics`, `archetypes`, `stats`, `results`, `all`

**Response**:
```json
{
  "success": true,
  "message": "Cache invalidated for pattern: demographics",
  "data": {
    "result": true
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Development Endpoints

### POST archive/dev/create-user
**Error Codes**: 400, 401, 500
**Description**: Create user for development (development environment only)

**Request Body**:
```json
{
  "user_id": "uuid",
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user_id": "uuid",
    "email": "user@example.com"
  }
}
```

---

## Unified API Routes (v1)

### GET /api/v1/stats
**Error Codes**: 400, 401, 403, 500
**Description**: Unified statistics endpoint with flexible parameters

**Query Parameters**:
```
type: string (user|system|demographic|performance, default: user)
scope: string (overview|detailed|analysis|summary|queue|insights, default: overview)
timeRange: string (1 day|7 days|30 days|90 days, default: 7 days)
```

**Additional filters for demographic type**:
```
gender: string (filter by gender)
ageMin: number (minimum age)
ageMax: number (maximum age)
schoolOrigin: string (filter by school origin)
archetype: string (filter by archetype)
```

**Response**:
```json
{
  "success": true,
  "message": "user statistics retrieved successfully",
  "data": {
    // Response varies based on type and scope parameters
    // See individual endpoints above for specific response formats
  }
}
```

---

## Direct Access Routes

The following routes are also available without the `/archive` prefix for direct service access:

- `GET /results` → `GET /archive/results`
- `GET /results/:id` → `GET /archive/results/:id`
- `POST /results` → `POST /archive/results`
- `POST /results/batch` → `POST /archive/results/batch`
- `PUT /results/:id` → `PUT /archive/results/:id`
- `DELETE /results/:id` → `DELETE /archive/results/:id`
- `POST /jobs` → `POST /archive/jobs`
- `GET /jobs/:jobId` → `GET /archive/jobs/:jobId`
- `PUT /jobs/:jobId/status` → `PUT /archive/jobs/:jobId/status`
- `GET /jobs` → `GET /archive/jobs`
- `GET /jobs/stats` → `GET /archive/jobs/stats`
- `DELETE /jobs/:jobId` → `DELETE /archive/jobs/:jobId`

**Note**: Direct access routes have the same authentication requirements and response formats as their `/archive` counterparts.

---

## Notes

1. **Authentication Headers**:
   - User endpoints: `Authorization: Bearer <jwt_token>`
   - Service endpoints: `X-Service-Key: <service_key>` + `X-Internal-Service: true`

2. **Content-Type**: Semua request body menggunakan `application/json`

3. **Pagination**: Menggunakan offset-based pagination dengan parameter `page` dan `limit`

4. **Timestamps**: Semua timestamp dalam format ISO 8601 UTC

5. **UUIDs**: Semua ID menggunakan format UUID v4

6. **Rate Limiting**: Endpoint user memiliki rate limiting, endpoint service tidak

7. **CORS**: Dikonfigurasi untuk menerima request dari frontend domains yang diizinkan

8. **Route Variants**: Service mendukung multiple route patterns:
   - Legacy routes: `/archive/*` (backward compatibility)
   - Direct routes: `/*` (direct service access)
   - Unified routes: `/api/v1/*` (new unified API)

9. **Caching**: Statistics dan demographics endpoints menggunakan caching untuk performa optimal

10. **Query Optimization**: Demographics endpoints menggunakan composite indexes untuk query yang efisien

11. **API Gateway Integration**: Ketika diakses melalui API Gateway, semua endpoint archive service dapat diakses dengan prefix `/api/archive/`:
    - `/api/archive/results` → `/archive/results`
    - `/api/archive/jobs` → `/archive/jobs`
    - `/api/archive/stats` → `/archive/stats`
    - `/api/archive/demographics` → `/archive/demographics`
    - `/api/archive/health` → `/health`

12. **Service Discovery**: Archive service berjalan di port 3002 (default) dan dapat diakses langsung atau melalui API Gateway di port 3000
