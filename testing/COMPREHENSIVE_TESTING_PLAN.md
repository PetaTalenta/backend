# Comprehensive End-to-End Testing Plan
## ATMA Backend API Testing

---

## 1. Overview

### 1.1 Purpose
Dokumen ini menjelaskan rencana testing end-to-end untuk sistem ATMA Backend yang mencakup seluruh flow dari registrasi user hingga interaksi dengan chatbot, termasuk proses assessment dan notifikasi real-time.

### 1.2 Scope
- Authentication flow (register, login, logout)
- WebSocket notification system
- User profile management
- Assessment submission and processing
- Result retrieval and verification
- Chatbot interaction
- Load testing dari 1 hingga 200 concurrent users

### 1.3 Test Environment
- **Base URL**: `https://api.futureguide.id`
- **WebSocket URL**: `wss://api.futureguide.id`
- **Authentication**: JWT Bearer Token (Auth V2 menggunakan Firebase ID Token)
- **Protocol**: HTTPS/WSS

---

## 2. Complete Test Flow

### 2.1 Phase 1: User Registration
**Endpoint**: `POST /api/auth/v2/register`

**Flow Description**:
- User mendaftar dengan email dan password baru
- Sistem membuat akun Firebase dan menyimpan data user
- Response berisi user data dan Firebase ID token

**Request Requirements**:
- Email: format valid, belum terdaftar
- Password: minimal 8 karakter, kombinasi huruf dan angka
- Display name (optional)
- Photo URL (optional)

**Success Metrics**:
- HTTP Status: 200 OK
- Response time: < 2 detik
- Response berisi: uid, email, idToken, refreshToken, expiresIn
- Token valid dan dapat digunakan untuk autentikasi
- User tersimpan di database auth.users

**Failure Scenarios**:
- Email sudah terdaftar (400 - EMAIL_EXISTS)
- Format email invalid (400 - INVALID_EMAIL)
- Password terlalu lemah (400 - WEAK_PASSWORD)

---

### 2.2 Phase 2: First Logout
**Endpoint**: `POST /api/auth/v2/logout`

**Flow Description**:
- User melakukan logout untuk menguji flow login ulang
- Sistem merevoke refresh token

**Request Requirements**:
- Authorization header dengan Firebase ID token
- Refresh token di request body

**Success Metrics**:
- HTTP Status: 200 OK
- Response time: < 1 detik
- Logout berhasil tanpa error
- Token di-revoke dengan benar

---

### 2.3 Phase 3: Re-login
**Endpoint**: `POST /api/auth/v2/login`

**Flow Description**:
- User login kembali dengan kredensial yang sama
- Sistem memvalidasi dan mengembalikan token baru

**Request Requirements**:
- Email dan password yang sudah terdaftar

**Success Metrics**:
- HTTP Status: 200 OK
- Response time: < 2 detik
- Response berisi: uid, email, idToken, refreshToken
- Token baru valid dan berbeda dari token sebelumnya
- User dapat mengakses protected endpoints

**Failure Scenarios**:
- Email tidak ditemukan (404 - EMAIL_NOT_FOUND)
- Password salah (401 - INVALID_PASSWORD)
- User disabled (403 - USER_DISABLED)

---

### 2.4 Phase 4: WebSocket Connection
**Endpoint**: WebSocket connection ke `wss://api.futureguide.id`

**Flow Description**:
- Establish WebSocket connection menggunakan Socket.IO
- Authenticate dengan JWT token dalam 10 detik
- Listen untuk notification events

**Connection Steps**:
1. Connect ke WebSocket server
2. Emit 'authenticate' event dengan token
3. Wait untuk 'authenticated' response
4. Setup listeners untuk analysis events

**Success Metrics**:
- Connection established: < 3 detik
- Authentication successful
- Receive 'authenticated' event dengan userId dan email
- Connection stable tanpa disconnect
- Ready untuk menerima notifications

**Events to Monitor**:
- `analysis-started`: Job mulai diproses
- `analysis-complete`: Job selesai dengan sukses
- `analysis-failed`: Job gagal
- `auth_error`: Authentication error

**Failure Scenarios**:
- Connection timeout (> 20 detik)
- Authentication timeout (> 10 detik)
- Invalid token (auth_error)
- Connection dropped

---

### 2.5 Phase 5: Get User Profile
**Endpoint**: `GET /api/auth/profile`

