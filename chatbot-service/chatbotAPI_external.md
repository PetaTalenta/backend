# Chatbot Service - External API Documentation

## Overview
Chatbot Service menyediakan API untuk mengelola percakapan AI dan integrasi dengan assessment. API ini diakses melalui **API Gateway** pada port **3000** dengan prefix `/api/chatbot/`.

**Service Information:**
- **Service Name:** chatbot-service
- **Internal Port:** 3006
- **External Access:** Via API Gateway (Port 3000)
- **Base URL:** `http://localhost:3000/api/chatbot/`
- **Version:** 1.0.0

## Authentication
Semua endpoint eksternal memerlukan autentikasi JWT token yang diperoleh dari Auth Service.

**Header Required:**
```
Authorization: Bearer <jwt_token>
```

## Rate Limiting
- **Free Model Endpoints:** 20 requests per minute
- **Message Endpoints:** 50 requests per 5 minutes
- **General API:** 1000 requests per 15 minutes
- **Burst Protection:** 5 requests per 10 seconds

---

## 💬 Conversation Management Endpoints

### 1. Create Conversation
**POST** `/api/chatbot/conversations`

Membuat percakapan baru dengan AI chatbot.

**Request Body:**
```json
{
  "title": "My Assessment Discussion",
  "context": "assessment",
  "metadata": {
    "assessment_id": "uuid",
    "persona_type": "string"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Conversation created successfully",
  "data": {
    "id": "uuid",
    "title": "My Assessment Discussion",
    "context": "assessment",
    "status": "active",
    "created_at": "timestamp",
    "updated_at": "timestamp",
    "user_id": "uuid",
    "metadata": {
      "last_ai_model": "qwen/qwen3-235b-a22b-07-25:free",
      "total_messages": 15,
      "total_tokens_used": 2500,
      "conversation_tags": ["career", "development", "assessment"],
      "priority": "normal",
      "archived_reason": "completed_discussion",
      "custom_settings": {}
    }
  }
}
```

### 2. Get User Conversations
**GET** `/api/chatbot/conversations`

Mendapatkan daftar percakapan untuk user yang terautentikasi.

**Query Parameters:**
- `page` (number, default: 1) - Halaman data
- `limit` (number, default: 10) - Jumlah data per halaman
- `status` (string, optional) - Filter berdasarkan status (active, archived)
- `context` (string, optional) - Filter berdasarkan konteks (general, assessment)
- `sort` (string, default: 'updated_at') - Field untuk sorting
- `order` (string, default: 'DESC') - Urutan sorting

