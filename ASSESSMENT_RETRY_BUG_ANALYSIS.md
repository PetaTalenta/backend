# Assessment Retry Bug Analysis

**Date:** September 28, 2025  
**Issue:** Endpoint `/assessment/retry` mengembalikan error "Job not found"  
**Reporter:** User dengan akun kasykoi@gmail.com  

## 🔍 Problem Description

User mendapatkan error berikut ketika menggunakan endpoint assessment/retry:

```json
{
    "success": false,
    "error": {
        "code": "NOT_FOUND",
        "message": "Job not found",
        "details": {}
    }
}
```

**URL yang bermasalah:**
```
http://localhost:3000/results/a099bf74-72e0-465c-86fc-9ce841e3d4de?jobId=a868a91a-023f-4793-b0c1-2c90bd39c469
```

## 🕵️ Root Cause Analysis

### Database Investigation

Setelah melakukan investigasi di database PostgreSQL, ditemukan bahwa:

1. **Job ID yang dicari MEMANG ADA di database**
2. **Namun ada confusion antara Database ID vs Job ID**

### Struktur Tabel `archive.analysis_jobs`

Tabel ini memiliki **3 jenis ID berbeda**:

| Column | Value | Purpose |
|--------|-------|---------|
| `id` (Primary Key) | `a868a91a-023f-4793-b0c1-2c90bd39c469` | Database internal ID |
| `job_id` (Business ID) | `7558b2ae-d5a6-4666-bbe8-564bc44af92d` | Job identifier untuk API |
| `result_id` (Foreign Key) | `a099bf74-72e0-465c-86fc-9ce841e3d4de` | Link ke analysis_results |

### Database Query Results

```sql
SELECT id, job_id, result_id, status 
FROM archive.analysis_jobs 
WHERE id = 'a868a91a-023f-4793-b0c1-2c90bd39c469';
```

**Result:**
- **Database ID:** `a868a91a-023f-4793-b0c1-2c90bd39c469`
- **Job ID:** `7558b2ae-d5a6-4666-bbe8-564bc44af92d`  
- **Result ID:** `a099bf74-72e0-465c-86fc-9ce841e3d4de`
- **Status:** `completed`

## 🚨 The Problem

**Frontend mengirimkan Database ID sebagai `jobId` parameter, bukan Job ID yang sebenarnya!**

### Context: Data Source Investigation

**User mendapatkan `jobId` dari endpoint `/archive/jobs`**, yang berarti ada kemungkinan:
- ✅ **Endpoint `/archive/jobs` mengembalikan database `id` sebagai `job_id`**
- ✅ **Frontend menggunakan response tersebut sebagai parameter `jobId`**
- ❌ **Backend `/assessment/retry` mencari berdasarkan field `job_id` yang berbeda**

**Ini menunjukkan ada inconsistency antara:**
1. **Data yang dikirim oleh endpoint `/archive/jobs`** (kemungkinan database `id`)
2. **Data yang diexpektasi oleh endpoint `/assessment/retry`** (seharusnya field `job_id`)

### What's Happening:

1. 📡 **Archive endpoint sends:** Database ID (`a868a91a-023f-4793-b0c1-2c90bd39c469`) sebagai response
2. 🎯 **Frontend receives & uses:** Value tersebut sebagai `jobId` parameter  
3. ❌ **Frontend sends:** `jobId=a868a91a-023f-4793-b0c1-2c90bd39c469` (Database ID)
4. 🔍 **Backend searches:** `WHERE job_id = 'a868a91a-023f-4793-b0c1-2c90bd39c469'`
5. 💥 **Database returns:** No results (karena value itu ada di kolom `id`, bukan `job_id`)
6. 📤 **API returns:** "Job not found"

### Code Flow Analysis

**Assessment Service (`/assessment/retry`):**
```javascript
// Line 292 in assessment-service/src/routes/assessments.js
existingJob = await archiveService.getJobStatus(jobId);
```

**Archive Service (`archiveService.getJobStatus()`):**
```javascript
// Line 69 in assessment-service/src/services/archiveService.js  
const response = await archiveClient.get(`/archive/jobs/${jobId}`);
```

**Archive Service Route:**
```javascript
// Line 150 in archive-service/src/routes/directJobs.js
const job = await analysisJobsService.getJobByJobIdWithResult(jobId);
```

**Model Query:**
```javascript
// Line 169 in archive-service/src/models/AnalysisJob.js
AnalysisJob.findByJobId = async function(jobId, includeAssociations = false) {
  const options = {
    where: { job_id: jobId }  // ← Mencari di kolom job_id
  };
  //...
}
```

