# Laporan Eksekusi K6 Testing

**Tanggal**: 8 Oktober 2025  
**Executor**: K6 v1.3.0  
**Environment**: Docker (localhost)  
**Dokumentasi Referensi**: [K6_TESTING_IMPLEMENTATION_REPORT.md](./K6_TESTING_IMPLEMENTATION_REPORT.md)

---

## 📋 Executive Summary

Testing suite K6 telah dijalankan untuk memvalidasi performa dan fungsionalitas sistem ATMA Backend. Testing dilakukan dalam 2 tahap:

1. **Smoke Test** (30 detik) - ✅ **PASSED**
2. **E2E Full Flow Test** (2m 22s) - ⚠️ **PARTIAL FAILURE**

### Key Findings

- ✅ **Semua service health checks berfungsi dengan baik**
- ✅ **Response time memenuhi threshold (P95 < 5s)**
- ⚠️ **User registration endpoint memiliki issue**
- ⚠️ **Authentication flow memerlukan perbaikan**

---

## 🧪 Test 1: Smoke Test

### Konfigurasi
- **Duration**: 30 detik
- **Virtual Users**: 1 VU
- **Iterations**: 9 complete iterations
- **Script**: `scripts/smoke-test.js`

### Hasil

#### ✅ Overall Status: **PASSED**

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Checks Passed | 90/90 (100%) | - | ✅ |
| HTTP Request Duration (P95) | 835.53ms | < 5000ms | ✅ |
| HTTP Request Failed Rate | 0.00% | < 1% | ✅ |
| Total HTTP Requests | 54 | - | ✅ |

#### Detailed Metrics

**HTTP Performance:**
```
http_req_duration:
  avg:  284.87ms
  min:  51.1ms
  med:  104.87ms
  max:  1.02s
  p(90): 777.61ms
  p(95): 835.53ms ✓
```

**Checks Breakdown:**
- ✅ API Gateway Health: status is 200 (9/9)
- ✅ API Gateway Health: response time < 2s (9/9)
- ✅ Auth V2 Health: status is 200 (9/9)
- ✅ Auth V2 Health: response time < 2s (9/9)
- ✅ Assessment Health: status is 200 (9/9)
- ✅ Assessment Health: response time < 2s (9/9)
- ✅ Login: status is 200 (9/9)
- ✅ Login: has token (9/9)
- ✅ Profile: status is 200 (9/9)
- ✅ Archive Results: status is 200 (9/9)

**Network:**
- Data Received: 385 kB (12 kB/s)
- Data Sent: 13 kB (375 B/s)

**Execution:**
- Iteration Duration: avg=3.72s, min=3.5s, max=4.1s
- Iterations per Second: 0.268373/s

### ✅ Kesimpulan Smoke Test

Semua service berjalan dengan baik dan memenuhi threshold yang ditetapkan. Response time sangat baik dengan P95 di bawah 1 detik.

---

## 🔄 Test 2: E2E Full Flow Test

### Konfigurasi
- **Duration**: 2 menit 22 detik (142 detik)
- **Virtual Users**: 1 VU
- **Iterations**: 1 complete iteration
- **Script**: `scripts/e2e-full-flow.js`
- **Test User**: `k6test_1759934496474_2612@example.com`

### Hasil

#### ⚠️ Overall Status: **PARTIAL FAILURE**

| Metric | Value | Status |
|--------|-------|--------|
| Total Duration | 142.2 seconds | ⚠️ |
| HTTP Requests | 48 | ⚠️ |
| HTTP Failed Rate | 95.83% | ❌ |
| Phases Completed | 9/14 | ⚠️ |
| Errors | 1 | ❌ |
| Success | 1 | ⚠️ |

#### Phase Execution Details

