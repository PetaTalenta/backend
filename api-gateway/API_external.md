# API Gateway - External API Documentation

## Overview

API Gateway menyediakan akses terpusat ke semua microservices dalam sistem ATMA (AI-Driven Talent Mapping Assessment). Gateway ini menangani routing, autentikasi, rate limiting, dan proxy ke berbagai services.

**Gateway Information:**

- **Service Name:** api-gateway
- **Port:** 3000
- **Base URL:** `http://localhost:3000/api/`
- **Version:** 1.0.0

## Authentication

Sebagian besar endpoint memerlukan autentikasi JWT token yang diperoleh dari Auth Service.

**Header Required:**

```
Authorization: Bearer <jwt_token>
```

## Rate Limiting

- **General Gateway:** 5000 requests per 15 minutes
- **Auth Endpoints:** 100 requests per 15 minutes
- **Assessment Endpoints:** 100 requests per 15 minutes
- **Admin Endpoints:** 50 requests per 15 minutes
- **Archive Endpoints:** 1000 requests per 15 minutes
- **Chat Endpoints:** 500 requests per 15 minutes

---

## 🔐 Authentication Service Routes (`/api/auth/`)

### Public Endpoints (No Authentication)

#### POST /api/auth/register

Mendaftarkan user baru ke sistem.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "myPassword1",
  "username": "johndoe"
}
```

**Response Success (201):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "username": "johndoe",
      "user_type": "user",
      "is_active": true,
      "token_balance": 5
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully"
}
```

#### POST /api/auth/login

Login user ke sistem.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "myPassword1"
}
```

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "username": "johndoe",
      "user_type": "user",
      "is_active": true,
      "token_balance": 5
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

### Protected Endpoints (Authentication Required)

#### GET /api/auth/profile

Mendapatkan profil user yang sedang login.

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "johndoe",
    "user_type": "user",
    "is_active": true,
    "token_balance": 5,
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

#### PUT /api/auth/profile

Update profil user.

**Request Body:**

```json
{
  "username": "newusername",
  "email": "newemail@example.com",
  "full_name": "John Doe Updated"
}
```

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "newusername",
      "email": "newemail@example.com",
      "user_type": "user",
      "is_active": true,
      "token_balance": 5,
      "last_login": "2024-01-15T10:30:00.000Z",
      "created_at": "2024-01-15T10:30:00.000Z",
      "profile": {
        "full_name": "John Doe Updated",
        "school_info": {
          "type": "structured",
          "school_id": "school-uuid",
          "school": {
            "id": "school-uuid",
            "name": "SMA Negeri 1 Jakarta"
          }
        }
      }
    },
    "message": "Profile updated successfully"
  }
}
```

#### POST /api/auth/change-password

Mengubah password user.

**Request Body:**

```json
{
  "currentPassword": "oldPassword1",
  "newPassword": "newPassword1"
}
```

**Response Success (200):**

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

#### POST /api/auth/logout

Logout user dari sistem.

**Response Success (200):**

```json
{
  "success": true,
  "message": "Logout successful"
}
```

#### GET /api/auth/token-balance

