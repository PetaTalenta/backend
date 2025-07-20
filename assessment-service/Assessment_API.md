# Assessment Service API Documentation

## Overview
Assessment Service mengelola penerimaan data assessment psikologi dan mengkoordinasikan analisis AI melalui queue system.

## Base URL
```
http://localhost:3003
```

## Error Codes
- `400` - Bad Request (validation error, invalid input)
- `401` - Unauthorized (missing/invalid authentication)
- `403` - Forbidden (insufficient token balance, access denied)
- `404` - Not Found (resource tidak ditemukan)
- `500` - Internal Server Error
- `503` - Service Unavailable (dependency service down)

---

## Public Endpoints

### GET /
**Error Codes**: 500  
**Description**: Service information

**Response**:
```json
{
  "success": true,
  "message": "ATMA Assessment Service is running",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET /health
**Error Codes**: 500  
**Description**: Service health status dengan dependency checks

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "assessment-service",
  "version": "1.0.0",
  "dependencies": {
    "rabbitmq": {
      "status": "healthy",
      "details": {
        "messageCount": 5,
        "consumerCount": 1
      }
    },
    "authService": {
      "status": "healthy"
    },
    "archiveService": {
      "status": "healthy"
    }
  },
  "jobs": {
    "total": 15,
    "queued": 5,
    "processing": 2,
    "completed": 7,
    "failed": 1
  }
}
```

### GET /health/ready
**Error Codes**: 503  
**Description**: Readiness probe untuk container orchestration

**Response**:
```json
{
  "status": "ready",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Internal Service Endpoints

### POST /assessments/callback/completed
**Error Codes**: 400, 401, 404  
**Description**: Callback dari analysis worker ketika job selesai  
**Authentication**: Internal service key required

**Headers**:
```
X-Service-Key: internal_service_secret_key
X-Internal-Service: true
```

**Request Body**:
```json
{
  "jobId": "uuid",
  "resultId": "uuid", 
  "status": "completed"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Job status updated successfully",
  "data": {
    "jobId": "uuid",
    "status": "completed",
    "progress": 100,
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST /assessments/callback/failed
**Error Codes**: 400, 401, 404  
**Description**: Callback dari analysis worker ketika job gagal  
**Authentication**: Internal service key required

**Headers**:
```
X-Service-Key: internal_service_secret_key
X-Internal-Service: true
```

**Request Body**:
```json
{
  "jobId": "uuid",
  "resultId": "uuid",
  "status": "failed",
  "errorMessage": "AI service error message"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Job status updated to failed and tokens refunded",
  "data": {
    "jobId": "uuid",
    "status": "failed",
    "progress": 0,
    "error": "AI service error message",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## User Endpoints

### POST /assessments/submit
**Error Codes**: 400, 401, 403, 500, 503  
**Description**: Submit assessment data untuk analisis AI  
**Authentication**: Bearer token required  
**Token Cost**: 1 token

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Request Body**:
```json
{
  "riasec": {
    "realistic": 75,
    "investigative": 85,
    "artistic": 60,
    "social": 50,
    "enterprising": 70,
    "conventional": 55
  },
  "ocean": {
    "conscientiousness": 65,
    "extraversion": 55,
    "agreeableness": 45,
    "neuroticism": 30,
    "openness": 80
  },
  "viaIs": {
    "creativity": 85,
    "curiosity": 78,
    "judgment": 70,
    "loveOfLearning": 82,
    "perspective": 60,
    "bravery": 55,
    "perseverance": 68,
    "honesty": 73,
    "zest": 66,
    "love": 80,
    "kindness": 75,
    "socialIntelligence": 65,
    "teamwork": 60,
    "fairness": 70,
    "leadership": 67,
    "forgiveness": 58,
    "humility": 62,
    "prudence": 69,
    "selfRegulation": 61,
    "appreciationOfBeauty": 50,
    "gratitude": 72,
    "hope": 77,
    "humor": 65,
    "spirituality": 55
  },
  "assessmentName": "AI-Based IQ Test"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Assessment submitted successfully and queued for analysis",
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

**Note**: To check job status, use Archive Service endpoint: `GET /api/archive/jobs/:jobId`

---

## Development Endpoints

### POST /test/submit
**Error Codes**: 400, 500  
**Description**: Test assessment submission (development only)  
**Environment**: Development only

**Request Body**: Same as `/assessments/submit`

**Response**: Same as `/assessments/submit`

### GET /test/status/:jobId
**Error Codes**: 400, 404  
**Description**: Test job status check (development only)  
**Environment**: Development only

**Response**: Same as `/assessments/status/:jobId`

---

## Notes

1. **Authentication**:
   - User endpoints: `Authorization: Bearer <jwt_token>`
   - Internal service endpoints: `X-Service-Key` + `X-Internal-Service: true`

2. **Content-Type**: Semua request body menggunakan `application/json`

3. **Rate Limiting**: User endpoints memiliki rate limiting

4. **Job Status Values**: `queued`, `processing`, `completed`, `failed`

5. **Token Balance**: User harus memiliki minimal 1 token untuk submit assessment

6. **Queue Position**: Estimasi posisi dalam antrian processing