**Flow Description**:
- Retrieve profile data user yang sedang login
- Verifikasi data user tersimpan dengan benar

**Request Requirements**:
- Authorization header dengan JWT token

**Success Metrics**:
- HTTP Status: 200 OK
- Response time: < 1 detik
- Response berisi data lengkap: id, email, username, user_type, token_balance
- Profile data (jika ada): full_name, date_of_birth, gender, school_info

**Data Validation**:
- User ID match dengan token
- Email match dengan registrasi
- Token balance tersedia
- Profile structure sesuai schema

---

### 2.6 Phase 6: Get Archive Data
**Endpoints**: 
- `GET /api/archive/results` - List hasil assessment
- `GET /api/archive/jobs` - List analysis jobs

**Flow Description**:
- Retrieve historical data user (jika ada)
- Verifikasi pagination dan filtering
- Check data consistency

**Request Requirements**:
- Authorization header dengan JWT token
- Query parameters: page, limit, status, sort, order

**Success Metrics**:
- HTTP Status: 200 OK
- Response time: < 2 detik
- Pagination berfungsi dengan benar
- Data sorted sesuai parameter
- Response structure konsisten

**Data Points to Verify**:
- Total count akurat
- Pagination metadata benar
- Status filtering berfungsi
- Empty state handled dengan baik

---

### 2.7 Phase 7: Submit Assessment
**Endpoint**: `POST /api/assessment/submit`

**Flow Description**:
- Submit assessment data untuk AI analysis
- Job masuk ke queue untuk processing
- Sistem mendeduct token balance

**Request Requirements**:
- Authorization header dengan JWT token
- Assessment data lengkap: riasec, ocean, viaIs scores
- Assessment name: "AI-Driven Talent Mapping"
- Optional: raw_responses, raw_schema_version
- Optional: X-Idempotency-Key header

**Success Metrics**:
- HTTP Status: 200 OK
- Response time: < 3 detik
- Response berisi: jobId, status="queued", estimatedProcessingTime
- Token balance berkurang 1
- Job tersimpan di database dengan status "queued"

**Data to Capture**:
- jobId untuk tracking
- queuePosition
- remainingTokens
- estimatedProcessingTime

**Failure Scenarios**:
- Insufficient tokens (402 - INSUFFICIENT_TOKENS)
- Invalid assessment data (400 - VALIDATION_ERROR)
- Duplicate submission dengan idempotency key sama

---

### 2.8 Phase 8: Wait for WebSocket Notification
**Event**: `analysis-complete` atau `analysis-failed`

**Flow Description**:
- Monitor WebSocket untuk notification events
- Capture event data ketika analysis selesai
- Handle timeout jika processing terlalu lama

**Expected Events Sequence**:
1. `analysis-started` - Job mulai diproses (status: "processing")
2. `analysis-complete` - Job selesai (status: "completed") ATAU
3. `analysis-failed` - Job gagal (status: "failed")

**Success Metrics**:
- Receive `analysis-started` event: < 30 detik setelah submit
- Receive `analysis-complete` event: < 5 menit setelah started
- Event data lengkap: jobId, result_id, status, assessment_name
- Event diterima tanpa delay signifikan

**Event Data to Validate**:
- jobId match dengan submission
- result_id tersedia (untuk completed)
- status sesuai dengan event type
- timestamp akurat

**Timeout Handling**:
- Max wait time: 10 menit
- Fallback ke polling jika WebSocket gagal
- Log timeout untuk investigation

---

### 2.9 Phase 9: Poll Job Status
**Endpoint**: `GET /api/archive/jobs/:jobId`

**Flow Description**:
- Poll job status secara berkala hingga status "completed"
- Verifikasi status transition yang benar
- Handle eventual consistency

**Polling Strategy**:
- Initial delay: 2 detik setelah notification
- Polling interval: 3 detik
- Max attempts: 20 (total ~1 menit)
- Exponential backoff optional

**Success Metrics**:
- HTTP Status: 200 OK per request
- Response time: < 1 detik per poll
- Status eventually menjadi "completed"
- result_id tersedia di response
- archetype data tersedia (jika completed)

**Status Transitions to Monitor**:
- queued → processing → completed (normal flow)
- queued → processing → failed (error flow)

**Data to Validate**:
- jobId match
- status progression logical
- result_id populated ketika completed
- archetype field available
- timestamps updated correctly

