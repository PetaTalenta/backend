# Logging Guide - ATMA Backend

## Overview

Sistem logging di ATMA Backend telah diperbaiki untuk memberikan output yang lebih mudah dibaca dan lebih informatif. Panduan ini menjelaskan cara menggunakan logging yang telah diperbaiki.

## Format Log Baru

### Format Umum
```
MM-dd HH:mm:ss [LEVEL] [TrackingID] Message (user@email.com) | key=value key2=value2
```

### Contoh Output
```
07-20 08:22:32 [INFO ] [38d9812e] Processing assessment job (testuser@example.com) | retry=0 processor=optimized
07-20 08:22:33 [INFO ] [38d9812e] Generating persona profile (testuser@example.com) | useMockModel=true
07-20 08:22:34 [ERROR] [38d9812e] AI service error (testuser@example.com) | error=Rate limit exceeded
```

## Fitur Baru

### 1. Tracking ID
- Setiap job/request memiliki tracking ID (8 karakter pertama dari jobId/correlationId)
- Memudahkan tracking flow dari satu request

### 2. User Context
- Menampilkan email user atau user ID yang terpotong
- Memudahkan debugging masalah spesifik user

### 3. Metadata yang Bersih
- Hanya menampilkan metadata yang penting
- Nilai panjang dipotong dengan "..."
- Metadata kosong/null tidak ditampilkan

### 4. Color Coding (Development)
- ERROR: Merah
- WARN: Kuning  
- INFO: Cyan
- DEBUG: Abu-abu

## Cara Penggunaan

### Basic Logging
```javascript
const logger = require('./utils/logger');

logger.info('User logged in', { userId: '123', ip: '192.168.1.1' });
logger.error('Database connection failed', { error: error.message });
```

### Logging dengan Context

#### Job Context
```javascript
// Untuk tracking job processing
const jobLogger = logger.withJob(jobId, userId, userEmail);
jobLogger.info('Job started');
jobLogger.error('Job failed', { reason: 'timeout' });
```

#### User Context
```javascript
// Untuk tracking user actions
const userLogger = logger.withUser(userId, userEmail);
userLogger.info('Profile updated');
userLogger.warn('Invalid input detected');
```

#### Correlation Context
```javascript
// Untuk tracking request flow
const correlationLogger = logger.withCorrelation(correlationId);
correlationLogger.info('Request received');
correlationLogger.debug('Processing step 1');
```

## File Output

### Analysis Worker
- `logs/analysis-worker.log` - Human-readable format untuk semua log
- `logs/error.log` - JSON format untuk error (debugging detail)
- `logs/structured.log` - JSON format untuk monitoring/parsing

### Assessment Service
- `logs/assessment-service.log` - Human-readable format untuk semua log

## Best Practices

### 1. Gunakan Context Logger
```javascript
// ❌ Tidak optimal
logger.info('Processing job', { jobId, userId, userEmail, status });

// ✅ Optimal
const jobLogger = logger.withJob(jobId, userId, userEmail);
jobLogger.info('Processing job', { status });
```

### 2. Log Level yang Tepat
- **ERROR**: Kesalahan yang memerlukan perhatian
- **WARN**: Situasi tidak normal tapi tidak fatal
- **INFO**: Informasi penting untuk monitoring
- **DEBUG**: Detail untuk debugging (hanya development)

### 3. Metadata yang Berguna
```javascript
// ❌ Terlalu verbose
logger.info('User action', { 
  timestamp: new Date(),
  service: 'assessment-service',
  version: '1.0.0',
  action: 'submit'
});

// ✅ Fokus pada informasi penting
logger.info('User action', { action: 'submit', duration: '2.3s' });
```

### 4. Error Logging
```javascript
try {
  // some operation
} catch (error) {
  logger.error('Operation failed', {
    operation: 'processAssessment',
    error: error.message,
    // Jangan log stack trace di info level
  });
}
```

## Konfigurasi

### Environment Variables
```bash
# Log level (error, warn, info, debug)
LOG_LEVEL=info

# Log file path
LOG_FILE=logs/service-name.log

# Development mode (enables console colors)
NODE_ENV=development
```

### Log Rotation
- File log otomatis di-rotate ketika mencapai 5MB
- Menyimpan maksimal 5 file backup
- Error logs disimpan terpisah untuk analisis

## Monitoring dan Alerting

### Structured Logs
File `logs/structured.log` berisi format JSON untuk:
- Log aggregation tools (ELK Stack, Splunk)
- Monitoring dashboards
- Automated alerting

### Key Metrics untuk Monitor
- Error rate per service
- Response time trends
- User activity patterns
- Job processing success rate

## Troubleshooting

### Log Tidak Muncul
1. Periksa LOG_LEVEL environment variable
2. Pastikan direktori logs/ ada dan writable
3. Periksa disk space

### Format Tidak Sesuai
1. Pastikan menggunakan logger yang benar
2. Periksa NODE_ENV setting
3. Restart service setelah perubahan konfigurasi

### Performance Impact
- Logging level DEBUG dapat mempengaruhi performance
- Gunakan INFO atau WARN di production
- Monitor disk usage untuk log files
