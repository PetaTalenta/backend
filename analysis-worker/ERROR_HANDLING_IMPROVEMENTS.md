# Analysis Worker - Error Handling & Timeout Configuration

## New Environment Variables for Enhanced Error Handling

### AI Service Timeout
```env
# AI request timeout (default: 5 minutes)
AI_REQUEST_TIMEOUT=300000

# AI rate limiting (default: 15 requests per minute)
AI_RATE_LIMIT_RPM=15
AI_MAX_RETRIES=5
AI_RETRY_BASE_DELAY=2000
```

### RabbitMQ Message TTL & Timeouts
```env
# Message TTL - how long messages stay in queue (default: 1 hour)
MESSAGE_TTL=3600000

# Queue TTL - how long unused queues persist (default: 24 hours)
QUEUE_TTL=86400000

# Message processing timeout (default: 30 minutes)
MESSAGE_TIMEOUT=1800000

# Queue limits
QUEUE_MAX_LENGTH=10000
DLQ_MAX_LENGTH=1000
```

### Job Heartbeat Configuration
```env
# Heartbeat interval for long-running jobs (default: 30 seconds)
HEARTBEAT_INTERVAL=30000

# Maximum age for heartbeats before cleanup (default: 1 hour)
MAX_HEARTBEAT_AGE=3600000

# Heartbeat cleanup interval (default: 10 minutes)
HEARTBEAT_CLEANUP_INTERVAL=600000
```

### DLQ Monitoring
```env
# DLQ monitoring interval (default: 5 minutes)
DLQ_MONITOR_INTERVAL=300000

# Alert threshold for DLQ message count (default: 10)
DLQ_ALERT_THRESHOLD=10
```

### Job Cleanup Configuration
```env
# How long jobs can be stuck in processing before cleanup (default: 1 hour)
JOB_CLEANUP_PROCESSING_HOURS=1

# How long jobs can be queued before cleanup (default: 24 hours)  
JOB_CLEANUP_QUEUED_HOURS=24

# Job cleanup scheduler interval (default: 1 hour)
JOB_CLEANUP_INTERVAL=3600000
```

## Error Handling Improvements Summary

### 1. ✅ AI Model Timeout Protection
- Added timeout mechanism for AI requests (5 minutes default)
- Uses Promise.race for reliable timeout handling
- Proper error handling with AI_TIMEOUT error type
- **CRITICAL FIX**: AI timeout errors are NOT retried
- **CRITICAL FIX**: Job status properly set to 'failed' instead of stuck in 'processing'
- Token refund for timeout errors to prevent user loss

### 2. ✅ RabbitMQ Message TTL
- Messages expire after 1 hour if unprocessed
- Queues auto-delete after 24 hours if unused
- Prevents infinite message accumulation

### 3. ✅ Job Status Heartbeat
- Long-running jobs send periodic status updates
- Prevents false positive "stuck" job detection
- Automatic cleanup of stale heartbeats

### 4. ✅ Dead Letter Queue Monitoring
- Automatic monitoring of failed jobs in DLQ
- Configurable alerting thresholds
- Manual recovery tools for DLQ messages

### 5. ✅ Enhanced Job Cleanup
- Automatic cleanup of truly stuck jobs
- Better detection logic with heartbeat integration
- Configurable timeouts and intervals

## Usage Examples

### Check Job Status with Heartbeat Info
```javascript
const jobInfo = jobHeartbeat.getJobInfo('job-123');
console.log('Job processing time:', jobInfo.processingDuration);
```

### Manual DLQ Processing
```javascript
const processedMessages = await dlqMonitor.processDLQMessages(10);
console.log('Processed DLQ messages:', processedMessages.length);
```

### Get DLQ Statistics
```javascript
const stats = await dlqMonitor.getDLQStats();
console.log('Current DLQ count:', stats.currentMessageCount);
```

## Monitoring & Alerts

The system now provides better observability through:

1. **Heartbeat Status**: Track active job processing in real-time
2. **DLQ Monitoring**: Get alerts when failed jobs accumulate
3. **Timeout Tracking**: Monitor AI request timeouts and patterns
4. **Job Cleanup Stats**: See how many stuck jobs are cleaned up

## Testing & Verification

### Test AI Timeout Handling
```bash
# Test if AI timeout properly fails jobs (not stuck in processing)
node test-ai-timeout.js

# Include normal request test too (slower)
node test-ai-timeout.js --include-normal
```

### Monitor Job Status
```bash
# Single check of job status
node monitor-job-status.js

# Continuous monitoring
node monitor-job-status.js --continuous

# Custom interval (every 30 seconds)
node monitor-job-status.js --continuous --interval=30
```

## Migration Notes

These improvements are backward compatible. Existing jobs will continue to work, but new jobs will benefit from:

- **FIXED**: AI timeout no longer causes stuck 'processing' status
- **FIXED**: Proper job failure handling with user-friendly error messages
- Better timeout handling with configurable timeouts
- More accurate stuck job detection
- Improved failure recovery
- Enhanced monitoring capabilities

## Docker Configuration Updates

The following environment variables have been added to both `.env.docker` and `docker-compose.yml`:

```env
# AI timeout handling
AI_REQUEST_TIMEOUT=300000

# Message TTL and queue management  
MESSAGE_TTL=3600000
QUEUE_TTL=86400000
MESSAGE_TIMEOUT=1800000
QUEUE_MAX_LENGTH=10000
DLQ_MAX_LENGTH=1000

# Job heartbeat and monitoring
MAX_HEARTBEAT_AGE=3600000
HEARTBEAT_CLEANUP_INTERVAL=600000
DLQ_MONITOR_INTERVAL=300000
DLQ_ALERT_THRESHOLD=10

# Job cleanup configuration
JOB_CLEANUP_PROCESSING_HOURS=1  
JOB_CLEANUP_QUEUED_HOURS=24
JOB_CLEANUP_INTERVAL=3600000
```