**Response:**
```json
{
  "success": true,
  "message": "Conversations retrieved successfully",
  "data": {
    "conversations": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "title": "Career Guidance Discussion",
        "context_type": "career_guidance",
        "context_data": {
          "assessment_id": "789e0123-e45f-67g8-h901-234567890123",
          "persona_type": "analytical_thinker",
          "focus_areas": ["leadership", "technical_skills"]
        },
        "status": "active",
        "metadata": {
          "last_ai_model": "qwen/qwen3-235b-a22b-07-25:free",
          "total_messages": 15,
          "total_tokens_used": 2500,
          "conversation_tags": ["career", "development", "assessment"],
          "priority": "normal"
        },
        "created_at": "2024-01-15T10:30:00.000Z",
        "updated_at": "2024-01-15T14:45:30.000Z",
        "messages": [
          {
            "id": "msg_001",
            "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
            "sender_type": "user",
            "content": "Bagaimana cara mengembangkan karir di bidang teknologi?",
            "content_type": "text",
            "metadata": {
              "user_context": "career_planning",
              "message_length": 52
            },
            "parent_message_id": null,
            "created_at": "2024-01-15T10:31:00.000Z"
          }
        ]
      },
      {
        "id": "660f9511-f3ac-52e5-b827-557766551111",
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "title": "Assessment Results Discussion",
        "context_type": "assessment",
        "context_data": {
          "assessment_id": "890f1234-f56g-78h9-i012-345678901234",
          "assessment_type": "personality_career",
          "completion_date": "2024-01-14T16:20:00.000Z"
        },
        "status": "archived",
        "metadata": {
          "last_ai_model": "meta-llama/llama-3.2-3b-instruct:free",
          "total_messages": 8,
          "total_tokens_used": 1200,
          "conversation_tags": ["assessment", "results", "analysis"],
          "priority": "high",
          "archived_reason": "completed_discussion"
        },
        "created_at": "2024-01-14T16:25:00.000Z",
        "updated_at": "2024-01-14T17:10:15.000Z",
        "messages": []
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_items": 25,
      "items_per_page": 10,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### 3. Get Specific Conversation
**GET** `/api/chatbot/conversations/:id`

Mendapatkan detail percakapan berdasarkan ID.

**Parameters:**
- `id` (UUID) - ID percakapan

**Query Parameters:**
- `include_messages` (boolean, default: false) - Sertakan pesan dalam response

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "string",
    "context": "assessment",
    "status": "active",
    "user_id": "uuid",
    "metadata": {
      "user_context": "career_planning",
      "message_length": 52,
      "model": "qwen/qwen3-235b-a22b-07-25:free",
      "finish_reason": "stop",
      "native_finish_reason": "stop",
      "processing_time": 1250,
      "regenerated_at": "2024-01-15T10:31:00.000Z"
    },
    "created_at": "timestamp",
    "updated_at": "timestamp",
    "messages": [
      {
        "id": "msg_001",
        "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
        "sender_type": "user",
        "content": "Bagaimana cara mengembangkan karir di bidang teknologi?",
        "content_type": "text",
        "metadata": {
          "user_context": "career_planning",
          "message_length": 52
        },
        "parent_message_id": null,
        "created_at": "2024-01-15T10:31:00.000Z"
      },
      {
        "id": "msg_002",
        "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
        "sender_type": "assistant",
        "content": "Untuk mengembangkan karir di bidang teknologi, ada beberapa langkah strategis yang bisa Anda lakukan...",
        "content_type": "text",
        "metadata": {
          "model": "qwen/qwen3-235b-a22b-07-25:free",
          "finish_reason": "stop",
          "native_finish_reason": "stop",
          "processing_time": 1250
        },
        "parent_message_id": "msg_001",
        "created_at": "2024-01-15T10:31:05.000Z"
      }
    ] // jika include_messages=true
  }
}
```

### 4. Update Conversation
**PUT** `/api/chatbot/conversations/:id`

Memperbarui percakapan (hanya pemilik).

**Parameters:**
- `id` (UUID) - ID percakapan

**Request Body:**
```json
{
  "title": "Updated Title",
  "status": "archived",
  "metadata": {
    "context": "career_guidance",
    "user_preferences": {
      "communication_style": "detailed",
      "focus_areas": ["technical_skills", "leadership"]
    }
  }
}
```

### 5. Delete Conversation
**DELETE** `/api/chatbot/conversations/:id`

Menghapus percakapan (hanya pemilik).

**Parameters:**
- `id` (UUID) - ID percakapan

---

## 📨 Message Management Endpoints

### 1. Send Message
**POST** `/api/chatbot/conversations/:conversationId/messages`

Mengirim pesan ke AI dan mendapatkan response.

**Parameters:**
- `conversationId` (UUID) - ID percakapan

**Request Body:**
```json
{
  "content": "Bagaimana cara mengembangkan karir di bidang teknologi?",
  "type": "user",
  "metadata": {
    "context": "career_guidance"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "user_message": {
      "id": "uuid",
      "content": "user message",
      "type": "user",
      "timestamp": "timestamp"
    },
    "ai_response": {
      "id": "uuid",
      "content": "AI response",
      "type": "assistant",
      "timestamp": "timestamp",
      "model_used": "qwen/qwen3-235b-a22b-07-25:free",
      "tokens_used": 150
    }
  }
}
```

### 2. Get Conversation Messages
**GET** `/api/chatbot/conversations/:conversationId/messages`

Mendapatkan pesan dalam percakapan.

