# Assessment Service - Internal API Documentation

## Overview
Assessment Service menyediakan API internal untuk komunikasi antar service dalam ekosistem ATMA. API ini digunakan oleh **Analysis Worker**, **Archive Service**, dan service internal lainnya untuk callback dan komunikasi service-to-service.

**Service Information:**
- **Service Name:** assessment-service
- **Internal Port:** 3003
- **Internal Base URL:** `http://localhost:3003/`
- **Version:** 1.0.0

## Internal Authentication
Semua endpoint internal menggunakan service authentication dengan header khusus.

**Required Headers:**
```
X-Internal-Service: true
X-Service-Key: <internal_service_secret_key>
```

**Service Key:** Didefinisikan dalam environment variable `INTERNAL_SERVICE_KEY`

---

## 🔄 Archive Service Integration

Assessment Service terintegrasi dengan Archive Service untuk:
1. **Job Management** - Membuat dan tracking analysis jobs
2. **Result Storage** - Menyimpan hasil analisis langsung (jika diperlukan)
3. **Status Synchronization** - Sinkronisasi status job antar services

### Archive Service Configuration

**Environment Variables:**
```env
ARCHIVE_SERVICE_URL=http://localhost:3002
INTERNAL_SERVICE_KEY=internal_service_secret_key_change_in_production
```

### Available Archive Integration Methods

#### 1. Job Management
- `createJob(jobId, userId, assessmentData, assessmentName)` - Membuat job baru
- `getJobStatus(jobId)` - Mendapatkan status job
- `syncJobStatus(jobId, status, additionalData)` - Sinkronisasi status job

#### 2. Result Management
- `createAnalysisResult(userId, assessmentData, personaProfile, assessmentName, status, errorMessage)` - Membuat hasil analisis
- `getAnalysisResult(resultId)` - Mendapatkan hasil analisis
- `updateAnalysisResult(resultId, updateData)` - Update hasil analisis

#### 3. Health Check
- `checkHealth()` - Cek kesehatan Archive Service

---

## 🔄 Job Callback Endpoints - Internal Only

### 1. Job Completion Callback
**POST** `/assessment/callback/completed`

Callback endpoint untuk Analysis Worker melaporkan job yang berhasil diselesaikan.

**Required Headers:**
```
X-Internal-Service: true
X-Service-Key: <internal_service_key>
```

**Request Body:**
```json
{
  "jobId": "string",
  "resultId": "uuid",
  "status": "completed"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Job status updated successfully",
  "data": {
    "jobId": "string",
    "status": "completed",
    "progress": 100,
    "updatedAt": "timestamp"
  }
}
```

**Error Responses:**
- `401 UNAUTHORIZED` - Invalid service key atau missing header
- `400 VALIDATION_ERROR` - Missing required fields
- `404 NOT_FOUND` - Job tidak ditemukan

### 2. Job Failure Callback
**POST** `/assessment/callback/failed`

Callback endpoint untuk Analysis Worker melaporkan job yang gagal dan memproses refund token.

**Required Headers:**
```
X-Internal-Service: true
X-Service-Key: <internal_service_key>
```

**Request Body:**
```json
{
  "jobId": "string",
  "resultId": "uuid",
  "status": "failed",
  "errorMessage": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Job status updated to failed and tokens refunded",
  "data": {
    "jobId": "string",
    "status": "failed",
    "progress": 0,
    "error": "string",
    "updatedAt": "timestamp"
  }
}
```

**Features:**
- Otomatis refund token ke user
- Update status job di local tracker
- Sync dengan Archive Service
- Logging untuk monitoring

---

## 🔍 Health Check - Internal Endpoints

### 1. Service Health Check
**GET** `/health`

Mengecek status kesehatan service dan dependencies (dapat diakses internal tanpa auth).

**Response:**
```json
{
  "status": "healthy|degraded|error",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "assessment-service",
  "version": "1.0.0",
  "dependencies": {
    "rabbitmq": {
      "status": "healthy|unhealthy",
      "details": {
        "messageCount": 0,
        "consumerCount": 1
      }
    },
    "authService": {
      "status": "healthy|unhealthy"
    },
    "archiveService": {
      "status": "healthy|unhealthy"
    }
  },
  "jobs": {
    "total": 100,
    "queued": 5,
    "processing": 2,
    "completed": 90,
    "failed": 3
  }
}
```

