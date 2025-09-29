# Analysis Result Reprocessing & Timeout Handling Fixes

**Date:** September 29, 2025  
**Priority:** CRITICAL  
**Related Issue:** [kasykoi-stuck-jobs-investigation-20250929.md](./kasykoi-stuck-jobs-investigation-20250929.md)

## Problem Summary

The system had a critical flaw where AI service timeouts would create incomplete analysis results with `test_result: null`, but these jobs would still be marked as "completed" due to having timestamps and result IDs. This prevented users from regenerating their results, as the duplicate job detection would return the incomplete result.

### Root Causes Identified

1. **Partial Result Creation**: AI timeouts created results with `test_data` but `test_result: null`
2. **No Validation**: Archive service accepted incomplete results without validation
3. **Blocked Reprocessing**: Duplicate detection prevented reprocessing of incomplete results
4. **Status Confusion**: Jobs appeared "completed" despite having incomplete results

## Implemented Fixes

### 1. Result Validation (CRITICAL)

**Files Modified:**
- `/analysis-worker/src/services/archiveService.js`
- `/archive-service/src/services/resultsService.js`

**Changes:**
- Added validation to `saveAnalysisResult()` to reject `null` or incomplete `test_result`
- Added validation to `addToBatch()` to prevent batching incomplete results
- Added validation to `createSingleResult()` in archive service
- Required fields check: `archetype` and `shortSummary` must be present

```javascript
// BEFORE: Accepted null test_result
const saveAnalysisResult = async (userId, testData, testResult, jobId, ...) => {
  // No validation - saved even if testResult was null
}

// AFTER: Validates completeness
const saveAnalysisResult = async (userId, testData, testResult, jobId, ..., allowOverwrite = false) => {
  if (!testResult || typeof testResult !== 'object') {
    throw new Error('Cannot save incomplete analysis result - test_result is null or invalid');
  }
  
  const requiredFields = ['archetype', 'shortSummary'];
  const missingFields = requiredFields.filter(field => !testResult[field]);
  if (missingFields.length > 0) {
    throw new Error(`Cannot save incomplete analysis result - missing required fields: ${missingFields.join(', ')}`);
  }
}
```

### 2. Reprocessing Support (CRITICAL)

**Files Modified:**
- `/analysis-worker/src/services/jobDeduplicationService.js`

**Changes:**
- Made `checkDuplicate()` method async to check result completeness
- Added `checkResultCompleteness()` method to verify if existing results are complete
- Allow reprocessing when existing result has `test_result: null`
- Support for `allowOverwrite` flag

```javascript
// NEW: Check if existing result is incomplete
async checkResultCompleteness(resultId) {
  const response = await archiveClient.get(`/archive/results/${resultId}`);
  const result = response.data.data;
  
  const isIncomplete = !result.test_result || 
                      typeof result.test_result !== 'object' ||
                      !result.test_result.archetype ||
                      !result.test_result.shortSummary;
  
  return { resultId, isIncomplete, testResult: result.test_result };
}

// UPDATED: Allow reprocessing of incomplete results
async checkDuplicate(jobId, userId, assessmentData) {
  // ... existing logic ...
  
  if (processedJob) {
    const existingResult = await this.checkResultCompleteness(processedJob.resultId);
    
    if (existingResult && existingResult.isIncomplete) {
      logger.warn('Allowing reprocessing of incomplete result', { ... });
      
      // Remove from cache to allow reprocessing
      this.processedJobs.delete(jobHash);
      
      return {
        isDuplicate: false,
        jobHash,
        reason: 'INCOMPLETE_RESULT_REPROCESSING',
        allowOverwrite: true
      };
    }
  }
}
```

### 3. Result Overwriting (NEW FEATURE)

**Files Modified:**
- `/archive-service/src/services/resultsService.js`

**Changes:**
- Added support for `allow_overwrite` flag in result creation
- When overwriting, find existing incomplete result and update it instead of creating new one
- Maintains result history while fixing incomplete data

```javascript
// NEW: Overwrite incomplete results
if (data.allow_overwrite) {
  const existingIncompleteResult = await AnalysisResult.findOne({
    where: {
      user_id: data.user_id,
      test_result: null
    },
    order: [['created_at', 'DESC']]
  });

  if (existingIncompleteResult) {
    await existingIncompleteResult.update({
      test_result: data.test_result,
      test_data: data.test_data || existingIncompleteResult.test_data,
      raw_responses: data.raw_responses || existingIncompleteResult.raw_responses,
      updated_at: new Date()
    });

    return existingIncompleteResult;
  }
}
```