**Parameters:**
- `conversationId` (UUID) - ID percakapan

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 50)
- `order` (string, default: 'ASC') - Urutan pesan

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg_001",
        "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
        "sender_type": "user",
        "content": "Bagaimana cara mengembangkan karir di bidang teknologi?",
        "content_type": "text",
        "metadata": {
          "user_context": "career_planning",
          "message_length": 52
        },
        "parent_message_id": null,
        "created_at": "2024-01-15T10:31:00.000Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_items": 25,
      "items_per_page": 10,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### 3. Regenerate AI Response
**POST** `/api/chatbot/conversations/:conversationId/messages/:messageId/regenerate`

Regenerasi response AI untuk pesan tertentu.

**Parameters:**
- `conversationId` (UUID) - ID percakapan
- `messageId` (UUID) - ID pesan yang akan di-regenerate

**Response:**
```json
{
  "success": true,
  "message": "Response regenerated successfully",
  "data": {
    "new_response": {
      "id": "uuid",
      "content": "New AI response",
      "type": "assistant",
      "timestamp": "timestamp",
      "model_used": "string",
      "tokens_used": 200
    }
  }
}
```

---

## 🎯 Assessment Integration Endpoints

### 1. Create Conversation from Assessment
**POST** `/api/chatbot/assessment/from-assessment`

Membuat percakapan berdasarkan hasil assessment.

**Request Body:**
```json
{
  "assessment_result_id": "uuid",
  "persona_profile": {
    "archetype": "The Analytical Innovator",
    "shortSummary": "Anda adalah seorang pemikir analitis dengan kecenderungan investigatif yang kuat dan kreativitas tinggi. Kombinasi antara kecerdasan logis-matematis dan keterbukaan terhadap pengalaman baru membuat Anda unggul dalam memecahkan masalah kompleks dengan pendekatan inovatif.",
    "strengthSummary": "Kekuatan utama Anda terletak pada analisis mendalam, kreativitas, dan dorongan kuat untuk belajar hal baru. Ini membuat Anda mampu menghasilkan solusi unik di berbagai situasi kompleks.",
    "strengths": [
      "Kemampuan analisis yang mendalam",
      "Kreativitas dalam pemecahan masalah",
      "Dorongan belajar yang tinggi",
      "Pemikiran logis dan sistematis"
    ],
    "weaknessSummary": "Area yang perlu dikembangkan meliputi kecenderungan untuk terlalu perfeksionis dan kadang kesulitan dalam komunikasi ide kompleks kepada orang lain.",
    "weaknesses": [
      "Terlalu perfeksionis",
      "Kesulitan komunikasi ide kompleks",
      "Kurang sabar dengan detail administratif"
    ],
    "careerRecommendations": [
      {
        "title": "Data Scientist",
        "match_percentage": 92,
        "description": "Menganalisis data kompleks untuk menghasilkan insights bisnis"
      },
      {
        "title": "Research & Development Engineer",
        "match_percentage": 88,
        "description": "Mengembangkan produk dan teknologi baru melalui penelitian"
      }
    ],
    "developmentAreas": [
      "Komunikasi interpersonal",
      "Manajemen waktu",
      "Kepemimpinan tim"
    ]
  },
  "welcome_message_type": "personalized"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Assessment conversation created successfully",
  "data": {
    "conversation": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Career Assessment Discussion",
      "context_type": "assessment",
      "context_data": {
        "assessment_id": "789e0123-e45f-67g8-h901-234567890123",
        "persona_type": "analytical_thinker",
        "focus_areas": ["leadership", "technical_skills"]
      },
      "status": "active",
      "metadata": {
        "last_ai_model": "qwen/qwen3-235b-a22b-07-25:free",
        "total_messages": 15,
        "total_tokens_used": 2500,
        "conversation_tags": ["career", "development", "assessment"],
        "priority": "normal"
      },
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T14:45:30.000Z"
    },
    "welcome_message": {
      "content": "Personalized welcome message",
      "suggestions": [
        "Bagaimana cara mengembangkan kekuatan saya?",
        "Apa karir yang cocok untuk profil saya?"
      ]
    }
  }
}
```

### 2. Check Assessment Readiness
**GET** `/api/chatbot/assessment/assessment-ready/:userId`

Mengecek apakah user memiliki assessment yang siap untuk chatbot.