**Note**: 
Meski notification sudah diterima, database mungkin butuh waktu untuk update. Polling memastikan data benar-benar tersedia.

---

### 2.10 Phase 10: Get Result Details
**Endpoint**: `GET /api/archive/results/:id`

**Flow Description**:
- Retrieve detail lengkap hasil analysis
- Validate struktur dan kelengkapan data
- Verify AI-generated content quality

**Request Requirements**:
- Authorization header dengan JWT token
- result_id dari job yang completed

**Success Metrics**:
- HTTP Status: 200 OK
- Response time: < 2 detik
- Response berisi data lengkap:
  - test_data (riasec, ocean, viaIs scores)
  - test_result (archetype, recommendations, insights)
  - status: "completed"
  - assessment_name
  - timestamps

**Data Quality Checks**:
- Archetype name present dan meaningful
- Career recommendations (minimal 3-4 items)
- Each recommendation berisi: careerName, justification, relatedMajors, careerProspect
- Strengths dan weaknesses lists populated
- Insights dan skillSuggestion tersedia
- Role models included
- Development activities present

**Content Validation**:
- Text dalam Bahasa Indonesia
- Recommendations relevant dengan scores
- No placeholder atau template text
- Consistent formatting

---

### 2.11 Phase 11: Create Chatbot Conversation
**Endpoint**: `POST /api/chatbot/conversations`

**Flow Description**:
- Create conversation baru dengan profile persona
- Link conversation dengan analysis result
- Receive initial AI greeting

**Request Requirements**:
- Authorization header dengan JWT token
- resultsId: ID dari analysis result
- profilePersona: extracted dari test_result
- title (optional)

**Success Metrics**:
- HTTP Status: 200 OK
- Response time: < 5 detik (includes AI generation)
- Response berisi:
  - conversation: id, title, context_type, status
  - initial_messages: user intro + assistant greeting
- Conversation tersimpan di database
- Initial messages relevant dengan persona

**Profile Persona Mapping**:
Extract dari test_result:
- name: dari user profile
- personality: dari archetype
- strengths: dari strengths array
- interests: dari career recommendations
- careerGoals: dari top career recommendation

---

### 2.12 Phase 12: Send Chatbot Messages
**Endpoint**: `POST /api/chatbot/conversations/:conversationId/messages`

**Flow Description**:
- Send beberapa messages untuk test relevance
- Validate AI responses quality
- Check conversation context maintenance

**Test Messages Sequence**:
1. "Bisakah kamu jelaskan lebih detail tentang archetype saya?"
2. "Apa langkah konkret yang bisa saya ambil untuk karir [top recommendation]?"
3. "Bagaimana cara mengembangkan kelemahan yang kamu sebutkan?"

**Success Metrics per Message**:
- HTTP Status: 200 OK
- Response time: < 10 detik
- Response berisi:
  - user_message: echo dari input
  - assistant_message: AI-generated response
  - usage: token usage stats
  - processing_time
- AI response relevant dengan question
- AI response consistent dengan analysis result
- Context maintained across messages

**Response Quality Checks**:
- Response dalam Bahasa Indonesia
- Reference ke archetype dan analysis result
- Actionable advice provided
- Professional dan empathetic tone
- No hallucination atau incorrect data
- Consistent dengan profile persona

---

### 2.13 Phase 13: Get Conversation Messages
**Endpoint**: `GET /api/chatbot/conversations/:conversationId/messages`

**Flow Description**:
- Retrieve all messages dari conversation
- Verify message history completeness
- Check pagination

**Request Requirements**:
- Authorization header dengan JWT token
- conversationId dari created conversation
- Query params: page, limit, include_usage

**Success Metrics**:
- HTTP Status: 200 OK
- Response time: < 2 detik
- All messages present (initial + sent messages)
- Messages in correct chronological order
- Pagination metadata accurate
- Message content intact

**Data Validation**:
- Message count match expected
- Sender types correct (user/assistant)
- Content preserved
- Timestamps sequential
- Usage data included if requested

---

### 2.14 Phase 14: Final Logout
**Endpoint**: `POST /api/auth/v2/logout`

**Flow Description**:
- User logout untuk mengakhiri session
- Cleanup resources dan close connections

**Request Requirements**:
- Authorization header dengan Firebase ID token
- Refresh token di request body

**Success Metrics**:
- HTTP Status: 200 OK
- Response time: < 1 detik
- Logout successful
- Token invalidated
- WebSocket connection closed gracefully

