# Admin Page Development Plan - Archive Service Integration

## 📋 Overview
Rencana pengembangan admin page untuk mengelola user, monitoring system, dan analytics dengan integrasi penuh ke archive-service.

## 🎯 Current Capabilities (Already Available)

### User Management
- ✅ **View User List** - `GET /api/admin/users` (proxy to archive-service)
- ✅ **View User Details** - `GET /api/admin/users/:userId` 
- ✅ **Delete User** - `DELETE /api/admin/users/:userId` (soft delete with email modification)
- ✅ **Update Token Balance** - `PUT /api/admin/users/:userId/token-balance`

### User Data Table Features (Available)
```javascript
// User data structure available:
{
  id: "uuid",
  username: "string",
  email: "string", 
  token_balance: "number",
  created_at: "timestamp",
  updated_at: "timestamp",
  // Profile data from archive-service
  total_results: "number",
  total_jobs: "number",
  completed_assessments: "number"
}
```

## 🚀 Required Development (Missing Features)

### 1. User Management Enhancements

#### A. Create User Endpoint ✅ **ALREADY HANDLED**
**Admin Service Route (Current Implementation):**
```javascript
// User creation is handled by auth-service
// Admin service proxies to auth-service /admin/register
router.post('/users', async (req, res) => {
  // Proxy to auth-service for user creation
  adminProxy('/admin/register', {
    method: 'POST',
    body: req.body,
    headers: { authorization: req.headers.authorization }
  }, req, res);
});
```

**Archive Service Role:**
```
❌ POST /archive/admin/users - NOT NEEDED
✅ User creation stays in auth-service domain
✅ Archive service will automatically track users via existing relationships
✅ User profiles are managed in auth.user_profiles table
```

#### B. Update User Profile
**Admin Service Route:**
```javascript
router.put('/users/:userId/profile', async (req, res) => {
  usersProxy(`/archive/admin/users/${req.params.userId}/profile`, {
    method: 'PUT',
    body: req.body,
    headers: { authorization: req.headers.authorization }
  }, req, res);
});
```

**Required Archive Service Endpoint:**
```
PUT /archive/admin/users/:userId/profile
- Update user profile information
- Modify user settings
- Update user metadata
```

### 2. System Monitoring & Analytics

#### A. Global Statistics Dashboard
**Admin Service Route:**
```javascript
router.get('/stats/global', async (req, res) => {
  usersProxy('/archive/admin/stats/global', {
    method: 'GET',
    query: req.query,
    headers: { authorization: req.headers.authorization }
  }, req, res);
});
```

**Required Archive Service Endpoint:**
```
GET /archive/admin/stats/global
Response:
{
  total_users: number,
  total_assessments: number,
  total_jobs: number,
  successful_jobs: number,
  failed_jobs: number,
  processing_jobs: number,
  success_rate: number,
  system_health: "healthy|warning|critical"
}
```

#### B. Job Monitoring
**Admin Service Route:**
```javascript
router.get('/jobs/monitor', async (req, res) => {
  usersProxy('/archive/admin/jobs/monitor', {
    method: 'GET',
    query: req.query,
    headers: { authorization: req.headers.authorization }
  }, req, res);
});
```

**Required Archive Service Endpoint:**
```
GET /archive/admin/jobs/monitor
Response:
{
  active_jobs: [
    {
      job_id: "string",
      user_id: "uuid",
      status: "processing|queued",
      assessment_name: "string",
      started_at: "timestamp",
      progress: "percentage",
      estimated_completion: "timestamp"
    }
  ],
  queue_stats: {
    queued: number,
    processing: number,
    avg_processing_time: "duration"
  }
}
```

#### C. Daily Analytics
**Admin Service Route:**
```javascript
router.get('/analytics/daily', async (req, res) => {
  usersProxy('/archive/admin/analytics/daily', {
    method: 'GET',
    query: req.query,
    headers: { authorization: req.headers.authorization }
  }, req, res);
});
```

**Required Archive Service Endpoint:**
```
GET /archive/admin/analytics/daily?date=YYYY-MM-DD
Response:
{
  date: "YYYY-MM-DD",
  user_logins: number,
  new_users: number,
  assessments_completed: number,
  assessments_started: number,
  job_success_rate: number,
  popular_assessments: [
    {
      name: "string",
      count: number
    }
  ]
}
```

### 3. Assessment Data Deep Dive

#### A. Assessment Details
**Admin Service Route:**
```javascript
router.get('/assessments/:resultId/details', async (req, res) => {
  usersProxy(`/archive/admin/assessments/${req.params.resultId}/details`, {
    method: 'GET',
    headers: { authorization: req.headers.authorization }
  }, req, res);
});
```

