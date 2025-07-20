# ATMA API Gateway - External API Documentation

## Overview
ATMA (AI-Driven Talent Mapping Assessment) API Gateway menyediakan unified access point untuk semua layanan backend dalam sistem ATMA. Gateway ini menangani authentication, rate limiting, dan routing ke berbagai microservices.

## Base URL
```
http://localhost:3000/api
```

## Common Error Codes
Semua endpoint dapat mengembalikan error codes berikut:
- `400` - Bad Request (validation error, invalid input)
- `401` - Unauthorized (missing/invalid authentication token)
- `403` - Forbidden (insufficient permissions, token balance)
- `404` - Not Found (resource tidak ditemukan)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error
- `503` - Service Unavailable (backend service down)
- `504` - Gateway Timeout (service request timeout)

## Authentication

### User Authentication
Gunakan JWT token yang diperoleh dari login:
```
Authorization: Bearer <jwt_token>
```

### Internal Service Authentication
Untuk komunikasi antar service (tidak untuk external use):
```
X-Service-Key: <internal_service_key>
X-Internal-Service: true
```

## Rate Limiting

**Updated for High-Volume Testing (1000+ concurrent users)**

| Endpoint Type | Window | Max Requests | Key | Notes |
|---------------|--------|--------------|-----|-------|
| General | 15 min | 5000 | IP + User ID | Supports mass testing |
| Auth | 15 min | 2500 | IP | Register + Login + Profile |
| Assessment | 1 hour | 1000 | User ID | Mass assessment testing |
| Admin | 15 min | 1000 | IP | High-volume admin ops |

Rate limit headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when rate limit resets

---

## Authentication Endpoints

### POST /auth/register
Registrasi user baru.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Validation Rules:**
- `email`: Valid email format, max 255 characters
- `password`: Min 8 characters, must contain letters and numbers

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "user_type": "user",
      "is_active": true,
      "token_balance": 0,
      "created_at": "2025-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

### POST /auth/register/batch
Registrasi batch multiple users.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "users": [
    {
      "email": "user1@example.com",
      "password": "password123"
    },
    {
      "email": "user2@example.com", 
      "password": "password456"
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Batch registration completed",
  "data": {
    "successful": 2,
    "failed": 0,
    "results": [...]
  }
}
```

### POST /auth/login
Login user.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "user_type": "user",
      "is_active": true,
      "token_balance": 5,
      "last_login": "2025-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

### POST /auth/logout
Logout user (invalidate token di client side).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### GET /auth/profile
Mendapatkan profil user yang terautentikasi.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "user@example.com",
      "user_type": "user",
      "is_active": true,
      "token_balance": 5,
      "last_login": "2025-01-01T00:00:00.000Z",
      "created_at": "2025-01-01T00:00:00.000Z",
      "profile": {
        "full_name": "John Doe",
        "date_of_birth": "1995-01-01",
        "gender": "male",
        "school": {
          "id": 123,
          "name": "SMA Negeri 1 Jakarta",
          "city": "Jakarta",
          "province": "DKI Jakarta"
        }
      }
    }
  }
}
```

### PUT /auth/profile
Update profil user.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "johndoe",
  "full_name": "John Doe",
  "school_id": 123,
  "date_of_birth": "1995-01-01",
  "gender": "male"
}
```

**Alternative dengan school_origin:**
```json
{
  "username": "johndoe",
  "full_name": "John Doe",
  "school_origin": "SMA Negeri 1 Jakarta",
  "date_of_birth": "1995-01-01",
  "gender": "male"
}
```

**Validation Rules:**
- `username`: 3-50 characters, alphanumeric + underscore
- `full_name`: Max 100 characters
- `school_id`: Integer (use either school_id OR school_origin)
- `school_origin`: Max 200 characters
- `date_of_birth`: YYYY-MM-DD format
- `gender`: "male", "female", or "other"

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      // Updated user object with profile
    }
  }
}
```