## ✅ Solution

### Root Issue: API Response Inconsistency

**Kemungkinan besar masalahnya bukan di frontend, tapi di backend API responses!**

### What Needs to be Fixed:

1. **🔧 Backend API Fix (Priority 1):**
   - **Audit endpoint `/archive/jobs`** dan pastikan response menggunakan `job_id` field
   - **Standardisasi semua archive endpoints** agar konsisten menggunakan `job_id`

2. **🎯 Frontend Adjustment (jika diperlukan):**
   - Jika backend sudah fix, frontend perlu update untuk menggunakan field yang benar

### Correct URL Should Be:
```
http://localhost:3000/results/a099bf74-72e0-465c-86fc-9ce841e3d4de?jobId=7558b2ae-d5a6-4666-bbe8-564bc44af92d
```

### Verification Test:

Ketika ditest dengan job_id yang benar:
```bash
curl -H "X-Internal-Service: true" \
     -H "X-Service-Key: f8c1af59d85da6581036e18b4b9e0ec35d1fdefe1a93837d5b4746c9984ea4c1" \
     http://localhost:3002/archive/jobs/7558b2ae-d5a6-4666-bbe8-564bc44af92d
```

**Result:** ✅ Success - Job ditemukan dengan status `completed`

## 📋 Action Items

### 🎯 High Priority - Backend API Consistency Fix
- [ ] **Investigate endpoint `/archive/jobs`** yang digunakan frontend untuk mendapatkan job list
- [ ] **Pastikan response dari `/archive/jobs` menggunakan `job_id`** sebagai identifier, bukan database `id`
- [ ] **Audit dan fix semua archive endpoints** yang mengembalikan job data
- [ ] **Test endpoint `/assessment/retry`** setelah backend fix

### 🔄 Secondary Priority - Frontend Adjustment  
- [ ] **Frontend team:** Update jika ada perubahan field name dari backend fix
- [ ] **Verify:** Pastikan frontend menggunakan field identifier yang benar dari API response

### 🔍 Investigation Needed - Backend API Consistency
- [ ] **Audit endpoint `/archive/jobs`** - Pastikan response menggunakan field `job_id`, bukan database `id`
- [ ] **Cek semua archive endpoints** yang mengembalikan job data ke frontend
- [ ] **Standardisasi field naming** - Pastikan semua endpoint konsisten menggunakan `job_id`
- [ ] **Audit semua endpoint** yang menerima `jobId` parameter untuk konsistensi
- [ ] **Frontend investigation** - Cek dari endpoint mana frontend mendapatkan jobId value

### 🛡️ Prevention Measures
- [ ] Tambahkan validation di backend untuk mengecek format jobId
- [ ] Consider menambahkan endpoint lookup by database ID sebagai fallback
- [ ] Improve API documentation untuk memperjelas perbedaan ID types

## 🔗 Related Files

- `assessment-service/src/routes/assessments.js` (Line 289-295)
- `assessment-service/src/services/archiveService.js` (Line 60-85)
- `archive-service/src/routes/directJobs.js` (Line 142-166)
- `archive-service/src/models/AnalysisJob.js` (Line 168-182)
- `archive-service/src/services/analysisJobsService.js` (Line 67-91)

## 📊 Database Schema Reference

```sql
-- Table: archive.analysis_jobs
CREATE TABLE archive.analysis_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),           -- Database internal ID
    job_id VARCHAR(255) UNIQUE NOT NULL,                      -- Business job identifier  
    user_id UUID NOT NULL,                                    -- User reference
    result_id UUID REFERENCES archive.analysis_results(id),   -- Result reference
    status VARCHAR(50) NOT NULL DEFAULT 'queued',
    -- ... other columns
);
```

## 💡 Key Takeaway

**Kemungkinan besar ini adalah masalah API consistency di backend, bukan frontend error!**

### The Real Issue:
- **Endpoint `/archive/jobs`** kemungkinan mengembalikan database `id` sebagai job identifier
- **Endpoint `/assessment/retry`** mengexpektasi field `job_id` yang berbeda
- **Frontend hanya menggunakan data yang diberikan oleh backend API**

### API Design Principle:
**Always use `job_id` field for API operations, not the database `id` field!**

The `id` field is for internal database relations, while `job_id` is the business identifier meant for API communication between services.

### Next Steps:
1. **Investigate** endpoint `/archive/jobs` response format
2. **Standardize** semua job-related endpoints untuk konsistensi
3. **Fix** backend API sebelum blame frontend 😅