**Parameters:**
- `userId` (UUID) - ID user

**Response:**
```json
{
  "success": true,
  "data": {
    "ready": true,
    "assessment_results": [
      {
        "id": "789e0123-e45f-67g8-h901-234567890123",
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "assessment_name": "AI-Driven Talent Mapping",
        "status": "completed",
        "persona_profile": {
          "archetype": "The Analytical Innovator",
          "shortSummary": "Anda adalah seorang pemikir analitis dengan kecenderungan investigatif yang kuat...",
          "strengths": ["Kemampuan analisis yang mendalam", "Kreativitas dalam pemecahan masalah"],
          "weaknesses": ["Terlalu perfeksionis", "Kesulitan komunikasi ide kompleks"]
        },
        "created_at": "2024-01-14T16:20:00.000Z",
        "updated_at": "2024-01-14T16:25:00.000Z"
      },
      {
        "id": "890f1234-f56g-78h9-i012-345678901234",
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "assessment_name": "AI-Based IQ Test",
        "status": "completed",
        "persona_profile": {
          "archetype": "The Logical Thinker",
          "shortSummary": "Anda memiliki kemampuan logika yang sangat baik...",
          "strengths": ["Pemikiran logis", "Analisis sistematis"],
          "weaknesses": ["Kurang fleksibel", "Terlalu fokus pada detail"]
        },
        "created_at": "2024-01-10T14:30:00.000Z",
        "updated_at": "2024-01-10T14:35:00.000Z"
      }
    ],
    "latest_result": {
      "id": "789e0123-e45f-67g8-h901-234567890123",
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "assessment_name": "AI-Driven Talent Mapping",
      "status": "completed",
      "persona_profile": {
        "archetype": "The Analytical Innovator",
        "shortSummary": "Anda adalah seorang pemikir analitis dengan kecenderungan investigatif yang kuat dan kreativitas tinggi. Kombinasi antara kecerdasan logis-matematis dan keterbukaan terhadap pengalaman baru membuat Anda unggul dalam memecahkan masalah kompleks dengan pendekatan inovatif.",
        "strengthSummary": "Kekuatan utama Anda terletak pada analisis mendalam, kreativitas, dan dorongan kuat untuk belajar hal baru.",
        "strengths": [
          "Kemampuan analisis yang mendalam",
          "Kreativitas dalam pemecahan masalah",
          "Dorongan belajar yang tinggi",
          "Pemikiran logis dan sistematis"
        ],
        "weaknessSummary": "Area yang perlu dikembangkan meliputi kecenderungan untuk terlalu perfeksionis dan kadang kesulitan dalam komunikasi ide kompleks kepada orang lain.",
        "weaknesses": [
          "Terlalu perfeksionis",
          "Kesulitan komunikasi ide kompleks",
          "Kurang sabar dengan detail administratif"
        ],
        "careerRecommendations": [
          {
            "title": "Data Scientist",
            "match_percentage": 92,
            "description": "Menganalisis data kompleks untuk menghasilkan insights bisnis"
          },
          {
            "title": "Research & Development Engineer",
            "match_percentage": 88,
            "description": "Mengembangkan produk dan teknologi baru melalui penelitian"
          }
        ],
        "developmentAreas": [
          "Komunikasi interpersonal",
          "Manajemen waktu",
          "Kepemimpinan tim"
        ]
      },
      "created_at": "2024-01-14T16:20:00.000Z",
      "updated_at": "2024-01-14T16:25:00.000Z"
    }
  }
}
```

### 3. Generate Conversation Suggestions
**GET** `/api/chatbot/assessment/conversations/:conversationId/suggestions`

Mendapatkan saran pertanyaan berdasarkan konteks percakapan.

