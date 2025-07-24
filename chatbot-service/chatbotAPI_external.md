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
    "metadata": {...}
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
    "conversations": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
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
    "metadata": {...},
    "created_at": "timestamp",
    "updated_at": "timestamp",
    "messages": [...] // jika include_messages=true
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
  "metadata": {...}
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
    "messages": [...],
    "pagination": {...}
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
  "persona_profile": {...},
  "welcome_message_type": "personalized"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Assessment conversation created successfully",
  "data": {
    "conversation": {...},
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
    "assessment_results": [...],
    "latest_result": {...}
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
    "model_distribution": {...},
    "peak_usage_hours": [...]
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
    "details": {...}
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
    "memory": {...},
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

## 🔗 Related Services
- **Auth Service:** Untuk autentikasi dan manajemen user
- **Archive Service:** Untuk penyimpanan hasil assessment
- **API Gateway:** Sebagai entry point untuk semua request eksternal
- **Assessment Service:** Untuk integrasi hasil assessment dengan chatbot
