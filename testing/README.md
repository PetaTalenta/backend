# ATMA Backend Testing Suite

Comprehensive E2E and Load Testing suite untuk ATMA (AI-Driven Talent Mapping Assessment) Backend.

## 📋 Overview

Testing suite ini mencakup:
- **E2E Testing**: Testing end-to-end untuk satu user journey lengkap
- **Load Testing**: Testing dengan 50 user concurrent untuk mengukur performa sistem

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 atau lebih baru)
- ATMA Backend services berjalan:
  - API Gateway (port 3000)
  - Auth Service (port 3001)
  - Archive Service (port 3002)
  - Assessment Service (port 3003)
  - Notification Service (port 3005)

### Installation
```bash
cd testing
npm install
```

### Running Tests

#### E2E Test (Single User Journey)
```bash
npm run test:e2e
```

#### Load Test (50 Users Concurrent)
```bash
npm run test:load
```

#### Run All Tests
```bash
npm run test:all
```

## 📊 Test Scenarios

### E2E Test Flow
1. **User Registration** - Register satu user dengan data random
2. **User Login** - Login dengan credentials yang baru dibuat
3. **Update Profile** - Update profile dengan data lengkap
4. **Submit Assessment** - Submit assessment dengan data RIASEC, OCEAN, dan VIA-IS
5. **Wait for Completion** - Monitor via WebSocket untuk notifikasi completion
6. **Check Assessment** - Retrieve hasil assessment dari archive service
7. **Delete Account** - Cleanup dengan menghapus akun user

### Load Test Flow
Sama seperti E2E test, tetapi dijalankan untuk 50 users secara concurrent:
- 50 user register dengan data random
- 50 login bersama
- 50 update profile mereka
- 50 submit assessment
- 50 menunggu assessment selesai lewat WebSocket
- 50 user cek assessment results
- 50 user hapus akun mereka

## 📈 Metrics & Reporting

### Response Time Metrics
- **Min**: Response time tercepat
- **Max**: Response time terlambat  
- **Avg**: Response time rata-rata
- **P95**: 95th percentile response time
- **P99**: 99th percentile response time

### Performance Metrics
- **Success Rate**: Persentase request yang berhasil
- **Throughput**: Requests per second
- **Concurrent Users**: Jumlah user yang ditest bersamaan
- **Total Duration**: Total waktu testing

### Stage-by-Stage Analysis
Setiap stage akan menampilkan:
- Success rate dan failure count
- Response time statistics
- Throughput rate
- Error details (jika ada)

## ⚙️ Configuration

Edit `config.js` untuk mengubah:

```javascript
{
  test: {
    userCount: 50,           // Jumlah user untuk load test
    concurrency: 10,         // Concurrent operations
    delayBetweenStages: 2000, // Delay antar stage (ms)
    assessmentTimeout: 300000, // Timeout untuk assessment (5 menit)
    cleanupDelay: 1000       // Delay saat cleanup (ms)
  }
}
```

## 🔧 Troubleshooting

### Common Issues

1. **Connection Refused**
   ```
   Error: connect ECONNREFUSED 127.0.0.1:3000
   ```
   - Pastikan semua services ATMA berjalan
   - Check port configuration di config.js

2. **WebSocket Authentication Failed**
   ```
   WebSocket authentication failed: Invalid token
   ```
   - Pastikan JWT token valid dan belum expired
   - Check notification service berjalan di port 3005

3. **Assessment Timeout**
   ```
   Assessment completion timeout
   ```
   - Increase `assessmentTimeout` di config.js
   - Check assessment service performance

4. **Rate Limiting**
   ```
   Rate limit exceeded
   ```
   - Reduce `concurrency` di config.js
   - Increase `delayBetweenStages`

### Debug Mode

Enable debug logging:
```bash
DEBUG=* npm run test:load
```

## 📁 File Structure

```
testing/
├── package.json          # Dependencies dan scripts
├── config.js            # Configuration untuk testing
├── utils.js             # Utility functions
├── e2e-test.js          # E2E testing script
├── load-test.js         # Load testing script
└── README.md            # Documentation ini
```

## 🎯 Expected Results

### Successful E2E Test
```
🧪 ATMA E2E Testing Started
=== Test 1: User Registration ===
✓ User registered successfully in 245ms

=== Test 2: User Login ===
✓ User logged in successfully in 156ms

... (semua stages berhasil)

📊 E2E TEST REPORT
✅ All E2E tests passed successfully!
```

### Successful Load Test
```
🚀 ATMA Load Testing Started
=== Stage 1: User Registration ===
✓ Registered 50/50 users

... (semua stages berhasil)

📊 LOAD TEST REPORT
📈 Registration:
   Success Rate: 100.00% (50/50)
   Throughput: 12.34 requests/second
   Response Times:
     Min: 123ms
     Max: 567ms
     Avg: 234ms
     P95: 456ms
     P99: 523ms
```

## 🔒 Security Notes

- Test users menggunakan email dan password random
- JWT tokens di-handle secara aman
- Cleanup otomatis menghapus test data
- Tidak menggunakan data production

## 📞 Support

Jika mengalami issues:
1. Check semua services ATMA berjalan
2. Verify configuration di config.js
3. Check logs untuk error details
4. Reduce concurrency jika ada performance issues

## 🚧 Limitations

- Delete account endpoint mungkin belum tersedia (akan skip dengan warning)
- WebSocket testing memerlukan notification service aktif
- Assessment processing time tergantung pada AI service performance
- Rate limiting bisa mempengaruhi hasil jika terlalu aggressive

## 📝 Notes

- Testing ini menggunakan data dummy/random
- Semua test data akan di-cleanup setelah testing
- Pastikan database dalam kondisi bersih sebelum testing
- Monitor resource usage selama load testing
