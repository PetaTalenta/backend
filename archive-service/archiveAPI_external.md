# Archive Service - External API Documentation

## Overview
Archive Service menyediakan API untuk mengelola hasil analisis assessment dan job tracking. API ini diakses melalui **API Gateway** pada port **3000** dengan prefix `/api/archive/`.

**Service Information:**
- **Service Name:** archive-service
- **Internal Port:** 3002
- **External Access:** Via API Gateway (Port 3000)
- **Base URL:** `http://localhost:3000/api/archive/`
- **Version:** 1.0.0

## Authentication
Semua endpoint eksternal memerlukan autentikasi JWT token yang diperoleh dari Auth Service.

**Header Required:**
```
Authorization: Bearer <jwt_token>
```

## Rate Limiting
- **Archive Endpoints:** 5000 requests per 15 minutes
- **General Gateway:** 5000 requests per 15 minutes

---

## 📊 Analysis Results Endpoints

### 1. Get User Results
**GET** `/api/archive/results`

Mendapatkan daftar hasil analisis untuk user yang terautentikasi.

**Query Parameters:**
- `page` (number, default: 1) - Halaman data
- `limit` (number, default: 10) - Jumlah data per halaman
- `status` (string, optional) - Filter berdasarkan status
- `sort` (string, default: 'created_at') - Field untuk sorting
- `order` (string, default: 'DESC') - Urutan sorting

**Response:**
```json
{
  "success": true,
  "message": "Results retrieved successfully",
  "data": {
    "results": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

### 2. Get Specific Result
**GET** `/api/archive/results/:id`

Mendapatkan detail hasil analisis berdasarkan ID.

**Parameters:**
- `id` (UUID) - ID hasil analisis

**Response:**
```json
{
  "success": true,
  "message": "Result retrieved successfully",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "assessment_name": "string",
    "archetype": "string",
    "analysis_data": {...},
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

### 3. Update Result
**PUT** `/api/archive/results/:id`

Memperbarui hasil analisis (hanya pemilik atau admin).

**Parameters:**
- `id` (UUID) - ID hasil analisis

**Request Body:**
```json
{
  "analysis_data": {...},
  "status": "completed"
}
```

### 4. Delete Result
**DELETE** `/api/archive/results/:id`

Menghapus hasil analisis (hanya pemilik).

**Parameters:**
- `id` (UUID) - ID hasil analisis

---

## 🔄 Analysis Jobs Endpoints

### 1. Get User Jobs
**GET** `/api/archive/jobs`

Mendapatkan daftar job analisis untuk user yang terautentikasi.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `status` (string, optional) - pending, processing, completed, failed
- `assessment_name` (string, optional)
- `sort` (string, default: 'created_at')
- `order` (string, default: 'DESC')

**Response:**
```json
{
  "success": true,
  "message": "Jobs retrieved successfully",
  "data": {
    "jobs": [...],
    "total": 25
  }
}
```

### 2. Get Job Status
**GET** `/api/archive/jobs/:jobId`

Mendapatkan status job berdasarkan job ID.

**Parameters:**
- `jobId` (string) - ID job

**Response:**
```json
{
  "success": true,
  "message": "Job retrieved successfully",
  "data": {
    "job_id": "string",
    "user_id": "uuid",
    "status": "processing",
    "assessment_name": "string",
    "created_at": "timestamp",
    "updated_at": "timestamp",
    "result_id": "uuid"
  }
}
```

### 3. Get Job Statistics
**GET** `/api/archive/jobs/stats`

Mendapatkan statistik job untuk user yang terautentikasi.

**Response:**
```json
{
  "success": true,
  "message": "Job statistics retrieved successfully",
  "data": {
    "total_jobs": 50,
    "pending": 5,
    "processing": 2,
    "completed": 40,
    "failed": 3,
    "success_rate": 0.94
  }
}
```

### 4. Delete Job
**DELETE** `/api/archive/jobs/:jobId`

Menghapus/membatalkan job (hanya pemilik).

**Parameters:**
- `jobId` (string) - ID job

---

## 📈 Statistics Endpoints

### 1. Get User Statistics
**GET** `/api/archive/stats`

Mendapatkan statistik untuk user yang terautentikasi.

**Response:**
```json
{
  "success": true,
  "message": "Statistics retrieved successfully",
  "data": {
    "total_results": 25,
    "total_jobs": 30,
    "completed_assessments": 25,
    "archetype_distribution": {...},
    "recent_activity": [...]
  }
}
```

### 2. Get User Overview
**GET** `/api/archive/stats/overview`

Mendapatkan overview statistik untuk dashboard user.

**Response:**
```json
{
  "success": true,
  "message": "Overview retrieved successfully",
  "data": {
    "summary": {
      "total_assessments": 25,
      "this_month": 5,
      "success_rate": 0.96
    },
    "recent_results": [...],
    "archetype_summary": {...}
  }
}
```

---

## 🔄 Unified API v1 Endpoints

### 1. Unified Statistics
**GET** `/api/archive/api/v1/stats`

Endpoint statistik terpadu dengan parameter fleksibel.

**Query Parameters:**
- `type` (string) - user, system, demographic, performance
- `scope` (string) - overview, detailed, analysis, summary
- `timeRange` (string) - "1 day", "7 days", "30 days", "90 days"

**Note:** Parameter `type` dengan nilai `system`, `demographic`, atau `performance` memerlukan autentikasi internal service.

### 2. Unified Data Retrieval
**GET** `/api/archive/api/v1/data/:type`

Endpoint pengambilan data terpadu.

**Parameters:**
- `type` (string) - results, jobs, demographics

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `sort` (string)
- `order` (string)

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
- `INTERNAL_ERROR` (500) - Server error

---

## 🔍 Health Check

### Service Health
**GET** `/api/archive/health`

Mengecek status kesehatan service (tidak memerlukan autentikasi).

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "version": "1.0.0",
  "service": "archive-service"
}
```

---

## 📝 Notes

1. **Pagination:** Semua endpoint list menggunakan pagination dengan format standar
2. **Sorting:** Field sorting yang didukung: `created_at`, `updated_at`, `status`
3. **Filtering:** Beberapa endpoint mendukung filtering berdasarkan status dan parameter lainnya
4. **Rate Limiting:** Semua endpoint tunduk pada rate limiting gateway
5. **CORS:** Service mendukung CORS untuk akses dari frontend
6. **Compression:** Response otomatis dikompresi untuk menghemat bandwidth

## 🔗 Related Services
- **Auth Service:** Untuk autentikasi dan manajemen user
- **Assessment Service:** Untuk pembuatan dan pengiriman assessment
- **API Gateway:** Sebagai entry point untuk semua request eksternal
