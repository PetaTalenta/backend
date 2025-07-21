# WebSocket Migration Guide - API Gateway Integration

## Overview

WebSocket connections untuk ATMA Notification Service sekarang dapat melewati API Gateway sebagai single entry point. Ini memberikan konsistensi dengan arsitektur microservices dan memudahkan management routing.

## Perubahan yang Dilakukan

### 1. API Gateway Configuration
- ✅ Menambahkan `NOTIFICATION_SERVICE_URL` ke konfigurasi
- ✅ Membuat `notificationServiceProxy` dengan WebSocket support (`ws: true`)
- ✅ Membuat `socketIOProxy` untuk Socket.IO paths
- ✅ Menambahkan routes untuk `/api/notifications/*` dan `/socket.io/*`

### 2. Routing Changes
- **Sebelum**: Client → `http://localhost:3005` (direct ke notification service)
- **Sesudah**: Client → `http://localhost:3000` (melalui API Gateway) → `http://localhost:3005`

### 3. Path Mapping
| Client Request | API Gateway | Notification Service |
|----------------|-------------|---------------------|
| `/socket.io/*` | Proxy langsung | `/socket.io/*` |
| `/api/notifications/health` | Path rewrite | `/health` |
| `/api/notifications/debug/*` | Path rewrite | `/debug/*` |
| `/api/notifications/*` | Path rewrite | `/notifications/*` |

## Migration Steps untuk Frontend

### 1. Update Connection URL
```javascript
// SEBELUM
const socket = io('http://localhost:3005');

// SESUDAH (Recommended)
const socket = io('http://localhost:3000');
```

### 2. Update Environment Variables
```bash
# .env file
# SEBELUM
VUE_APP_NOTIFICATION_SERVICE_URL=http://localhost:3005

# SESUDAH
VUE_APP_API_GATEWAY_URL=http://localhost:3000
```

### 3. Update Health Check Endpoints
```javascript
// SEBELUM
fetch('http://localhost:3005/health')

// SESUDAH
fetch('http://localhost:3000/api/notifications/health')
```

## Backward Compatibility

✅ **Koneksi langsung ke notification service masih didukung** untuk backward compatibility:
- `http://localhost:3005` masih berfungsi
- Tidak ada breaking changes untuk existing implementations
- Migration bersifat optional tetapi direkomendasikan

## Benefits

### 1. Single Entry Point
- Semua komunikasi melalui API Gateway (port 3000)
- Konsisten dengan HTTP API endpoints
- Simplified client configuration

### 2. Centralized Management
- Rate limiting bisa diterapkan di gateway level
- Logging dan monitoring terpusat
- Security policies terpusat

### 3. Load Balancing Ready
- Mudah untuk menambahkan multiple notification service instances
- Gateway bisa handle load balancing untuk WebSocket connections

## Testing

### 1. Test WebSocket Connection via Gateway
```javascript
const socket = io('http://localhost:3000', {
  autoConnect: false,
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('Connected via API Gateway');
  socket.emit('authenticate', { token: 'your-jwt-token' });
});

socket.connect();
```

### 2. Test Health Endpoint
```bash
# Via API Gateway
curl http://localhost:3000/api/notifications/health

# Direct (still works)
curl http://localhost:3005/health
```

## Troubleshooting

### 1. Connection Issues
- Pastikan API Gateway berjalan di port 3000
- Pastikan notification service berjalan di port 3005
- Check CORS configuration

### 2. WebSocket Upgrade Issues
- Verify `ws: true` option di proxy configuration
- Check browser network tab untuk WebSocket upgrade requests
- Ensure no middleware blocking WebSocket upgrade

### 3. Authentication Issues
- Authentication tetap dilakukan di notification service level
- JWT token validation tidak berubah
- Check token format dan expiry

## Production Considerations

### 1. Environment Variables
```bash
# Production API Gateway
API_GATEWAY_URL=https://api.yourdomain.com

# Production Notification Service (internal)
NOTIFICATION_SERVICE_URL=http://notification-service:3005
```

### 2. SSL/TLS
- Gunakan `wss://` untuk production WebSocket connections
- Ensure proper SSL termination di API Gateway

### 3. Monitoring
- Monitor WebSocket connection counts di both gateway dan notification service
- Track proxy performance metrics
- Set up alerts untuk connection failures

## Next Steps

1. **Update frontend applications** untuk menggunakan API Gateway URL
2. **Test thoroughly** di development environment
3. **Update documentation** dan deployment guides
4. **Plan production migration** dengan zero downtime
5. **Monitor performance** setelah migration

---

**Last Updated**: 2025-01-21  
**Version**: 1.0.0