**Required Archive Service Endpoint:**
```
GET /archive/admin/assessments/:resultId/details
Response:
{
  id: "uuid",
  user_id: "uuid",
  assessment_name: "string",
  test_data: {
    riasec: {...},
    ocean: {...},
    viaIs: {...}
  },
  test_result: {
    persona_profile: {...},
    archetype: "string",
    // Full persona profile data
  },
  raw_response: {
    // Original assessment responses
    user_answers: [...],
    processing_metadata: {...}
  },
  processing_info: {
    started_at: "timestamp",
    completed_at: "timestamp",
    processing_time: "duration",
    ai_model_used: "string"
  }
}
```

## 🔧 Archive Service Development Requirements (Updated)

### ✅ **Already Available (Current Implementation):**

1. **User Management (Existing):**
   - ✅ `GET /archive/admin/users` - With pagination, search, sorting
   - ✅ `GET /archive/admin/users/:userId` - With user statistics
   - ✅ `PUT /archive/admin/users/:userId/token-balance` - Token management
   - ✅ `DELETE /archive/admin/users/:userId` - Soft delete functionality

2. **Infrastructure (Existing):**
   - ✅ Admin authentication middleware (`adminAuth.js`)
   - ✅ Database models (AnalysisResult, AnalysisJob, UserProfile, School)
   - ✅ Stats service with caching (`statsService.js`)
   - ✅ Metrics and monitoring (`metricsMiddleware.js`)
   - ✅ Performance optimization with indexes

### 🔄 **New Admin Endpoints Needed:**

1. **Enhanced User Management:**
   - ❌ `POST /archive/admin/users` - **REMOVED** (stays in auth-service)
   - 🆕 `PUT /archive/admin/users/:userId/profile` - Update user profile
   - 🔄 Enhanced existing endpoints with profile data

2. **System Analytics:**
   - 🆕 `GET /archive/admin/stats/global` - System-wide statistics
   - 🆕 `GET /archive/admin/analytics/daily` - Daily analytics
   - 🆕 `GET /archive/admin/analytics/trends` - Trend analysis

3. **Job Monitoring:**
   - 🆕 `GET /archive/admin/jobs/monitor` - Real-time job monitoring
   - 🆕 `GET /archive/admin/jobs/queue` - Queue status
   - 🆕 `POST /archive/admin/jobs/:jobId/cancel` - Cancel job (Phase 4)

4. **Assessment Deep Dive:**
   - 🆕 `GET /archive/admin/assessments/:resultId/details` - Full assessment data
   - 🆕 `GET /archive/admin/assessments/search` - Search assessments
   - 🆕 `GET /archive/admin/assessments/export` - Export assessment data

### 🗄️ **Database Enhancements:**

1. **User Activity Tracking (New Table):**
```sql
CREATE TABLE archive.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  admin_id UUID NOT NULL, -- Track which admin performed the action
  activity_type VARCHAR(50) NOT NULL,
  activity_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_activity_logs_user_id ON archive.user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_admin_id ON archive.user_activity_logs(admin_id);
CREATE INDEX idx_user_activity_logs_created_at ON archive.user_activity_logs(created_at);
CREATE INDEX idx_user_activity_logs_activity_type ON archive.user_activity_logs(activity_type);
```

2. **System Metrics (New Table):**
```sql
CREATE TABLE archive.system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value NUMERIC,
  metric_data JSONB,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_system_metrics_name ON archive.system_metrics(metric_name);
CREATE INDEX idx_system_metrics_recorded_at ON archive.system_metrics(recorded_at);
CREATE INDEX idx_system_metrics_name_recorded ON archive.system_metrics(metric_name, recorded_at);
```

### 🏗️ **Implementation Strategy:**

1. **Leverage Existing Infrastructure:**
   - Use existing `statsService.getSummaryStats()` for global statistics
   - Extend `AnalysisJob` model for job monitoring
   - Utilize `AnalysisResult` model for assessment details
   - Build on existing caching and performance optimizations

2. **Incremental Development:**
   - Each phase builds on previous functionality
   - Maintain backward compatibility
   - Add new features without breaking existing endpoints

3. **Performance Considerations:**
   - Use existing JSONB indexes for persona_profile queries
   - Implement proper pagination for large datasets
   - Leverage Redis caching for frequently accessed data
   - Optimize database queries with proper indexing

## 📊 Admin Page UI Components

### 1. User Management Table
```javascript
// Features needed:
- Sortable columns (username, email, created_at, token_balance)
- Search/filter functionality
- Bulk operations (delete, update tokens)
- Inline editing for basic fields
- User detail modal with full statistics
```