**Cleanup Verification**:
- Subsequent requests dengan token lama gagal (401)
- WebSocket disconnected
- No memory leaks
- Session cleared

---

## 3. Overall Success Metrics

### 3.1 Functional Metrics
- **Complete Flow Success Rate**: ≥ 95%
- **All Endpoints Responding**: 100%
- **Data Consistency**: 100%
- **WebSocket Stability**: ≥ 98%
- **AI Response Quality**: ≥ 90% relevant

### 3.2 Performance Metrics
- **Total Flow Duration**: < 8 menit (termasuk AI processing)
- **API Response Time (avg)**: < 2 detik
- **WebSocket Latency**: < 500ms
- **Assessment Processing Time**: 2-5 menit
- **Chatbot Response Time**: < 10 detik

### 3.3 Reliability Metrics
- **Zero Data Loss**: 100%
- **Transaction Integrity**: 100%
- **Error Recovery**: Graceful handling
- **Idempotency**: Duplicate prevention working

---

## 4. Load Testing Strategy

### 4.1 Progressive Load Testing

#### Level 1: Single User (Baseline)
**Objective**: Establish baseline performance metrics

- **Users**: 1
- **Duration**: Complete full flow
- **Metrics to Capture**:
  - Response time per endpoint
  - Total flow duration
  - Memory usage
  - CPU usage
  - Database query performance
  - WebSocket stability

**Success Criteria**:
- All endpoints respond successfully
- No errors or timeouts
- Performance within expected ranges
- Establish baseline for comparison

---

#### Level 2: Light Load (5 Users)
**Objective**: Test basic concurrency handling

- **Users**: 5 concurrent
- **Ramp-up**: 1 user per 10 seconds
- **Duration**: All users complete full flow
- **Iteration**: Each user runs flow 1x

**Metrics to Monitor**:
- Response time degradation vs baseline
- Queue depth for assessments
- WebSocket connection stability
- Database connection pool usage
- Error rate

**Success Criteria**:
- Response time increase < 20% vs baseline
- Error rate < 1%
- All WebSocket connections stable
- Queue processing orderly
- No resource exhaustion

---

#### Level 3: Medium Load (25 Users)
**Objective**: Test realistic concurrent usage

- **Users**: 25 concurrent
- **Ramp-up**: 5 users per 30 seconds
- **Duration**: 30 minutes
- **Iteration**: Each user runs flow 2x

**Metrics to Monitor**:
- Response time at 50th, 90th, 95th percentile
- Assessment queue length
- RabbitMQ message throughput
- Database query performance
- WebSocket connection count
- Memory and CPU usage trends

**Success Criteria**:
- P95 response time < 5 seconds
- Error rate < 2%
- Queue processing keeps up with submissions
- No memory leaks
- WebSocket connections stable
- Database performance acceptable

---

#### Level 4: High Load (100 Users)
**Objective**: Test system under stress

- **Users**: 100 concurrent
- **Ramp-up**: 10 users per minute
- **Duration**: 1 hour
- **Iteration**: Each user runs flow 3x

**Metrics to Monitor**:
- All previous metrics
- Rate limiting effectiveness
- Auto-scaling behavior (if applicable)
- Database connection pool saturation
- RabbitMQ queue depth
- Worker processing capacity
- API Gateway performance

**Success Criteria**:
- P95 response time < 10 seconds
- Error rate < 5%
- Rate limiting working correctly
- Queue doesn't grow unbounded
- System remains responsive
- No cascading failures
- Graceful degradation if limits reached

**Expected Bottlenecks**:
- Assessment worker capacity
- AI API rate limits
- Database connections
- WebSocket connection limits

---

#### Level 5: Peak Load (200 Users)
**Objective**: Test maximum capacity and breaking point

- **Users**: 200 concurrent
- **Ramp-up**: 20 users per minute
- **Duration**: 2 hours
- **Iteration**: Each user runs flow 2x

**Metrics to Monitor**:
- System breaking point identification
- Resource saturation points
- Error types and frequencies
- Recovery time after load spike
- Queue overflow behavior
- Circuit breaker activation

**Success Criteria**:
- System doesn't crash
- Error rate < 10%
- Errors are graceful (proper error messages)
- System recovers after load reduction
- No data corruption
- Critical paths remain functional

