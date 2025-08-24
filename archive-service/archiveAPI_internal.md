# Archive Service - Internal API Documentation

## Overview
Archive Service menyediakan API internal untuk komunikasi antar service dalam ekosistem ATMA. API ini digunakan oleh **Assessment Service**, **Analysis Worker**, dan service internal lainnya.

**Service Information:**
- **Service Name:** archive-service
- **Internal Port:** 3002
- **Internal Base URL:** `http://localhost:3002/`
- **Version:** 1.0.0

## Internal Authentication
Semua endpoint internal menggunakan service authentication dengan header khusus.

**Required Headers:**
```
X-Internal-Service: true
X-Service-Key: <internal_service_secret_key>
```

Catatan:
- Jika header `X-Internal-Service: true` dikirim, service akan memvalidasi `X-Service-Key`. Jika salah/absen akan mengembalikan 401 INVALID_SERVICE_KEY.
- Jika header internal tidak dikirim, request diperlakukan sebagai request user biasa (beberapa endpoint tetap bisa diakses dengan JWT).

**Service Key:** Didefinisikan dalam environment variable `INTERNAL_SERVICE_KEY`

---

## 🔄 Analysis Results - Internal Endpoints

### 1. Create Analysis Result
**POST** `/archive/results`

Membuat hasil analisis baru (hanya untuk internal service).

**Request Body:**
```json
{
  "user_id": "uuid",
  "assessment_name": "string",
  "assessment_data": {
    "riasec": {...},
    "ocean": {...},
    "viaIs": {...}
  },
  "persona_profile": {
    "personality_summary": "string",
    "career_recommendations": [...],
    "strengths": [...],
    "development_areas": [...]
  },
  "status": "completed"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Analysis result created successfully",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "job_id": "string",
    "status": "completed",
    "created_at": "timestamp"
  }
}
```

### 2. Batch Create Results
**POST** `/archive/results/batch`

Membuat multiple hasil analisis dalam satu request.

**Request Body:**
```json
{
  "items": [
    {
      "user_id": "uuid",
      "assessment_name": "string",
      "assessment_data": {...},
      "persona_profile": {...},
      "status": "completed"
    }
  ],
  "options": {
    "batch_size": 100,
    "validate_users": true
  }
}
```

### 3. Update Result (Internal)
**PUT** `/archive/results/:id`

Memperbarui hasil analisis (akses internal tanpa validasi ownership).

**Request Body:**
```json
{
  "assessment_data": {...},
  "persona_profile": {...},
  "status": "completed"
}
```

### 4. Get Result (Internal)
**GET** `/archive/results/:id`

Mendapatkan hasil analisis tanpa validasi ownership user.

---

## 🔄 Analysis Jobs - Internal Endpoints

### 1. Create Analysis Job
**POST** `/archive/jobs`

Membuat job analisis baru.

**Request Body:**
```json
{
  "user_id": "uuid",
  "assessment_name": "string",
  "assessment_data": {...},
  "priority": "normal",
  "callback_url": "http://service/callback"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Analysis job created successfully",
  "data": {
    "job_id": "generated_job_id",
    "user_id": "uuid",
    "status": "pending",
    "created_at": "timestamp",
    "estimated_completion": "timestamp"
  }
}
```

### 2. Update Job Status
**PUT** `/archive/jobs/:jobId/status`

Memperbarui status job (digunakan oleh Analysis Worker).

**Request Body:**
```json
{
  "status": "processing|completed|failed",
  "result_id": "uuid",
  "error_message": "string",
  "progress": 75,
  "metadata": {...}
}
```

### 3. Get Job (Internal)
**GET** `/archive/jobs/:jobId`

Mendapatkan detail job tanpa validasi ownership.

### 4. Batch Update Jobs
**POST** `/archive/v1/batch/update-jobs`

Memperbarui multiple jobs dalam satu request.

**Request Body:**
```json
{
  "items": [
    {
      "job_id": "string",
      "status": "completed",
      "result_id": "uuid"
    }
  ],
  "options": {
    "validate_existence": true
  }
}
```

---

## 📊 Statistics - Internal Endpoints

### 1. System Statistics
**GET** `/archive/stats/summary`

Mendapatkan statistik sistem untuk monitoring dan dashboard admin.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_users": 1500,
    "total_results": 5000,
    "total_jobs": 5200,
    "system_performance": {
      "avg_processing_time": 45.5,
      "success_rate": 0.97,
      "queue_length": 12
    },
    "archetype_distribution": {...},
    "daily_stats": [...]
  }
}
```

### 2. Performance Metrics
**GET** `/archive/metrics/performance`

Mendapatkan analisis performa sistem dan slow queries.

---

## 📈 Demographics - Internal Endpoints

### 1. Demographic Overview
**GET** `/archive/demographics/overview`

Mendapatkan overview data demografis untuk analisis.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_records": 5000,
    "gender_distribution": {...},
    "age_distribution": {...},
    "school_distribution": {...},
    "archetype_by_demographics": {...}
  }
}
```

### 2. Archetype Demographics
**GET** `/archive/demographics/archetype/:archetype`

Mendapatkan data demografis untuk archetype tertentu.

**Parameters:**
- `archetype` (string) - Nama archetype

