# ATMA E2E Testing Guide

## Overview

This comprehensive testing guide covers all aspects of the ATMA E2E testing suite, including setup, execution, troubleshooting, and best practices.

## Quick Start

1. **Install Dependencies**
   ```bash
   cd testing
   npm install
   ```

2. **Check Services**
   ```bash
   node scripts/check-services.js
   ```

3. **Run Tests**
   ```bash
   npm test
   ```

## Test Types

### 1. Single User Test (`single-user-test.js`)
Tests the complete user journey for one user:
- User registration with random email
- User login and authentication
- WebSocket connection and authentication
- Profile update
- Assessment submission
- WebSocket notification handling
- Profile persona retrieval
- Chatbot interaction
- Account cleanup

**Usage:**
```bash
npm run test:single
```

### 2. Dual User Test (`dual-user-test.js`)
Tests parallel execution with multiple users:
- Runs 2 users simultaneously by default
- Tests concurrent operations
- Validates system performance under load
- Ensures no data cross-contamination

**Usage:**
```bash
npm run test:dual
```

**Configuration:**
```bash
# Set number of parallel users
PARALLEL_USERS=3 npm run test:dual
```

### 3. WebSocket Test (`websocket-test.js`)
Focused testing of WebSocket functionality:
- Connection establishment
- Authentication flow
- Notification handling
- Reconnection scenarios
- Error handling

**Usage:**
```bash
npm run test:websocket
```

### 4. Chatbot Test (`chatbot-test.js`)
Comprehensive chatbot functionality testing:
- Conversation creation
- Message exchange
- Assessment integration
- Conversation management
- Error scenarios

**Usage:**
```bash
npm run test:chatbot
```

### 5. Stress Test (`stress-test.js`)
High-load testing with multiple concurrent users:
- Tests system limits
- Performance metrics collection
- Resource usage monitoring
- Concurrent operation validation

**Usage:**
```bash
npm run test:stress
```

**Configuration:**
```bash
# Set number of stress test users
STRESS_TEST_USERS=10 npm run test:stress
```

## Configuration

### Environment Variables (.env)

```bash
# API Configuration
API_BASE_URL=http://localhost:3000/api
WEBSOCKET_URL=http://localhost:3000

# Timeout Configuration
TEST_TIMEOUT=30000
ASSESSMENT_TIMEOUT=300000
WEBSOCKET_TIMEOUT=10000

# Test Configuration
ENABLE_CLEANUP=true
ENABLE_DETAILED_LOGS=true
PARALLEL_USERS=2
STRESS_TEST_USERS=5

# Data Configuration
EMAIL_DOMAIN=example.com
USERNAME_PREFIX=testuser
DEFAULT_ASSESSMENT_NAME=AI-Driven Talent Mapping
```

### Test Data Customization

Edit `lib/test-data.js` to customize:
- Assessment score ranges
- User profile templates
- Chat message templates
- School data generation

## Advanced Usage

### Custom Test Runner

```javascript
const TestRunner = require('./test-runner');

// Run specific tests only
TestRunner.runWithConfig({
  onlyTests: ['Single User Test', 'WebSocket Test']
});

// Enable stress testing
TestRunner.runWithConfig({
  enableStressTest: true
});

// Disable specific tests
TestRunner.runWithConfig({
  disableTests: ['Stress Test']
});
```

### CLI Options

```bash
# Run only single user test
npm test -- --single-only

# Run only dual user test
npm test -- --dual-only

# Run only WebSocket test
npm test -- --websocket-only

# Run only chatbot test
npm test -- --chatbot-only

# Enable stress testing
npm test -- --stress

# Disable stress testing
npm test -- --no-stress
```

## Monitoring and Debugging

### Detailed Logging

Enable detailed logging for debugging:
```bash
ENABLE_DETAILED_LOGS=true npm test
```

### WebSocket Debugging

Enable Socket.IO client debugging:
```javascript
// In browser console or Node.js
localStorage.debug = 'socket.io-client:socket';
```

### API Request Monitoring

The test suite automatically logs all API requests and responses when detailed logging is enabled.

### Performance Metrics

Stress tests automatically collect:
- Response times
- Success/failure rates
- Concurrent operation performance
- Resource usage patterns

## Troubleshooting

### Common Issues

1. **Services Not Running**
   ```bash
   # Check service status
   node scripts/check-services.js
   
   # Start services
   docker-compose up -d
   ```

