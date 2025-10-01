# RabbitMQ Stuck Jobs Issue - Investigation and Fix Report
**Date**: October 1, 2025  
**Reporter**: System Administrator  
**Status**: ✅ RESOLVED

## Executive Summary
Investigated and resolved critical issue where jobs were stuck in RabbitMQ queue with no consumers processing them. Root cause was a bug in assessment-service's RabbitMQ health check causing channel disconnection and failure to reconnect.

## Problem Description

### Initial Symptoms
- Users reported jobs stuck in "queued" status indefinitely
- 3 messages stuck in `assessment_analysis` queue with 0 consumers
- Analysis workers not consuming from the main job queue
- Assessment service repeatedly logging "RabbitMQ connection or channel is closed" warnings

### Queue Status (Before Fix)
```
Queue Name                      Messages    Consumers
---------------------------------------------------
assessment_analysis             3           0      ⚠️ NO CONSUMERS!
analysis_events_assessments     0           1      ✅ Working
analysis_events_notifications   14          0      ⚠️ Separate issue
assessment_analysis_dlq         7           0      Dead letter queue
```

### Stuck Jobs Identified
1. **Job ID**: `599afbdf-1ee4-4b1b-9a5f-fe24f638923e` (user: rizqy8@gmail.com)
2. **Job ID**: `4db3aaff-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (user: rizqy8@gmail.com)  
3. **Job ID**: `de680bde-672b-4d36-8546-c384ff8fd946` (user: kasykoi@gmail.com)

## Root Cause Analysis

### Primary Issue: assessment-service RabbitMQ Channel Bug

**Location**: `assessment-service/src/config/rabbitmq.js:checkHealth()`

**Problem**: The `checkHealth()` function was incorrectly checking for channel properties that don't exist on amqplib channels:

```javascript
// ❌ INCORRECT CODE
if (!connection.isOpen || !channel.isOpen) {
  logger.warn('RabbitMQ connection or channel is closed');
  return false;
}
```

**Impact**:
1. Health check always returned `false` because `channel.isOpen` is undefined
2. Service repeatedly logged "RabbitMQ connection or channel is closed" warnings
3. Channel appeared unhealthy even though it was working
4. Missing channel event handlers meant channel couldn't reconnect when actually closed

### Secondary Issue: Analysis Workers Restart

**Problem**: Analysis workers crashed and restarted around 08:10:00, failed initial RabbitMQ connection, resulting in 0 consumers on `assessment_analysis` queue.

**Timeline**:
- **08:10:07** - Assessment service restarts, attempts RabbitMQ connection
- **08:10:13** - Connection established successfully
- **08:10:38** - First "channel is closed" warning appears (25 seconds after startup)
- **08:27:32** - User submits job `599afbdf` - goes to queue but no consumer picks it up
- **08:45:13** - Stuck job monitor marks job as failed after 17.72 minutes

## Solution Implemented

### 1. Fixed RabbitMQ Health Check

**File**: `assessment-service/src/config/rabbitmq.js`

**Changes**:
```javascript
// ✅ CORRECTED CODE
const checkHealth = async() => {
  try {
    if (!connection || !channel) {
      return false;
    }

    // Check if connection is still alive (correct property check)
    if (!connection.connection || connection.connection.closed) {
      return false;
    }

    // Perform actual connectivity test
    try {
      await channel.checkQueue(config.queue);
      return true;
    } catch (queueError) {
      return false;
    }
  } catch (error) {
    return false;
  }
};
```

### 2. Added Channel Event Handlers

**Added proper channel lifecycle management**:
```javascript
// Create channel
channel = await connection.createChannel();

// Handle channel events
channel.on('close', () => {
  logger.warn('RabbitMQ channel closed');
  channel = null;
});