| # | Phase | Duration | Status | Notes |
|---|-------|----------|--------|-------|
| 1 | Registration | 2.723s | ❌ | Registration failed |
| 2 | First Logout | 0.191s | ❌ | Logout failed (no valid token) |
| 3 | Re-login | 0.936s | ❌ | Re-login failed (user not found) |
| 4 | WebSocket Connection | 0.001s | ⚠️ | Skipped (K6 limitation) |
| 5 | Get Profile | 0.076s | ❌ | Failed (401 Unauthorized) |
| 6 | Get Archive Results | 0.072s | ❌ | Failed (401 Unauthorized) |
| 7 | Get Archive Jobs | 0.121s | ❌ | Failed (401 Unauthorized) |
| 8 | Submit Assessment | 0.095s | ❌ | Failed (401 Unauthorized) |
| 9 | Poll Job Status | 123.816s | ❌ | Timeout after 40 attempts (401 errors) |
| 10 | Get Result | - | ⏭️ | Skipped (no result ID) |
| 11 | Create Chatbot Conversation | - | ⏭️ | Skipped (no result data) |
| 12 | Send Chatbot Message | - | ⏭️ | Skipped (no conversation) |
| 13 | Get Chatbot Messages | - | ⏭️ | Skipped (no conversation) |
| 14 | Final Logout | 0.131s | ❌ | Failed (no valid token) |

#### HTTP Performance

```
HTTP Requests:
  Total: 48
  Failed Rate: 95.83%
  Duration (avg): 166.67ms
  Duration (p95): 277.00ms
```

#### Error Analysis

**Primary Error**: Registration endpoint failure
- Registration request returned non-200 status
- This caused cascade failure for all subsequent operations

**Secondary Errors**: Authentication failures (401 Unauthorized)
- All authenticated endpoints returned 401
- Token was not properly generated/stored due to registration failure
- Job polling attempted 40 times, all failed with 401

**Skipped Operations**:
- WebSocket connection (K6 limitation - Socket.IO not fully supported)
- Result retrieval (no job completed)
- Chatbot operations (no result data available)

---

## 🔍 Root Cause Analysis

### Issue 1: Registration Endpoint Failure ❌

**Symptom**: Registration phase failed with non-200 status

**Impact**: 
- User tidak terdaftar di sistem
- Token tidak di-generate
- Semua operasi berikutnya gagal

**Possible Causes**:
1. Endpoint `/api/auth/register` tidak tersedia atau error
2. Validation error pada request body
3. Database connection issue
4. Email sudah terdaftar (jika ada data lama)

**Recommendation**:
- Cek logs auth-service untuk detail error
- Validasi endpoint registration manual
- Pastikan database schema sudah benar
- Implementasi cleanup data test sebelum E2E test

### Issue 2: Authentication Token Management ❌

**Symptom**: Semua authenticated requests mendapat 401 Unauthorized

**Impact**:
- User tidak bisa akses protected endpoints
- Job polling gagal
- Chatbot operations tidak bisa dijalankan

**Possible Causes**:
1. Token tidak di-generate karena registration gagal
2. Token format tidak sesuai
3. Token expiry terlalu cepat
4. Middleware authentication error

**Recommendation**:
- Implementasi proper token generation di registration
- Validasi token format dan expiry
- Cek middleware authentication di API Gateway

### Issue 3: WebSocket/Socket.IO Limitation ⚠️

**Symptom**: WebSocket connection skipped

**Impact**:
- Real-time notifications tidak di-test
- Job status updates via WebSocket tidak di-test

**Note**: Ini adalah limitasi K6, bukan bug sistem

**Recommendation**:
- Gunakan polling fallback (sudah diimplementasi)
- Pertimbangkan testing WebSocket dengan tool lain (Postman, Artillery)

---

## 📊 Performance Metrics Summary

### Smoke Test Performance ✅

| Metric | Value | Assessment |
|--------|-------|------------|
| Average Response Time | 284.87ms | ✅ Excellent |
| P95 Response Time | 835.53ms | ✅ Good |
| P90 Response Time | 777.61ms | ✅ Good |
| Max Response Time | 1.02s | ✅ Acceptable |
| Error Rate | 0% | ✅ Perfect |

### E2E Test Performance ⚠️

| Metric | Value | Assessment |
|--------|-------|------------|
| Average Response Time | 166.67ms | ✅ Excellent |
| P95 Response Time | 277.00ms | ✅ Excellent |
| Error Rate | 95.83% | ❌ Critical |
| Total Duration | 142s | ⚠️ Long (due to polling timeout) |