Mendapatkan saldo token user.

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "token_balance": 5
  }
}
```

#### GET /api/auth/schools

Mendapatkan daftar sekolah.

**Query Parameters:**

- `search` (string): Pencarian nama sekolah
- `city` (string): Filter berdasarkan kota
- `province` (string): Filter berdasarkan provinsi
- `page` (number): Halaman (default: 1)
- `limit` (number): Jumlah per halaman (default: 20)
- `useFullText` (boolean): Gunakan full-text search (default: false)

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "schools": [
      {
        "id": "school-uuid",
        "name": "SMA Negeri 1 Jakarta",
        "address": "Jl. Sudirman No. 1",
        "city": "Jakarta",
        "province": "DKI Jakarta",
        "created_at": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

#### POST /api/auth/schools

Membuat sekolah baru.

**Request Body:**

```json
{
  "name": "SMA Negeri 1 Jakarta",
  "address": "Jl. Sudirman No. 1",
  "city": "Jakarta",
  "province": "DKI Jakarta"
}
```

**Response Success (201):**

```json
{
  "success": true,
  "data": {
    "school": {
      "id": "school-uuid",
      "name": "SMA Negeri 1 Jakarta",
      "address": "Jl. Sudirman No. 1",
      "city": "Jakarta",
      "province": "DKI Jakarta",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  },
  "message": "School created successfully"
}
```

---

## 🎯 Assessment Service Routes (`/api/assessment/`)

### Assessment Submission

#### POST /api/assessment/submit

Submit assessment data untuk analisis AI.

**Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-Idempotency-Key: <unique_key> (optional)
```

**Request Body:**

```json
{
  "assessmentName": "Test Assessment",
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

**Response Success (202):**

```json
{
  "success": true,
  "data": {
    "jobId": "job_550e8400-e29b-41d4-a716-446655440000",
    "status": "queued",
    "estimatedProcessingTime": "2-5 minutes",
    "queuePosition": 1
  },
  "message": "Assessment submitted successfully"
}
```

#### GET /api/assessment/status/:jobId

Mengecek status assessment yang sedang diproses.

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "jobId": "job_550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "progress": 100,
    "resultId": "result_550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Health Endpoints

#### GET /api/assessment/health

Health check assessment service.

#### GET /api/assessment/health/ready

Readiness probe.

#### GET /api/assessment/health/live

Liveness probe.

#### GET /api/assessment/health/queue

Queue status check.

---

## 📁 Archive Service Routes (`/api/archive/`)

Archive Service mengelola hasil assessment dan job tracking dengan optimasi performa tinggi menggunakan caching dan batch processing.

**Supported Assessment Types:**

- `AI-Driven Talent Mapping` (default)
- `AI-Based IQ Test`
- `Custom Assessment`

**Status Values:**

- Results: `completed`, `processing`, `failed`
- Jobs: `queued`, `processing`, `completed`, `failed`

### Results Management

#### GET /api/archive/results

Mendapatkan daftar hasil assessment user.

**Query Parameters:**

- `page` (number): Halaman (default: 1)
- `limit` (number): Jumlah per halaman (default: 10, max: 100)
- `status` (string): Filter status (completed, processing, failed)
- `assessment_name` (string): Filter berdasarkan nama assessment (AI-Driven Talent Mapping, AI-Based IQ Test, Custom Assessment)
- `sort` (string): Field untuk sorting (created_at, updated_at, default: created_at)
- `order` (string): Urutan sorting (asc, desc, ASC, DESC, default: desc)

**Response Success (200):**

```json
{
  "success": true,
  "message": "Results retrieved successfully",
  "data": {
    "results": [
      {
        "id": "result_550e8400-e29b-41d4-a716-446655440000",
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "assessment_name": "AI-Driven Talent Mapping",
        "status": "completed",
        "created_at": "2024-01-15T10:30:00.000Z",
        "persona_profile": {
          "archetype": "The Innovator",
          "shortSummary": "You are a natural innovator with strong analytical thinking and problem-solving abilities. You thrive in environments that challenge your intellect and allow you to explore new ideas.",
          "strengths": ["Problem Solving", "Analytical Thinking", "Innovation"],
          "weaknesses": ["Communication", "Leadership", "Time Management"],
          "careerRecommendation": [
            {
              "careerName": "Software Engineer",
              "careerProspect": {
                "jobAvailability": "high",
                "salaryPotential": "high",
                "careerProgression": "high",
                "industryGrowth": "high",
                "skillDevelopment": "high"
              }
            },
            {
              "careerName": "Data Scientist",
              "careerProspect": {
                "jobAvailability": "high",
                "salaryPotential": "high",
                "careerProgression": "high",
                "industryGrowth": "super high",
                "skillDevelopment": "high"
              }
            }
          ],
          "insights": [
            "Your investigative nature makes you excellent at research and analysis",
            "You prefer working independently on complex problems",
            "Technology and innovation sectors align well with your personality"
          ],
          "workEnvironment": "You thrive in quiet, organized environments where you can focus deeply on complex problems. You prefer minimal interruptions and value intellectual autonomy.",
          "roleModel": [
            "Elon Musk",
            "Steve Jobs",
            "Bill Gates",
            "Mark Zuckerberg"
          ]
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### GET /api/archive/results/:resultId

Mendapatkan detail hasil assessment.

**Path Parameters:**

- `resultId` (string): UUID dari hasil assessment

**Response Success (200):**

```json
{
  "success": true,
  "message": "Result retrieved successfully",
  "data": {
    "id": "result_550e8400-e29b-41d4-a716-446655440000",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "assessment_name": "AI-Driven Talent Mapping",
    "status": "completed",
    "assessment_data": {
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
    },
    "persona_profile": {
      "archetype": "The Innovator",
      "shortSummary": "You are a natural innovator with strong analytical thinking and problem-solving abilities. You thrive in environments that challenge your intellect and allow you to explore new ideas.",
      "strengths": ["Problem Solving", "Analytical Thinking", "Innovation"],
      "weaknesses": ["Communication", "Leadership", "Time Management"],
      "careerRecommendation": [
        {
          "careerName": "Software Engineer",
          "careerProspect": {
            "jobAvailability": "high",
            "salaryPotential": "high",
            "careerProgression": "high",
            "industryGrowth": "high",
            "skillDevelopment": "high"
          }
        },
        {
          "careerName": "Data Scientist",
          "careerProspect": {
            "jobAvailability": "high",
            "salaryPotential": "high",
            "careerProgression": "high",
            "industryGrowth": "super high",
            "skillDevelopment": "high"
          }
        }
      ],
      "insights": [
        "Your investigative nature makes you excellent at research and analysis",
        "You prefer working independently on complex problems",
        "Technology and innovation sectors align well with your personality"
      ],
      "workEnvironment": "You thrive in quiet, organized environments where you can focus deeply on complex problems. You prefer minimal interruptions and value intellectual autonomy.",
      "roleModel": ["Elon Musk", "Steve Jobs", "Bill Gates", "Mark Zuckerberg"]
    },
    "error_message": null,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Job Tracking

#### GET /api/archive/jobs

Mendapatkan daftar job assessment user.

**Query Parameters:**

- `page` (number): Halaman (default: 1)
- `limit` (number): Jumlah per halaman (default: 10, max: 100)
- `status` (string): Filter status (queued, processing, completed, failed)
- `assessment_name` (string): Filter berdasarkan nama assessment (AI-Driven Talent Mapping, AI-Based IQ Test, Custom Assessment)
- `sort` (string): Field untuk sorting (created_at, updated_at, status, default: created_at)
- `order` (string): Urutan sorting (asc, desc, ASC, DESC, default: desc)

**Response Success (200):**

```json
{
  "success": true,
  "message": "Jobs retrieved successfully",
  "data": {
    "jobs": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "job_id": "job_550e8400-e29b-41d4-a716-446655440000",
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "status": "completed",
        "assessment_name": "AI-Driven Talent Mapping",
        "result_id": "result_550e8400-e29b-41d4-a716-446655440000",
        "error_message": null,
        "completed_at": "2024-01-15T10:35:00.000Z",
        "processing_started_at": "2024-01-15T10:30:30.000Z",
        "priority": 0,
        "retry_count": 0,
        "max_retries": 3,
        "created_at": "2024-01-15T10:30:00.000Z",
        "updated_at": "2024-01-15T10:35:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### GET /api/archive/jobs/:jobId

Mendapatkan detail job assessment.

**Path Parameters:**

- `jobId` (string): Job ID dari assessment

**Response Success (200):**

```json
{
  "success": true,
  "message": "Job retrieved successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "job_id": "job_550e8400-e29b-41d4-a716-446655440000",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "assessment_name": "AI-Driven Talent Mapping",
    "result_id": "result_550e8400-e29b-41d4-a716-446655440000",
    "error_message": null,
    "completed_at": "2024-01-15T10:35:00.000Z",
    "processing_started_at": "2024-01-15T10:30:30.000Z",
    "priority": 0,
    "retry_count": 0,
    "max_retries": 3,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:35:00.000Z"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### DELETE /api/archive/jobs/:jobId

Hapus/cancel job assessment (user only). Job dengan status 'processing' tidak dapat dihapus.

**Path Parameters:**

- `jobId` (string): Job ID dari assessment

**Response Success (200):**

```json
{
  "success": true,
  "message": "Job deleted successfully",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Response Error (400) - Job sedang diproses:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Cannot delete job that is currently processing",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

#### GET /api/archive/jobs/stats

Mendapatkan statistik job untuk user yang sedang login.

**Response Success (200):**

```json
{
  "success": true,
  "message": "Job statistics retrieved successfully",
  "data": {
    "total_jobs": 10,
    "completed_jobs": 8,
    "failed_jobs": 1,
    "processing_jobs": 1,
    "queued_jobs": 0,
    "success_rate": 0.8,
    "average_processing_time": "3.2 minutes",
    "last_job_date": "2024-01-15T10:30:00.000Z"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Statistics

#### GET /api/archive/v1/stats

Endpoint statistik terpadu dengan caching dan optimasi performa.

**Query Parameters:**

- `type` (string): user, system, demographic, performance (required)
- `scope` (string): overview, detailed, analysis, summary, queue, insights (default: overview)
- `timeRange` (string): "1 day", "7 days", "30 days", "90 days" (default: "7 days")

**Response Success (200) - User Stats (type=user, scope=overview):**

```json
{
  "success": true,
  "message": "user statistics retrieved successfully",
  "data": {
    "total_assessments": 5,
    "completed_assessments": 4,
    "failed_assessments": 1,
    "processing_assessments": 0,
    "success_rate": 0.8,
    "last_assessment_date": "2024-01-15T10:30:00.000Z",
    "favorite_assessment_type": "AI-Driven Talent Mapping",
    "total_jobs": 5,
    "average_processing_time": "3.5 minutes"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Response Success (200) - User Stats (type=user, scope=detailed):**

```json
{
  "success": true,
  "message": "user statistics retrieved successfully",
  "data": {
    "assessment_breakdown": {
      "AI-Driven Talent Mapping": 3,
      "AI-Based IQ Test": 1,
      "Custom Assessment": 1
    },
    "monthly_activity": [
      {
        "month": "2024-01",
        "assessments": 5,
        "success_rate": 0.8
      }
    ],
    "archetype_history": [
      {
        "archetype": "The Innovator",
        "assessment_date": "2024-01-15T10:30:00.000Z",
        "assessment_name": "AI-Driven Talent Mapping"
      }
    ],
    "performance_metrics": {
      "average_completion_time": "3.5 minutes",
      "fastest_completion": "2.1 minutes",
      "slowest_completion": "5.2 minutes"
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Response Success (200) - System Stats (type=system, scope=summary) - Internal Service Only:**

```json
{
  "success": true,
  "message": "system statistics retrieved successfully",
  "data": {
    "total_users": 1250,
    "active_users_today": 89,
    "total_assessments": 3500,
    "assessments_today": 45,
    "overall_success_rate": 0.92,
    "average_processing_time": "3.2 minutes",
    "system_health": {
      "database_status": "healthy",
      "cache_hit_rate": 0.85,
      "queue_length": 12
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Response Success (200) - Performance Stats (type=performance) - Internal Service Only:**

```json
{
  "success": true,
  "message": "performance statistics retrieved successfully",
  "data": {
    "database_performance": {
      "avg_query_time": "45ms",
      "slow_queries": 2,
      "connection_pool_usage": 0.65
    },
    "cache_performance": {
      "hit_rate": 0.85,
      "miss_rate": 0.15,
      "eviction_rate": 0.02
    },
    "index_statistics": [
      {
        "table": "analysis_results",
        "index": "idx_user_created",
        "scans": 1250,
        "efficiency": 0.95
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 💬 Chatbot Service Routes (`/api/chatbot/`)

### Conversation Management

#### POST /api/chatbot/conversations

Membuat percakapan baru.

**Request Body:**

```json
{
  "title": "Career Guidance Chat",
  "context_type": "career_guidance",
  "context_data": {},
  "metadata": {}
}
```

**Response Success (201):**

```json
{
  "success": true,
  "data": {
    "id": "conv_550e8400-e29b-41d4-a716-446655440000",
    "title": "Career Guidance Chat",
    "context_type": "career_guidance",
    "status": "active",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

#### GET /api/chatbot/conversations

Mendapatkan daftar percakapan user.

**Query Parameters:**

- `page` (number): Halaman (default: 1)
- `limit` (number): Jumlah per halaman (default: 20)
- `include_archived` (boolean): Sertakan yang diarsipkan (default: false)
- `context_type` (string): Filter berdasarkan tipe konteks (general, assessment, career_guidance)

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "conv_550e8400-e29b-41d4-a716-446655440000",
        "title": "Career Guidance Chat",
        "context_type": "career_guidance",
        "status": "active",
        "created_at": "2024-01-15T10:30:00.000Z",
        "updated_at": "2024-01-15T10:30:00.000Z",
        "message_count": 5
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_items": 1,
      "items_per_page": 20,
      "has_next": false,
      "has_prev": false
    }
  }
}
```

#### GET /api/chatbot/conversations/:id

Mendapatkan detail percakapan.

**Query Parameters:**

- `include_messages` (boolean): Sertakan pesan (default: false)
- `message_limit` (number): Batas jumlah pesan (default: 50)

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "id": "conv_550e8400-e29b-41d4-a716-446655440000",
    "title": "Career Guidance Chat",
    "context_type": "career_guidance",
    "context_data": {
      "assessment_id": "result_550e8400-e29b-41d4-a716-446655440000"
    },
    "status": "active",
    "metadata": {
      "model_preference": "gpt-3.5-turbo"
    },
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    "messages": [
      {
        "id": "msg_123",
        "content": "Hello, I need career guidance",
        "sender_type": "user",
        "created_at": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

#### PUT /api/chatbot/conversations/:id

Update percakapan.

**Request Body:**

```json
{
  "title": "Updated Career Chat",
  "status": "archived",
  "metadata": {
    "updated_reason": "Session completed"
  }
}
```

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "id": "conv_550e8400-e29b-41d4-a716-446655440000",
    "title": "Updated Career Chat",
    "context_type": "career_guidance",
    "status": "archived",
    "updated_at": "2024-01-15T11:00:00.000Z"
  }
}
```

#### DELETE /api/chatbot/conversations/:id

Hapus percakapan (soft delete).

**Response Success (200):**

```json
{
  "success": true,
  "message": "Conversation deleted successfully"
}
```

### Message Handling

#### POST /api/chatbot/conversations/:conversationId/messages

Mengirim pesan dan mendapatkan balasan AI.

**Request Body:**

```json
{
  "content": "Hello, I need career guidance",
  "content_type": "text",
  "parent_message_id": null
}
```

**Response Success (201):**

```json
{
  "success": true,
  "data": {
    "user_message": {
      "id": "msg_user_123",
      "content": "Hello, I need career guidance",
      "sender_type": "user",
      "created_at": "2024-01-15T10:30:00.000Z"
    },
    "assistant_message": {
      "id": "msg_assistant_124",
      "content": "Hello! I'd be happy to help you with career guidance...",
      "sender_type": "assistant",
      "created_at": "2024-01-15T10:30:01.000Z"
    },
    "usage": {
      "tokens_used": 150,
      "model": "openai/gpt-3.5-turbo"
    }
  }
}
```

#### GET /api/chatbot/conversations/:conversationId/messages

Mendapatkan pesan dalam percakapan.

**Query Parameters:**

- `page` (number): Halaman (default: 1)
- `limit` (number): Jumlah per halaman (default: 50)
- `include_usage` (boolean): Sertakan informasi usage (default: false)

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg_user_123",
        "content": "Hello, I need career guidance",
        "sender_type": "user",
        "created_at": "2024-01-15T10:30:00.000Z",
        "parent_message_id": null
      },
      {
        "id": "msg_assistant_124",
        "content": "Hello! I'd be happy to help you with career guidance...",
        "sender_type": "assistant",
        "created_at": "2024-01-15T10:30:01.000Z",
        "parent_message_id": "msg_user_123",
        "metadata": {
          "model": "gpt-3.5-turbo",
          "tokens_used": 150
        }
      }
    ],
    "conversation_id": "conv_550e8400-e29b-41d4-a716-446655440000",
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_items": 2,
      "items_per_page": 50,
      "has_next": false,
      "has_prev": false
    }
  }
}
```

#### POST /api/chatbot/conversations/:conversationId/messages/:messageId/regenerate

Regenerate balasan AI untuk pesan tertentu.

**Response Success (200):**

```json
{
  "message": {
    "id": "msg_assistant_124",
    "content": "I'd be delighted to assist you with career guidance...",
    "sender_type": "assistant",
    "created_at": "2024-01-15T10:30:01.000Z",
    "updated_at": "2024-01-15T10:35:00.000Z",
    "parent_message_id": "msg_user_123",
    "metadata": {
      "model": "gpt-3.5-turbo",
      "tokens_used": 160,
      "regenerated_at": "2024-01-15T10:35:00.000Z"
    }
  },
  "usage": {
    "prompt_tokens": 50,
    "completion_tokens": 160,
    "total_tokens": 210,
    "model": "gpt-3.5-turbo"
  }
}
```

### Assessment Integration

#### GET /api/chatbot/assessment-ready/:userId

Mengecek apakah assessment user siap untuk integrasi chat.

**Response Success (200):**

```json
{
  "has_assessment": true,
  "assessment_date": "2024-01-15T10:30:00.000Z",
  "assessment_id": "result_550e8400-e29b-41d4-a716-446655440000",
  "conversation_exists": false,
  "conversation_id": null,
  "ready_for_chatbot": true
}
```

#### POST /api/chatbot/assessment/from-assessment

Membuat percakapan berdasarkan hasil assessment.

**Request Body:**

```json
{
  "assessment_id": "result_550e8400-e29b-41d4-a716-446655440000",
  "title": "Career Guidance Based on Assessment",
  "auto_start_message": true
}
```

**Response Success (201):**

```json
{
  "success": true,
  "data": {
    "conversation": {
      "id": "conv_550e8400-e29b-41d4-a716-446655440000",
      "title": "Career Guidance Based on Assessment",
      "context_type": "assessment",
      "context_data": {
        "assessment_id": "result_550e8400-e29b-41d4-a716-446655440000"
      },
      "status": "active",
      "created_at": "2024-01-15T10:30:00.000Z"
    },
    "welcome_message": {
      "id": "msg_welcome_123",
      "content": "Hello! I've reviewed your assessment results and I'm here to help guide your career journey...",
      "sender_type": "assistant",
      "created_at": "2024-01-15T10:30:01.000Z"
    },
    "suggestions": [
      "What career paths align with my personality type?",
      "How can I develop my identified strengths?",
      "What skills should I focus on improving?"
    ]
  }
}
```

#### GET /api/chatbot/conversations/:conversationId/suggestions

Mendapatkan saran percakapan berdasarkan assessment.

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "suggestions": [
      "What career paths align with my personality type?",
      "How can I develop my identified strengths?",
      "What skills should I focus on improving?",
      "Tell me about careers in technology",
      "How can I improve my leadership skills?"
    ],
    "context": {
      "assessment_based": true,
      "conversation_stage": "initial",
      "user_archetype": "The Innovator"
    }
  }
}
```

#### POST /api/chatbot/auto-initialize

Auto-initialize percakapan berdasarkan assessment terbaru.

**Response Success (201):**

```json
{
  "success": true,
  "data": {
    "conversation": {
      "id": "conv_550e8400-e29b-41d4-a716-446655440000",
      "title": "AI Career Guidance",
      "context_type": "assessment",
      "status": "active",
      "created_at": "2024-01-15T10:30:00.000Z"
    },
    "welcome_message": {
      "id": "msg_welcome_123",
      "content": "Hello! Based on your recent assessment, I'm here to provide personalized career guidance...",
      "sender_type": "assistant",
      "created_at": "2024-01-15T10:30:01.000Z"
    },
    "suggestions": [
      "What career paths suit my personality?",
      "How can I leverage my strengths?",
      "What development areas should I focus on?"
    ]
  }
}
```

---

## 🔔 Notification Service Routes (`/api/notifications/`)

### WebSocket Connection

Notification service menyediakan real-time notifications melalui WebSocket di `/socket.io/`.

### Health Check

#### GET /api/notifications/health

Health check notification service.

**Response Success (200):**

```json
{
  "success": true,
  "status": "healthy",
  "service": "notification-service",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "websocket": {
    "status": "active",
    "connections": 25
  }
}
```

---

## 👨‍💼 Admin Routes (`/api/admin/`)

### Admin Authentication

#### POST /api/admin/login

Login admin ke sistem.

**Request Body:**

```json
{
  "username": "admin",
  "password": "adminPassword1"
}
```

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "admin": {
      "id": "admin-uuid",
      "username": "admin",
      "email": "admin@example.com",
      "user_type": "admin",
      "is_active": true,
      "created_at": "2024-01-15T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Admin login successful"
}
```

#### POST /api/admin/register

Mendaftarkan admin baru (hanya untuk superadmin).

**Request Body:**

```json
{
  "username": "newadmin",
  "email": "admin@example.com",
  "password": "adminPassword1",
  "full_name": "Admin Name",
  "user_type": "admin"
}
```

**Response Success (201):**

```json
{
  "success": true,
  "data": {
    "admin": {
      "id": "admin-uuid",
      "username": "newadmin",
      "email": "admin@example.com",
      "user_type": "admin",
      "is_active": true,
      "full_name": "Admin Name",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  },
  "message": "Admin registered successfully"
}
```

### Admin User Management

#### DELETE /api/archive/admin/users/:userId

Hapus user secara permanen (soft delete) - hanya untuk admin.

**Path Parameters:**

- `userId` (string): UUID dari user

**Response Success (200):**

```json
{
  "success": true,
  "message": "User deleted successfully",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### PUT /api/archive/admin/users/:userId/token-balance

Update token balance user (untuk admin).

**Path Parameters:**

- `userId` (string): UUID dari user

**Request Body:**

```json
{
  "amount": 100,
  "operation": "add"
}
```

**Response Success (200):**

```json
{
  "success": true,
  "message": "Token balance updated successfully",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "old_balance": 5,
    "new_balance": 105,
    "amount": 100,
    "operation": "add"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Additional Archive Endpoints

#### DELETE /api/archive/results/:id

Hapus hasil assessment (user only).

**Path Parameters:**

- `id` (string): UUID dari hasil assessment

**Response Success (200):**

```json
{
  "success": true,
  "message": "Analysis result deleted successfully",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### POST /api/archive/results

Membuat hasil assessment baru (internal service only).

**Headers:**

```
X-Internal-Service: true
X-Service-Key: <internal_service_secret_key>
```

**Request Body:**

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "assessment_data": {
    "riasec": {
      "realistic": 85,
      "investigative": 92,
      "artistic": 78,
      "social": 65,
      "enterprising": 70,
      "conventional": 55
    },
    "ocean": {
      "openness": 88,
      "conscientiousness": 75,
      "extraversion": 82,
      "agreeableness": 90,
      "neuroticism": 45
    },
    "viaIs": {
      "creativity": 85,
      "curiosity": 90,
      "judgment": 78
    }
  },
  "persona_profile": {
    "archetype": "The Innovator",
    "shortSummary": "You are a natural innovator with strong analytical thinking and problem-solving abilities. You thrive in environments that challenge your intellect and allow you to explore new ideas.",
    "strengths": ["Problem Solving", "Analytical Thinking", "Innovation"],
    "weaknesses": ["Communication", "Leadership", "Time Management"],
    "careerRecommendation": [
      {
        "careerName": "Software Engineer",
        "careerProspect": {
          "jobAvailability": "high",
          "salaryPotential": "high",
          "careerProgression": "high",
          "industryGrowth": "high",
          "skillDevelopment": "high"
        }
      },
      {
        "careerName": "Data Scientist",
        "careerProspect": {
          "jobAvailability": "high",
          "salaryPotential": "high",
          "careerProgression": "high",
          "industryGrowth": "super high",
          "skillDevelopment": "high"
        }
      }
    ],
    "insights": [
      "Your investigative nature makes you excellent at research and analysis",
      "You prefer working independently on complex problems",
      "Technology and innovation sectors align well with your personality"
    ],
    "workEnvironment": "You thrive in quiet, organized environments where you can focus deeply on complex problems. You prefer minimal interruptions and value intellectual autonomy.",
    "roleModel": ["Elon Musk", "Steve Jobs", "Bill Gates", "Mark Zuckerberg"]
  },
  "assessment_name": "AI-Driven Talent Mapping",
  "status": "completed",
  "error_message": null
}
```

**Response Success (201):**

```json
{
  "success": true,
  "message": "Analysis result saved successfully",
  "data": {
    "id": "result_550e8400-e29b-41d4-a716-446655440000",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "assessment_name": "AI-Driven Talent Mapping",
    "created_at": "2024-01-15T10:30:00.000Z",
    "batched": false
  }
}
```

#### POST /api/archive/jobs

Membuat job assessment baru (internal service only).

**Headers:**

```
X-Internal-Service: true
X-Service-Key: <internal_service_secret_key>
```

**Request Body:**

```json
{
  "job_id": "job_550e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "assessment_data": {
    "riasec": {...},
    "ocean": {...},
    "viaIs": {...}
  },
  "assessment_name": "AI-Driven Talent Mapping",
  "status": "queued"
}
```

**Response Success (201):**

```json
{
  "success": true,
  "message": "Analysis job created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "job_id": "job_550e8400-e29b-41d4-a716-446655440000",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "queued",
    "assessment_name": "AI-Driven Talent Mapping",
    "priority": 0,
    "retry_count": 0,
    "max_retries": 3,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

#### PUT /api/archive/jobs/:jobId/status

Update status job assessment (internal service only).

**Headers:**

```
X-Internal-Service: true
X-Service-Key: <internal_service_secret_key>
```

**Path Parameters:**

- `jobId` (string): Job ID dari assessment

**Request Body:**

```json
{
  "status": "completed",
  "result_id": "result_550e8400-e29b-41d4-a716-446655440000",
  "error_message": null
}
```

**Response Success (200):**

```json
{
  "success": true,
  "message": "Job status updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "job_id": "job_550e8400-e29b-41d4-a716-446655440000",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "result_id": "result_550e8400-e29b-41d4-a716-446655440000",
    "completed_at": "2024-01-15T10:35:00.000Z",
    "updated_at": "2024-01-15T10:35:00.000Z"
  }
}
```

#### GET /api/archive/v1/data/:type

Unified data retrieval endpoint untuk results, jobs, demographics.

**Path Parameters:**

- `type` (string): results, jobs, demographics

**Query Parameters:**

- `page` (number): Halaman (default: 1)
- `limit` (number): Jumlah per halaman (default: 10, max: 100)
- `sort` (string): Field untuk sorting (created_at, updated_at, status)
- `order` (string): Urutan sorting (asc, desc, ASC, DESC, default: desc)
- `status` (string): Filter status (untuk results: completed, processing, failed; untuk jobs: queued, processing, completed, failed)
- `assessment_name` (string): Filter berdasarkan nama assessment

**Response Success (200) - Type: results:**

```json
{
  "success": true,
  "message": "results data retrieved successfully",
  "data": [
    {
      "id": "result_550e8400-e29b-41d4-a716-446655440000",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "completed",
      "assessment_name": "AI-Driven Talent Mapping",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Response Success (200) - Type: jobs:**

```json
{
  "success": true,
  "message": "jobs data retrieved successfully",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "job_id": "job_550e8400-e29b-41d4-a716-446655440000",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "completed",
      "assessment_name": "AI-Driven Talent Mapping",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### GET /api/archive/v1/health/:component

Unified health check endpoint.

**Path Parameters:**

- `component` (string): all, database, queue, performance (optional, default: all)

**Response Success (200) - Component: all:**

```json
{
  "success": true,
  "status": "healthy",
  "data": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "service": "archive-service",
    "version": "1.0.0",
    "database": {
      "status": "healthy",
      "message": "Database connection successful"
    },
    "queue": {
      "status": "healthy",
      "pending_jobs": 5,
      "processing_jobs": 2
    },
    "performance": {
      "status": "healthy",
      "avg_index_scans": 1250,
      "total_indexes": 15
    }
  }
}
```

**Response Success (200) - Component: database:**

```json
{
  "success": true,
  "status": "healthy",
  "data": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "service": "archive-service",
    "version": "1.0.0",
    "database": {
      "status": "healthy",
      "message": "Database connection successful",
      "connection_pool": {
        "active": 5,
        "idle": 10,
        "total": 15
      }
    }
  }
}
```

#### POST /api/archive/results/batch

Membuat multiple hasil assessment dalam satu request (internal service only).

**Headers:**

```
X-Internal-Service: true
X-Service-Key: <internal_service_secret_key>
```

**Request Body:**

```json
{
  "items": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "assessment_data": {...},
      "persona_profile": {...},
      "assessment_name": "AI-Driven Talent Mapping",
      "status": "completed"
    }
  ],
  "options": {
    "batch_size": 100,
    "validate_users": true
  }
}
```

**Response Success (201):**

```json
{
  "success": true,
  "message": "Batch results created successfully",
  "data": {
    "created_count": 1,
    "failed_count": 0,
    "batch_id": "batch_550e8400-e29b-41d4-a716-446655440000",
    "processing_time": "1.2s"
  }
}
```

#### POST /api/archive/v1/batch/:operation

Operasi batch terpadu (internal service only).

**Headers:**

```
X-Internal-Service: true
X-Service-Key: <internal_service_secret_key>
```

**Path Parameters:**

- `operation` (string): create-results, update-jobs, cleanup

**Request Body untuk create-results:**

```json
{
  "items": [
    {
      "user_id": "uuid",
      "assessment_data": {...},
      "persona_profile": {...},
      "status": "completed"
    }
  ],
  "options": {
    "batch_size": 100
  }
}
```

**Response Success (200):**

```json
{
  "success": true,
  "message": "Batch operation completed successfully",
  "data": {
    "operation": "create-results",
    "processed_count": 50,
    "success_count": 48,
    "failed_count": 2,
    "processing_time": "2.5s"
  }
}
```

---

## 🏥 Health Check Routes

### Global Health

#### GET /health

Main health check untuk semua services.

**Response Success (200):**

```json
{
  "success": true,
  "status": "healthy",
  "services": {
    "auth": "healthy",
    "assessment": "healthy",
    "archive": "healthy",
    "notification": "healthy",
    "chatbot": "healthy"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### GET /health/metrics

Metrics endpoint.

#### GET /health/ready

Readiness probe.

#### GET /health/live

Liveness probe.

---

## 📋 Error Response Format

Semua error response menggunakan format standar dengan timestamp:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "details": {} // Optional additional details
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` - Token tidak valid atau tidak ada
- `FORBIDDEN` - Akses ditolak (contoh: internal service access required)
- `RATE_LIMIT_EXCEEDED` - Rate limit terlampaui
- `VALIDATION_ERROR` - Data input tidak valid (dengan detail validasi)
- `NOT_FOUND` - Resource tidak ditemukan
- `INTERNAL_ERROR` - Server error

### Archive Service Specific Errors

- `RESULT_NOT_FOUND` - Analysis result tidak ditemukan
- `JOB_NOT_FOUND` - Analysis job tidak ditemukan
- `ACCESS_DENIED` - User tidak memiliki akses ke resource
- `INVALID_STATUS_TRANSITION` - Perubahan status tidak valid
- `BATCH_SIZE_EXCEEDED` - Ukuran batch melebihi limit (max 100)
- `JOB_PROCESSING` - Job sedang diproses dan tidak dapat dihapus
- `INVALID_UUID` - Format UUID tidak valid

---

## 🔒 Security Headers

API Gateway menambahkan security headers pada setiap response:

- `X-Gateway: ATMA-API-Gateway`
- `X-Gateway-Version: 1.0.0`
- `X-Request-ID: <unique-request-id>`

## 📊 Rate Limiting Headers

Ketika rate limit diterapkan, response akan menyertakan headers:

- `X-RateLimit-Limit: <limit>`
- `X-RateLimit-Remaining: <remaining>`
- `X-RateLimit-Reset: <reset-time>`

## 🌐 CORS Configuration

API Gateway dikonfigurasi untuk menerima request dari:

- `http://localhost:3000` (Frontend development)
- `http://localhost:5173` (Vite development server)
- Production domains (sesuai konfigurasi)

## 📝 Request/Response Examples

### Successful Response Format

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    /* response data */
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "details": {
      /* additional error details */
    }
  }
}
```

### Pagination Format

```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": {
    "items": [
      /* array of items */
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Archive Service Response Examples

**Validation Error Example:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "details": {
      "errors": [
        {
          "field": "persona_profile.archetype",
          "message": "Archetype is required"
        }
      ]
    }
  }
}
```

**Not Found Example:**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Analysis result not found",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```