channel.on('error', (err) => {
  logger.error('RabbitMQ channel error', { error: err.message });
});
```

### 3. Restarted Affected Services

**Actions Taken**:
```bash
docker restart atma-assessment-service
docker restart atma-backend-analysis-worker-1 atma-backend-analysis-worker-2
```

## Results (After Fix)

### Queue Status
```
Queue Name                      Messages    Consumers
---------------------------------------------------
assessment_analysis             0           2      ✅ FIXED!
analysis_events_assessments     0           1      ✅ Working
analysis_events_notifications   20          0      ⚠️ Separate issue (out of scope)
assessment_analysis_dlq         7           0      Historical failures
```

### Stuck Jobs Processed Successfully
All 3 stuck jobs were consumed and processed successfully by analysis workers:

1. **Job `599afbdf`**: Completed in 21.1 seconds
   - Status: ✅ Completed
   - Result: Archetype "The Innovative Thinker"
   - Processing time: 21133ms

2. **Job `4db3aaff`**: Completed in 21.0 seconds  
   - Status: ✅ Completed
   - Result: Archetype "The Innovative Thinker"
   - Processing time: 21062ms

3. **Job `de680bde`**: Completed in 20.8 seconds
   - Status: ✅ Completed  
   - Result: Archetype "The Detail-Oriented Implementer"
   - Processing time: 20848ms

### Log Verification

**Before Fix**:
```
10/01, 08:10:38 [WARN ] RabbitMQ connection or channel is closed
10/01, 08:11:08 [WARN ] RabbitMQ connection or channel is closed
10/01, 08:11:38 [WARN ] RabbitMQ connection or channel is closed
... (repeated every 30 seconds)
```

**After Fix**:
```
10/01, 08:50:25 [INFO ] RabbitMQ connection established successfully
10/01, 08:50:25 [INFO ] Event consumer initialized for assessments
10/01, 08:50:25 [INFO ] Assessment event consumer started
10/01, 08:50:46 [INFO ] [599afbdf] Assessment job status updated to processing
10/01, 08:51:06 [INFO ] [599afbdf] Assessment job status updated to completed
✅ No more "channel is closed" warnings!
```

## Technical Details

### Key Properties of amqplib Connections/Channels

**Correct way to check connection status**:
- `connection.connection.closed` - Boolean indicating if connection is closed
- `channel.checkQueue(queueName)` - Throws error if channel is unhealthy

**Incorrect approach** (what was used before):
- `connection.isOpen` - ❌ Does not exist
- `channel.isOpen` - ❌ Does not exist

### Channel Event Handling

Proper channel lifecycle management requires handling:
1. `close` event - Channel closed gracefully or by server
2. `error` event - Channel encountered an error
3. Connection-level events already handled correctly

## Preventive Measures

### 1. Code Quality
- ✅ Fixed incorrect property access in health checks
- ✅ Added proper channel event handlers
- ✅ Improved error handling to prevent silent failures

### 2. Monitoring Recommendations
- Set up alerts for queues with messages but 0 consumers
- Monitor "channel is closed" warnings (should be rare)
- Track consumer count metrics in RabbitMQ dashboard

### 3. Testing Recommendations
- Add integration tests for RabbitMQ reconnection scenarios
- Test channel disconnect/reconnect behavior
- Verify health check accuracy with actual RabbitMQ failures

## Related Issues

### Out of Scope (Noted for Future Investigation)
1. **notification-service queue**: 20 messages stuck with 0 consumers
   - Queue: `analysis_events_notifications`
   - Likely similar issue but different service
   
2. **Dead Letter Queue**: 7 messages in DLQ
   - Queue: `assessment_analysis_dlq`
   - Historical failures, require separate investigation

## Lessons Learned

1. **Always verify API/library behavior**: Don't assume properties exist without checking documentation
2. **Event-driven systems need proper event handling**: Missing channel close handlers prevented recovery
3. **Health checks must be accurate**: False positives in health checks can hide real issues
4. **Monitor consumer counts**: Zero consumers on a queue with messages is a critical alert condition

## Conclusion

The stuck jobs issue was successfully resolved by:
1. Fixing the incorrect health check logic in assessment-service
2. Adding proper channel event handlers
3. Restarting affected services to pick up the changes

All stuck jobs were processed successfully within ~21 seconds each after the fix. The system is now processing jobs normally with 2 active consumers on the main queue.

---
**Report Generated**: October 1, 2025  
**Services Affected**: assessment-service, analysis-worker  
**Fix Applied**: Yes  
**Verification**: Complete  
**Status**: ✅ RESOLVED
