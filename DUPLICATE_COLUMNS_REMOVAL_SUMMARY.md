# Duplicate Columns Removal and Status Standardization

## 📋 Overview

Refactoring untuk menghapus duplikasi kolom antara tabel `analysis_jobs` dan `analysis_results`, serta menstandardisasi status menjadi hanya 4 nilai yang jelas.

## 🎯 Tujuan

1. **Hapus duplikasi kolom** di `analysis_results` yang sudah ada di `analysis_jobs`
2. **Standardisasi status** menjadi 4 nilai: `queued`, `processing`, `completed`, `failed`
3. **Pastikan error message** selalu ada saat status `failed`

## 🔄 Perubahan yang Dilakukan

### 1. Model AnalysisResult (`archive-service/src/models/AnalysisResult.js`)

**Kolom yang dihapus:**
- `status` - sekarang hanya di `analysis_jobs`
- `error_message` - sekarang hanya di `analysis_jobs`
- `assessment_name` - sekarang hanya di `analysis_jobs`

**Index yang dihapus:**
- `idx_analysis_results_status`
- `idx_analysis_results_assessment_name`

### 2. Model AnalysisJob (`archive-service/src/models/AnalysisJob.js`)

**Status constraint diperbarui:**
```javascript
validate: {
  isIn: [['queued', 'processing', 'completed', 'failed']]
}
```

**Validasi baru ditambahkan:**
```javascript
validate: {
  statusErrorMessageRequired() {
    if (this.status === 'failed' && (!this.error_message || this.error_message.trim() === '')) {
      throw new Error('Error message is required when status is failed');
    }
  }
}
```

### 3. Services dan Controllers

**File yang diupdate:**
- `assessment-service/src/services/archiveService.js`
- `analysis-worker/src/services/archiveService.js`
- `archive-service/src/services/resultsService.js`
- `archive-service/src/controllers/resultsController.js`
- `archive-service/src/controllers/adminSystemController.js`
- `archive-service/src/services/analysisJobsService.js`

**Perubahan utama:**
- Hapus penggunaan field duplikat di `analysis_results`
- Ganti status `cancelled` menjadi `failed` dengan error message yang sesuai
- Update validasi dan logging

### 4. Database Migration

**File:** `migrations/remove-duplicate-columns-and-standardize-status.sql`

**Langkah migration:**
1. Update semua job dengan status `cancelled` menjadi `failed`
2. Drop kolom duplikat dari `analysis_results`
3. Update constraint status di `analysis_jobs`
4. Tambah validasi error message untuk status `failed`
5. Fix job yang failed tanpa error message

## 📊 Status Mapping

### Sebelum (5 status):
- `queued` - Job dalam antrian
- `processing` - Job sedang diproses
- `completed` - Job berhasil diselesaikan
- `failed` - Job gagal
- `cancelled` - Job dibatalkan ❌

### Sesudah (4 status):
- `queued` - Job dalam antrian
- `processing` - Job sedang diproses  
- `completed` - Job berhasil diselesaikan
- `failed` - Job gagal atau dibatalkan ✅

## 🔧 Aturan Baru

### 1. Status Management
- Status hanya dikelola di tabel `analysis_jobs`
- Tabel `analysis_results` hanya menyimpan data hasil analisis
- Job yang dibatalkan akan memiliki status `failed` dengan error message yang jelas

### 2. Error Message Requirement
- Setiap job dengan status `failed` **HARUS** memiliki `error_message`
- Error message tidak boleh kosong atau hanya whitespace
- Validasi dilakukan di level model

### 3. Data Consistency
- Tidak ada lagi duplikasi data antara kedua tabel
- Single source of truth untuk status, error message, dan assessment name
- Relasi tetap melalui `result_id` di `analysis_jobs`

## 🚀 Cara Menjalankan Migration

```bash
# Masuk ke container PostgreSQL
docker exec -it <postgres_container> psql -U atma_user -d atma_db

# Jalankan migration script
\i /path/to/migrations/remove-duplicate-columns-and-standardize-status.sql
```

## ✅ Verifikasi

Setelah migration, pastikan:

1. **Tidak ada status `cancelled`** di `analysis_jobs`
2. **Semua job `failed` memiliki error message**
3. **Kolom duplikat terhapus** dari `analysis_results`
4. **Aplikasi berjalan normal** tanpa error

## 🔍 Testing

Untuk memastikan perubahan bekerja dengan baik:

1. **Test job creation** - pastikan job baru dibuat dengan benar
2. **Test job failure** - pastikan error message wajib ada
3. **Test job cancellation** - pastikan job dibatalkan menjadi status `failed`
4. **Test API responses** - pastikan tidak ada field duplikat yang dikembalikan

## 📝 Notes

- Perubahan ini **breaking change** untuk API yang mengandalkan field duplikat
- Frontend perlu diupdate untuk mengambil status dari job, bukan result
- Monitoring dan logging sudah diupdate untuk menggunakan struktur baru
- Migration script aman untuk dijalankan berulang kali (idempotent)