**Parameters:**
- `conversationId` (UUID) - ID percakapan

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      "Bagaimana cara meningkatkan skill komunikasi?",
      "Apa langkah selanjutnya dalam pengembangan karir?",
      "Bagaimana cara mengatasi kelemahan saya?"
    ],
    "context": "career_development"
  }
}
```

### 4. Auto-Initialize Assessment Conversation
**POST** `/api/chatbot/assessment/auto-initialize`

Otomatis membuat percakapan berdasarkan assessment terbaru user.

**Request Body:**
```json
{
  "user_id": "uuid",
  "conversation_type": "career_guidance"
}
```

---

## 📊 Usage Analytics Endpoints

### 1. Get User Usage Statistics
**GET** `/api/chatbot/usage/stats`

Mendapatkan statistik penggunaan untuk user.

**Query Parameters:**
- `period` (string, default: '30d') - Periode statistik (1d, 7d, 30d, 90d)
- `include_details` (boolean, default: false) - Sertakan detail penggunaan

**Response:**
```json
{
  "success": true,
  "data": {
    "total_conversations": 15,
    "total_messages": 150,
    "tokens_used": 25000,
    "average_conversation_length": 10,
    "most_active_day": "2024-01-15",
    "model_usage": {
      "qwen/qwen3-235b-a22b-07-25:free": 120,
      "meta-llama/llama-3.2-3b-instruct:free": 30
    }
  }
}
```

### 2. Get Usage Summary
**GET** `/api/chatbot/usage/summary`

Mendapatkan ringkasan penggunaan untuk dashboard.

**Response:**
```json
{
  "success": true,
  "data": {
    "today": {
      "conversations": 3,
      "messages": 25,
      "tokens": 1500
    },
    "this_week": {
      "conversations": 12,
      "messages": 120,
      "tokens": 8000
    },
    "limits": {
      "daily_conversations": 100,
      "remaining_conversations": 97,
      "rate_limit_status": "normal"
    }
  }
}
```

### 3. Get System Usage Statistics (Admin Only)
**GET** `/api/chatbot/usage/system`

Mendapatkan statistik sistem (hanya untuk admin).

**Query Parameters:**
- `period` (string, default: '7d')
- `breakdown` (string, optional) - daily, weekly, monthly

**Response:**
```json
{
  "success": true,
  "data": {
    "total_users": 500,
    "active_users": 150,
    "total_conversations": 2500,
    "total_messages": 15000,
    "model_distribution": {
      "qwen/qwen3-235b-a22b-07-25:free": {
        "requests": 1250,
        "percentage": 62.5,
        "total_tokens": 125000,
        "avg_tokens_per_request": 100,
        "cost_credits": 0.0
      },
      "meta-llama/llama-3.2-3b-instruct:free": {
        "requests": 750,
        "percentage": 37.5,
        "total_tokens": 75000,
        "avg_tokens_per_request": 100,
        "cost_credits": 0.0
      },
      "openai/gpt-4o-mini": {
        "requests": 0,
        "percentage": 0.0,
        "total_tokens": 0,
        "avg_tokens_per_request": 0,
        "cost_credits": 0.0
      }
    },
    "peak_usage_hours": [
      {
        "hour": 9,
        "requests": 145,
        "day_of_week": "monday"
      },
      {
        "hour": 14,
        "requests": 132,
        "day_of_week": "tuesday"
      },
      {
        "hour": 16,
        "requests": 128,
        "day_of_week": "wednesday"
      },
      {
        "hour": 10,
        "requests": 125,
        "day_of_week": "thursday"
      },
      {
        "hour": 15,
        "requests": 120,
        "day_of_week": "friday"
      }
    ]
  }
}
```

---

## ❌ Error Responses

### Standard Error Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      "code": "ERROR_CODE",
      "message": "Human readable error message",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "request_id": "req_123456789",
      "validation_errors": [
        {
          "field": "content",
          "message": "Message content is required",
          "code": "REQUIRED_FIELD"
        }
      ],
      "context": {
        "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "endpoint": "/api/chatbot/conversations/550e8400-e29b-41d4-a716-446655440000/messages",
        "method": "POST"
      }
    }
  }
}
```

### Common Error Codes
- `UNAUTHORIZED` (401) - Token tidak valid atau tidak ada
- `FORBIDDEN` (403) - Akses ditolak
- `NOT_FOUND` (404) - Resource tidak ditemukan
- `VALIDATION_ERROR` (400) - Data input tidak valid
- `RATE_LIMIT_EXCEEDED` (429) - Terlalu banyak request
- `CONVERSATION_NOT_FOUND` (404) - Percakapan tidak ditemukan
- `MESSAGE_TOO_LONG` (400) - Pesan terlalu panjang
- `MODEL_UNAVAILABLE` (503) - Model AI tidak tersedia
- `INTERNAL_ERROR` (500) - Server error