2. **WebSocket Connection Failures**
   - Verify notification service is running on port 3005
   - Check API Gateway WebSocket proxy configuration
   - Ensure no firewall blocking connections

3. **Authentication Errors**
   - Verify JWT token validity
   - Check token expiration settings
   - Ensure auth service is responding

4. **Assessment Timeout**
   - Increase `ASSESSMENT_TIMEOUT` in .env
   - Check analysis worker service status
   - Verify queue processing

5. **Database Connection Issues**
   - Ensure PostgreSQL is running
   - Check database connection strings
   - Verify database schema is up to date

### Debug Mode

Run tests with debug information:
```bash
DEBUG=* npm test
```

### Verbose Output

Enable verbose logging:
```bash
npm test -- --verbose
```

## Test Data Management

### Cleanup

Automatic cleanup after tests:
```bash
ENABLE_CLEANUP=true npm test
```

Manual cleanup:
```bash
npm run clean
```

### Test Data Identification

Test data is identified by:
- Email domain: `test.atma.local`
- Username prefix: `testuser_`
- Assessment names containing: `AI-Driven Talent Mapping`
- Conversation metadata: `test_session: true`

### Database Cleanup

For manual database cleanup:
```sql
-- Clean test users
DELETE FROM users WHERE email LIKE '%test.atma.local';

-- Clean test conversations
DELETE FROM conversations WHERE title LIKE '%E2E Test%';

-- Clean test results
DELETE FROM analysis_results WHERE assessment_name LIKE '%AI-Driven Talent Mapping%';

-- Clean test jobs
DELETE FROM analysis_jobs WHERE assessment_name LIKE '%AI-Driven Talent Mapping%';
```

## Performance Benchmarks

### Expected Performance

- User registration: < 2 seconds
- User login: < 1 second
- WebSocket connection: < 3 seconds
- Assessment submission: < 5 seconds
- Assessment completion: < 5 minutes
- Chatbot response: < 10 seconds

### Stress Test Targets

- 5 concurrent users: All operations successful
- 10 concurrent users: > 95% success rate
- 20 concurrent users: > 90% success rate

## Continuous Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Start services
      run: docker-compose up -d
      
    - name: Wait for services
      run: sleep 30
      
    - name: Install dependencies
      run: |
        cd testing
        npm install
        
    - name: Check services
      run: |
        cd testing
        node scripts/check-services.js
        
    - name: Run E2E tests
      run: |
        cd testing
        npm test
        
    - name: Upload test reports
      uses: actions/upload-artifact@v2
      if: always()
      with:
        name: test-reports
        path: testing/reports/
```

## Best Practices

### Test Design

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data
3. **Timeouts**: Set appropriate timeouts for operations
4. **Error Handling**: Handle all possible error scenarios
5. **Logging**: Provide detailed logging for debugging

### Data Management

1. **Random Data**: Use random emails and usernames
2. **Unique Identifiers**: Include timestamps in test data
3. **Test Markers**: Mark all test data for easy identification
4. **Cleanup Strategy**: Implement both automatic and manual cleanup

### Performance

1. **Concurrent Limits**: Don't overwhelm services
2. **Batch Operations**: Group related operations
3. **Resource Monitoring**: Monitor system resources during tests
4. **Graceful Degradation**: Handle service unavailability

### Security

1. **Test Credentials**: Use separate test credentials
2. **Data Isolation**: Ensure test data doesn't affect production
3. **Token Management**: Properly handle JWT tokens
4. **Cleanup**: Remove all test data after completion

## Extending the Test Suite

### Adding New Tests

1. Create new test file in `/testing/`
2. Extend base test classes
3. Add to test runner configuration
4. Update package.json scripts
5. Document new test functionality

### Custom Assertions

```javascript
// Example custom assertion
function assertAssessmentResult(result) {
  if (!result.persona_profile) {
    throw new Error('Assessment result missing persona profile');
  }
  
  if (!result.persona_profile.archetype) {
    throw new Error('Assessment result missing archetype');
  }
  
  if (!result.persona_profile.careerRecommendation) {
    throw new Error('Assessment result missing career recommendations');
  }
}
```

### Test Utilities

Create reusable utilities in `/testing/lib/` for:
- Common API operations
- Data validation
- Performance measurement
- Error handling
- Reporting

## Support

For issues or questions:
1. Check this guide first
2. Review test logs in `/testing/reports/`
3. Check service health with `node scripts/check-services.js`
4. Consult API documentation
5. Contact the development team
