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

### POST /batch/process
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
