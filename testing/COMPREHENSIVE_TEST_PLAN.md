# Comprehensive Testing Plan - Unified Auth Migration

**Date:** October 5, 2025  
**Purpose:** Comprehensive testing untuk memvalidasi unified auth implementation  
**Scope:** All services dengan Firebase (auth-v2) dan Legacy JWT tokens

---

## 🎯 Testing Objectives

1. **Functional Testing**: Memastikan semua services menerima kedua jenis token
2. **End-to-End Testing**: Testing complete user journey dengan auth-v2
3. **Fallback Testing**: Memvalidasi fallback mechanism bekerja dengan baik
4. **Performance Testing**: Memastikan latency dan throughput sesuai target
5. **Security Testing**: Memvalidasi token validation dan authorization
6. **Error Handling**: Testing berbagai error scenarios
7. **Integration Testing**: Testing antar-service communication

---

## 📋 Test Scenarios

### 1. Authentication Flow Testing

#### 1.1 Firebase Authentication (Auth-V2)
- ✅ User registration dengan email/password
- ✅ User login dengan email/password
- ✅ Email verification flow
- ✅ Password reset flow
- ✅ Token refresh mechanism
- ✅ Token expiration handling

#### 1.2 Legacy JWT Authentication
- ✅ User login dengan legacy auth-service
- ✅ JWT token generation
- ✅ JWT token validation
- ✅ JWT token expiration

### 2. Service Access Testing

#### 2.1 Archive Service
- [ ] Create analysis job dengan Firebase token
- [ ] Create analysis job dengan JWT token
- [ ] Get analysis results dengan Firebase token
- [ ] Get analysis results dengan JWT token
- [ ] List user jobs dengan Firebase token
- [ ] List user jobs dengan JWT token
- [ ] Delete job dengan Firebase token
- [ ] Delete job dengan JWT token

#### 2.2 Assessment Service
- [ ] Submit assessment dengan Firebase token
- [ ] Submit assessment dengan JWT token
- [ ] Get assessment results dengan Firebase token
- [ ] Get assessment results dengan JWT token
- [ ] List assessments dengan Firebase token
- [ ] List assessments dengan JWT token

#### 2.3 Chatbot Service
- [ ] Send chat message dengan Firebase token
- [ ] Send chat message dengan JWT token
- [ ] Get chat history dengan Firebase token
- [ ] Get chat history dengan JWT token
- [ ] Stream response dengan Firebase token
- [ ] Stream response dengan JWT token

#### 2.4 Notification Service
- [ ] WebSocket connection dengan Firebase token
- [ ] WebSocket connection dengan JWT token
- [ ] Receive notifications dengan Firebase token
- [ ] Receive notifications dengan JWT token
- [ ] Mark notification as read dengan Firebase token
- [ ] Mark notification as read dengan JWT token

#### 2.5 Admin Service
- [ ] Admin login dengan Firebase token
- [ ] Admin login dengan JWT token
- [ ] User management dengan Firebase token
- [ ] User management dengan JWT token
- [ ] System monitoring dengan Firebase token
- [ ] System monitoring dengan JWT token

#### 2.6 API Gateway
- [ ] Route requests dengan Firebase token
- [ ] Route requests dengan JWT token
- [ ] Rate limiting dengan Firebase token
- [ ] Rate limiting dengan JWT token
- [ ] Header forwarding (X-User-ID, X-User-Email)
- [ ] Error handling dan response formatting

### 3. Fallback Mechanism Testing

#### 3.1 Primary Verification Failure
- [ ] Firebase token fails → fallback to JWT verification
- [ ] JWT token fails → fallback to Firebase verification
- [ ] Both verifications fail → return 401

#### 3.2 Service Unavailability
- [ ] Auth-V2 service down → fallback to JWT
- [ ] Auth service down → fallback to Firebase
- [ ] Both services down → graceful degradation

#### 3.3 Network Issues
- [ ] Timeout pada auth-v2 service → fallback
- [ ] Timeout pada auth service → fallback
- [ ] Network latency simulation

### 4. Performance Testing

#### 4.1 Token Caching
- [ ] First request (cache miss) - measure latency
- [ ] Subsequent requests (cache hit) - measure latency
- [ ] Cache hit rate > 90% after warm-up
- [ ] Cache expiration (TTL) working correctly
- [ ] Memory cache size limits

#### 4.2 Load Testing
- [ ] 50 concurrent requests dengan Firebase tokens
- [ ] 50 concurrent requests dengan JWT tokens
- [ ] 100 concurrent requests mixed tokens (50/50)
- [ ] Sustained load: 100 req/s for 5 minutes
- [ ] Spike test: 0 → 200 req/s → 0

#### 4.3 Latency Benchmarks
- [ ] Auth latency p50 < 50ms
- [ ] Auth latency p95 < 200ms
- [ ] Auth latency p99 < 500ms
- [ ] End-to-end request latency < 1s

### 5. Security Testing

#### 5.1 Token Validation
- [ ] Expired Firebase token → 401
- [ ] Expired JWT token → 401
- [ ] Invalid signature Firebase token → 401
- [ ] Invalid signature JWT token → 401
- [ ] Malformed token → 401
- [ ] Missing token → 401

#### 5.2 Authorization Testing
- [ ] User can only access own resources
- [ ] Admin can access all resources
- [ ] Cross-user access denied (403)
- [ ] Role-based access control

#### 5.3 Token Security
- [ ] Token tidak di-log secara penuh (only first 10 chars)
- [ ] Token tidak di-expose di error messages
- [ ] HTTPS enforcement (production)
- [ ] Token revocation mechanism

### 6. Error Handling Testing