### 2. System Dashboard
```javascript
// Widgets needed:
- Real-time job queue status
- Daily/weekly/monthly statistics charts
- System health indicators
- Recent activity feed
- Performance metrics
```

### 3. Assessment Explorer
```javascript
// Features needed:
- Assessment search and filter
- Detailed view with test_data, test_result, raw_response
- Export functionality
- User assessment history
- Assessment analytics
```

## 🔐 Security Considerations

1. **Admin Authentication:**
   - All endpoints require admin JWT token
   - Role-based access (admin vs superadmin)
   - Activity logging for all admin actions

2. **Data Privacy:**
   - Audit trail for user data access
   - Sensitive data masking in logs
   - GDPR compliance for user deletion

3. **Rate Limiting:**
   - Admin-specific rate limits (1000 req/15min)
   - Separate limits for bulk operations

## 📅 Implementation Timeline (Updated)

### Phase 1 (Week 1-2): Enhanced User Management
**Status**: ✅ Partially Available - Needs Enhancement

**Tasks:**
1. **User Profile Update Endpoint**
   - Add `PUT /archive/admin/users/:userId/profile`
   - Update user profile information in auth.user_profiles
   - Validate profile data and maintain referential integrity

2. **Enhanced User Data Retrieval**
   - Extend existing `GET /archive/admin/users/:userId` with profile details
   - Add school information and demographic data
   - Include comprehensive user statistics

3. **User Activity Logging System**
   - Create `archive.user_activity_logs` table
   - Log all admin actions for audit trail
   - Implement activity tracking middleware

