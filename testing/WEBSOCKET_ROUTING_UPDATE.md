# WebSocket Routing Update - Testing Configuration

## Overview

Testing configuration telah diupdate untuk menggunakan API Gateway sebagai single entry point untuk semua koneksi WebSocket, sesuai dengan arsitektur microservices ATMA.

## Changes Made

### 1. Configuration Update (`config.js`)

**Before:**
```javascript
websocket: {
  url: 'http://localhost:3005', // Direct ke notification service
  timeout: 10000,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
}
```

**After:**
```javascript
websocket: {
  url: 'http://localhost:3000', // Melalui API Gateway
  timeout: 10000,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
}
```

### 2. Health Check Updates

**Files Updated:**
- `testing/demo.js`
- `testing/run-tests.js`

**Before:**
```javascript
{ name: 'Notification Service', url: 'http://localhost:3005/health' }
```

**After:**
```javascript
{ name: 'Notification Service', url: 'http://localhost:3000/api/notifications/health' }
```

### 3. Documentation Updates

**Files Updated:**
- `testing/README.md` - Added WebSocket configuration section
- `testing/QUICK_START.md` - Added routing update notice and troubleshooting

## Architecture Flow

### Previous Architecture
```
Testing Client → http://localhost:3005 → Notification Service
```

### New Architecture
```
Testing Client → http://localhost:3000 → API Gateway → http://localhost:3005 → Notification Service
```

## Benefits

1. **Consistency**: Semua komunikasi melalui API Gateway
2. **Centralized Routing**: Single entry point untuk monitoring dan logging
3. **Security**: Rate limiting dan authentication di gateway level
4. **Scalability**: Easier load balancing dan service discovery

## Testing Impact

### No Breaking Changes
- Existing test logic tetap sama
- Socket.IO client configuration tidak berubah
- Authentication flow tetap sama
- Event handling tetap sama

### What Changed
- Connection URL dari port 3005 ke port 3000
- Health check endpoints menggunakan API Gateway routes
- Documentation updated untuk reflect new routing

## Verification

### 1. Test WebSocket Connection
```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:3000', {
  autoConnect: false,
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('Connected via API Gateway');
  socket.emit('authenticate', { token: yourJWTToken });
});
```

### 2. Test Health Endpoint
```bash
# Via API Gateway (new)
curl http://localhost:3000/api/notifications/health

# Direct (still works for backward compatibility)
curl http://localhost:3005/health
```

## Backward Compatibility

- Direct connections ke notification service masih didukung
- Existing implementations tidak akan break
- Migration bersifat optional tetapi direkomendasikan

## Next Steps

1. Run testing suite untuk verify changes
2. Monitor WebSocket connections melalui API Gateway
3. Update any external documentation yang reference direct notification service URLs
4. Consider updating production configurations

## Files Modified

1. `testing/config.js` - WebSocket URL configuration
2. `testing/demo.js` - Health check URL
3. `testing/run-tests.js` - Health check URL
4. `testing/README.md` - Documentation update
5. `testing/QUICK_START.md` - Documentation update
6. `testing/package.json` - Added test:websocket script
7. `testing/test-websocket-routing.js` - New WebSocket routing test script
8. `testing/WEBSOCKET_ROUTING_UPDATE.md` - This summary document

## Testing Commands

```bash
# Test WebSocket routing specifically
npm run test:websocket

# Test E2E with new routing
npm run test:e2e

# Test Load with new routing
npm run test:load

# Run health checks
node demo.js

# Direct test script
node test-websocket-routing.js
```

## New Test Script

Added `test-websocket-routing.js` untuk specifically test WebSocket routing:
- Tests health endpoints (gateway, notification via gateway, direct)
- Tests WebSocket connection via API Gateway
- Verifies routing is working correctly
- Provides detailed connection information

All tests should work seamlessly dengan new WebSocket routing melalui API Gateway.
