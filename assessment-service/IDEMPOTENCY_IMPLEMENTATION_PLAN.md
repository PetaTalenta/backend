# Rencana Implementasi Fitur Idempotency untuk API POST /assessments/submit

## 1. Tujuan Implementasi

### Tujuan Utama
- **Mencegah duplikasi submission**: Memastikan bahwa request yang sama tidak diproses berulang kali
- **Konsistensi data**: Menjaga integritas data assessment dan mencegah inkonsistensi
- **Optimasi resource**: Menghindari pemborosan token dan resource komputasi
- **User experience**: Memberikan response yang konsisten untuk request yang sama

### Manfaat Bisnis
- Mengurangi biaya operasional dari duplikasi proses AI analysis
- Meningkatkan reliability sistem
- Mencegah user kehilangan token karena network issues atau double-click
- Meningkatkan performa sistem secara keseluruhan

## 2. Analisis Kondisi Saat Ini

### Mekanisme yang Sudah Ada
1. **Job Deduplication di Analysis Worker** (`analysis-worker/src/services/jobDeduplicationService.js`)
   - Sudah ada mekanisme untuk mencegah duplikasi di level worker
   - Menggunakan hash dari userId + assessmentData
   - Cache retention 5 menit untuk recently processed jobs

2. **Token Management**
   - Token deduction di awal proses (`authService.deductTokens`)
   - Token refund mechanism untuk failed jobs (`authService.refundTokens`)

3. **Job Tracking**
   - Local job tracker di assessment service
   - Database job tracking di archive service

### Gap yang Perlu Diatasi
1. **Tidak ada idempotency key di API level**
2. **Tidak ada mekanisme untuk mendeteksi duplicate request sebelum token deduction**
3. **Tidak ada caching untuk response duplicate requests**
4. **Tidak ada standardized idempotency headers**

## 3. Strategi Implementasi

### Pendekatan Idempotency
Menggunakan **Idempotency Key** dengan kombinasi:
- Client-provided idempotency key (header `Idempotency-Key`)
- Server-generated fallback key berdasarkan content hash
- Time-based expiration untuk idempotency cache

### Arsitektur Solusi
```
Client Request → API Gateway → Assessment Service
                                    ↓
                            Idempotency Check
                                    ↓
                         [Cache Hit] → Return Cached Response
                                    ↓
                         [Cache Miss] → Process Request
                                    ↓
                            Cache Response → Return Response
```

## 4. Komponen yang Terpengaruh

### 4.1 Assessment Service
**File yang perlu dimodifikasi:**
- `src/routes/assessments.js` - Endpoint utama
- `src/middleware/idempotency.js` - **[BARU]** Middleware idempotency
- `src/services/idempotencyService.js` - **[BARU]** Service untuk idempotency logic
- `src/utils/hashGenerator.js` - **[BARU]** Utility untuk generate content hash

**Perubahan pada endpoint `/submit`:**
- Tambah idempotency middleware sebelum token deduction
- Modifikasi flow untuk check idempotency cache
- Implementasi response caching

### 4.2 Database Schema
**Tabel baru yang diperlukan:**
```sql
-- Tabel untuk menyimpan idempotency cache
CREATE TABLE IF NOT EXISTS assessment.idempotency_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    response_data JSONB NOT NULL,
    status_code INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_idempotency_cache_key ON assessment.idempotency_cache(idempotency_key);
CREATE INDEX idx_idempotency_cache_user_id ON assessment.idempotency_cache(user_id);
CREATE INDEX idx_idempotency_cache_expires_at ON assessment.idempotency_cache(expires_at);
```



### 4.3 API Gateway
**Modifikasi yang diperlukan:**
- Forward `Idempotency-Key` header ke assessment service
- Dokumentasi API untuk idempotency headers

## 5. Detail Implementasi