4. **Database Migration**
   ```sql
   CREATE TABLE archive.user_activity_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id),
     admin_id UUID NOT NULL,
     activity_type VARCHAR(50) NOT NULL,
     activity_data JSONB,
     ip_address INET,
     user_agent TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

**Boundaries:**
- ❌ User creation stays in auth-service (admin-service proxies to auth-service)
- ✅ Focus on profile updates and enhanced data retrieval only
- ✅ Implement basic activity logging for admin actions
- ✅ Maintain backward compatibility with existing endpoints

**Deliverables:**
- Enhanced user profile management
- Activity logging system
- Database migration script
- Updated admin user controller

### Phase 2 (Week 3-4): System Monitoring & Analytics
**Status**: 🔄 Needs Implementation - Can Leverage Existing Services

**Tasks:**
1. **Global Statistics Endpoint**
   - Add `GET /archive/admin/stats/global`
   - Leverage existing `statsService.getSummaryStats()`
   - Add system health indicators and success rates
   - Implement caching for performance

2. **Job Monitoring System**
   - Add `GET /archive/admin/jobs/monitor` using AnalysisJob model
   - Real-time active jobs with progress tracking
   - Queue statistics and processing metrics
   - Add `GET /archive/admin/jobs/queue` for queue status

3. **System Metrics Table**
   ```sql
   CREATE TABLE archive.system_metrics (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     metric_name VARCHAR(100) NOT NULL,
     metric_value NUMERIC,
     metric_data JSONB,
     recorded_at TIMESTAMP DEFAULT NOW()
   );
   ```

4. **Enhanced Admin Controller**
   - Create `adminSystemController.js` for system-wide operations
   - Implement job monitoring logic
   - Add system health checks

**Boundaries:**
- ✅ Read-only monitoring, no job manipulation yet
- ✅ Use existing AnalysisJob and AnalysisResult models
- ✅ Implement proper caching for performance
- ✅ Focus on system observability

**Deliverables:**
- Global statistics endpoint
- Job monitoring dashboard data
- System metrics tracking
- Real-time queue status

### Phase 3 (Week 5-6): Deep Analytics & Assessment Details
**Status**: 🔄 Needs Implementation - Database Structure Ready

**Tasks:**
1. **Daily Analytics Endpoint**
   - Add `GET /archive/admin/analytics/daily`
   - User activity metrics, assessment completion rates
   - Popular assessments and success metrics
   - Time-based trend analysis

2. **Assessment Deep Dive**
   - Add `GET /archive/admin/assessments/:resultId/details`
   - Full assessment data using existing AnalysisResult model
   - Include test_data, test_result, raw_responses
   - Processing metadata and performance info

3. **Assessment Search & Export**
   - Add `GET /archive/admin/assessments/search` with filtering
   - Implement pagination for large datasets
   - Add export functionality for assessment data
   - Search by user, date range, assessment type

4. **Trend Analysis Service**
   - Create `trendAnalysisService.js`
   - Weekly/monthly trend calculations
   - Archetype distribution analysis
   - Performance trend tracking

**Boundaries:**
- ✅ Use existing AnalysisResult model structure (test_data, test_result, raw_responses)
- ✅ Focus on data retrieval and analysis, not modification
- ✅ Implement proper pagination for large datasets
- ✅ Maintain data privacy and security standards

**Deliverables:**
- Daily analytics endpoint
- Assessment details with full data
- Search and export functionality
- Trend analysis capabilities

### Phase 4 (Week 7-8): Advanced Features & Optimization
**Status**: 🔄 Enhancement Phase

**Tasks:**
1. **Advanced Job Management**
   - Add `POST /archive/admin/jobs/:jobId/cancel` for job cancellation
   - Job retry and failure analysis
   - Bulk job operations

2. **Performance Optimization**
   - Query optimization for large datasets
   - Advanced caching strategies
   - Database index optimization

3. **Security Enhancements**
   - Enhanced audit logging
   - Data access controls
   - GDPR compliance features

4. **API Documentation**
   - Complete OpenAPI documentation
   - Admin API usage examples
   - Integration guides

**Boundaries:**
- ✅ Focus on operational efficiency
- ✅ Maintain system stability
- ✅ Ensure security compliance
- ✅ Prepare for production deployment

**Deliverables:**
- Advanced job management
- Performance optimizations
- Security enhancements
- Complete documentation

## 🧪 Testing Strategy (Updated)

### Phase-Based Testing Approach:

**Phase 1 Testing:**
1. **Unit Tests:**
   - User profile update endpoint
   - Activity logging middleware
   - Enhanced user data retrieval
2. **Integration Tests:**
   - Admin service ↔ Archive service profile updates
   - Database transaction integrity
3. **Security Tests:**
   - Admin authentication for new endpoints
   - Activity logging accuracy

**Phase 2 Testing:**
1. **Unit Tests:**
   - Global statistics calculations
   - Job monitoring queries
   - System metrics collection
2. **Performance Tests:**
   - Statistics endpoint caching
   - Job monitoring under load
3. **Integration Tests:**
   - Real-time job status updates
   - System health monitoring

**Phase 3 Testing:**
1. **Unit Tests:**
   - Daily analytics calculations
   - Assessment detail retrieval
   - Search and export functionality
2. **Load Tests:**
   - Large dataset pagination
   - Export operations performance
3. **E2E Tests:**
   - Complete admin assessment workflows
   - Data integrity across operations

**Phase 4 Testing:**
1. **Security Tests:**
   - Advanced audit logging
   - Data access controls
   - GDPR compliance verification
2. **Performance Tests:**
   - Optimized query performance
   - Advanced caching effectiveness
3. **Integration Tests:**
   - Complete admin system integration
   - Production readiness verification

### Testing Infrastructure:
- **Docker-based testing** for consistent environments
- **Database seeding** with realistic test data
- **Automated testing** in CI/CD pipeline
- **Performance benchmarking** for each phase

## 📝 Implementation Notes (Updated)

### 🔒 **Security & Compliance:**
- All admin operations logged in `archive.user_activity_logs` for audit purposes
- User data modifications maintain referential integrity across schemas
- GDPR compliance for user deletion and data export
- Role-based access control with admin/superadmin distinction

### 🚀 **Performance Considerations:**
- Leverage existing JSONB indexes for persona_profile queries
- Implement Redis caching for frequently accessed statistics
- Use database connection pooling for optimal performance
- Proper pagination for large dataset operations

### 🔧 **Technical Implementation:**
- Build on existing archive-service infrastructure
- Maintain backward compatibility with current endpoints
- Use existing models (AnalysisResult, AnalysisJob, UserProfile)
- Incremental deployment with feature flags

### 📊 **Data Architecture:**
- User creation remains in auth-service domain
- Archive service focuses on data analysis and monitoring
- Cross-schema relationships properly maintained
- Activity logging for complete audit trail

### 🔄 **Continuous Development:**
- Each phase delivers working functionality
- No breaking changes to existing systems
- Proper testing at each phase boundary
- Documentation updated incrementally

### 🎯 **Success Metrics:**
- **Phase 1:** Enhanced user management with activity logging
- **Phase 2:** Real-time system monitoring and job tracking
- **Phase 3:** Comprehensive analytics and assessment insights
- **Phase 4:** Production-ready admin system with full features

### ⚠️ **Risk Mitigation:**
- Database migrations are additive only
- Existing endpoints remain unchanged
- Proper error handling and rollback procedures
- Performance monitoring throughout implementation