**Stress Points to Identify**:
- Maximum concurrent assessments
- Maximum WebSocket connections
- Database query bottlenecks
- AI API throttling
- Memory limits
- Network bandwidth

---

### 4.2 Load Testing Execution Plan

#### Pre-Test Preparation
1. **Environment Setup**:
   - Ensure all services running
   - Database optimized and indexed
   - Monitoring tools configured
   - Logging levels appropriate
   - Backup recent data

2. **Test Data Preparation**:
   - Generate unique test users (email+timestamp)
   - Prepare assessment data variations
   - Setup test accounts with tokens

3. **Monitoring Setup**:
   - Application metrics (Prometheus/Grafana)
   - Database monitoring
   - RabbitMQ monitoring
   - WebSocket connection tracking
   - Log aggregation (ELK/Loki)
   - APM tools (if available)

#### During Test Execution
1. **Real-time Monitoring**:
   - Dashboard dengan key metrics
   - Alert thresholds configured
   - Team ready untuk intervention
   - Log streaming untuk errors

2. **Progressive Validation**:
   - Validate each level before proceeding
   - Document anomalies immediately
   - Capture screenshots/metrics
   - Note any manual interventions

3. **Incident Response**:
   - Stop test if critical failure
   - Document failure conditions
   - Capture diagnostic data
   - Plan remediation

#### Post-Test Analysis
1. **Metrics Analysis**:
   - Compare against baseline
   - Identify performance degradation points
   - Calculate capacity limits
   - Document bottlenecks

2. **Report Generation**:
   - Performance summary
   - Bottleneck identification
   - Recommendations for optimization
   - Capacity planning insights

---

### 4.3 Load Testing Tools Recommendations

#### Option 1: k6 (Recommended)
- **Pros**: Modern, scriptable, good WebSocket support
- **Use Case**: All load levels
- **Features**: Metrics, thresholds, cloud execution

#### Option 2: Artillery
- **Pros**: YAML config, Socket.IO support
- **Use Case**: WebSocket-heavy testing
- **Features**: Scenarios, plugins, reporting

#### Option 3: JMeter
- **Pros**: Mature, GUI, extensive plugins
- **Use Case**: Complex scenarios
- **Features**: Distributed testing, detailed reports

#### Option 4: Locust
- **Pros**: Python-based, distributed
- **Use Case**: Custom logic testing
- **Features**: Web UI, real-time stats

---

## 5. Performance Benchmarks

### 5.1 Response Time Targets

| Endpoint Category | Target (P50) | Target (P95) | Max Acceptable |
|-------------------|--------------|--------------|----------------|
| Authentication | < 1s | < 2s | 3s |
| Profile/Archive GET | < 500ms | < 1s | 2s |
| Assessment Submit | < 2s | < 3s | 5s |
| Job Status Poll | < 500ms | < 1s | 2s |
| Result Retrieval | < 1s | < 2s | 3s |
| Chatbot Create | < 3s | < 5s | 8s |
| Chatbot Message | < 5s | < 10s | 15s |
| WebSocket Connect | < 2s | < 3s | 5s |

### 5.2 Throughput Targets

| Operation | Target RPS | Peak RPS |
|-----------|------------|----------|
| Authentication | 50 | 100 |
| Profile Reads | 200 | 500 |
| Assessment Submit | 20 | 50 |
| Job Status Poll | 100 | 300 |
| Chatbot Messages | 30 | 80 |
| WebSocket Events | 500 | 1000 |

### 5.3 Resource Utilization Limits

| Resource | Warning | Critical |
|----------|---------|----------|
| CPU Usage | 70% | 85% |
| Memory Usage | 75% | 90% |
| Database Connections | 70% | 85% |
| Queue Depth | 100 | 500 |
| WebSocket Connections | 1000 | 2000 |

---

## 6. Monitoring and Observability

### 6.1 Key Metrics to Track

#### Application Metrics
- Request rate per endpoint
- Response time percentiles (P50, P90, P95, P99)
- Error rate by type
- Active user sessions
- Token balance changes

#### Infrastructure Metrics
- CPU and memory usage per service
- Network I/O
- Disk I/O
- Container/pod health

#### Database Metrics
- Query execution time
- Connection pool usage
- Slow query log
- Transaction rate
- Lock contention

#### Queue Metrics
- Message rate (in/out)
- Queue depth
- Consumer count
- Message age
- Dead letter queue size

