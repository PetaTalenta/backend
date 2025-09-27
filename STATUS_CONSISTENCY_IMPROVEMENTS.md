# Status Consistency and Cascade Delete Improvements

## Overview

Perbaikan untuk memastikan konsistensi status antara `analysis_jobs` dan `analysis_results`, serta implementasi cascade delete functionality.

## Masalah yang Diperbaiki

### 1. Status Tidak Konsisten
**Sebelum:**
- Jobs: `queued`, `processing`, `completed`, `failed`, `cancelled`
- Results: `completed`, `processing`, `failed`
- Status tidak selalu sinkron antara jobs dan results

**Sesudah:**
- Results sekarang mendukung semua status: `queued`, `processing`, `completed`, `failed`, `cancelled`
- Status selalu sinkron antara jobs dan results
- Mapping status yang konsisten

### 2. Method `deleteJobByJobId` Tidak Ada
**Sebelum:**
- Method dipanggil di route tapi tidak diimplementasi
- Menyebabkan error saat internal service mencoba delete job

**Sesudah:**
- Implementasi lengkap method `deleteJobByJobId`
- Mendukung cascade delete ke results terkait

### 3. Delete Tidak Cascade
**Sebelum:**
- Delete job tidak menghapus result terkait
- Delete result tidak mengupdate job terkait
- Menyebabkan data orphaned

**Sesudah:**
- Delete job akan menghapus result terkait
- Delete result akan menghapus job terkait (bukan update status ke `cancelled`)
- Konsistensi data terjaga
- Cleanup otomatis untuk orphaned jobs

## Perubahan yang Dibuat

### 1. AnalysisJobsService (`archive-service/src/services/analysisJobsService.js`)

#### Method Baru: `deleteJobByJobId`
```javascript
async deleteJobByJobId(jobId) {
  // Delete job tanpa user check (untuk internal services)
  // Cascade delete ke results terkait
}
```

#### Method Baru: `syncJobResultStatus`
```javascript
async syncJobResultStatus(jobId) {
  // Sinkronisasi status antara job dan result
  // Membersihkan orphaned result_id
  // Mapping status yang konsisten
}
```

#### Method Baru: `cleanupOrphanedJobs`
```javascript
async cleanupOrphanedJobs() {
  // Membersihkan job yang result_id-nya tidak ada
  // Menghapus job orphaned dari database
  // Return statistik cleanup
}
```

#### Perbaikan: `deleteJob`
- Menambahkan cascade delete ke results
- Menggunakan transaction untuk konsistensi
- Logging yang lebih detail

### 2. ResultsService (`archive-service/src/services/resultsService.js`)

#### Perbaikan: `deleteResult`
- Menambahkan cascade delete ke jobs terkait
- Menggunakan transaction untuk konsistensi
- Menghapus job terkait saat result dihapus (bukan update status ke `cancelled`)

### 3. AnalysisResult Model (`archive-service/src/models/AnalysisResult.js`)

#### Status Field Update
```javascript
status: {
  type: DataTypes.STRING(50),
  allowNull: false,
  defaultValue: 'completed',
  validate: {
    isIn: [['completed', 'processing', 'failed', 'queued', 'cancelled']]
  }
}
```

### 4. Routes (`archive-service/src/routes/directJobs.js`)

#### Endpoint Baru: `POST /jobs/:jobId/sync-status`
- Untuk sinkronisasi status (internal service only)
- Mengembalikan detail sync actions yang dilakukan

#### Endpoint Baru: `POST /jobs/cleanup-orphaned`
- Untuk membersihkan orphaned jobs (internal service only)
- Mengembalikan statistik cleanup yang dilakukan

### 5. Analysis Worker (`analysis-worker/src/services/archiveService.js`)

#### Perbaikan: Status Determination
- Status result ditentukan berdasarkan success/failure
- `completed` jika testResult ada, `failed` jika tidak

