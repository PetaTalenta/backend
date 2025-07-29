# Production Logging Configuration Changes

## Overview
Perubahan konfigurasi logging untuk memastikan semua service menampilkan log di console bahkan di production environment.

## Changes Made

### 1. Analysis Worker (`analysis-worker/src/utils/logger.js`)
**Before:**
```javascript
// Add console transport for development with enhanced format
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}
```

**After:**
```javascript
// Add console transport for all environments
// Development: colored format, Production: JSON format for better parsing
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }));
} else {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}
```

### 2. Archive Service (`archive-service/src/utils/logger.js`)
**Before:**
```javascript
// Console transport
new winston.transports.Console({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: consoleFormat
}),
```

**After:**
```javascript
// Console transport - show all logs in both environments
new winston.transports.Console({
  level: process.env.LOG_LEVEL || 'info',
  format: consoleFormat
}),
```

## Services Already Configured Correctly

### 1. Auth Service
- ✅ Sudah memiliki console transport untuk production dengan JSON format
- ✅ Development menggunakan colored format

### 2. Chatbot Service  
- ✅ Sudah memiliki console transport untuk production dengan JSON format
- ✅ Development menggunakan colored format

### 3. Assessment Service
- ✅ Menggunakan custom logger yang sudah menampilkan console output di production
- ✅ Production tanpa warna, development dengan warna

### 4. Notification Service
- ✅ Selalu menampilkan console output tanpa kondisi NODE_ENV
- ✅ Menggunakan colored simple format

### 5. API Gateway
- ✅ Memiliki console transport untuk production dengan level 'info'
- ✅ Development menggunakan level 'debug'

## Production Logging Behavior

### Development Environment
- **Format**: Colored output dengan timestamp
- **Level**: debug/info (tergantung service)
- **Output**: Console + File

### Production Environment  
- **Format**: JSON format untuk parsing yang lebih baik
- **Level**: info (dapat dikonfigurasi via LOG_LEVEL)
- **Output**: Console + File

## Environment Variables

Semua service mendukung environment variables berikut:

```bash
# Log level (error, warn, info, debug)
LOG_LEVEL=info

# Log file path
LOG_FILE=logs/service-name.log

# Environment mode
NODE_ENV=production
```

## Docker Configuration

Di `docker-compose.yml`, semua service sudah dikonfigurasi dengan:
```yaml
environment:
  NODE_ENV: production
  LOG_LEVEL: info
  LOG_FILE: logs/service-name.log
```

## Benefits

1. **Debugging**: Logs terlihat di Docker logs dan kubectl logs
2. **Monitoring**: Dapat menggunakan log aggregation tools
3. **Troubleshooting**: Tidak perlu akses ke file system untuk melihat logs
4. **Consistency**: Semua service memiliki behavior logging yang konsisten

## Monitoring Commands

```bash
# Melihat logs semua service
docker-compose logs -f

# Melihat logs service tertentu
docker-compose logs -f analysis-worker-1

# Melihat logs dengan filter
docker-compose logs -f | grep ERROR

# Melihat logs dalam format JSON (production)
docker-compose logs -f analysis-worker-1 | jq '.'
```

## Notes

- File logging tetap aktif untuk semua environment
- Log rotation tetap berfungsi (5MB per file, maksimal 5 backup)
- Error logs tetap disimpan terpisah untuk analisis
- Structured logs (JSON) tetap tersedia untuk monitoring tools