---

## 🔍 Health Check Endpoints

### 1. Service Health
**GET** `/api/chatbot/health`

Mengecek status kesehatan service (tidak memerlukan autentikasi).

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 86400,
  "version": "1.0.0",
  "environment": "production",
  "service": "chatbot-service",
  "services": {
    "database": {
      "status": "healthy",
      "connected": true
    }
  },
  "system": {
    "memory": {
      "rss": 45678912,
      "heapTotal": 32456789,
      "heapUsed": 28123456,
      "external": 1234567,
      "arrayBuffers": 567890
    },
    "platform": "linux",
    "nodeVersion": "v18.17.0"
  }
}
```

### 2. Readiness Check
**GET** `/api/chatbot/health/ready`

Mengecek kesiapan service untuk menerima traffic.

### 3. Liveness Check
**GET** `/api/chatbot/health/live`

Mengecek apakah service masih hidup.

### 4. Assessment Integration Health
**GET** `/api/chatbot/assessment/health`

Mengecek status integrasi assessment.

**Response:**
```json
{
  "success": true,
  "message": "Assessment integration routes are healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "features": {
    "assessment_integration": true,
    "event_driven_conversations": true,
    "personalized_welcome_messages": true,
    "suggested_questions": true
  }
}
```

---

## 📝 Notes

1. **Rate Limiting:** Service menggunakan multiple layer rate limiting untuk free models
2. **Model Fallback:** Otomatis fallback ke model lain jika model utama tidak tersedia
3. **Token Management:** Tracking penggunaan token untuk optimasi biaya
4. **Context Optimization:** Otomatis optimasi context conversation untuk efisiensi
5. **Assessment Integration:** Integrasi penuh dengan assessment service untuk personalisasi
6. **Real-time Features:** Support untuk real-time conversation updates
7. **Burst Protection:** Perlindungan terhadap burst requests

---

## 📋 Data Structure Documentation

### Conversations Array Structure

Array `"conversations": [...]` berisi objek-objek percakapan dengan struktur lengkap sebagai berikut:

#### Conversation Object Structure
```json
{
  "id": "UUID",                    // Primary key, auto-generated UUID
  "user_id": "UUID",               // Foreign key ke user yang memiliki conversation
  "title": "string",               // Judul conversation (max 255 karakter)
  "context_type": "string",        // Tipe konteks: "general" | "assessment" | "career_guidance"
  "context_data": {},              // Data konteks dalam format JSONB
  "status": "string",              // Status: "active" | "archived" | "deleted"
  "metadata": {},                  // Metadata tambahan dalam format JSONB
  "created_at": "ISO8601",         // Timestamp pembuatan
  "updated_at": "ISO8601",         // Timestamp update terakhir
  "messages": []                   // Array pesan (opsional, tergantung query parameter)
}
```

#### Field Descriptions

**Core Fields:**
- `id`: UUID unik untuk setiap conversation, auto-generated
- `user_id`: UUID user pemilik conversation (dari JWT token)
- `title`: Judul conversation, default "New Conversation", maksimal 255 karakter
- `context_type`: Menentukan jenis conversation:
  - `"general"`: Conversation umum tanpa konteks khusus
  - `"assessment"`: Conversation terkait hasil assessment
  - `"career_guidance"`: Conversation untuk panduan karir
- `status`: Status conversation:
  - `"active"`: Conversation aktif dan dapat digunakan
  - `"archived"`: Conversation diarsipkan tapi masih dapat diakses
  - `"deleted"`: Conversation dihapus (soft delete)

**Context & Metadata Fields:**
- `context_data`: Objek JSONB berisi data konteks spesifik:
  ```json
  {
    "assessment_id": "UUID",           // ID assessment terkait (jika ada)
    "persona_type": "string",          // Tipe persona dari assessment
    "focus_areas": ["array"],          // Area fokus dari assessment
    "assessment_type": "string",       // Jenis assessment
    "completion_date": "ISO8601"       // Tanggal completion assessment
  }
  ```

- `metadata`: Objek JSONB berisi informasi tambahan:
  ```json
  {
    "last_ai_model": "string",         // Model AI terakhir yang digunakan
    "total_messages": "number",        // Total pesan dalam conversation
    "total_tokens_used": "number",     // Total token yang digunakan
    "conversation_tags": ["array"],    // Tag untuk kategorisasi
    "priority": "string",              // Prioritas: "low" | "normal" | "high"
    "archived_reason": "string",       // Alasan jika diarsipkan
    "custom_settings": {}              // Pengaturan khusus conversation
  }
  ```

**Timestamp Fields:**
- `created_at`: Timestamp ISO8601 saat conversation dibuat
- `updated_at`: Timestamp ISO8601 saat conversation terakhir diupdate

#### Messages Array (Optional)

Jika parameter `include_messages=true` disertakan, field `messages` akan berisi array objek pesan:

```json
"messages": [
  {
    "id": "UUID",                      // Primary key pesan
    "conversation_id": "UUID",         // Foreign key ke conversation
    "sender_type": "string",           // "user" | "assistant" | "system"
    "content": "string",               // Isi pesan (max 10,000 karakter)
    "content_type": "string",          // "text" | "image" | "file"
    "metadata": {},                    // Metadata pesan dalam JSONB
    "parent_message_id": "UUID|null",  // ID pesan parent (untuk threading)
    "created_at": "ISO8601"            // Timestamp pembuatan pesan
  }
]
```

#### Pagination Object

Setiap response yang mengembalikan array conversations juga menyertakan objek pagination:

```json
"pagination": {
  "current_page": 1,                 // Halaman saat ini
  "total_pages": 3,                  // Total halaman
  "total_items": 25,                 // Total item di semua halaman
  "items_per_page": 10,              // Jumlah item per halaman
  "has_next": true,                  // Apakah ada halaman selanjutnya
  "has_prev": false                  // Apakah ada halaman sebelumnya
}
```

#### Example Use Cases

**1. General Conversation:**
```json
{
  "id": "conv_001",
  "title": "General Chat",
  "context_type": "general",
  "context_data": null,
  "status": "active",
  "metadata": {
    "conversation_tags": ["general", "chat"]
  }
}
```

**2. Assessment-based Conversation:**
```json
{
  "id": "conv_002",
  "title": "Career Assessment Discussion",
  "context_type": "assessment",
  "context_data": {
    "assessment_id": "assess_123",
    "persona_type": "analytical_thinker",
    "focus_areas": ["leadership", "problem_solving"]
  },
  "status": "active",
  "metadata": {
    "conversation_tags": ["assessment", "career", "personality"],
    "priority": "high"
  }
}
```

**3. Career Guidance Conversation:**
```json
{
  "id": "conv_003",
  "title": "Tech Career Path",
  "context_type": "career_guidance",
  "context_data": {
    "focus_areas": ["software_development", "leadership"],
    "experience_level": "mid_level"
  },
  "status": "active",
  "metadata": {
    "conversation_tags": ["career", "technology", "guidance"],
    "priority": "normal"
  }
}
```

#### Query Parameters untuk Filtering Conversations

Saat mengambil conversations array, Anda dapat menggunakan parameter berikut untuk filtering dan sorting:

**Pagination Parameters:**
- `page` (number, default: 1) - Nomor halaman
- `limit` (number, default: 20, max: 100) - Jumlah item per halaman

**Filtering Parameters:**
- `include_archived` (boolean, default: false) - Sertakan conversation yang diarsipkan
- `context_type` (string, optional) - Filter berdasarkan tipe konteks:
  - `"general"` - Hanya conversation umum
  - `"assessment"` - Hanya conversation assessment
  - `"career_guidance"` - Hanya conversation career guidance
- `status` (string, optional) - Filter berdasarkan status:
  - `"active"` - Hanya conversation aktif
  - `"archived"` - Hanya conversation diarsipkan

**Include Parameters:**
- `include_messages` (boolean, default: false) - Sertakan pesan dalam response
- `message_limit` (number, default: 1, max: 50) - Limit pesan yang disertakan

**Sorting Parameters:**
- `sort` (string, default: 'updated_at') - Field untuk sorting:
  - `"created_at"` - Urutkan berdasarkan tanggal pembuatan
  - `"updated_at"` - Urutkan berdasarkan tanggal update
  - `"title"` - Urutkan berdasarkan judul
- `order` (string, default: 'DESC') - Urutan sorting:
  - `"ASC"` - Ascending (terlama ke terbaru)
  - `"DESC"` - Descending (terbaru ke terlama)

**Example Query:**
```
GET /api/chatbot/conversations?page=1&limit=10&context_type=assessment&include_messages=true&message_limit=5&sort=updated_at&order=DESC
```

#### Database Schema Information

**Table: `chat.conversations`**
- Primary Key: `id` (UUID)
- Foreign Key: `user_id` (UUID) → references users table
- Indexes: `user_id`, `status`, `created_at`, `context_type`

**Table: `chat.messages`**
- Primary Key: `id` (UUID)
- Foreign Key: `conversation_id` (UUID) → references conversations table
- Foreign Key: `parent_message_id` (UUID) → self-reference for threading
- Indexes: `conversation_id`, `created_at`, `sender_type`, `parent_message_id`

**Relationships:**
- One conversation belongs to one user
- One conversation has many messages
- One message belongs to one conversation
- One message can have one parent message (for threading)
- One message can have many child messages (replies)

#### Validation Rules & Constraints

**Conversation Validation:**
- `title`: Required, 1-255 characters
- `context_type`: Required, must be one of: "general", "assessment", "career_guidance"
- `status`: Required, must be one of: "active", "archived", "deleted"
- `user_id`: Required, must be valid UUID
- `context_data`: Optional, must be valid JSON object
- `metadata`: Optional, must be valid JSON object

**Message Validation:**
- `content`: Required, 1-10,000 characters (configurable via MAX_MESSAGE_LENGTH env var)
- `sender_type`: Required, must be one of: "user", "assistant", "system"
- `content_type`: Required, must be one of: "text", "image", "file"
- `conversation_id`: Required, must reference existing conversation
- `parent_message_id`: Optional, must reference existing message in same conversation

**Business Rules:**
- User can only access their own conversations
- Deleted conversations are not returned in API responses
- Archived conversations can be accessed but not modified
- Messages are immutable once created (no updates allowed)
- Maximum 100 conversations per page
- Maximum 50 messages per conversation query
- Rate limiting applies per user and endpoint

#### Common Data Patterns

**Empty Conversations Array:**
```json
{
  "success": true,
  "data": {
    "conversations": [],
    "pagination": {
      "current_page": 1,
      "total_pages": 0,
      "total_items": 0,
      "items_per_page": 10,
      "has_next": false,
      "has_prev": false
    }
  }
}
```

**Conversation with Messages:**
```json
{
  "id": "conv_123",
  "title": "My Chat",
  "context_type": "general",
  "status": "active",
  "messages": [
    {
      "id": "msg_001",
      "sender_type": "user",
      "content": "Hello!",
      "content_type": "text",
      "created_at": "2024-01-15T10:00:00.000Z"
    },
    {
      "id": "msg_002",
      "sender_type": "assistant",
      "content": "Hi! How can I help you today?",
      "content_type": "text",
      "created_at": "2024-01-15T10:00:05.000Z"
    }
  ]
}
```

**Archived Conversation:**
```json
{
  "id": "conv_456",
  "title": "Completed Assessment Chat",
  "context_type": "assessment",
  "status": "archived",
  "metadata": {
    "archived_reason": "assessment_completed",
    "archived_at": "2024-01-14T18:00:00.000Z"
  }
}
```

---

## 🔗 Related Services
- **Auth Service:** Untuk autentikasi dan manajemen user
- **Archive Service:** Untuk penyimpanan hasil assessment
- **API Gateway:** Sebagai entry point untuk semua request eksternal
- **Assessment Service:** Untuk integrasi hasil assessment dengan chatbot
