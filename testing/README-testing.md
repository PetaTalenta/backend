# ATMA Testing Suite - Modular Structure

File `test-user-flow.js` yang besar telah dipecah menjadi beberapa file berdasarkan fungsi dengan konteks yang utuh. Setiap file memiliki tanggung jawab yang jelas dan dapat digunakan secara independen.

## Struktur File

### 1. `test-config.js` - Konfigurasi dan Setup
**Konteks**: Konfigurasi dasar dan data testing
- URL konfigurasi untuk semua services
- Fungsi generate random email dan user data
- Data assessment untuk testing
- Helper untuk membuat test user

### 2. `test-helpers.js` - Helper Functions
**Konteks**: Utility functions yang digunakan di semua file
- `makeRequest()` - Wrapper untuk API calls dengan error handling
- `displayResponse()` - Format output sesuai EX_API_DOCS.md
- `cleanup()` - Cleanup WebSocket connections dan variables

### 3. `test-auth-flow.js` - Authentication Flow
**Konteks**: Complete authentication testing flow
- Health check untuk semua services
- User registration dan login
- Profile management (get, update, delete)
- Complete auth flow test runner

### 4. `test-websocket-flow.js` - WebSocket Flow
**Konteks**: Real-time WebSocket testing dan notifications
- WebSocket connection dan authentication
- Setup notification listeners untuk analysis complete/failed
- Job monitoring via WebSocket notifications
- WebSocket cleanup dan management

### 5. `test-assessment-flow.js` - Assessment Flow
**Konteks**: Assessment submission dan job monitoring
- Assessment submission
- Job status polling
- Archive job retrieval
- Assessment flow untuk mass testing
- Job completion waiting dengan timeout

### 6. `test-mass-testing.js` - Mass Testing
**Konteks**: Load testing dan performance testing
- Mass login testing untuk multiple users
- Mass end-to-end testing (login + assessment + completion)
- Batch processing dengan configurable delays
- WebSocket connections untuk mass users
- Performance metrics dan statistics

### 7. `test-runner.js` - Main Runner
**Konteks**: Command line interface dan test orchestration
- Command line argument parsing
- Test selection dan configuration
- Help documentation
- Main entry point untuk semua testing scenarios

## Cara Penggunaan

### Basic Testing
```bash
# Basic authentication flow
node test-runner.js

# WebSocket flow testing
node test-runner.js --websocket
node test-runner.js -w

# Keep user profile after test
node test-runner.js --websocket --keep-user
```

### Mass Testing
```bash
# Mass login test (250 users default)
node test-runner.js --mass-login
node test-runner.js -m

# End-to-end test (50 users default)
node test-runner.js --end-to-end
node test-runner.js -e

# Custom configurations
node test-runner.js -e --users=100 --batch-size=10
node test-runner.js -m --users=500 --high-performance
```

### Advanced Options
```bash
# High-performance mode
node test-runner.js -e --users=100 --hp

# Skip WebSocket testing
node test-runner.js -m --no-websocket

# Custom timeouts and delays
node test-runner.js -e --job-timeout=600000 --batch-delay=5000

# Debug mode
DEBUG_RESPONSE=true node test-runner.js --websocket
```

## Keuntungan Struktur Baru

### 1. **Modular dan Maintainable**
- Setiap file memiliki tanggung jawab yang jelas
- Mudah untuk modify atau extend functionality
- Code reuse yang lebih baik

### 2. **Konteks yang Utuh**
- Setiap file memiliki konteks lengkap untuk fungsinya
- Tidak ada dependency yang tersebar
- Self-contained functionality

### 3. **Scalable Testing**
- Mudah menambah test scenarios baru
- Flexible configuration options
- Support untuk different testing scales

### 4. **Better Error Handling**
- Isolated error handling per module
- Better debugging capabilities
- Cleaner error reporting

### 5. **Performance Optimized**
- High-performance mode untuk load testing
- Configurable delays dan timeouts
- Batch processing untuk efficiency

## File Dependencies

```
test-runner.js (main entry)
├── test-config.js (configuration)
├── test-helpers.js (utilities)
├── test-auth-flow.js
│   ├── test-helpers.js
│   └── test-config.js
├── test-websocket-flow.js
│   └── test-config.js
├── test-assessment-flow.js
│   ├── test-helpers.js
│   ├── test-config.js
│   └── test-websocket-flow.js
└── test-mass-testing.js
    ├── test-helpers.js
    ├── test-config.js
    ├── test-auth-flow.js
    ├── test-assessment-flow.js
    └── test-websocket-flow.js
```

## Migration dari File Lama

File `test-user-flow.js` yang lama masih bisa digunakan, tetapi untuk development baru disarankan menggunakan struktur modular ini. Semua functionality yang ada di file lama sudah tersedia di struktur baru dengan improvements.

### Equivalence
- `node test-user-flow.js` → `node test-runner.js`
- `node test-user-flow.js --websocket` → `node test-runner.js --websocket`
- `node test-user-flow.js --mass-login` → `node test-runner.js --mass-login`
- `node test-user-flow.js --end-to-end` → `node test-runner.js --end-to-end`

## Testing Individual Modules

Setiap module juga bisa di-test secara individual:

```javascript
// Test auth flow only
const { runAuthFlow } = require('./test-auth-flow');
const { regenerateTestUser } = require('./test-config');

const { testUser, profileData } = regenerateTestUser();
runAuthFlow(testUser, profileData);

// Test WebSocket only
const { testConnectWebSocket } = require('./test-websocket-flow');
testConnectWebSocket(authToken);

// Test assessment only
const { runAssessmentFlow } = require('./test-assessment-flow');
runAssessmentFlow(authToken);
```

Struktur ini memberikan flexibility maksimal untuk testing ATMA backend dengan maintainability yang lebih baik.