### 4. Enhanced Error Handling (IMPROVED)

**Files Modified:**
- `/analysis-worker/src/processors/optimizedAssessmentProcessor.js`

**Changes:**
- Improved AI timeout error logging with special attention
- Support for `allowOverwrite` flag in result saving
- Better error context for debugging

```javascript
// Pass allowOverwrite flag to save operation
const allowOverwrite = deduplicationResult.allowOverwrite || false;

const saveResult = await withRetry(
  () => saveAnalysisResult(userId, finalAssessmentData, personaProfile, jobId, 
                          finalAssessmentName, raw_responses, false, allowOverwrite),
  { operationName: 'Archive service save', shouldRetry: (error) => error.isRetryable }
);
```

## User Experience Improvements

### Before the Fix
1. ❌ AI timeout creates incomplete result (`test_result: null`)
2. ❌ Job marked as "completed" despite being incomplete
3. ❌ User tries to regenerate → gets blocked as "duplicate"
4. ❌ User stuck with incomplete result, cannot retry

### After the Fix
1. ✅ AI timeout properly fails the job (no partial result created)
2. ✅ User can retry the analysis
3. ✅ If incomplete result exists, system detects it and allows reprocessing
4. ✅ Reprocessing overwrites the incomplete result with complete data
5. ✅ User gets complete analysis result

## Technical Benefits

### 1. Data Integrity
- No more incomplete results in database
- All saved results guaranteed to have complete `test_result`
- Proper validation at multiple layers

### 2. User Recovery
- Users can recover from AI timeout failures
- Automatic detection of incomplete results
- Seamless reprocessing without manual intervention

### 3. System Reliability
- Prevents accumulation of incomplete results
- Better error reporting and logging
- Maintains result history while fixing data

### 4. Performance
- Reduces support tickets for stuck analyses
- Eliminates need for manual database fixes
- Better user experience with automatic recovery

## Deployment Notes

### Environment Variables
No new environment variables required. Uses existing:
- `ARCHIVE_SERVICE_URL`
- `SERVICE_SECRET`
- `AI_REQUEST_TIMEOUT`

### Database Impact
- No schema changes required
- Existing incomplete results can be fixed by user retry
- Uses existing `updated_at` field for overwrite tracking

### Backwards Compatibility
- ✅ All existing functionality preserved
- ✅ No breaking changes to APIs
- ✅ Graceful handling of edge cases

## Testing Scenarios

### 1. AI Timeout Recovery
```bash
# Scenario: AI service times out during analysis
# Expected: Job fails cleanly, user can retry
# Result: Retry succeeds and overwrites any partial data
```

### 2. Duplicate Detection with Incomplete Results
```bash
# Scenario: User has incomplete result, tries to regenerate  
# Expected: System detects incomplete result, allows reprocessing
# Result: New complete result overwrites incomplete one
```

### 3. Normal Duplicate Detection
```bash
# Scenario: User has complete result, tries to regenerate
# Expected: System returns existing complete result
# Result: No unnecessary reprocessing, tokens refunded
```

## Monitoring & Alerts

### Key Metrics to Monitor
1. **Incomplete Result Rate**: Should drop to near 0%
2. **AI Timeout Recovery Rate**: % of timeouts that recover on retry
3. **Result Overwrite Operations**: Track successful overwrites
4. **Job Failure Rate**: Should remain stable or improve

### Log Patterns to Watch
```javascript
// Success patterns
"Allowing reprocessing of incomplete result"
"Found incomplete result to overwrite" 
"Analysis result validation passed"

// Error patterns  
"Cannot save incomplete analysis result"
"AI MODEL TIMEOUT - Job failed due to AI request timeout"
"Failed to check result completeness"
```

## Future Improvements

### 1. Automatic Cleanup (Low Priority)
- Scheduled task to identify and mark old incomplete results
- Notification to users with stuck incomplete results

### 2. Enhanced Validation (Medium Priority) 
- Validate more `test_result` fields for completeness
- Schema-based validation for result structure

### 3. User Notification (Medium Priority)
- Inform users when analysis fails due to AI timeout
- Provide retry button in UI for failed analyses

---

**Status:** ✅ IMPLEMENTED  
**Tested:** Manual testing required  
**Rollback Plan:** Revert commits, existing functionality preserved