## Status Mapping Rules

| Job Status | Result Status | Keterangan |
|------------|---------------|------------|
| `queued` | `processing` | Results tidak memiliki status queued |
| `processing` | `processing` | Status sama |
| `completed` | `completed` | Status sama |
| `failed` | `failed` | Status sama |
| `cancelled` | `failed` | Cancelled jobs dianggap failed |

## API Endpoints

### 1. Sync Status
```
POST /archive/jobs/:jobId/sync-status
Authorization: Internal Service Only
```

**Response:**
```json
{
  "success": true,
  "message": "Job-result status synchronized successfully",
  "data": {
    "jobId": "job-123",
    "syncActions": ["synced_result_status_processing_to_completed"],
    "success": true
  }
}
```

### 2. Delete Job (Cascade)
```
DELETE /archive/jobs/:jobId
Authorization: Bearer token atau Internal Service
```

**Behavior:**
- Soft delete job (status = `cancelled`)
- Hard delete result terkait
- Clear result_id dari job

### 3. Delete Result (Cascade)
```
DELETE /archive/results/:resultId
Authorization: Bearer token
```

**Behavior:**
- Hard delete result
- Hard delete job terkait
- Tidak ada update status ke `cancelled`

### 4. Cleanup Orphaned Jobs
```
POST /archive/jobs/cleanup-orphaned
Authorization: Internal Service Only
```

**Response:**
```json
{
  "success": true,
  "message": "Orphaned jobs cleanup completed",
  "data": {
    "success": true,
    "deletedCount": 5,
    "deletedJobIds": ["job-123", "job-456"],
    "message": "Successfully deleted 5 orphaned jobs"
  }
}
```

## Testing

### Script Test
```bash
node test-status-consistency.js
```

**Test Cases:**
1. ✅ Status consistency check
2. ✅ Status synchronization
3. ✅ Cascade delete job → result
4. ✅ Cascade delete result → job delete
5. ✅ Cleanup orphaned jobs

### Manual Testing
1. Submit assessment → job created dengan status `queued`
2. Worker processes → job status `processing`, result status `processing`
3. Worker completes → job status `completed`, result status `completed`
4. Delete job → result juga terhapus
5. Delete result → job juga terhapus
6. Cleanup orphaned jobs → job dengan result_id tidak valid dihapus

## Migration Notes

### Database Changes
- AnalysisResult model sekarang mendukung status tambahan
- Tidak perlu migration script karena menggunakan existing field

### Backward Compatibility
- Semua perubahan backward compatible
- Existing data tetap valid
- API endpoints existing tidak berubah

## Monitoring

### Log Messages
- `Syncing job-result status` - Status sync dimulai
- `Status mismatch detected` - Inconsistency ditemukan
- `Deleting related jobs` - Cascade delete jobs
- `Deleting associated result` - Cascade delete result
- `Starting cleanup of orphaned jobs` - Orphaned jobs cleanup
- `Orphaned jobs cleanup completed successfully` - Cleanup success

### Metrics to Monitor
- Status inconsistency count
- Cascade delete operations
- Orphaned result_id cleanup
- Orphaned jobs cleanup count
- Sync operation success rate

## Best Practices

1. **Selalu gunakan transaction** untuk operasi yang melibatkan multiple tables
2. **Check status consistency** secara berkala menggunakan sync endpoint
3. **Monitor logs** untuk detect inconsistencies
4. **Use internal service auth** untuk sync operations
5. **Test cascade operations** di staging sebelum production

## Troubleshooting

### Common Issues

1. **Status Mismatch**
   - Gunakan sync endpoint untuk fix
   - Check worker logs untuk root cause

2. **Orphaned Data**
   - Sync endpoint akan cleanup orphaned result_id
   - Monitor untuk prevent future occurrences

3. **Delete Failures**
   - Check transaction logs
   - Verify user permissions
   - Ensure job not in processing state