### POST /auth/change-password
Mengubah password user.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### GET /auth/token-balance
Mendapatkan saldo token user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "tokenBalance": 5,
    "userId": "uuid"
  }
}
```

---

## School Management Endpoints

### GET /auth/schools
Mendapatkan daftar sekolah.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
```
page: number (default: 1)
limit: number (default: 20, max: 100)
search: string (optional)
city: string (optional)
province: string (optional)
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "schools": [
      {
        "id": 1,
        "name": "SMA Negeri 1 Jakarta",
        "address": "Jl. Budi Utomo No. 7",
        "city": "Jakarta",
        "province": "DKI Jakarta",
        "user_count": 25
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### POST /auth/schools
Membuat sekolah baru.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "SMA Negeri 1 Jakarta",
  "address": "Jl. Budi Utomo No. 7",
  "city": "Jakarta",
  "province": "DKI Jakarta"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "School created successfully",
  "data": {
    "school": {
      "id": 1,
      "name": "SMA Negeri 1 Jakarta",
      "address": "Jl. Budi Utomo No. 7",
      "city": "Jakarta",
      "province": "DKI Jakarta",
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

### GET /auth/schools/by-location
Mendapatkan sekolah berdasarkan lokasi.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
```
city: string (optional)
province: string (optional)
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "schools": [
      {
        "id": 1,
        "name": "SMA Negeri 1 Jakarta",
        "city": "Jakarta",
        "province": "DKI Jakarta",
        "user_count": 25
      }
    ]
  }
}
```

### GET /auth/schools/location-stats
Mendapatkan statistik sekolah per lokasi.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "locationStats": [
      {
        "province": "DKI Jakarta",
        "city": "Jakarta",
        "school_count": 15,
        "user_count": 250
      }
    ]
  }
}
```

### GET /auth/schools/distribution
Mendapatkan distribusi user per sekolah.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "schoolDistribution": [
      {
        "school_id": 1,
        "school_name": "SMA Negeri 1 Jakarta",
        "city": "Jakarta",
        "province": "DKI Jakarta",
        "user_count": 25,
        "percentage": 15.5
      }
    ]
  }
}
```

---

## Admin Endpoints

### POST /admin/login
Login admin.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "admin",
      "email": "admin@example.com",
      "user_type": "admin",
      "is_active": true
    },
    "token": "jwt_token_here",
    "message": "Login successful"
  }
}
```

### GET /admin/profile
Mendapatkan profil admin.

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "admin",
      "email": "admin@example.com",
      "user_type": "admin",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

---

## Assessment Endpoints

### POST /assessment/submit
Submit assessment data untuk analisis AI.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Token Cost:** 1 token

**Request Body:**
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

**Validation Rules:**
- All scores must be integers between 0-100
- RIASEC: 6 dimensions required
- OCEAN: 5 dimensions required
- VIA-IS: 24 character strengths required
- assessmentName: Optional, must be one of: "AI-Driven Talent Mapping", "AI-Based IQ Test", "Custom Assessment"

**Response (202):**
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
    "remainingTokens": 4
  }
}
```

---

## Archive Endpoints

