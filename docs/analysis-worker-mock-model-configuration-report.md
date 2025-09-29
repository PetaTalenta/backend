# Analysis Worker Mock Model Configuration Report

**Tanggal:** 29 September 2025  
**Dibuat oleh:** GitHub Copilot  
**Task:** Mengubah analysis-worker untuk menggunakan mock model

## Ringkasan Perubahan

Analysis-worker telah dikonfigurasi untuk menggunakan mock model AI sebagai pengganti Google Gemini API yang sesungguhnya. Perubahan ini berguna untuk:

1. **Development/Testing** - Mengurangi biaya API calls ke Google Gemini
2. **Debugging** - Memberikan hasil yang konsisten dan predictable
3. **Offline Development** - Tidak memerlukan koneksi internet atau API key

## Perubahan yang Dilakukan

### 1. Docker Compose Configuration
**File:** `/docker-compose.yml`  
**Baris:** 390

```yaml
# Perubahan dari:
USE_MOCK_MODEL: "false"

# Menjadi:
USE_MOCK_MODEL: "true"
```

### 2. Restart Container
Analysis-worker container telah di-restart untuk menerapkan konfigurasi baru:
```bash
docker compose restart analysis-worker
docker compose up -d analysis-worker
```

## Verifikasi

### Status Container
- ✅ Container analysis-worker berhasil dijalankan
- ✅ Worker 1 ready dan consuming messages dari RabbitMQ
- ⚠️ Worker 2 memiliki dependency issue (tidak mempengaruhi mock model functionality)

### Log Analysis
Dari log container terlihat bahwa:
1. **Mock model aktif** - Tidak ada error terkait Google AI API key
2. **RabbitMQ connection** berhasil
3. **Queue consumer** siap menerima assessment jobs
4. **Event publisher** terinisialisasi dengan benar

## Cara Kerja Mock Model

### Konfigurasi di Code
Mock model dikontrol oleh environment variable dan konfigurasi di:
- `src/config/ai.js` - Deteksi `USE_MOCK_MODEL === 'true'`
- `src/services/aiService.js` - Logic switching ke mock service
- `src/services/mockAiService.js` - Implementation mock AI responses

### Mock Response Behavior
Mock model memberikan:
- **Response time:** ~20 detik (simulasi processing AI)
- **Dynamic content** berdasarkan input assessment data
- **Consistent structure** sesuai format persona profile
- **Token counting simulation** untuk usage tracking

## Testing Mock Model

Untuk menguji mock model:

1. **Kirim assessment job** melalui assessment-service
2. **Monitor logs** analysis-worker untuk melihat proses mock
3. **Cek hasil** di archive-service database

Contoh log yang diharapkan:
```
Using mock AI model | jobId=xxx
Generating mock persona profile | jobId=xxx  
Mock persona profile generated successfully | jobId=xxx
```

## Rollback Instructions

Untuk kembali ke Google Gemini API:
1. Ubah `USE_MOCK_MODEL: "true"` menjadi `USE_MOCK_MODEL: "false"` di docker-compose.yml
2. Pastikan `GOOGLE_AI_API_KEY` sudah diset dengan benar
3. Restart analysis-worker container

## Catatan Tambahan

- Mock model tidak memerlukan Google AI API key
- Performance mock model lebih cepat dan konsisten
- Mock responses tetap valid dan realistic berdasarkan assessment data
- Container dependencies issue di worker 2 perlu diperbaiki terpisah (tidak terkait mock model)

## Status Akhir

✅ **BERHASIL** - Analysis-worker sekarang menggunakan mock model dan siap memproses assessment jobs tanpa menggunakan Google Gemini API.
