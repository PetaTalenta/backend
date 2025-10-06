# Comprehensive Testing Suite - Unified Auth Migration

## 📋 Overview

Test suite komprehensif untuk memvalidasi implementasi unified authentication yang mendukung Firebase (auth-v2) dan Legacy JWT tokens di semua microservices.

## 🎯 Test Coverage

### 1. **End-to-End Testing dengan Auth-V2** (`test-auth-v2-e2e.js`)
Complete user journey testing dengan Firebase authentication:
- ✅ Firebase login dan token generation
- ✅ Token verification
- ✅ Access ke semua services (Archive, Assessment, Chatbot, Notification)
- ✅ Cross-service integration
- ✅ Performance testing
- ✅ Error handling

### 2. **Fallback Mechanism Testing** (`test-fallback-mechanism.js`)
Testing automatic fallback antara Firebase dan JWT:
- ✅ Normal operation dengan kedua token types
- ✅ Invalid token handling
- ✅ Token type detection
- ✅ Performance comparison
- ✅ Fallback behavior validation

### 3. **Comprehensive Testing** (`comprehensive-unified-auth-test.js`)
Full test suite mencakup semua aspek:
- ✅ Authentication flows (Firebase & JWT)
- ✅ Service access testing (semua services)
- ✅ Fallback mechanisms
- ✅ Performance & load testing
- ✅ Security testing
- ✅ Error handling
- ✅ Integration testing

## 🚀 Quick Start

### Prerequisites

1. **All services must be running:**
   ```bash
   docker-compose up -d
   ```

2. **Verify services are up:**
   ```bash
   docker-compose ps
   ```

3. **Install test dependencies:**
   ```bash
   cd testing
   npm install
   ```

### Running Tests

#### Option 1: Run All Tests (Recommended)
```bash
cd testing
./run-comprehensive-tests.sh
```

This will run all test suites sequentially and generate a consolidated report.

#### Option 2: Run Individual Test Suites

**Auth-V2 End-to-End Testing:**
```bash
cd testing
node test-auth-v2-e2e.js
```

**Fallback Mechanism Testing:**
```bash
cd testing
node test-fallback-mechanism.js
```

**Comprehensive Testing:**
```bash
cd testing
node comprehensive-unified-auth-test.js
```

## 📊 Test Results

### Report Locations

All test reports are saved in:
- **JSON Reports**: `testing/reports/`
- **Log Files**: `testing/logs/`

### Report Format

Each test generates a JSON report with:
```json
{
  "total": 50,
  "passed": 48,
  "failed": 2,
  "successRate": "96%",
  "duration": "45.3s",
  "timestamp": "2025-10-05T10:00:00Z",
  "tests": [...]
}
```

## 🔍 Test Scenarios

### Authentication Testing
- [x] Firebase login with email/password
- [x] Legacy JWT login
- [x] Token verification (both types)
- [x] Token refresh
- [x] Profile retrieval

### Service Access Testing
- [x] Archive Service (create, list, get, delete jobs)
- [x] Assessment Service (submit, list assessments)
- [x] Chatbot Service (conversations, messages)
- [x] Notification Service (WebSocket, notifications)
- [x] Admin Service (admin operations)

### Fallback Testing
- [x] Firebase token → JWT fallback
- [x] JWT token → Firebase fallback
- [x] Invalid token handling
- [x] Service unavailability scenarios

### Performance Testing
- [x] Auth latency (p50, p95, p99)
- [x] Concurrent requests (50-100 concurrent)
- [x] Token caching effectiveness
- [x] Load testing (sustained load)

### Security Testing
- [x] Invalid token rejection (401)
- [x] Expired token handling
- [x] Malformed token handling
- [x] Authorization checks (403)
- [x] Missing token handling

### Error Handling Testing
- [x] 400 Bad Request
- [x] 401 Unauthorized
- [x] 403 Forbidden
- [x] 404 Not Found
- [x] 500 Internal Server Error

## 📈 Success Criteria