### GET /archive/results
Mendapatkan daftar analysis results untuk user.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
```
page: number (default: 1)
limit: number (default: 10, max: 100)
status: string (completed|processing|failed)
assessment_name: string (AI-Driven Talent Mapping|AI-Based IQ Test|Custom Assessment)
sort: string (created_at|updated_at, default: created_at)
order: string (asc|desc, default: desc)
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "persona_profile": {
        "archetype": "The Analytical Innovator",
        "shortSummary": "Anda adalah seorang pemikir analitis dengan kecenderungan investigatif yang kuat dan kreativitas tinggi. Kombinasi antara kecerdasan logis-matematis yang dominan dan keterbukaan terhadap pengalaman baru membuat Anda unggul dalam memecahkan masalah kompleks dengan pendekatan inovatif. Anda memiliki keingintahuan intelektual yang tinggi dan selalu mencari pengetahuan baru.",
        "strengths": [
          "Kemampuan analisis yang tajam",
          "Kreativitas dan inovasi",
          "Keingintahuan intelektual yang tinggi",
          "Kemampuan belajar mandiri yang kuat",
          "Pemikiran sistematis dan terstruktur"
        ],
        "weaknesses": [
          "Terkadang terlalu perfeksionis",
          "Dapat terjebak dalam overthinking",
          "Kurang sabar dengan proses yang lambat",
          "Kemampuan sosial yang perlu dikembangkan",
          "Kesulitan mendelegasikan tugas"
        ],
        "careerRecommendation": [
          {
            "careerName": "Data Scientist",
            "careerProspect": {
              "jobAvailability": "high",
              "salaryPotential": "high",
              "careerProgression": "high",
              "industryGrowth": "super high",
              "skillDevelopment": "super high"
            }
          },
          {
            "careerName": "Peneliti",
            "careerProspect": {
              "jobAvailability": "moderate",
              "salaryPotential": "moderate",
              "careerProgression": "moderate",
              "industryGrowth": "moderate",
              "skillDevelopment": "high"
            }
          },
          {
            "careerName": "Pengembang Software",
            "careerProspect": {
              "jobAvailability": "super high",
              "salaryPotential": "high",
              "careerProgression": "high",
              "industryGrowth": "super high",
              "skillDevelopment": "super high"
            }
          }
        ],
        "insights": [
          "Kembangkan keterampilan komunikasi untuk menyampaikan ide kompleks dengan lebih efektif",
          "Latih kemampuan bekerja dalam tim untuk mengimbangi kecenderungan bekerja sendiri",
          "Manfaatkan kekuatan analitis untuk memecahkan masalah sosial",
          "Cari mentor yang dapat membantu mengembangkan keterampilan kepemimpinan",
          "Tetapkan batas waktu untuk menghindari analisis berlebihan"
        ],
        "workEnvironment": "Lingkungan kerja yang ideal adalah tempat yang memberikan otonomi intelektual, menghargai inovasi, dan menyediakan tantangan kognitif yang berkelanjutan. Anda akan berkembang di lingkungan yang terstruktur namun fleksibel, dengan akses ke sumber daya penelitian dan pembelajaran yang memadai.",
        "roleModel": [
          "Marie Curie",
          "Albert Einstein",
          "Ada Lovelace",
          "Elon Musk",
          "B.J. Habibie"
        ]
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

### GET /archive/results/:id
Mendapatkan analysis result spesifik berdasarkan ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "assessment_data": {
      "riasec": { },
      "ocean": { },
      "viaIs": { }
    },
    "persona_profile": {
      "archetype": "The Analytical Innovator",
      "shortSummary": "Anda adalah seorang pemikir analitis dengan kecenderungan investigatif yang kuat dan kreativitas tinggi. Kombinasi antara kecerdasan logis-matematis yang dominan dan keterbukaan terhadap pengalaman baru membuat Anda unggul dalam memecahkan masalah kompleks dengan pendekatan inovatif. Anda memiliki keingintahuan intelektual yang tinggi dan selalu mencari pengetahuan baru.",
      "strengths": [
        "Kemampuan analisis yang tajam",
        "Kreativitas dan inovasi",
        "Keingintahuan intelektual yang tinggi",
        "Kemampuan belajar mandiri yang kuat",
        "Pemikiran sistematis dan terstruktur"
      ],
      "weaknesses": [
        "Terkadang terlalu perfeksionis",
        "Dapat terjebak dalam overthinking",
        "Kurang sabar dengan proses yang lambat",
        "Kemampuan sosial yang perlu dikembangkan",
        "Kesulitan mendelegasikan tugas"
      ],
      "careerRecommendation": [
        {
          "careerName": "Data Scientist",
          "careerProspect": {
            "jobAvailability": "high",
            "salaryPotential": "high",
            "careerProgression": "high",
            "industryGrowth": "super high",
            "skillDevelopment": "super high"
          }
        },
        {
          "careerName": "Peneliti",
          "careerProspect": {
            "jobAvailability": "moderate",
            "salaryPotential": "moderate",
            "careerProgression": "moderate",
            "industryGrowth": "moderate",
            "skillDevelopment": "high"
          }
        },
        {
          "careerName": "Pengembang Software",
          "careerProspect": {
            "jobAvailability": "super high",
            "salaryPotential": "high",
            "careerProgression": "high",
            "industryGrowth": "super high",
            "skillDevelopment": "super high"
          }
        }
      ],
      "insights": [
        "Kembangkan keterampilan komunikasi untuk menyampaikan ide kompleks dengan lebih efektif",
        "Latih kemampuan bekerja dalam tim untuk mengimbangi kecenderungan bekerja sendiri",
        "Manfaatkan kekuatan analitis untuk memecahkan masalah sosial",
        "Cari mentor yang dapat membantu mengembangkan keterampilan kepemimpinan",
        "Tetapkan batas waktu untuk menghindari analisis berlebihan"
      ],
      "workEnvironment": "Lingkungan kerja yang ideal adalah tempat yang memberikan otonomi intelektual, menghargai inovasi, dan menyediakan tantangan kognitif yang berkelanjutan. Anda akan berkembang di lingkungan yang terstruktur namun fleksibel, dengan akses ke sumber daya penelitian dan pembelajaran yang memadai.",
      "roleModel": [
        "Marie Curie",
        "Albert Einstein",
        "Ada Lovelace",
        "Elon Musk",
        "B.J. Habibie"
      ]
    },
    "status": "completed",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### DELETE /archive/results/:id
Menghapus analysis result.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Analysis result deleted successfully"
}
```