### 5.1 Idempotency Key Generation
```javascript
// Priority order untuk idempotency key:
1. Client-provided header: `Idempotency-Key`
2. Auto-generated dari: SHA256(userId + JSON.stringify(assessmentData) + timestamp_hour)
```

### 5.2 Request Flow dengan Idempotency
```
1. Extract idempotency key dari header atau generate
2. Check idempotency cache
3. If cache hit:
   - Return cached response
   - Log cache hit
4. If cache miss:
   - Proceed dengan normal flow
   - Cache response sebelum return
   - Set expiration time
```

### 5.3 Cache Expiration Strategy
- **Default TTL**: 24 jam
- **Cleanup job**: Hapus expired entries setiap 1 jam menggunakan database scheduled job
- **Max cache size**: 10,000 entries per user (configurable)
- **Database-only approach**: Menggunakan PostgreSQL sebagai cache storage dengan optimized indexes

## 6. Konfigurasi Environment

### Environment Variables Baru
```env
# Idempotency Configuration
IDEMPOTENCY_ENABLED=true
IDEMPOTENCY_TTL_HOURS=24
IDEMPOTENCY_MAX_CACHE_SIZE=10000
IDEMPOTENCY_CLEANUP_INTERVAL_MINUTES=60
```

## 7. Testing Strategy

### 7.1 Unit Tests
- Test idempotency middleware
- Test hash generation
- Test cache operations
- Test expiration logic

### 7.2 Integration Tests
- Test complete flow dengan idempotency
- Test concurrent requests dengan same key
- Test cache hit/miss scenarios
- Test token deduction prevention

### 7.3 Load Tests
- Test performa dengan idempotency enabled
- Test database cache performance under load
- Test cleanup job performance
- Test database connection pooling dengan increased load

## 8. Monitoring dan Observability

### 8.1 Metrics yang Perlu Ditambahkan
- `idempotency_cache_hits_total`
- `idempotency_cache_misses_total`
- `idempotency_key_generation_duration`
- `idempotency_cache_size`
- `idempotency_cleanup_duration`

### 8.2 Logging
- Log setiap cache hit dengan original request timestamp
- Log cache cleanup operations
- Log idempotency key generation failures

## 9. Security Considerations

### 9.1 Idempotency Key Validation
- Maximum length: 255 characters
- Allowed characters: alphanumeric, hyphens, underscores
- Rate limiting untuk key generation

### 9.2 Data Privacy
- Tidak menyimpan sensitive data dalam cache
- Hash assessment data untuk privacy
- Automatic cleanup expired entries

## 10. Rollout Plan

### Phase 1: Infrastructure Setup
- [ ] Buat database schema untuk idempotency cache
- [ ] Setup database indexes untuk optimal performance
- [ ] Implement basic idempotency service

### Phase 2: Core Implementation
- [ ] Implement idempotency middleware
- [ ] Modify assessment submission endpoint
- [ ] Add comprehensive testing

### Phase 3: Monitoring & Optimization
- [ ] Add metrics dan monitoring
- [ ] Performance tuning
- [ ] Documentation update

### Phase 4: Production Deployment
- [ ] Feature flag untuk gradual rollout
- [ ] Monitor production metrics
- [ ] Full deployment

## 11. Backward Compatibility

- API tetap backward compatible
- Idempotency key bersifat optional
- Existing clients akan tetap berfungsi normal
- Response format tidak berubah

## 12. Performance Impact

### Expected Impact
- **Positive**: Reduced duplicate processing, faster response untuk duplicate requests
- **Negative**: Additional database operations, slight latency increase untuk first request

### Mitigation
- Optimize database queries dengan proper indexing
- Implement efficient cleanup mechanisms menggunakan database scheduled jobs
- Monitor dan tune cache size limits
- Use database connection pooling untuk better performance

## 13. Success Metrics

- Reduction dalam duplicate job processing: Target 95%
- Cache hit rate: Target >80% untuk duplicate requests
- Response time improvement untuk duplicate requests: Target <100ms
- Zero token loss dari network-related duplicates