### 3. School Analytics
**GET** `/archive/demographics/schools`

Mendapatkan analisis berdasarkan asal sekolah.

**Query Parameters:**
- `school` (string, optional) - Filter sekolah tertentu

### 4. Optimized Demographics
**GET** `/archive/demographics/optimized`

Mendapatkan data demografis dengan query yang dioptimasi.

**Query Parameters:**
- `gender` (string)
- `ageMin` (number)
- `ageMax` (number)
- `schoolOrigin` (string)
- `archetype` (string)
- `limit` (number, default: 100)

### 5. Demographic Trends
**GET** `/archive/demographics/trends`

Mendapatkan tren demografis dari waktu ke waktu.

**Query Parameters:**
- `period` (string) - day, week, month, year
- `limit` (number) - Jumlah periode

---

## 🔧 Batch Processing - Internal Endpoints

### 1. Get Batch Statistics
**GET** `/archive/results/batch/stats`

Mendapatkan statistik batch processing.

**Response:**
```json
{
  "success": true,
  "data": {
    "queue_length": 150,
    "processing_rate": 25.5,
    "avg_batch_size": 50,
    "last_processed": "timestamp",
    "failed_batches": 2
  }
}
```

### 2. Force Batch Process
**POST** `/archive/results/batch/process`

Memaksa pemrosesan batch saat ini.

### 3. Clear Batch Queue
**POST** `/archive/results/batch/clear`

Membersihkan antrian batch (operasi darurat).

---

## 📊 Metrics & Monitoring - Internal Endpoints

### 1. Application Metrics
**GET** `/archive/metrics`

Mendapatkan metrik aplikasi untuk monitoring.

**Response:**
```json
{
  "success": true,
  "data": {
    "requests": {
      "total": 10000,
      "success": 9700,
      "errors": 300
    },
    "response_times": {
      "avg": 125.5,
      "p95": 250.0,
      "p99": 500.0
    },
    "cache": {
      "hits": 8500,
      "misses": 1500,
      "hit_rate": 0.85
    }
  }
}
```

### 2. Database Metrics
**GET** `/archive/metrics/database`

Mendapatkan metrik database.

### 3. Cache Metrics
**GET** `/archive/metrics/cache`

Mendapatkan metrik cache Redis.

### 4. Performance Metrics
**GET** `/archive/metrics/performance`

Mendapatkan analisis performa.

### 5. Reset Metrics
**POST** `/archive/metrics/reset`

Reset counter metrik.

### 6. Cache Invalidation
**POST** `/archive/metrics/cache/invalidate`

Invalidasi cache berdasarkan pattern.

**Request Body:**
```json
{
  "pattern": "demographics|archetypes|stats|results|all"
}
```

---

## 🔄 Unified API v1 - Internal Endpoints

### 1. Advanced Analytics
**GET** `/archive/v1/analytics`

Endpoint analitik lanjutan dengan filtering dan agregasi.

**Query Parameters:**
- `metric` (string) - results, jobs, demographics, performance
- `aggregation` (string) - count, avg, sum, min, max
- `groupBy` (string) - date, archetype, gender, school, status
- `filters` (JSON string) - Kriteria filter
- `timeRange` (string) - Rentang waktu

### 2. Batch Operations
**POST** `/archive/v1/batch/:operation`

Operasi batch terpadu.

**Operations:**
- `create-results` - Batch create results
- `update-jobs` - Batch update jobs
- `cleanup` - Batch cleanup

### 3. Health Check Components
**GET** `/archive/v1/health/:component`

Health check komponen spesifik.

**Components:**
- `database` - Status database
- `queue` - Status antrian
- `performance` - Status performa
- `all` - Semua komponen

---

## 🔧 Development Endpoints

### Create User (Development Only)
**POST** `/archive/results/dev/create-user`

Membuat user untuk testing (hanya tersedia di development mode).

**Request Body:**
```json
{
  "user_id": "uuid",
  "email": "user@example.com"
}
```

---

## 🔍 Endpoint Access

Semua endpoint menggunakan prefix `/archive` untuk konsistensi:

- `/archive/results/*` - Results endpoints
- `/archive/jobs/*` - Jobs endpoints
- `/archive/v1/*` - Unified API endpoints

---

## 📝 Internal Communication Notes

1. **Service Discovery:** Service berjalan di port 3002 dan dapat diakses langsung oleh service lain
2. **Authentication:** Menggunakan service key untuk validasi internal
3. **Rate Limiting:** Tidak ada rate limiting untuk komunikasi internal
4. **Error Handling:** Menggunakan format error standar dengan kode error spesifik
5. **Logging:** Semua request internal dicatat untuk monitoring
6. **Caching:** Menggunakan Redis untuk caching data yang sering diakses
7. **Database:** PostgreSQL dengan schema `archive`
8. **Background Processing:** Menggunakan background processor untuk operasi batch

## 🔗 Service Dependencies
- **PostgreSQL Database:** Penyimpanan data utama
- **Redis Cache:** Caching dan session storage
- **RabbitMQ:** Message queue untuk komunikasi asinkron
- **Auth Service:** Validasi token dan user data
- **Assessment Service:** Sumber data assessment
