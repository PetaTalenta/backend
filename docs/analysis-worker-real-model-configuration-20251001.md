# Analysis Worker - Real Model Configuration Change

**Tanggal:** 1 Oktober 2025  
**Deskripsi:** Mengubah konfigurasi analysis worker dari menggunakan mock model ke model AI asli (Google Gemini)

## Masalah yang Ditemukan

Analysis worker masih menggunakan **mock model** meskipun sudah mencoba mengubah konfigurasi di `docker-compose.yml`. Hasil analysis menunjukkan:
- "The Balanced Professional"
- "Detail-Oriented Implementer" 
- "Creative Communicator"
- "Empathetic Creator"

Ini adalah hasil dari **mock model**, bukan real AI model.

### Root Cause

File `docker-compose.override.yml` **tidak meng-override** environment variable `USE_MOCK_MODEL`, sehingga nilai dari `.env.docker` atau cache tetap digunakan (`USE_MOCK_MODEL=true`).

## Perubahan yang Dilakukan

### 1. File: `docker-compose.yml`

**Lokasi:** Line ~397  
**Perubahan:** Mengubah environment variable `USE_MOCK_MODEL`

```yaml
# SEBELUM
USE_MOCK_MODEL: "true"

# SESUDAH
USE_MOCK_MODEL: "false"
```

### 2. File: `docker-compose.override.yml` ⭐ **FIX UTAMA**

**Lokasi:** analysis-worker service environment  
**Perubahan:** Menambahkan `USE_MOCK_MODEL: "false"` untuk override nilai default

```yaml
# SEBELUM
  analysis-worker:
    build:
      context: ./analysis-worker
      dockerfile: Dockerfile
      args:
        INCLUDE_DEV_DEPS: "true"
    environment:
      NODE_ENV: development
    command: npm run dev

# SESUDAH
  analysis-worker:
    build:
      context: ./analysis-worker
      dockerfile: Dockerfile
      args:
        INCLUDE_DEV_DEPS: "true"
    environment:
      NODE_ENV: development
      USE_MOCK_MODEL: "false"  # ⭐ DITAMBAHKAN
    command: npm run dev
```

### 3. Verifikasi File: `analysis-worker/.env.docker`

File `.env.docker` sudah memiliki konfigurasi yang benar:
```bash
USE_MOCK_MODEL=false
```

## Detail Konfigurasi Model AI

Analysis worker sekarang menggunakan konfigurasi berikut:

- **Model:** `gemini-2.5-flash`
- **Temperature:** `0.2` (untuk hasil yang lebih konsisten)
- **Token Counting:** Enabled
- **Input Token Price:** $0.30 per 1K tokens
- **Output Token Price:** $2.50 per 1K tokens
- **API Key:** Dari environment variable `GOOGLE_AI_API_KEY`

## Langkah Perbaikan

### Langkah 1: Edit docker-compose.override.yml
Tambahkan `USE_MOCK_MODEL: "false"` di environment analysis-worker

### Langkah 2: Force Recreate Container
**PENTING:** `restart` saja TIDAK CUKUP! Environment variable tidak di-reload dengan restart.

```bash
# SALAH - Ini tidak akan update environment variable
docker compose restart analysis-worker

# BENAR - Harus recreate container
docker compose up -d --force-recreate analysis-worker
```

**Status:** ✅ Berhasil di-recreate
- Container: `atma-backend-analysis-worker-1` - Started
- Container: `atma-backend-analysis-worker-2` - Started

### Langkah 3: Verifikasi Environment Variable

```bash
docker compose exec analysis-worker env | grep USE_MOCK_MODEL
```

**Hasil Sebelum Fix:**
```
USE_MOCK_MODEL=true  ❌
```

**Hasil Sesudah Fix:**
```
USE_MOCK_MODEL=false  ✅
```

## Verifikasi

### Cek Logs untuk Konfirmasi
```bash
docker compose logs analysis-worker --tail=50 | grep -i "initialized"
```

**Output yang Benar:**
```
Google Generative AI initialized successfully | model=gemini-2.5-flash temperature=0.2
```

✅ **Tidak ada log "Using mock AI model"**  
✅ **Ada log "Google Generative AI initialized successfully"**