---

## ✅ What Works Well

1. **Service Health Checks** ✅
   - Semua service (API Gateway, Auth, Assessment) merespons dengan baik
   - Response time sangat cepat (< 100ms)

2. **Response Time Performance** ✅
   - Average response time di bawah 300ms
   - P95 response time memenuhi threshold
   - Tidak ada timeout pada request yang berhasil

3. **Network Performance** ✅
   - Data transfer stabil
   - Tidak ada network error

4. **Test Infrastructure** ✅
   - K6 terinstall dan berjalan dengan baik
   - Test scripts ter-struktur dengan baik
   - Logging informatif

---

## ❌ Issues Found

1. **Registration Endpoint** ❌ **CRITICAL**
   - Status: Broken
   - Priority: P0 (Blocker)
   - Impact: Blocks entire E2E flow

2. **Authentication Flow** ❌ **CRITICAL**
   - Status: Broken
   - Priority: P0 (Blocker)
   - Impact: All authenticated operations fail

3. **Job Polling Timeout** ⚠️ **MEDIUM**
   - Status: Timeout after 2 minutes
   - Priority: P2
   - Impact: Long wait time, but has fallback

---

## 🎯 Recommendations

### Immediate Actions (P0)

1. **Fix Registration Endpoint**
   ```bash
   # Debug registration
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "Test123!",
       "name": "Test User"
     }'
   ```

2. **Validate Authentication Flow**
   - Cek auth-service logs
   - Validasi JWT token generation
   - Test manual login/logout flow

3. **Database Cleanup**
   ```sql
   -- Cleanup test users before E2E test
   DELETE FROM auth.users WHERE email LIKE 'k6test_%@example.com';
   ```

### Short-term Improvements (P1)

1. **Add Pre-test Validation**
   - Health check semua services sebelum E2E test
   - Validate database connectivity
   - Clear test data

2. **Improve Error Handling**
   - Better error messages di test scripts
   - Capture response body on failures
   - Add retry logic untuk transient errors

3. **Optimize Polling**
   - Reduce polling interval dari 3s ke 2s
   - Add exponential backoff
   - Reduce max attempts dari 40 ke 30

### Long-term Enhancements (P2)

1. **Add More Test Scenarios**
   - Load test dengan multiple VUs
   - Stress test untuk find breaking point
   - Soak test untuk stability

2. **Implement CI/CD Integration**
   - Run smoke test pada setiap commit
   - Run E2E test pada setiap PR
   - Block merge jika test gagal

3. **Add Monitoring Integration**
   - Export metrics ke Grafana
   - Set up alerts untuk failures
   - Track performance trends

---

## 📝 Next Steps

### For Developers

1. ✅ **Investigate registration endpoint failure**
   - Check auth-service logs
   - Validate database schema
   - Test endpoint manually

2. ✅ **Fix authentication token flow**
   - Ensure token is generated on registration
   - Validate token format
   - Test token expiry

3. ✅ **Re-run E2E test after fixes**
   ```bash
   cd testing/k6
   k6 run scripts/e2e-full-flow.js
   ```

### For QA Team

1. **Manual Testing**
   - Validate registration flow manually
   - Test complete user journey
   - Document any additional issues

2. **Test Data Management**
   - Create test data cleanup script
   - Document test user credentials
   - Set up test environment

### For DevOps

1. **Monitoring Setup**
   - Add K6 to CI/CD pipeline
   - Set up test result reporting
   - Configure alerts

2. **Environment Management**
   - Ensure test environment stability
   - Document environment setup
   - Create environment reset script

---

## 📚 References

- [K6 Documentation](https://k6.io/docs/)
- [K6 Testing Implementation Report](./K6_TESTING_IMPLEMENTATION_REPORT.md)
- [API Documentation](../README.md)

---

## 📞 Contact

Untuk pertanyaan atau issue terkait testing:
- **Repository**: https://github.com/PetaTalenta/backend
- **Documentation**: `/docs` folder

---

**Report Generated**: 2025-10-08  
**K6 Version**: v1.3.0  
**Test Environment**: Docker (localhost)