#### WebSocket Metrics
- Active connections
- Connection duration
- Message rate
- Disconnect rate
- Authentication failures

---

### 6.2 Logging Strategy

#### Log Levels
- **ERROR**: System errors, exceptions
- **WARN**: Degraded performance, retries
- **INFO**: Key business events
- **DEBUG**: Detailed flow (test only)

#### Key Events to Log
- User registration/login/logout
- Assessment submission
- Job status changes
- WebSocket connections/disconnections
- AI API calls
- Database errors
- Rate limit hits

#### Log Correlation
- Request ID across services
- User ID for user actions
- Job ID for assessment flow
- Conversation ID for chatbot

---

## 7. Edge Cases and Special Scenarios

### 7.1 Concurrent Operations
- **Scenario**: User submits multiple assessments simultaneously
- **Expected**: Idempotency key prevents duplicates OR all queued separately
- **Validation**: Check job count and token deduction

### 7.2 WebSocket Reconnection
- **Scenario**: WebSocket disconnects during processing
- **Expected**: Auto-reconnect and re-authenticate
- **Validation**: Notifications still received after reconnect

### 7.3 Token Expiration
- **Scenario**: Token expires during long-running flow
- **Expected**: Refresh token used automatically OR graceful error
- **Validation**: Flow continues or clear error message

### 7.4 Assessment Timeout
- **Scenario**: Assessment processing takes > 10 minutes
- **Expected**: Timeout handling, job marked as failed
- **Validation**: User notified, can retry

### 7.5 Insufficient Tokens
- **Scenario**: User tries to submit without enough tokens
- **Expected**: 402 error with clear message
- **Validation**: No job created, token balance unchanged

### 7.6 Chatbot Context Limit
- **Scenario**: Conversation exceeds token limit
- **Expected**: Graceful truncation or error
- **Validation**: User informed, can start new conversation

### 7.7 Database Unavailability
- **Scenario**: Database connection lost temporarily
- **Expected**: Retry logic, circuit breaker
- **Validation**: System recovers, no data loss

### 7.8 AI API Failure
- **Scenario**: OpenAI/AI service unavailable
- **Expected**: Job marked as failed, user notified
- **Validation**: Can retry later, no token charged

---

## 8. Failure Scenarios and Recovery

### 8.1 Assessment Processing Failure
**Trigger**: AI API error, validation failure, timeout

**Expected Behavior**:
- Job status → "failed"
- error_message populated
- User notified via WebSocket
- Token refunded (if applicable)
- Retry option available

**Validation**:
- Check job status
- Verify error message clarity
- Confirm token refund
- Test retry functionality

### 8.2 WebSocket Connection Loss
**Trigger**: Network issue, server restart

**Expected Behavior**:
- Auto-reconnect with exponential backoff
- Re-authenticate automatically
- Resume event listening
- No missed notifications (or fallback to polling)

**Validation**:
- Monitor reconnection attempts
- Verify authentication after reconnect
- Check event delivery

### 8.3 Database Transaction Failure
**Trigger**: Constraint violation, deadlock

**Expected Behavior**:
- Transaction rollback
- Clear error message
- No partial data
- System remains consistent

**Validation**:
- Check data integrity
- Verify rollback completed
- Confirm error handling

### 8.4 Rate Limit Exceeded
**Trigger**: Too many requests

**Expected Behavior**:
- 429 status code
- Retry-After header
- Clear error message
- Request queued or rejected gracefully

**Validation**:
- Verify rate limit enforcement
- Check error response format
- Test retry behavior

---

## 9. Test Data Management

### 9.1 Test User Generation
- **Pattern**: `test_user_{timestamp}@example.com`
- **Password**: `TestPass123!`
- **Cleanup**: Mark test users for deletion after test

### 9.2 Assessment Data Variations
- **Variation 1**: High investigative, low social
- **Variation 2**: Balanced across all dimensions
- **Variation 3**: High artistic, high openness
- **Purpose**: Test AI response diversity

### 9.3 Chatbot Test Questions
- **Category 1**: Archetype explanation
- **Category 2**: Career guidance
- **Category 3**: Skill development
- **Category 4**: Challenge handling

### 9.4 Data Cleanup Strategy
- **During Test**: Minimal cleanup
- **After Test**: Bulk delete test users
- **Retention**: Keep sample data for analysis
- **Privacy**: Ensure no real user data in tests

---