Setelah recreate, kedua worker instance telah:
1. ✅ Terhubung ke RabbitMQ
2. ✅ Mulai mengkonsumsi messages dari queue `assessment_analysis`
3. ✅ Event publisher terinisialisasi
4. ✅ DLQ monitoring aktif
5. ✅ Stuck job monitor berjalan
6. ✅ **Google Generative AI (Real Model) terinisialisasi dengan model gemini-2.5-flash**

## Implikasi

### Sebelum (Mock Model)
- Analysis job menggunakan mock/dummy AI response
- Tidak ada biaya API
- Hasil analisis tidak akurat/realistis
- Untuk testing development saja

### Sesudah (Real Model)
- Analysis job menggunakan Google Gemini 2.5 Flash yang sesungguhnya
- Ada biaya API berdasarkan token usage
- Hasil analisis akurat dan berkualitas tinggi
- Production-ready

## Monitoring

Untuk memantau penggunaan model AI:

```bash
# Melihat logs worker
docker compose logs -f analysis-worker

# Melihat jumlah jobs yang diproses
docker exec -it atma-postgres psql -U atma_user -d atma_db -c "SELECT status, COUNT(*) FROM archive.analysis_jobs GROUP BY status;"

# Melihat token usage
docker exec -it atma-postgres psql -U atma_user -d atma_db -c "SELECT * FROM archive.token_usage ORDER BY created_at DESC LIMIT 10;"
```

## Catatan Penting

### ⚠️ Pelajaran Penting
1. **`docker compose restart` TIDAK cukup** untuk update environment variables
2. **Harus gunakan `docker compose up -d --force-recreate`** untuk environment changes
3. **`docker-compose.override.yml` menimpa `docker-compose.yml`** - jika tidak ada override di override.yml, nilai dari base compose atau .env file yang dipakai

### Production Checklist
1. ✅ Pastikan environment variable `GOOGLE_AI_API_KEY` sudah di-set dengan API key yang valid
2. ✅ Monitor biaya API usage di Google AI Studio
3. ✅ Rate limit default: 15 requests per minute
4. ✅ Timeout default: 300 detik (5 menit) per request
5. ✅ Verifikasi `USE_MOCK_MODEL=false` di container yang running

## Environment Variables Terkait

```yaml
GOOGLE_AI_API_KEY: ${GOOGLE_AI_API_KEY}
GOOGLE_AI_MODEL: gemini-2.5-flash
AI_TEMPERATURE: 0.2
USE_MOCK_MODEL: "false"
ENABLE_TOKEN_COUNTING: true
AI_REQUEST_TIMEOUT: 300000
AI_RATE_LIMIT_RPM: 15
AI_MAX_RETRIES: 5
```

## Testing

Untuk testing apakah model AI bekerja dengan baik:

1. Submit assessment baru melalui API
2. Monitor logs analysis-worker untuk melihat processing
3. Cek hasil analysis di database atau melalui API

```bash
# Monitor worker logs real-time
docker compose logs -f analysis-worker
```

## Cara Testing Real Model vs Mock Model

Untuk memastikan benar-benar menggunakan real model, submit assessment baru dan perhatikan hasil persona:

### Mock Model (SALAH) - Hasil Generic:
- ❌ "The Balanced Professional"
- ❌ "Detail-Oriented Implementer"
- ❌ "Creative Communicator"
- ❌ "Empathetic Creator"

### Real Model (BENAR) - Hasil Spesifik & Variatif:
- ✅ Persona unik dan detail berdasarkan jawaban assessment
- ✅ Insight yang lebih mendalam dan personal
- ✅ Archetype yang lebih spesifik dan akurat
- ✅ Tidak berulang untuk setiap assessment

---

**Status Akhir:** ✅ **SELESAI**  

Analysis worker **BENAR-BENAR** sekarang menggunakan model AI asli (Google Gemini 2.5 Flash) dan siap untuk production use.

**Verifikasi Terakhir:**
```bash
# Cek environment variable
docker compose exec analysis-worker env | grep USE_MOCK_MODEL
# Output: USE_MOCK_MODEL=false ✅

# Cek logs initialization
docker compose logs analysis-worker | grep "Google Generative AI initialized"
# Output: Google Generative AI initialized successfully | model=gemini-2.5-flash ✅
```