### 2. Liveness Probe
**GET** `/health/live`

Simple liveness probe untuk container orchestration.

**Response:**
```json
{
  "status": "alive",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 3. Readiness Probe
**GET** `/health/ready`

Readiness probe untuk memastikan service siap menerima traffic.

**Response:**
```json
{
  "status": "ready|not_ready",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "reason": "string"
}
```

### 4. Queue Health Check
**GET** `/health/queue`

Health check khusus untuk RabbitMQ queue.

**Response:**
```json
{
  "status": "healthy|unhealthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "details": {
    "messageCount": 0,
    "consumerCount": 1,
    "isHealthy": true
  }
}
```

---

## 🔧 Development Endpoints (Internal)

### Test Assessment Submission
**POST** `/test/submit`

Submit assessment untuk testing tanpa autentikasi (hanya tersedia di development mode).

**Request Body:**
```json
{
  "assessmentName": "Test Assessment",
  "riasec": {"realistic": 75, "investigative": 80, "artistic": 65, "social": 70, "enterprising": 85, "conventional": 60},
  "ocean": {"openness": 80, "conscientiousness": 75, "extraversion": 70, "agreeableness": 85, "neuroticism": 40},
  "viaIs": {"creativity": 80, "curiosity": 85, "judgment": 75, "loveOfLearning": 90, "perspective": 70, "bravery": 65, "perseverance": 80, "honesty": 85, "zest": 75, "love": 80, "kindness": 85, "socialIntelligence": 75, "teamwork": 80, "fairness": 85, "leadership": 70, "forgiveness": 75, "humility": 80, "prudence": 75, "selfRegulation": 80, "appreciationOfBeauty": 70, "gratitude": 85, "hope": 80, "humor": 75, "spirituality": 60}
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test assessment submitted successfully",
  "data": {
    "jobId": "uuid",
    "analysisId": "uuid",
    "status": "queued",
    "estimatedProcessingTime": "2-5 minutes",
    "queuePosition": 1,
    "userId": "test-uuid",
    "userEmail": "test@example.com"
  }
}
```

### Test Job Status Check
**GET** `/test/status/:jobId`

Check status job testing tanpa autentikasi.

---

## 📊 Internal Communication Features

### 1. Job Tracking
- **Local Job Tracker:** In-memory tracking untuk performa
- **Archive Service Sync:** Sinkronisasi dengan database Archive Service
- **Real-time Updates:** Update status real-time via callback

### 2. Token Management
- **Automatic Deduction:** Potong token saat submit assessment
- **Automatic Refund:** Refund token saat job gagal
- **Balance Validation:** Validasi saldo sebelum processing

### 3. Queue Management
- **RabbitMQ Integration:** Publish job ke queue untuk processing
- **Queue Statistics:** Monitor queue length dan consumer count
- **Priority Handling:** Support untuk job priority (future)

### 4. Error Handling
- **Graceful Degradation:** Service tetap berjalan meski dependency down
- **Retry Logic:** Retry untuk operasi yang gagal
- **Comprehensive Logging:** Log semua operasi untuk debugging

---

## 📝 Internal Communication Notes

1. **Service Discovery:** Service berjalan di port 3003 dan dapat diakses langsung oleh service lain
2. **Authentication:** Menggunakan service key untuk validasi internal
3. **Rate Limiting:** Tidak ada rate limiting untuk komunikasi internal
4. **Error Handling:** Menggunakan format error standar dengan kode error spesifik
5. **Logging:** Semua request internal dicatat untuk monitoring
6. **Queue Integration:** RabbitMQ untuk asynchronous job processing
7. **Idempotency:** Support idempotency untuk prevent duplicate submissions
8. **Background Jobs:** Cleanup job untuk maintenance

## 🔗 Service Dependencies
- **RabbitMQ:** Message queue untuk job processing
- **Auth Service:** Token validation dan user management
- **Archive Service:** Job dan result storage
- **Analysis Worker:** Processing assessment data
- **PostgreSQL:** Database untuk idempotency (optional)

## 🚨 Security Notes
- Internal endpoints tidak boleh diexpose ke public
- Service key harus dijaga kerahasiaannya
- Callback endpoints hanya menerima request dari trusted services
- Logging tidak boleh mencatat sensitive data
