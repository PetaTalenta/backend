# Idempotency Feature Usage Guide

## Overview

The Assessment Service now supports idempotency to prevent duplicate assessment submissions. This feature ensures that identical requests are processed only once, preventing token loss and resource waste.

## How It Works

### 1. Idempotency Key Generation

The system uses two methods to generate idempotency keys:

**Priority 1: Client-Provided Key**
```http
POST /assessments/submit
Authorization: Bearer <token>
Idempotency-Key: my-unique-key-12345
Content-Type: application/json

{
  "riasec": { ... },
  "ocean": { ... },
  "viaIs": { ... }
}
```

**Priority 2: Auto-Generated Key**
If no client key is provided, the system generates one based on:
- User ID
- Assessment data content
- Current day (for daily uniqueness)

### 2. Request Flow

1. **First Request**: Processed normally, response cached
2. **Duplicate Request**: Returns cached response immediately
3. **Token Protection**: No tokens deducted for duplicate requests

### 3. Response Headers

All responses include idempotency headers:

```http
X-Idempotency-Key: abc123...
X-Idempotency-Cache: HIT|MISS
X-Idempotency-Supported: true
X-Idempotency-TTL-Hours: 24
X-Idempotency-Original-Timestamp: 2024-01-01T00:00:00.000Z (for cache hits)
```

## Configuration

### Environment Variables

```env
# Enable/disable idempotency
IDEMPOTENCY_ENABLED=true

# Cache TTL in hours (default: 24)
IDEMPOTENCY_TTL_HOURS=24

# Maximum cache entries per user (default: 10000)
IDEMPOTENCY_MAX_CACHE_SIZE=10000

# Cleanup interval in minutes (default: 60)
IDEMPOTENCY_CLEANUP_INTERVAL_MINUTES=60
```

### Database Configuration

```env
# Database connection for idempotency cache
DB_HOST=localhost
DB_PORT=5432
DB_NAME=atma_db
DB_USER=postgres
DB_PASSWORD=password
DB_SCHEMA=assessment
```

## API Endpoints

### Submit Assessment (with Idempotency)

```http
POST /assessments/submit
Authorization: Bearer <token>
Idempotency-Key: optional-client-key (max 255 chars, alphanumeric + hyphens + underscores)
```

### Health Check

```http
GET /assessments/idempotency/health
```

Response:
```json
{
  "success": true,
  "message": "Idempotency service is healthy",
  "data": {
    "enabled": true,
    "status": "healthy",
    "cacheStats": {
      "totalEntries": 150,
      "activeEntries": 120,
      "expiredEntries": 30
    },
    "config": {
      "ttlHours": "24",
      "maxCacheSize": "10000"
    }
  }
}
```

### Manual Cleanup

```http
POST /assessments/idempotency/cleanup
```

Response:
```json
{
  "success": true,
  "message": "Cache cleanup completed",
  "data": {
    "deletedEntries": 25
  }
}
```

## Client Implementation Examples

### JavaScript/Fetch

```javascript
// With client-provided idempotency key
const response = await fetch('/assessments/submit', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
    'Idempotency-Key': 'user-123-assessment-2024-01-01'
  },
  body: JSON.stringify(assessmentData)
});

// Check if response was from cache
const cacheStatus = response.headers.get('X-Idempotency-Cache');
if (cacheStatus === 'HIT') {
  console.log('This was a duplicate request');
}
```

### cURL

```bash
# With idempotency key
curl -X POST "http://localhost:3003/assessments/submit" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: my-unique-key-123" \
  -d @assessment-data.json

# Without idempotency key (auto-generated)
curl -X POST "http://localhost:3003/assessments/submit" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @assessment-data.json
```

## Best Practices

### 1. Client-Provided Keys

- Use meaningful, unique identifiers
- Include user context: `user-{userId}-assessment-{timestamp}`
- Keep keys under 255 characters
- Use only alphanumeric characters, hyphens, and underscores

### 2. Error Handling

```javascript
try {
  const response = await submitAssessment(data, idempotencyKey);
  
  // Check if this was a duplicate
  if (response.headers['x-idempotency-cache'] === 'HIT') {
    showMessage('Assessment already submitted');
  } else {
    showMessage('Assessment submitted successfully');
  }
} catch (error) {
  // Handle errors normally
  showError(error.message);
}
```

### 3. Retry Logic

```javascript
async function submitWithRetry(data, maxRetries = 3) {
  const idempotencyKey = generateUniqueKey();
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await submitAssessment(data, idempotencyKey);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await delay(1000 * attempt); // Exponential backoff
    }
  }
}
```

## Monitoring

### Metrics to Monitor

- Cache hit rate (target: >80% for duplicate requests)
- Cache size per user
- Cleanup job performance
- Database connection health

### Logs to Watch

```
INFO: Idempotency cache hit - duplicate request detected
INFO: Response stored in idempotency cache
INFO: Cleaned up expired idempotency cache entries
ERROR: Failed to store response in idempotency cache
```

## Troubleshooting

### Common Issues

1. **Idempotency Disabled**
   - Check `IDEMPOTENCY_ENABLED=true` in environment
   - Verify database connection

2. **Cache Misses for Duplicates**
   - Check idempotency key consistency
   - Verify TTL configuration
   - Check for expired entries

3. **Database Connection Issues**
   - Service continues without idempotency
   - Check database credentials and connectivity
   - Monitor logs for connection errors

### Manual Database Cleanup

```sql
-- Check cache statistics
SELECT 
  COUNT(*) as total_entries,
  COUNT(*) FILTER (WHERE expires_at > NOW()) as active_entries,
  COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_entries
FROM assessment.idempotency_cache;

-- Manual cleanup
SELECT assessment.cleanup_expired_idempotency_cache();

-- Check specific user's cache
SELECT COUNT(*) FROM assessment.idempotency_cache WHERE user_id = 'user-uuid';
```

## Security Considerations

- Idempotency keys are logged partially (first 8 characters only)
- Response data is stored in encrypted JSONB format
- Automatic cleanup prevents data accumulation
- User isolation prevents cross-user cache access