### GET /archive/jobs
Mendapatkan daftar analysis jobs untuk user.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
```
page: number (default: 1)
limit: number (default: 10, max: 100)
status: string (queued|processing|completed|failed)
assessment_name: string (AI-Driven Talent Mapping|AI-Based IQ Test|Custom Assessment)
sort: string (created_at|updated_at, default: created_at)
order: string (asc|desc, default: desc)
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "job_id": "string",
      "user_id": "uuid",
      "status": "completed",
      "assessment_name": "AI-Driven Talent Mapping",
      "priority": 0,
      "retry_count": 0,
      "max_retries": 3,
      "result_id": "uuid",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### GET /archive/jobs/:jobId
Mendapatkan status job berdasarkan job ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "job_id": "string",
    "user_id": "uuid",
    "status": "completed",
    "priority": 0,
    "retry_count": 0,
    "max_retries": 3,
    "result_id": "uuid",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Health Check Endpoints

### GET /health
Basic health check untuk API Gateway.

**Response (200):**
```json
{
  "success": true,
  "status": "healthy",
  "service": "api-gateway",
  "version": "1.0.0",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "uptime": 3600.5,
  "environment": "development"
}
```

### GET /health/detailed
Detailed health check dengan status semua services.

**Response (200):**
```json
{
  "success": true,
  "status": "healthy",
  "service": "api-gateway",
  "version": "1.0.0",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "uptime": 3600.5,
  "environment": "development",
  "services": {
    "auth": {
      "status": "healthy",
      "url": "http://localhost:3001",
      "responseTime": "50ms",
      "lastChecked": "2025-01-01T00:00:00.000Z"
    },
    "archive": {
      "status": "healthy",
      "url": "http://localhost:3002",
      "responseTime": "45ms",
      "lastChecked": "2025-01-01T00:00:00.000Z"
    },
    "assessment": {
      "status": "healthy",
      "url": "http://localhost:3003",
      "responseTime": "60ms",
      "lastChecked": "2025-01-01T00:00:00.000Z"
    }
  },
  "summary": {
    "total": 3,
    "healthy": 3,
    "unhealthy": 0
  }
}
```

### GET /health/ready
Readiness probe untuk container orchestration.

**Response (200):**
```json
{
  "status": "ready",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "services": [
    {
      "service": "auth",
      "ready": true
    },
    {
      "service": "archive",
      "ready": true
    },
    {
      "service": "assessment",
      "ready": true
    }
  ]
}
```

### GET /health/live
Liveness probe untuk container orchestration.

**Response (200):**
```json
{
  "status": "alive",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "uptime": 3600.5
}
```

---

## Usage Examples

### Complete User Flow Example

1. **Register User:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

2. **Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

3. **Update Profile:**
```bash
curl -X PUT http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "full_name": "John Doe",
    "school_id": 123,
    "date_of_birth": "1995-01-01",
    "gender": "male"
  }'
```

4. **Submit Assessment:**
```bash
curl -X POST http://localhost:3000/api/assessment/submit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
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
    }
  }'
```

5. **Check Job Status:**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/archive/jobs/YOUR_JOB_ID
```

6. **Get Results:**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/archive/results
```

---

## Notes

1. **Content-Type**: Semua request body menggunakan `application/json`
2. **Authentication**: User endpoints memerlukan Bearer token
3. **Rate Limiting**: Perhatikan rate limit untuk setiap endpoint type
4. **Token Balance**: User harus memiliki minimal 1 token untuk submit assessment
5. **Job Processing**: Assessment processing bersifat asynchronous, gunakan job ID untuk tracking
6. **Error Handling**: Semua error response mengikuti format standar dengan `success: false`
7. **Pagination**: Endpoint list menggunakan pagination dengan `page` dan `limit` parameters
8. **CORS**: API Gateway mendukung CORS untuk web applications
9. **Validation**: Semua input data divalidasi sesuai dengan schema yang telah ditentukan
10. **Security**: API Gateway menggunakan JWT untuk authentication dan rate limiting untuk protection

## Environment Configuration

### Development
```
Base URL: http://localhost:3000/api
```

### Production
```
Base URL: https://your-domain.com/api
```

## Support

Untuk pertanyaan teknis atau bantuan implementasi, silakan merujuk ke:
- USAGE_GUIDE.md untuk panduan penggunaan
- Individual service documentation untuk detail implementasi
- Health endpoints untuk monitoring status system