## 10. Success Criteria Summary

### 10.1 Functional Requirements
✅ All endpoints accessible and responding
✅ Complete flow executable without manual intervention
✅ Data consistency across services
✅ WebSocket notifications delivered reliably
✅ AI responses relevant and high-quality
✅ Error handling graceful and informative

### 10.2 Performance Requirements
✅ Response times within targets (95% of requests)
✅ System handles 100 concurrent users smoothly
✅ Assessment processing completes in 2-5 minutes
✅ No memory leaks or resource exhaustion
✅ Database queries optimized

### 10.3 Reliability Requirements
✅ Error rate < 5% under normal load
✅ System recovers from failures automatically
✅ No data loss or corruption
✅ Graceful degradation under extreme load
✅ Monitoring and alerting functional

### 10.4 Scalability Requirements
✅ System scales to 200 concurrent users
✅ Queue processing keeps pace with submissions
✅ WebSocket connections stable at scale
✅ Database performance acceptable under load
✅ Bottlenecks identified and documented

---

## 11. Deliverables

### 11.1 Test Execution Report
- Test execution summary
- Pass/fail status per phase
- Performance metrics captured
- Issues encountered and resolutions

### 11.2 Load Test Report
- Results per load level
- Performance degradation analysis
- Bottleneck identification
- Capacity recommendations

### 11.3 Recommendations Document
- Performance optimization suggestions
- Scalability improvements
- Infrastructure recommendations
- Monitoring enhancements

### 11.4 Test Artifacts
- Test scripts/configurations
- Sample test data
- Monitoring dashboards
- Log analysis results

---

## 12. Next Steps

### 12.1 Implementation Phase
1. Setup test environment
2. Prepare test data
3. Configure monitoring
4. Develop test scripts
5. Execute baseline test

### 12.2 Execution Phase
1. Run single user test
2. Analyze and document baseline
3. Progress through load levels
4. Document findings at each level
5. Generate reports

### 12.3 Analysis Phase
1. Aggregate metrics
2. Identify patterns
3. Document bottlenecks
4. Create recommendations
5. Present findings

### 12.4 Optimization Phase
1. Implement quick wins
2. Plan major improvements
3. Re-test critical paths
4. Validate improvements
5. Update documentation

---

## Appendix A: Endpoint Quick Reference

| Phase | Method | Endpoint | Purpose |
|-------|--------|----------|---------|
| 1 | POST | /api/auth/v2/register | User registration |
| 2 | POST | /api/auth/v2/logout | First logout |
| 3 | POST | /api/auth/v2/login | Re-login |
| 4 | WS | wss://api.futureguide.id | WebSocket connect |
| 5 | GET | /api/auth/profile | Get user profile |
| 6a | GET | /api/archive/results | Get results list |
| 6b | GET | /api/archive/jobs | Get jobs list |
| 7 | POST | /api/assessment/submit | Submit assessment |
| 8 | WS | analysis-complete event | Wait for notification |
| 9 | GET | /api/archive/jobs/:jobId | Poll job status |
| 10 | GET | /api/archive/results/:id | Get result details |
| 11 | POST | /api/chatbot/conversations | Create conversation |
| 12 | POST | /api/chatbot/conversations/:id/messages | Send messages |
| 13 | GET | /api/chatbot/conversations/:id/messages | Get messages |
| 14 | POST | /api/auth/v2/logout | Final logout |

---

## Appendix B: Status Values Reference

### Job/Result Status
- `queued`: Waiting in queue
- `processing`: Being analyzed
- `completed`: Successfully finished
- `failed`: Error occurred
- `cancelled`: Manually cancelled

### WebSocket Events
- `analysis-started`: Processing began
- `analysis-complete`: Processing finished successfully
- `analysis-failed`: Processing failed
- `authenticated`: WebSocket auth successful
- `auth_error`: WebSocket auth failed

---

## Appendix C: Common Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| EMAIL_EXISTS | 400 | Email already registered |
| INVALID_PASSWORD | 401 | Wrong password |
| UNAUTHORIZED | 401 | Missing/invalid token |
| INSUFFICIENT_TOKENS | 402 | Not enough tokens |
| FORBIDDEN | 403 | Access denied |
| NOT_FOUND | 404 | Resource not found |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

---

**Document Version**: 1.0
**Last Updated**: 2025-10-08
**Author**: ATMA Testing Team
**Status**: Ready for Implementation

