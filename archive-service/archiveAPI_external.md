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
  "data": {
    "results": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "user_id": "550e8400-e29b-41d4-a716-446655440002",
        "persona_profile": { /* subset of fields; for full details use GET /api/archive/results/:id */ },
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
    }
  }
}
```

**Results Array Structure:**
- `results`: Array berisi objek hasil analisis dengan subset field: `id`, `user_id`, `persona_profile` (ringkas), `status`, `assessment_name`, `created_at`
- Untuk detail lengkap sebuah result (termasuk `updated_at`, `error_message`, struktur lengkap `assessment_data` dan `persona_profile`), gunakan endpoint `GET /api/archive/results/:id`

### 2. Get Specific Result
**GET** `/api/archive/results/:id`

Mendapatkan detail hasil analisis berdasarkan ID.

**Parameters:**
- `id` (UUID) - ID hasil analisis

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "assessment_data": {...},
    "persona_profile": {...},
    "status": "completed",
    "error_message": null,
    "assessment_name": "AI-Driven Talent Mapping",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

**Field Descriptions:**
- `assessment_data`: Data assessment yang dikirim user (RIASEC, OCEAN, VIA-IS) - lihat detail struktur di bawah
- `persona_profile`: Hasil analisis dan profil persona yang dihasilkan - lihat detail struktur di bawah
- `status`: Status hasil analisis ('completed', 'processing', 'failed')
- `error_message`: Pesan error jika status 'failed', null jika berhasil

---

## 📊 Detailed Data Structures

### Assessment Data Structure (`assessment_data`)

Data assessment lengkap yang dikirim user untuk dianalisis AI, terdiri dari 3 komponen utama:

#### 1. RIASEC Assessment (Holland Code)
**Deskripsi:** 6 dimensi kepribadian kerja dengan skala 0-100
```json
{
  "riasec": {
    "realistic": 75,        // Kecenderungan pada pekerjaan praktis, hands-on
    "investigative": 85,    // Kecenderungan pada penelitian dan analisis
    "artistic": 65,         // Kecenderungan pada kreativitas dan ekspresi
    "social": 70,          // Kecenderungan pada interaksi dan membantu orang
    "enterprising": 80,    // Kecenderungan pada kepemimpinan dan bisnis
    "conventional": 60     // Kecenderungan pada organisasi dan detail
  }
}
```

#### 2. OCEAN Assessment (Big Five Personality)
**Deskripsi:** 5 dimensi utama kepribadian manusia dengan skala 0-100
```json
{
  "ocean": {
    "openness": 88,           // Keterbukaan terhadap pengalaman baru
    "conscientiousness": 75,  // Kehati-hatian, kedisiplinan, orientasi tujuan
    "extraversion": 72,       // Kecenderungan sosial dan energi eksternal
    "agreeableness": 85,      // Keramahan, kerjasama, kepercayaan
    "neuroticism": 35         // Stabilitas emosional (skor rendah = stabil)
  }
}
```

#### 3. VIA-IS Assessment (Character Strengths)
**Deskripsi:** 24 kekuatan karakter dengan skala 0-100
```json
{
  "viaIs": {
    // Wisdom & Knowledge
    "creativity": 82,
    "curiosity": 90,
    "judgment": 78,
    "loveOfLearning": 95,
    "perspective": 75,

    // Courage
    "bravery": 68,
    "perseverance": 85,
    "honesty": 88,
    "zest": 76,

    // Humanity
    "love": 82,
    "kindness": 87,
    "socialIntelligence": 74,

    // Justice
    "teamwork": 79,
    "fairness": 86,
    "leadership": 72,

    // Temperance
    "forgiveness": 77,
    "humility": 81,
    "prudence": 73,
    "selfRegulation": 84,

    // Transcendence
    "appreciationOfBeauty": 69,
    "gratitude": 89,
    "hope": 83,
    "humor": 71,
    "spirituality": 58
  }
}
```

#### Complete Assessment Data Example
```json
{
  "riasec": { /* 6 fields as above */ },
  "ocean": { /* 5 fields as above */ },
  "viaIs": { /* 24 fields as above */ }
}
```

**Validation Rules:**
- Semua skor harus berupa integer antara 0-100
- RIASEC: 6 dimensi wajib diisi
- OCEAN: 5 dimensi wajib diisi
- VIA-IS: 24 kekuatan karakter wajib diisi
- Total: 35 field wajib (6 + 5 + 24)

### Persona Profile Structure (`persona_profile`)

Profil persona lengkap hasil analisis AI berdasarkan assessment data:

#### Core Profile Fields
```json
{
  "archetype": "The Analytical Innovator",
  "shortSummary": "Anda adalah seorang pemikir analitis dengan kecenderungan investigatif yang kuat dan kreativitas tinggi. Kombinasi antara kecerdasan logis-matematis dan keterbukaan terhadap pengalaman baru membuat Anda unggul dalam memecahkan masalah kompleks dengan pendekatan inovatif.",
  "strengthSummary": "Kekuatan utama Anda terletak pada analisis mendalam, kreativitas, dan dorongan kuat untuk belajar hal baru. Ini membuat Anda mampu menghasilkan solusi unik di berbagai situasi kompleks.",
  "weaknessSummary": "Area yang perlu dikembangkan meliputi keterampilan komunikasi interpersonal dan kemampuan bekerja dalam tim. Kecenderungan perfeksionisme dapat menghambat produktivitas jika tidak dikelola dengan baik."
}
```

#### Strengths & Weaknesses
```json
{
  "strengths": [
    "Kemampuan analisis yang tajam",
    "Kreativitas dan inovasi",
    "Keingintahuan intelektual yang tinggi",
    "Kemampuan belajar mandiri yang kuat",
    "Pemecahan masalah yang sistematis"
  ],
  "weaknesses": [
    "Kecenderungan perfeksionisme berlebihan",
    "Kesulitan dalam komunikasi ide kompleks",
    "Kurang sabar dengan proses yang lambat",
    "Cenderung bekerja sendiri daripada dalam tim"
  ]
}
```

#### Career Recommendations
```json
{
  "careerRecommendation": [
    {
      "careerName": "Data Scientist",
      "careerProspect": {
        "jobAvailability": "high",      // Ketersediaan lowongan kerja
        "salaryPotential": "high",      // Potensi gaji
        "careerProgression": "high",    // Peluang jenjang karir
        "industryGrowth": "super high", // Pertumbuhan industri
        "skillDevelopment": "super high" // Peluang pengembangan skill
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
  ]
}
```

**Career Prospect Values:**
- `super high`: Sangat tinggi (90-100%)
- `high`: Tinggi (70-89%)
- `moderate`: Sedang (40-69%)
- `low`: Rendah (20-39%)
- `super low`: Sangat rendah (0-19%)

#### Development & Insights
```json
{
  "insights": [
    "Kembangkan keterampilan komunikasi untuk menyampaikan ide kompleks dengan lebih efektif",
    "Latih kemampuan bekerja dalam tim untuk mengimbangi kecenderungan bekerja sendiri",
    "Manfaatkan kekuatan analitis untuk memecahkan masalah sosial",
    "Cari mentor yang dapat membantu mengembangkan keterampilan kepemimpinan",
    "Tetapkan batas waktu untuk menghindari analisis berlebihan"
  ],
  "skillSuggestion": [
    "Public Speaking",
    "Leadership",
    "Teamwork",
    "Time Management",
    "Delegation"
  ],
  "possiblePitfalls": [
    "Mengisolasi diri dari tim karena terlalu fokus pada analisis individu",
    "Menunda keputusan karena perfeksionisme berlebihan",
    "Kurang membangun jaringan karena terlalu fokus pada teknis"
  ]
}
```

#### Work Environment & Role Models
```json
{
  "riskTolerance": "moderate",
  "workEnvironment": "Lingkungan kerja yang memberikan otonomi intelektual, menghargai inovasi, dan menyediakan tantangan kognitif yang berkelanjutan. Anda berkembang di tempat yang terstruktur namun fleksibel.",
  "roleModel": [
    "Marie Curie",
    "Albert Einstein",
    "B.J. Habibie"
  ]
}
```

#### Complete Persona Profile Schema
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `archetype` | String | ✓ | Nama archetype yang sesuai (max 100 char) |
| `shortSummary` | String | ✓ | Ringkasan persona (1-2 paragraf, max 1000 char) |
| `strengthSummary` | String | ✓ | Ringkasan kekuatan (1 paragraf, max 500 char) |
| `strengths` | Array[String] | ✓ | 3-5 kekuatan utama |
| `weaknessSummary` | String | ✓ | Ringkasan kelemahan (1 paragraf, max 500 char) |
| `weaknesses` | Array[String] | ✓ | 3-5 kelemahan yang perlu diperhatikan |
| `careerRecommendation` | Array[Object] | ✓ | 3-5 rekomendasi karir dengan prospek |
| `insights` | Array[String] | ✓ | 3-5 insight pengembangan diri |
| `skillSuggestion` | Array[String] | ✓ | 3-5 rekomendasi skill development |
| `possiblePitfalls` | Array[String] | ✓ | 2-5 jebakan karir yang perlu diwaspadai |
| `riskTolerance` | String | ✓ | Toleransi risiko (very high/high/moderate/low/very low) |
| `workEnvironment` | String | ✓ | Deskripsi lingkungan kerja ideal (max 500 char) |
| `roleModel` | Array[String] | ✓ | 2-3 role model inspiratif |

### 3. Update Result
**PUT** `/api/archive/results/:id`

Memperbarui hasil analisis.

- Akses: pemilik data (JWT) atau internal service (dengan header internal)
- Catatan: field yang boleh diupdate terutama `persona_profile`, `status`, `error_message`, `assessment_name`

**Parameters:**
- `id` (UUID) - ID hasil analisis

**Request Body (contoh):**
```json
{
  "persona_profile": { /* schema sesuai bagian Persona Profile */ },
  "status": "completed",
  "error_message": null,
  "assessment_name": "AI-Driven Talent Mapping"
}
```

Rules penting:
- Tidak boleh mengubah `user_id`, `id`, atau `created_at`
- Jika `status` = `completed`, `persona_profile` tidak boleh null
- Jika `status` = `failed`, `error_message` wajib diisi dan `persona_profile` akan diabaikan/null

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
- `status` (string, optional) - queued, processing, completed, failed
- `assessment_name` (string, optional)
- `sort` (string, default: 'created_at', allowed: 'created_at', 'updated_at')
- `order` (string, default: 'DESC', allowed: 'ASC' | 'DESC')

**Response:**
```json
{
  "success": true,
  "message": "Jobs retrieved successfully",
  "data": {
    "jobs": [
      {
        "job_id": "job_12345abcdef",
        "user_id": "550e8400-e29b-41d4-a716-446655440001",
        "status": "processing",
        "assessment_name": "AI-Driven Talent Mapping",
        "created_at": "2024-01-15T10:30:00.000Z",
        "updated_at": "2024-01-15T10:32:00.000Z",
        "result_id": null,
        "archetype": null
      },
      {
        "job_id": "job_67890ghijkl",
        "user_id": "550e8400-e29b-41d4-a716-446655440001",
        "status": "completed",
        "assessment_name": "AI-Driven Talent Mapping",
        "created_at": "2024-01-14T09:15:00.000Z",
        "updated_at": "2024-01-14T09:18:00.000Z",
        "result_id": "550e8400-e29b-41d4-a716-446655440003",
        "archetype": "The Analytical Innovator"
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

**Jobs Array Structure:**
- `job_id`: String - ID unik untuk job analisis
- `user_id`: UUID - ID user yang memiliki job
- `status`: String - Status job ("pending", "processing", "completed", "failed")
- `assessment_name`: String - Nama assessment yang dijalankan
- `created_at`: Timestamp - Waktu job dibuat
- `updated_at`: Timestamp - Waktu terakhir job diupdate
- `result_id`: UUID/null - ID hasil analisis jika job completed, null jika belum selesai

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
    "result_id": "uuid",
    "archetype": "string|null"
  }
}
```

### 3. Get Job Statistics
**GET** `/api/archive/results/jobs/stats`

Mendapatkan statistik job untuk user yang terautentikasi.

Catatan: Statistik dibuat dari data jobs user; struktur bisa menyesuaikan implementasi terbaru.

**Response (contoh):**
```json
{
  "success": true,
  "message": "Job statistics retrieved successfully",
  "data": {
    "total_jobs": 50,
    "pending": 5,
    "processing": 2,
    "completed": 40,
    "failed": 3
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
    "archetype_distribution": {
      "The Analytical Innovator": 8,
      "The Creative Collaborator": 6,
      "The Strategic Leader": 4,
      "The Empathetic Helper": 7
    },
    "recent_activity": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "archetype": "The Analytical Innovator",
        "created_at": "2024-01-15T10:30:00.000Z",
        "status": "completed"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "archetype": "The Creative Collaborator",
        "created_at": "2024-01-14T15:20:00.000Z",
        "status": "completed"
      }
    ]
  }
}
```

**Statistics Data Structure:**
- `total_results`: Number - Total hasil analisis yang dimiliki user
- `total_jobs`: Number - Total job yang pernah dijalankan user
- `completed_assessments`: Number - Total assessment yang berhasil diselesaikan
- `archetype_distribution`: Object - Distribusi archetype yang pernah didapat user
- `recent_activity`: Array - Aktivitas terbaru user (max 10 item terbaru)

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
    "recent_results": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "archetype": "The Analytical Innovator",
        "assessment_name": "AI-Driven Talent Mapping",
        "created_at": "2024-01-15T10:30:00.000Z",
        "status": "completed"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "archetype": "The Creative Collaborator",
        "assessment_name": "AI-Driven Talent Mapping",
        "created_at": "2024-01-14T15:20:00.000Z",
        "status": "completed"
      }
    ],
    "archetype_summary": {
      "most_common": "The Analytical Innovator",
      "frequency": 3,
      "last_archetype": "The Creative Collaborator",
      "unique_archetypes": 4,
      "archetype_trend": "consistent"
    }
  }
}
```

**Overview Data Structure:**
- `summary`: Object - Ringkasan statistik user
  - `total_assessments`: Total assessment yang diselesaikan
  - `this_month`: Assessment yang diselesaikan bulan ini
  - `success_rate`: Tingkat keberhasilan (0.0 - 1.0)
- `recent_results`: Array - 5 hasil terbaru dengan info dasar
- `archetype_summary`: Object - Ringkasan pola archetype user
  - `most_common`: Archetype yang paling sering muncul
  - `frequency`: Berapa kali archetype tersebut muncul
  - `last_archetype`: Archetype terakhir yang didapat
  - `unique_archetypes`: Jumlah archetype unik yang pernah didapat
  - `archetype_trend`: Pola trend archetype ("consistent", "varied", "evolving")

---

## 🔄 Unified API v1 Endpoints

### 1. Unified Statistics
**GET** `/api/archive/v1/stats`

Endpoint statistik terpadu dengan parameter fleksibel.

**Query Parameters:**
- `type` (string) - user, system, demographic, performance
- `scope` (string) - overview, detailed, analysis, summary, queue, insights
- `timeRange` (string) - "1 day", "7 days", "30 days", "90 days"

Akses:
- `user` dapat diakses oleh user terautentikasi
- `system`, `demographic`, `performance` hanya untuk internal service (X-Internal-Service + X-Service-Key)

### 2. Unified Data Retrieval
**GET** `/api/archive/v1/data/:type`

Endpoint pengambilan data terpadu.

**Parameters:**
- `type` (string) - results, jobs, demographics

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `sort` (string, allowed: created_at, updated_at, status)
- `order` (string, ASC|DESC)

Catatan: akses `demographics` via endpoint ini memerlukan autentikasi internal service.
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

---

## 📋 Complete Response Examples

### Example: Complete Analysis Result Response
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "user_id": "550e8400-e29b-41d4-a716-446655440002",
    "assessment_data": {

      "riasec": {
        "realistic": 75,
        "investigative": 85,
        "artistic": 65,
        "social": 70,
        "enterprising": 80,
        "conventional": 60
      },
      "ocean": {
        "openness": 88,
        "conscientiousness": 75,
        "extraversion": 72,
        "agreeableness": 85,
        "neuroticism": 35
      },
      "viaIs": {
        "creativity": 82,
        "curiosity": 90,
        "judgment": 78,
        "loveOfLearning": 95,
        "perspective": 75,
        "bravery": 68,
        "perseverance": 85,
        "honesty": 88,
        "zest": 76,
        "love": 82,
        "kindness": 87,
        "socialIntelligence": 74,
        "teamwork": 79,
        "fairness": 86,
        "leadership": 72,
        "forgiveness": 77,
        "humility": 81,
        "prudence": 73,
        "selfRegulation": 84,
        "appreciationOfBeauty": 69,
        "gratitude": 89,
        "hope": 83,
        "humor": 71,
        "spirituality": 58
      }
    },
    "persona_profile": {
      "archetype": "The Analytical Innovator",
      "shortSummary": "Anda adalah seorang pemikir analitis dengan kecenderungan investigatif yang kuat dan kreativitas tinggi. Kombinasi antara kecerdasan logis-matematis dan keterbukaan terhadap pengalaman baru membuat Anda unggul dalam memecahkan masalah kompleks dengan pendekatan inovatif.",
      "strengthSummary": "Kekuatan utama Anda terletak pada analisis mendalam, kreativitas, dan dorongan kuat untuk belajar hal baru. Ini membuat Anda mampu menghasilkan solusi unik di berbagai situasi kompleks.",
      "strengths": [
        "Kemampuan analisis yang tajam",
        "Kreativitas dan inovasi",
        "Keingintahuan intelektual yang tinggi",
        "Kemampuan belajar mandiri yang kuat",
        "Pemecahan masalah yang sistematis"
      ],
      "weaknessSummary": "Area yang perlu dikembangkan meliputi keterampilan komunikasi interpersonal dan kemampuan bekerja dalam tim. Kecenderungan perfeksionisme dapat menghambat produktivitas jika tidak dikelola dengan baik.",
      "weaknesses": [
        "Kecenderungan perfeksionisme berlebihan",
        "Kesulitan dalam komunikasi ide kompleks",
        "Kurang sabar dengan proses yang lambat",
        "Cenderung bekerja sendiri daripada dalam tim"
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
      "skillSuggestion": [
        "Public Speaking",
        "Leadership",
        "Teamwork",
        "Time Management",
        "Delegation"
      ],
      "possiblePitfalls": [
        "Mengisolasi diri dari tim karena terlalu fokus pada analisis individu",
        "Menunda keputusan karena perfeksionisme berlebihan",
        "Kurang membangun jaringan karena terlalu fokus pada teknis"
      ],
      "riskTolerance": "moderate",
      "workEnvironment": "Lingkungan kerja yang memberikan otonomi intelektual, menghargai inovasi, dan menyediakan tantangan kognitif yang berkelanjutan. Anda berkembang di tempat yang terstruktur namun fleksibel.",
      "roleModel": [
        "Marie Curie",
        "Albert Einstein",
        "B.J. Habibie"
      ]
    },
    "status": "completed",
    "error_message": null,
    "assessment_name": "AI-Driven Talent Mapping",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:35:00.000Z"
  }
}
```

---

## 📝 Important Notes

### Data Consistency
1. **Assessment Data:** Selalu berisi 35 field (6 RIASEC + 5 OCEAN + 24 VIA-IS)
2. **Persona Profile:** Selalu berisi 13 field utama sesuai schema
3. **Status Values:** Hanya 3 nilai valid: 'completed', 'processing', 'failed'
4. **Score Range:** Semua skor assessment dalam rentang 0-100

### Response Variations
1. **Processing Status:** `persona_profile` bisa null jika status 'processing'
2. **Failed Status:** `persona_profile` null dan `error_message` berisi detail error
3. **Completed Status:** `persona_profile` lengkap dan `error_message` null

### Performance Considerations
1. **Pagination:** Gunakan pagination untuk list endpoints
2. **Filtering:** Manfaatkan parameter filter untuk mengurangi data transfer
3. **Caching:** Response di-cache untuk meningkatkan performa

### Data Privacy
1. **User Isolation:** User hanya bisa mengakses data milik sendiri
2. **Admin Access:** Admin memiliki akses terbatas untuk debugging
3. **Data Retention:** Data disimpan sesuai kebijakan retention

---

## 🔗 Related Services
- **Auth Service:** Untuk autentikasi dan manajemen user
- **Assessment Service:** Untuk pembuatan dan pengiriman assessment
- **API Gateway:** Sebagai entry point untuk semua request eksternal
