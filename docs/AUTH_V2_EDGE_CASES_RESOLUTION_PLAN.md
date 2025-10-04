# 🔧 Auth V2 Edge Cases Resolution Plan
## Mengatasi Masalah Forgot Password dan Duplikasi User

**Created**: October 4, 2025  
**Status**: 📋 **PLANNING** - Ready for Implementation  
**Priority**: 🔴 **CRITICAL**  
**Risk Level**: 🟡 MEDIUM  
**Timeline**: 1-2 weeks  

---

## 📋 Table of Contents

1. [Executive Summary](#-executive-summary)
2. [Problem Analysis](#-problem-analysis)
3. [Solution Architecture](#-solution-architecture)
4. [Implementation Phases](#-implementation-phases)
5. [Metrics & Success Criteria](#-metrics--success-criteria)
6. [Risk Mitigation](#-risk-mitigation)

---

## 📊 Executive Summary

### Masalah yang Diidentifikasi

Terdapat **2 edge cases kritis** dalam sistem hybrid authentication yang dapat menyebabkan user experience buruk dan data inconsistency:

**Masalah 1: Forgot Password untuk Local User**
- User yang register via auth lama (445 users) tidak memiliki `firebase_uid`
- Endpoint `/v1/auth/forgot-password` hanya bekerja untuk Firebase users
- Local users tidak bisa reset password via auth-v2-service

**Masalah 2: Duplikasi User saat Re-registration**
- User yang sudah register di auth lama mencoba register lagi di auth v2
- Potensi konflik antara Firebase account dan PostgreSQL record
- Dapat menyebabkan data inconsistency dan user confusion

### Impact

**Tanpa Solusi**:
- ❌ 445 local users tidak bisa reset password via auth-v2
- ❌ User bingung karena "email already exists" tapi tidak bisa login
- ❌ Potensi duplikasi data antara Firebase dan PostgreSQL
- ❌ Support tickets meningkat
- ❌ User experience buruk

**Dengan Solusi**:
- ✅ Semua users dapat reset password seamlessly
- ✅ Automatic migration saat forgot password
- ✅ Pencegahan duplikasi dengan pre-check
- ✅ Clear error messages untuk user guidance
- ✅ Zero data inconsistency

---

## 🎯 Problem Analysis

### Masalah 1: Forgot Password untuk Local User

#### Current State

**Database State**:
```
auth.users (Local User)
├── id: "uuid-123"
├── email: "user@example.com"
├── password_hash: "$2b$10$..." (bcrypt)
├── firebase_uid: NULL ❌
├── auth_provider: "local"
└── federation_status: "disabled"
```

**Current Flow**:
```
User → POST /v1/auth/forgot-password
     → Firebase REST API (sendPasswordResetEmail)
     → Firebase: "EMAIL_NOT_FOUND" ❌
     → Return Error 400
```

#### Root Cause

1. **Firebase Tidak Mengenal User**: Local user tidak ada di Firebase Authentication
2. **Endpoint Hanya Firebase-aware**: Forgot password endpoint hanya memanggil Firebase API
3. **Tidak Ada Fallback**: Tidak ada mekanisme untuk handle local users

#### Business Impact

- **User Frustration**: User tidak bisa reset password padahal sudah terdaftar
- **Support Load**: Meningkatkan support tickets untuk password reset
- **Migration Blocker**: User stuck di auth lama karena lupa password
- **Adoption Rate**: Menghambat adopsi auth-v2-service

---

### Masalah 2: Duplikasi User saat Re-registration

#### Scenario Analysis

**Scenario 2A: Local User Register Lagi (Belum Pernah Login di Auth V2)**

**Initial State**:
```
PostgreSQL: user@example.com (firebase_uid: NULL)
Firebase: (user tidak ada)
```

**User Action**: Register via `/v1/auth/register`

**Current Flow**:
```
1. Firebase.createUser(email, password) → SUCCESS (Firebase UID: "fb-456")
2. getOrCreateUser(firebaseUser)
   ├── findByFirebaseUid("fb-456") → NULL
   ├── findByEmail("user@example.com") → FOUND (local user)
   └── linkFirebaseToExistingUser()
       └── UPDATE auth.users SET firebase_uid="fb-456" WHERE email="user@example.com"
```

**Result**: ✅ **HANDLED CORRECTLY** - User ter-link dengan Firebase account baru

**Scenario 2B: Hybrid User Register Lagi (Sudah Pernah Login di Auth V2)**

**Initial State**:
```
PostgreSQL: user@example.com (firebase_uid: "fb-123")
Firebase: user@example.com (UID: "fb-123")
```

**User Action**: Register via `/v1/auth/register`

**Current Flow**:
```
1. Firebase.createUser(email, password) → ERROR ❌
   Error: "EMAIL_ALREADY_EXISTS"
2. Return Error 409 to user
```

**Result**: ✅ **HANDLED CORRECTLY** - Firebase mencegah duplikasi

**Scenario 2C: Edge Case - Orphaned Firebase Account**

**Initial State**:
```
PostgreSQL: user@example.com (firebase_uid: "fb-123")
Firebase: user@example.com (UID: "fb-999") ← Different UID!
```

**Cause**: Manual Firebase account creation atau data corruption

**User Action**: Register via `/v1/auth/register`

**Current Flow**:
```
1. Firebase.createUser(email, password) → ERROR "EMAIL_ALREADY_EXISTS"
2. Return Error 409
3. User tries to login → Firebase auth SUCCESS
4. getOrCreateUser(firebaseUser with UID "fb-999")
   ├── findByFirebaseUid("fb-999") → NULL
   ├── findByEmail("user@example.com") → FOUND (with firebase_uid="fb-123")
   └── linkFirebaseToExistingUser()
       └── UPDATE firebase_uid="fb-999" ❌ OVERWRITES OLD UID
```

**Result**: ⚠️ **POTENTIAL ISSUE** - Firebase UID overwritten, old Firebase account orphaned

#### Root Cause

1. **No Pre-check Before Firebase Creation**: Register endpoint tidak cek PostgreSQL sebelum create Firebase user
2. **Race Condition**: Concurrent registration attempts dapat menyebabkan inconsistency
3. **Orphaned Account Handling**: Tidak ada mekanisme untuk detect dan handle orphaned Firebase accounts
4. **Unclear Error Messages**: User tidak tahu apakah harus login atau reset password

---

## 🏗️ Solution Architecture

### Solution 1: Hybrid Forgot Password dengan Auto-Migration

#### Konsep

Endpoint forgot password harus **intelligent** - bisa handle baik Firebase users maupun local users dengan automatic migration.

#### Flow Logic

**Step 1: Pre-check User Existence**
- Cek PostgreSQL untuk user dengan email tersebut
- Identifikasi user type: local, firebase, atau hybrid

**Step 2: Conditional Processing**

**Case A: Firebase User (firebase_uid exists)**
- Langsung gunakan Firebase sendPasswordResetEmail API
- Return success

**Case B: Local User (firebase_uid is NULL)**
- Trigger automatic migration to Firebase
- Create Firebase account dengan temporary password
- Update PostgreSQL dengan firebase_uid
- Send Firebase password reset email
- Return success dengan message "Account migrated, check email"

**Case C: User Not Found**
- Return generic success message (security best practice)
- Tidak expose apakah email terdaftar atau tidak

#### Key Design Principles

1. **Seamless Migration**: User tidak perlu tahu tentang migration
2. **Security First**: Tidak expose user existence
3. **Idempotent**: Multiple calls tidak menyebabkan error
4. **Atomic Operation**: Migration dan password reset dalam satu transaction
5. **Audit Trail**: Log semua migration events

---

### Solution 2: Pre-check Registration dengan Smart Conflict Resolution

#### Konsep

Register endpoint harus **defensive** - cek PostgreSQL sebelum create Firebase user untuk prevent conflicts dan provide clear guidance.

#### Flow Logic

**Step 1: Pre-registration Validation**
- Cek PostgreSQL untuk existing user dengan email tersebut
- Cek Firebase untuk existing user dengan email tersebut

**Step 2: Conflict Detection Matrix**

| PostgreSQL | Firebase | Action |
|------------|----------|--------|
| Not Found | Not Found | ✅ Proceed with registration |
| Found (no firebase_uid) | Not Found | ⚠️ Return "Email exists, use forgot password" |
| Found (has firebase_uid) | Found (same UID) | ❌ Return "Email exists, please login" |
| Found (has firebase_uid) | Found (diff UID) | 🔧 Trigger reconciliation |
| Found (has firebase_uid) | Not Found | 🔧 Trigger Firebase recreation |
| Not Found | Found | 🔧 Trigger PostgreSQL creation |

**Step 3: Smart Error Messages**

Provide actionable guidance based on conflict type:
- "Email already registered. Please login or use forgot password."
- "Account found but needs migration. Please use forgot password to complete setup."
- "Account inconsistency detected. Please contact support with code: ERR_ORPHAN_ACCOUNT"

#### Key Design Principles

1. **Fail Fast**: Detect conflicts sebelum create Firebase user
2. **Clear Communication**: Error messages yang actionable
3. **Data Integrity**: Prevent orphaned accounts
4. **Reconciliation**: Auto-fix inconsistencies when possible
5. **Support Friendly**: Error codes untuk troubleshooting

---

## 🚀 Implementation Phases

### Phase 1: Hybrid Forgot Password Implementation (Week 1, Days 1-3)

#### Objectives
- Implement intelligent forgot password endpoint
- Enable automatic migration untuk local users
- Maintain backward compatibility

#### Tasks

**Task 1.1: Create Hybrid Forgot Password Service**
- Buat service layer untuk handle forgot password logic
- Implement user type detection (local vs firebase vs hybrid)
- Implement automatic migration flow untuk local users

**Task 1.2: Update Forgot Password Endpoint**
- Modify `/v1/auth/forgot-password` untuk gunakan hybrid service
- Add comprehensive error handling
- Add audit logging untuk migration events

**Task 1.3: Database Transaction Management**
- Ensure atomic operations untuk migration + password reset
- Implement rollback mechanism jika Firebase creation fails
- Add database locks untuk prevent race conditions

**Task 1.4: Testing**
- Unit tests untuk semua user type scenarios
- Integration tests dengan Firebase API
- Load testing untuk concurrent requests

#### Deliverables
- ✅ Hybrid forgot password service
- ✅ Updated endpoint dengan migration support
- ✅ Comprehensive test suite
- ✅ Migration audit logs

#### Success Criteria
- Local users dapat reset password via auth-v2
- Automatic migration success rate > 99%
- No data inconsistencies
- Response time < 2 seconds

---

### Phase 2: Pre-check Registration Implementation (Week 1, Days 4-5)

#### Objectives
- Prevent duplicate registrations
- Provide clear error messages
- Implement conflict resolution

#### Tasks

**Task 2.1: Create Pre-registration Validation Service**
- Implement email existence check di PostgreSQL dan Firebase
- Create conflict detection matrix logic
- Implement reconciliation strategies

**Task 2.2: Update Register Endpoint**
- Add pre-check sebelum Firebase user creation
- Implement smart error responses
- Add support contact information untuk complex cases

**Task 2.3: Orphaned Account Detection**
- Create background job untuk detect orphaned accounts
- Implement reconciliation logic
- Add admin dashboard untuk manual resolution

**Task 2.4: Testing**
- Test semua conflict scenarios
- Test concurrent registration attempts
- Test reconciliation logic

#### Deliverables
- ✅ Pre-registration validation service
- ✅ Updated register endpoint
- ✅ Orphaned account detection job
- ✅ Admin reconciliation tools

#### Success Criteria
- Zero duplicate Firebase accounts created
- Clear error messages untuk all conflict types
- Orphaned accounts detected within 1 hour
- User confusion reduced by 90%

---

### Phase 3: Monitoring & Observability (Week 2, Days 1-2)

#### Objectives
- Implement comprehensive monitoring
- Create alerting untuk edge cases
- Enable data-driven optimization

#### Tasks

**Task 3.1: Metrics Collection**
- Track forgot password requests by user type
- Track migration success/failure rates
- Track registration conflicts by type
- Track reconciliation attempts

**Task 3.2: Logging Enhancement**
- Structured logging untuk all edge case scenarios
- Add correlation IDs untuk request tracing
- Log retention policy untuk audit trail

**Task 3.3: Alerting Setup**
- Alert on high migration failure rate (> 1%)
- Alert on orphaned account detection
- Alert on unusual registration conflict patterns
- Alert on reconciliation failures

**Task 3.4: Dashboard Creation**
- Real-time dashboard untuk migration metrics
- Conflict resolution dashboard
- User journey visualization

#### Deliverables
- ✅ Comprehensive metrics collection
- ✅ Structured logging system
- ✅ Alerting rules
- ✅ Monitoring dashboards

#### Success Criteria
- All edge cases tracked dengan metrics
- Alerts trigger within 5 minutes
- Dashboard accessible untuk all stakeholders
- 100% audit trail coverage

---

### Phase 4: Documentation & Rollout (Week 2, Days 3-5)

#### Objectives
- Document new flows
- Train support team
- Gradual rollout dengan monitoring

#### Tasks

**Task 4.1: Technical Documentation**
- Update API documentation dengan new flows
- Document conflict resolution strategies
- Create troubleshooting guide

**Task 4.2: User Communication**
- Create user-facing documentation
- Prepare FAQ untuk common scenarios
- Update error message copy

**Task 4.3: Support Team Training**
- Train support team on new flows
- Provide troubleshooting playbook
- Setup escalation procedures

**Task 4.4: Gradual Rollout**
- Deploy to staging environment
- Run smoke tests
- Deploy to production dengan feature flag
- Monitor for 48 hours
- Full rollout

#### Deliverables
- ✅ Complete technical documentation
- ✅ User-facing guides
- ✅ Support team training materials
- ✅ Production deployment

#### Success Criteria
- Zero critical bugs in production
- Support team confidence > 90%
- User satisfaction maintained
- Smooth rollout dengan no incidents

---

## 📊 Metrics & Success Criteria

### Key Performance Indicators (KPIs)

#### Migration Metrics

**Forgot Password Migration Rate**
- **Target**: > 99% success rate
- **Measurement**: (Successful migrations / Total migration attempts) × 100
- **Alert Threshold**: < 95%

**Migration Performance**
- **Target**: < 2 seconds end-to-end
- **Measurement**: Time from request to email sent
- **Alert Threshold**: > 5 seconds

**Migration Failure Rate**
- **Target**: < 1%
- **Measurement**: (Failed migrations / Total attempts) × 100
- **Alert Threshold**: > 2%

#### Registration Conflict Metrics

**Duplicate Prevention Rate**
- **Target**: 100% (zero duplicates created)
- **Measurement**: (Prevented duplicates / Total conflict scenarios) × 100
- **Alert Threshold**: < 100%

**Conflict Resolution Time**
- **Target**: < 1 second
- **Measurement**: Time to detect and respond to conflict
- **Alert Threshold**: > 3 seconds

**Orphaned Account Detection**
- **Target**: < 1 hour from creation
- **Measurement**: Time between account creation and detection
- **Alert Threshold**: > 24 hours

#### User Experience Metrics

**Error Message Clarity**
- **Target**: < 5% users contact support after error
- **Measurement**: (Support tickets / Total errors shown) × 100
- **Alert Threshold**: > 10%

**Forgot Password Success Rate**
- **Target**: > 95% users complete flow
- **Measurement**: (Password resets completed / Forgot password requests) × 100
- **Alert Threshold**: < 90%

**Registration Abandonment Rate**
- **Target**: < 10% abandon after conflict error
- **Measurement**: (Abandoned registrations / Total conflicts) × 100
- **Alert Threshold**: > 20%

### Monitoring Queries

**Query 1: Migration Success Rate (Daily)**
```sql
-- Track forgot password migrations
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_migrations,
  SUM(CASE WHEN federation_status = 'active' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN federation_status = 'failed' THEN 1 ELSE 0 END) as failed,
  ROUND(100.0 * SUM(CASE WHEN federation_status = 'active' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM auth.users
WHERE auth_provider = 'hybrid'
  AND firebase_uid IS NOT NULL
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Query 2: Orphaned Account Detection**
```sql
-- Find accounts with mismatched Firebase UIDs
SELECT 
  id,
  email,
  firebase_uid,
  auth_provider,
  federation_status,
  last_firebase_sync
FROM auth.users
WHERE firebase_uid IS NOT NULL
  AND federation_status = 'failed'
  AND last_firebase_sync < CURRENT_TIMESTAMP - INTERVAL '1 hour';
```

**Query 3: Registration Conflict Patterns**
```sql
-- Analyze registration attempts for existing emails
-- (Requires application-level logging to track)
SELECT 
  error_type,
  COUNT(*) as occurrences,
  COUNT(DISTINCT email) as unique_users
FROM auth.registration_attempts
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND status = 'conflict'
GROUP BY error_type
ORDER BY occurrences DESC;
```

---

## ⚠️ Risk Mitigation

### Risk 1: Migration Failures During Forgot Password

**Risk Level**: 🟡 MEDIUM

**Scenario**: Firebase account creation fails during forgot password flow

**Impact**: User tidak dapat reset password, stuck di local auth

**Mitigation Strategies**:

1. **Retry Logic**: Implement exponential backoff untuk Firebase API calls
2. **Fallback Mechanism**: Jika migration fails, send email dengan manual migration link
3. **Manual Override**: Admin tool untuk manually trigger migration
4. **Monitoring**: Alert on migration failure rate > 1%

**Rollback Plan**: Revert to Firebase-only forgot password, provide manual migration instructions

---

### Risk 2: Race Condition pada Concurrent Registration

**Risk Level**: 🟡 MEDIUM

**Scenario**: Dua registration requests untuk email yang sama arrive simultaneously

**Impact**: Potensi duplikasi atau data inconsistency

**Mitigation Strategies**:

1. **Database Locks**: Use SELECT FOR UPDATE pada email check
2. **Idempotency Keys**: Implement request deduplication
3. **Transaction Isolation**: Use SERIALIZABLE isolation level
4. **Rate Limiting**: Limit registration attempts per email per time window

**Rollback Plan**: Manual reconciliation via admin tool

---

### Risk 3: Firebase API Rate Limiting

**Risk Level**: 🟢 LOW

**Scenario**: High volume of forgot password requests trigger Firebase rate limits

**Impact**: Legitimate users cannot reset password

**Mitigation Strategies**:

1. **Rate Limiting**: Implement application-level rate limiting
2. **Caching**: Cache Firebase API responses where appropriate
3. **Queue System**: Queue forgot password requests during high load
4. **Monitoring**: Track Firebase API quota usage

**Rollback Plan**: Temporary disable auto-migration, manual migration via support

---

### Risk 4: Data Inconsistency dari Orphaned Accounts

**Risk Level**: 🟢 LOW

**Scenario**: Orphaned Firebase accounts tidak terdeteksi dan ter-reconcile

**Impact**: User confusion, support load

**Mitigation Strategies**:

1. **Background Job**: Hourly job untuk detect orphaned accounts
2. **Auto-reconciliation**: Automatic linking jika possible
3. **Admin Dashboard**: Manual reconciliation tool
4. **Audit Trail**: Complete logging untuk troubleshooting

**Rollback Plan**: Manual reconciliation via support team

---

## 🎯 Success Criteria

### Technical Success Criteria

- ✅ **Zero Data Loss**: Tidak ada user data yang hilang atau corrupted
- ✅ **Zero Duplicates**: Tidak ada duplicate Firebase accounts created
- ✅ **High Availability**: 99.9% uptime untuk forgot password dan registration
- ✅ **Performance**: Response time < 2 seconds untuk 95th percentile
- ✅ **Migration Success**: > 99% forgot password migrations successful

### Business Success Criteria

- ✅ **User Satisfaction**: < 5% increase in support tickets
- ✅ **Adoption Rate**: > 90% of local users migrate within 3 months
- ✅ **Error Reduction**: 90% reduction in registration confusion
- ✅ **Support Efficiency**: 50% reduction in password reset support tickets
- ✅ **Zero Incidents**: No critical production incidents

### User Experience Success Criteria

- ✅ **Seamless Flow**: Users complete forgot password without confusion
- ✅ **Clear Messaging**: Error messages are actionable and clear
- ✅ **Fast Response**: Users receive password reset email within 1 minute
- ✅ **No Friction**: Registration conflicts resolved with clear guidance
- ✅ **Trust**: Zero user complaints about account security

---

## 📝 Next Steps

1. **Review & Approval**: Stakeholder review of this plan (1 day)
2. **Resource Allocation**: Assign developers and QA (1 day)
3. **Environment Setup**: Prepare staging environment (1 day)
4. **Phase 1 Implementation**: Start hybrid forgot password (3 days)
5. **Phase 2 Implementation**: Start pre-check registration (2 days)
6. **Phase 3 Implementation**: Setup monitoring (2 days)
7. **Phase 4 Implementation**: Documentation and rollout (3 days)
8. **Post-deployment Monitoring**: 2 weeks intensive monitoring

**Total Timeline**: 2 weeks implementation + 2 weeks monitoring = **4 weeks**

---

**Document Owner**: Backend Team  
**Last Review**: October 4, 2025  
**Next Review**: After Phase 1 completion