### Functional
- ✅ 100% services accept both token types
- ✅ Auth success rate > 99.5%
- ✅ All endpoints accessible with both tokens
- ✅ Fallback mechanism works correctly

### Performance
- ✅ Auth latency p95 < 200ms
- ✅ Cache hit rate > 90%
- ✅ Concurrent request success rate > 95%
- ✅ No memory leaks

### Security
- ✅ All invalid tokens rejected
- ✅ Authorization rules enforced
- ✅ No token leakage in logs
- ✅ Error messages don't expose sensitive data

## 🛠️ Troubleshooting

### Services Not Running
```bash
# Check service status
docker-compose ps

# Restart services
docker-compose restart

# View logs
docker-compose logs -f [service-name]
```

### Test Failures

1. **Authentication Failures**
   - Verify test user exists: `kasykoi@gmail.com / Anjas123`
   - Check auth services are running
   - Verify database is accessible

2. **Service Access Failures**
   - Check service health endpoints
   - Verify network connectivity
   - Check service logs for errors

3. **Performance Issues**
   - Ensure no other heavy processes running
   - Check system resources (CPU, memory)
   - Verify Redis cache is working

### Common Issues

**Issue: "ECONNREFUSED"**
```bash
# Solution: Service not running
docker-compose up -d [service-name]
```

**Issue: "401 Unauthorized"**
```bash
# Solution: Token expired or invalid
# Re-run the test to get fresh tokens
```

**Issue: "Timeout"**
```bash
# Solution: Service taking too long
# Check service logs and increase timeout if needed
```

## 📝 Test Configuration

### Environment Variables

Create `.env` file in testing directory:
```bash
API_GATEWAY_URL=http://localhost:3000
AUTH_SERVICE_URL=http://localhost:3001
AUTH_V2_SERVICE_URL=http://localhost:3008
ARCHIVE_SERVICE_URL=http://localhost:3002
ASSESSMENT_SERVICE_URL=http://localhost:3003
CHATBOT_SERVICE_URL=http://localhost:3006
NOTIFICATION_SERVICE_URL=http://localhost:3005
ADMIN_SERVICE_URL=http://localhost:3007
```

### Test Accounts

**Regular User:**
- Email: `kasykoi@gmail.com`
- Password: `Anjas123`

**Admin User:**
- Username: `superadmin`
- Password: `admin123`

## 🎓 Understanding Test Results

### Success Rate Interpretation

- **100%**: Perfect! All tests passed
- **95-99%**: Excellent, minor issues
- **90-94%**: Good, some issues to address
- **< 90%**: Needs attention, significant issues

### Performance Metrics

- **p50 (median)**: 50% of requests faster than this
- **p95**: 95% of requests faster than this
- **p99**: 99% of requests faster than this

Target: p95 < 200ms for auth operations

### Common Test Patterns

**PASSED**: ✓ Test completed successfully
**FAILED**: ✗ Test failed with error
**WARNING**: ⚠ Test passed but with warnings

## 📚 Additional Resources

- [Unified Auth Migration Plan](../docs/UNIFIED_AUTH_MIGRATION_PLAN.md)
- [Phase 1 Implementation Report](../docs/PHASE1_UNIFIED_AUTH_IMPLEMENTATION_REPORT.md)
- [Phase 2 Implementation Report](../docs/PHASE2_UNIFIED_AUTH_IMPLEMENTATION_REPORT.md)
- [Phase 3 Implementation Report](../docs/PHASE3_UNIFIED_AUTH_IMPLEMENTATION_REPORT.md)

## 🤝 Contributing

When adding new tests:

1. Follow existing test structure
2. Add descriptive test names
3. Include proper error handling
4. Update this README
5. Run all tests before committing

## 📞 Support

If you encounter issues:

1. Check service logs: `docker-compose logs -f`
2. Review test logs in `testing/logs/`
3. Check test reports in `testing/reports/`
4. Consult documentation in `docs/`

---

**Last Updated:** October 5, 2025  
**Version:** 1.0  
**Maintainer:** Backend Team