#### 6.1 Client Errors (4xx)
- [ ] 400 Bad Request - invalid request body
- [ ] 401 Unauthorized - invalid/missing token
- [ ] 403 Forbidden - insufficient permissions
- [ ] 404 Not Found - resource tidak ada
- [ ] 429 Too Many Requests - rate limit exceeded

#### 6.2 Server Errors (5xx)
- [ ] 500 Internal Server Error - unexpected error
- [ ] 502 Bad Gateway - downstream service error
- [ ] 503 Service Unavailable - service down
- [ ] 504 Gateway Timeout - request timeout

#### 6.3 Error Response Format
- [ ] Consistent error response structure
- [ ] Meaningful error messages
- [ ] Error codes untuk client handling
- [ ] Stack traces tidak di-expose (production)

### 7. Integration Testing

#### 7.1 Service-to-Service Communication
- [ ] API Gateway → Archive Service
- [ ] API Gateway → Assessment Service
- [ ] API Gateway → Chatbot Service
- [ ] API Gateway → Notification Service
- [ ] Archive Service → Notification Service (job completion)
- [ ] Assessment Service → Notification Service (results ready)

#### 7.2 Database Integration
- [ ] User data consistency across services
- [ ] Transaction handling
- [ ] Connection pool management
- [ ] Query performance

#### 7.3 External Services
- [ ] Firebase Admin SDK integration
- [ ] Redis cache integration
- [ ] RabbitMQ message queue
- [ ] PostgreSQL database

### 8. End-to-End User Journey

#### 8.1 New User Journey (Firebase)
1. [ ] Register dengan email/password (auth-v2)
2. [ ] Verify email
3. [ ] Login dan dapatkan Firebase token
4. [ ] Submit assessment (assessment-service)
5. [ ] Create analysis job (archive-service)
6. [ ] Chat dengan bot (chatbot-service)
7. [ ] Receive notifications (notification-service)
8. [ ] View results dan history

#### 8.2 Existing User Journey (JWT)
1. [ ] Login dengan legacy auth-service
2. [ ] Dapatkan JWT token
3. [ ] Access all services dengan JWT token
4. [ ] Verify semua functionality works

#### 8.3 Mixed Token Usage
1. [ ] Login dengan Firebase (auth-v2)
2. [ ] Use Firebase token untuk beberapa requests
3. [ ] Login dengan legacy auth
4. [ ] Use JWT token untuk requests lainnya
5. [ ] Verify both tokens work simultaneously

---

## 🔧 Test Environment

### Prerequisites
- Docker containers running (all services)
- PostgreSQL database initialized
- Redis cache available
- RabbitMQ message broker running
- Test user accounts created

### Test Accounts
- **Regular User**: kasykoi@gmail.com / Anjas123
- **Admin User**: superadmin / admin123
- **Test Users**: Will be created during testing

### Environment Variables
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

---

## 📊 Success Criteria

### Functional
- ✅ 100% services accept both token types
- ✅ All endpoints accessible dengan Firebase tokens
- ✅ All endpoints accessible dengan JWT tokens
- ✅ Fallback mechanism works in all scenarios

### Performance
- ✅ Auth success rate > 99.5%
- ✅ Auth latency p95 < 200ms
- ✅ Cache hit rate > 90% after warm-up
- ✅ No memory leaks during load tests

### Security
- ✅ All invalid tokens rejected
- ✅ Authorization rules enforced
- ✅ No token leakage in logs/errors
- ✅ Rate limiting working

### Reliability
- ✅ Zero crashes during testing
- ✅ Graceful degradation when services down
- ✅ Error handling consistent across services
- ✅ No data corruption

---

## 🚀 Test Execution Plan

### Phase 1: Smoke Tests (30 minutes)
1. Verify all services are running
2. Test basic authentication flows
3. Quick sanity checks on all endpoints

### Phase 2: Functional Tests (2 hours)
1. Complete authentication flow testing
2. Service access testing (all services)
3. Fallback mechanism testing

### Phase 3: Performance Tests (1 hour)
1. Token caching validation
2. Load testing
3. Latency benchmarks

### Phase 4: Security Tests (1 hour)
1. Token validation testing
2. Authorization testing
3. Security vulnerability checks

### Phase 5: Integration Tests (1 hour)
1. End-to-end user journeys
2. Service-to-service communication
3. External service integration

### Phase 6: Error Handling Tests (30 minutes)
1. Client error scenarios
2. Server error scenarios
3. Edge cases

**Total Estimated Time: 6 hours**

---

## 📝 Test Reporting

### Test Results Format
```json
{
  "testSuite": "Comprehensive Unified Auth Testing",
  "timestamp": "2025-10-05T10:00:00Z",
  "duration": "6h",
  "summary": {
    "total": 150,
    "passed": 148,
    "failed": 2,
    "skipped": 0,
    "successRate": "98.67%"
  },
  "categories": {
    "authentication": { "passed": 12, "failed": 0 },
    "serviceAccess": { "passed": 48, "failed": 1 },
    "fallback": { "passed": 9, "failed": 0 },
    "performance": { "passed": 15, "failed": 0 },
    "security": { "passed": 18, "failed": 1 },
    "integration": { "passed": 24, "failed": 0 },
    "errorHandling": { "passed": 22, "failed": 0 }
  }
}
```

### Report Location
- Test results: `testing/reports/comprehensive-test-{timestamp}.json`
- Detailed logs: `testing/logs/comprehensive-test-{timestamp}.log`
- Summary report: `docs/COMPREHENSIVE_TEST_REPORT.md`

---

## 🎓 Next Steps

After testing completion:
1. [ ] Analyze test results
2. [ ] Fix any failing tests
3. [ ] Document issues and resolutions
4. [ ] Update documentation based on findings
5. [ ] Create final test report
6. [ ] Sign-off from stakeholders

