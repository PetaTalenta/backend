# Archive Service - Logging Improvements

## Masalah yang Diperbaiki

Sebelumnya, logging untuk "route not found" di archive-service tidak memberikan informasi yang cukup detail untuk debugging. Log hanya menampilkan:

```json
{
  "level": "warn",
  "message": "Route not found",
  "path": "/some-path",
  "method": "GET",
  "ip": "127.0.0.1"
}
```

## Perbaikan yang Dilakukan

### 1. Enhanced Not Found Handler (`src/middleware/errorHandler.js`)

Diperbaiki `notFoundHandler` untuk memberikan informasi yang lebih komprehensif:

**Informasi yang sekarang dicatat:**
- **Basic request info**: method, path, originalUrl, baseUrl, url
- **Network info**: ip, protocol, hostname
- **Query and params**: query parameters, route parameters
- **Headers (selective)**: user-agent, referer, accept, content-type, authorization status, x-forwarded-for, x-real-ip
- **Request context**: requestId, timestamp
- **Body info**: hasBody, bodyKeys, contentLength (untuk non-GET requests)

**Format logging baru:**
```json
{
  "level": "warn",
  "message": "Route not found - Detailed request information",
  "method": "GET",
  "path": "/api/v1/nonexistent",
  "originalUrl": "/api/v1/nonexistent?debug=true&test=value",
  "baseUrl": "",
  "url": "/api/v1/nonexistent?debug=true&test=value",
  "ip": "::ffff:172.18.0.1",
  "protocol": "http",
  "hostname": "localhost",
  "query": {
    "debug": "true",
    "test": "value"
  },
  "params": {},
  "headers": {
    "user-agent": "TestBot/1.0",
    "referer": "http://example.com/test",
    "accept": "*/*",
    "content-type": null,
    "authorization": "[NOT_PRESENT]",
    "x-forwarded-for": null,
    "x-real-ip": null
  },
  "requestId": "pskqg8mblac",
  "timestamp": "2025-07-29T01:44:49.722Z",
  "hasBody": false,
  "bodyKeys": [],
  "contentLength": null
}
```

**Plus logging ringkas untuk quick scanning:**
```
2025-07-29 01:44:49:4449 warn: 404 - GET /api/v1/nonexistent?debug=true&test=value from ::ffff:172.18.0.1
```

### 2. Enhanced Error Handler

Diperbaiki `errorHandler` untuk memberikan context yang lebih lengkap:

**Informasi tambahan yang dicatat:**
- Error name dan stack trace
- Request context lengkap (originalUrl, userAgent, referer, requestId)
- Query parameters dan route parameters
- Body information
- Timestamp detail

### 3. Enhanced Request Logging (`src/app.js`)

Ditambahkan middleware logging untuk semua incoming requests:

**Informasi yang dicatat untuk setiap request:**
- Method dan URL lengkap
- IP address dan user agent
- Referer dan request ID
- Query parameters (jika ada)
- Body presence dan content type
- Timestamp

## Manfaat Perbaikan

### 1. **Debugging yang Lebih Efektif**
- Dapat melihat URL lengkap dengan query parameters
- Mengetahui dari mana request datang (referer, user-agent)
- Memahami context request secara lengkap

### 2. **Security Monitoring**
- Tracking IP addresses dan user agents
- Monitoring authorization attempts
- Detecting suspicious patterns

### 3. **Performance Analysis**
- Request ID untuk tracking end-to-end
- Timestamp untuk performance monitoring
- Request patterns analysis

### 4. **User Experience Improvement**
- Memahami user journey dari referer
- Identifying broken links atau typos
- Better error response dengan request ID

## Contoh Output Logging Baru

### Route Not Found
```bash
# Console output (quick scan)
2025-07-29 01:44:49:4449 warn: Route not found - Detailed request information
2025-07-29 01:44:49:4449 warn: 404 - GET /api/v1/nonexistent?debug=true&test=value from ::ffff:172.18.0.1

# JSON log file (detailed analysis)
{
  "level": "warn",
  "message": "Route not found - Detailed request information",
  "method": "GET",
  "originalUrl": "/api/v1/nonexistent?debug=true&test=value",
  "ip": "::ffff:172.18.0.1",
  "headers": {
    "user-agent": "TestBot/1.0",
    "referer": "http://example.com/test"
  },
  "query": {
    "debug": "true",
    "test": "value"
  },
  "requestId": "pskqg8mblac",
  "timestamp": "2025-07-29T01:44:49.722Z"
}
```

### Incoming Request
```bash
2025-07-29 01:44:49:4449 info: Incoming request
{
  "method": "GET",
  "originalUrl": "/api/v1/nonexistent?debug=true&test=value",
  "path": "/api/v1/nonexistent",
  "ip": "::ffff:172.18.0.1",
  "userAgent": "TestBot/1.0",
  "referer": "http://example.com/test",
  "requestId": "pskqg8mblac",
  "query": {
    "debug": "true",
    "test": "value"
  },
  "hasBody": false,
  "contentType": null,
  "timestamp": "2025-07-29T01:44:49.722Z"
}
```

## Deployment

Perbaikan telah di-deploy dengan:

1. **Rebuild service**: `./archive-service/rebuild-service.sh`
2. **Restart container**: Service otomatis restart dengan konfigurasi baru
3. **Verification**: Test dengan route yang tidak ada untuk memverifikasi logging baru

## Tools untuk Monitoring

### 1. Real-time Monitoring
```bash
# Monitor logs secara real-time
docker logs atma-archive-service -f

# Filter hanya 404 errors
docker logs atma-archive-service -f | grep "404"
```

### 2. Log Analysis
```bash
# Cek 404 errors terakhir
docker logs atma-archive-service --tail 50 | grep "Route not found"

# Monitor specific patterns
docker logs atma-archive-service | grep "nonexistent"
```

### 3. Health Check
```bash
# Test service health
curl http://localhost:3002/health

# Test 404 logging
curl http://localhost:3002/test-route
```

## Security Considerations

1. **Sensitive Data Protection**: Authorization headers hanya dicatat sebagai `[PRESENT]` atau `[NOT_PRESENT]`
2. **Body Logging**: Hanya mencatat presence dan keys, bukan content untuk keamanan
3. **IP Tracking**: Mencatat real IP dan forwarded IP untuk security monitoring
4. **Request ID**: Untuk tracking tanpa expose sensitive information

## Future Improvements

1. **Log Aggregation**: Integrasi dengan ELK stack atau similar
2. **Alerting**: Setup alerts untuk patterns tertentu (high 404 rate, suspicious IPs)
3. **Analytics**: Dashboard untuk monitoring trends dan patterns
4. **Rate Limiting**: Implementasi rate limiting berdasarkan IP dan patterns
