# ATMA Backend Vanilla Testing Suite

Program testing sederhana menggunakan JavaScript vanilla untuk melakukan end-to-end testing pada ATMA Backend API sesuai dengan Comprehensive Testing Plan.

## 📋 Deskripsi

Program ini melakukan testing lengkap untuk semua 14 fase dalam test plan:

1. ✅ User Registration
2. ✅ First Logout
3. ✅ Re-login
4. ✅ WebSocket Connection
5. ✅ Get User Profile
6. ✅ Get Archive Data
7. ✅ Submit Assessment
8. ✅ Wait for WebSocket Notification
9. ✅ Poll Job Status
10. ✅ Get Result Details
11. ✅ Create Chatbot Conversation
12. ✅ Send Chatbot Messages
13. ✅ Get Conversation Messages
14. ✅ Final Logout

## 🚀 Instalasi

```bash
cd testing/vanilla-test
npm install
```

## 📦 Dependencies

- **axios**: HTTP client untuk REST API calls
- **socket.io-client**: WebSocket client untuk real-time notifications
- **colors**: Terminal output dengan warna untuk readability

## 🎯 Cara Menggunakan

### Menjalankan Test

```bash
npm test
```

atau

```bash
node index.js
```

### Menjalankan dengan Verbose Mode

```bash
npm run test:verbose
```

## 📊 Output

Program akan menampilkan:

- ✅ **Progress real-time** untuk setiap fase dengan warna:
  - 🟢 Hijau: Sukses
  - 🔴 Merah: Error
  - 🟡 Kuning: Warning
  - 🔵 Biru: Info

- 📈 **Metrics** untuk setiap fase:
  - Response time
  - Status codes
  - Data yang diterima

- 📋 **Summary Report** di akhir test:
  - Total phases
  - Passed/Failed count
  - Success rate
  - Total duration
  - Detail per fase

- 💾 **JSON Report** disimpan ke file:
  - Format: `test-report-{timestamp}.json`
  - Berisi semua hasil test dan state

## 🔧 Konfigurasi

Edit `config.js` untuk mengubah:

- Base URL dan WebSocket URL
- Timeout settings
- Test messages untuk chatbot
- Polling configuration

```javascript
export const config = {
  baseURL: 'https://api.futureguide.id',
  wsURL: 'wss://api.futureguide.id',
  timeout: {
    http: 30000,
    wsConnect: 10000,
    wsAuth: 10000,
    wsNotification: 600000,
    polling: 60000,
    pollingInterval: 3000
  }
};
```

## 📝 Test Data

Edit `test-data.js` untuk mengubah:

- Assessment data (RIASEC, OCEAN, VIA-IS scores)
- Test variations
- User credentials

## 🎨 Struktur File

```
vanilla-test/
├── index.js          # Main test runner
├── config.js         # Configuration
├── logger.js         # Logging utility
├── test-data.js      # Test data
├── package.json      # Dependencies
└── README.md         # Documentation
```

## ✨ Features

- ✅ **Sequential Testing**: Menjalankan semua fase secara berurutan
- ✅ **Error Handling**: Robust error handling di setiap fase
- ✅ **WebSocket Support**: Real-time notification monitoring
- ✅ **Polling Fallback**: Automatic fallback ke polling jika WebSocket timeout
- ✅ **Colored Output**: Terminal output yang mudah dibaca
- ✅ **Detailed Logging**: Log lengkap untuk debugging
- ✅ **JSON Reports**: Hasil test disimpan dalam format JSON
- ✅ **Timing Metrics**: Tracking response time untuk setiap fase
- ✅ **State Management**: Menyimpan state antar fase (tokens, IDs, dll)

## 🔍 Troubleshooting

### Test gagal di fase Registration
- Pastikan API server berjalan
- Cek koneksi internet
- Verifikasi base URL di config.js

### WebSocket connection timeout
- Cek firewall settings
- Verifikasi WebSocket URL
- Test akan continue dengan polling fallback

### Assessment processing timeout
- Normal jika AI processing memakan waktu lama
- Increase timeout di config.js jika perlu
- Cek RabbitMQ dan analysis worker status

### Chatbot tests gagal
- Pastikan result ID tersedia dari fase sebelumnya
- Cek token balance mencukupi
- Verifikasi chatbot service running

## 📈 Success Criteria

Test dianggap sukses jika:

- ✅ Semua fase critical (1, 3, 7, 9) berhasil
- ✅ Success rate ≥ 95%
- ✅ Response time dalam batas yang wajar
- ✅ Data consistency terjaga
- ✅ No data loss atau corruption

## 🎯 Next Steps

Setelah test berhasil:

1. Review test report JSON
2. Analyze timing metrics
3. Identify bottlenecks
4. Optimize slow endpoints
5. Run load testing dengan multiple instances

## 📞 Support

Untuk pertanyaan atau issues, hubungi ATMA Testing Team.

---

**Version**: 1.0.0  
**Last Updated**: 2025-10-08  
**Author**: ATMA Testing Team

