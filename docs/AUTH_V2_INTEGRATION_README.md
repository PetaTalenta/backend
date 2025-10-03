# 🔐 Auth V2 Service - Database Integration Plan

## 📋 Overview

Dokumen ini berisi **comprehensive integration plan** untuk mengintegrasikan **auth-v2-service** (Firebase-based) dengan PostgreSQL database agar production ready dan dapat menggantikan auth-service yang lama.

**Status**: ✅ READY FOR IMPLEMENTATION  
**Created**: 4 Oktober 2025  
**Estimated Timeline**: 6-8 weeks  
**Risk Level**: 🟡 MEDIUM

---

## 📦 Apa yang Sudah Dibuat?

### 1. 📖 Documentation (3 files)

#### Main Planning Document (49KB)
**File**: [`docs/auth-v2-integration-plan.md`](./docs/auth-v2-integration-plan.md)

**Berisi**:
- ✅ Executive summary & goals
- ✅ Architecture design (current, target, hybrid)
- ✅ Database schema changes (detailed)
- ✅ 5 implementation phases dengan step-by-step guide
- ✅ Code examples untuk setiap komponen
- ✅ Risk assessment & mitigation strategies
- ✅ Timeline & resource estimation
- ✅ Success metrics & KPIs
- ✅ Checklist untuk setiap fase
- ✅ Troubleshooting guide

**Read time**: ~2 hours

#### Integration Summary (16KB)
**File**: [`docs/auth-v2-integration-summary.md`](./docs/auth-v2-integration-summary.md)

**Berisi**:
- ✅ Quick start guide
- ✅ Phase-by-phase breakdown
- ✅ Critical considerations
- ✅ Troubleshooting tips
- ✅ Command reference
- ✅ Cost estimation
- ✅ Security considerations
- ✅ Monitoring setup

**Read time**: ~30 minutes

#### Testing Report (16KB)
**File**: [`docs/auth-v2-service-testing-report-2025-10-03.md`](./docs/auth-v2-service-testing-report-2025-10-03.md)

**Berisi**:
- Testing results dari auth-v2-service
- Problem analysis (why can't replace auth-service yet)
- Solution recommendations
- User federation strategy explanation

---

### 2. 🗄️ Database Migrations (6 files)

**Location**: [`migrations/auth-v2-integration/`](./migrations/auth-v2-integration/)

#### SQL Migration Files

| File | Purpose | Size | Status |
|------|---------|------|--------|
| `001_add_firebase_uid.sql` | Menambah kolom `firebase_uid` | 1.9KB | ✅ Ready |
| `002_add_federation_metadata.sql` | Menambah kolom federation tracking | 3.4KB | ✅ Ready |
| `003_optional_password_hash.sql` | Make `password_hash` optional | 2.9KB | ✅ Ready |

**Features**:
- ✅ Idempotent (safe to re-run)
- ✅ Include rollback scripts
- ✅ Verification queries
- ✅ Detailed comments
- ✅ Transaction-safe

#### Helper Scripts

| File | Purpose | Size | Features |
|------|---------|------|----------|
| `run-migrations.sh` | Automated migration runner | 11KB | ✅ Backup<br>✅ Verification<br>✅ Color output<br>✅ Confirmations |
| `rollback-migrations.sh` | Safe rollback script | 9.7KB | ✅ Pre-checks<br>✅ Backup<br>✅ Verification<br>✅ Warnings |

**Both scripts include**:
- Prerequisite checks
- Automatic database backup
- Step-by-step verification
- Color-coded output (errors, warnings, success)
- Safety confirmations
- Detailed logging

#### Migration Guide

**File**: `README.md` (12KB)

**Berisi**:
- Migration file descriptions
- Prerequisites & setup
- How to apply migrations
- Expected schema after migrations
- Verification queries
- Rollback procedures
- Testing guide
- Troubleshooting
- Performance considerations
- Monitoring queries

---

## 🏗️ Architecture

### Current (auth-service)
```
Client → JWT → auth-service → PostgreSQL
```

### Target (auth-v2-service)
```
Client → Firebase Token → auth-v2-service → Firebase Auth
                                 ↓
                            PostgreSQL (mirror)
```

### Hybrid (Migration Phase)
```
Client → API Gateway → auth-service (JWT)
                    └→ auth-v2-service (Firebase)
                             ↓
                        PostgreSQL (shared)
```

---

## 📊 Database Schema Changes

### New Columns

| Column | Type | Purpose | Nullable |
|--------|------|---------|----------|
| `firebase_uid` | VARCHAR(128) | Link to Firebase user | ✅ Yes |
| `auth_provider` | VARCHAR(20) | 'local', 'firebase', 'hybrid' | ❌ No |
| `provider_data` | JSONB | Provider-specific metadata | ✅ Yes |
| `last_firebase_sync` | TIMESTAMP | Last sync timestamp | ✅ Yes |
| `federation_status` | VARCHAR(20) | Sync status | ❌ No |

### Modified Columns

- `password_hash`: Changed from **NOT NULL** to **NULLABLE** (Firebase users don't need password)

### New Indexes

- `idx_users_firebase_uid` - Fast lookup by Firebase UID
- `idx_users_auth_provider` - Filter by provider
- `idx_users_federation_status` - Monitor sync status

### New Constraints

- `chk_auth_provider` - Validate provider values
- `chk_federation_status` - Validate federation status
- `chk_password_hash_required` - Password required for local users only
- `chk_firebase_uid_format` - Firebase UID format validation

---

## 🚀 Quick Start

### Step 1: Review Documentation

```bash
cd /home/rayin/Desktop/atma-backend

# Read main plan (comprehensive)
code docs/auth-v2-integration-plan.md

# Read summary (quick overview)
code docs/auth-v2-integration-summary.md

# Read migration guide
code migrations/auth-v2-integration/README.md
```

### Step 2: Backup Database

```bash
# Automatic backup via script
cd migrations/auth-v2-integration
./run-migrations.sh staging

# Or manual backup
docker exec atma-postgres pg_dump -U atma_user atma_db \
  > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 3: Run Migrations (Staging First!)

```bash
cd migrations/auth-v2-integration
./run-migrations.sh staging
```

**Script will**:
1. ✅ Check Docker & PostgreSQL
2. ✅ Verify migration files exist
3. ✅ Show current schema
4. ✅ Create automatic backup
5. ✅ Run migrations (001 → 002 → 003)
6. ✅ Verify each migration
7. ✅ Show summary & next steps

### Step 4: Verify Migrations

```bash
# Connect to database
docker exec -it atma-postgres psql -U atma_user -d atma_db

# Check schema
\d+ auth.users

# Check constraints
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'auth.users'::regclass
ORDER BY conname;

# Check new columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'auth' 
AND table_name = 'users'
AND column_name IN ('firebase_uid', 'auth_provider', 'provider_data', 'last_firebase_sync', 'federation_status')
ORDER BY column_name;

# Exit
\q
```

### Step 5: Implement Code Changes

Follow the implementation phases in the main plan:

**Phase 2: Auth-v2-service Implementation**
- Add PostgreSQL dependencies
- Create database configuration (`src/config/database.ts`)
- Implement user repository (`src/repositories/user.repository.ts`)
- Create federation service (`src/services/user-federation.service.ts`)
- Update routes with `/verify-token` endpoint

**Phase 3: Service Integration**
- Update assessment-service middleware
- Update archive-service middleware
- Update chatbot-service middleware
- Update api-gateway routing

**Phase 4: Testing**
- Unit tests (>80% coverage)
- Integration tests
- End-to-end tests
- Performance tests

**Phase 5: Deployment**
- Deploy dual mode
- Gradual traffic shift (10% → 50% → 100%)
- Monitor & validate
- Complete migration

---

## 📋 Implementation Phases

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| **Phase 1: Database Preparation** | 5 days | ✅ Migrations applied<br>✅ Schema verified |
| **Phase 2: Auth-v2 Implementation** | 10 days | ✅ PostgreSQL integration<br>✅ User federation service |
| **Phase 3: Service Integration** | 10 days | ✅ All services updated<br>✅ Backward compatible |
| **Phase 4: Testing & Validation** | 7 days | ✅ Tests (>80% coverage)<br>✅ Performance validated |
| **Phase 5: Migration & Deployment** | 10 days | ✅ Production deployment<br>✅ Old service deprecated |
| **Buffer** | 14 days | For unexpected issues |
| **TOTAL** | **8 weeks** | Production ready! |

---

## ⚠️ Critical Warnings

### ❌ DO NOT

1. **DO NOT run migrations on production without testing on staging first**
2. **DO NOT skip database backup**
3. **DO NOT migrate without rollback plan**
4. **DO NOT remove old auth-service until fully tested**
5. **DO NOT apply migrations without reviewing them first**

### ✅ ALWAYS

1. **ALWAYS backup database before migration**
2. **ALWAYS test on staging environment first**
3. **ALWAYS verify each migration step**
4. **ALWAYS have rollback script ready**
5. **ALWAYS monitor logs during deployment**

---

## 🔧 Troubleshooting

### Migration Failed?

```bash
# 1. Check logs
cat /tmp/migration_output.log

# 2. Rollback
cd migrations/auth-v2-integration
./rollback-migrations.sh staging

# 3. Restore from backup
docker exec -i atma-postgres psql -U atma_user -d atma_db < backup_file.sql
```

### Need to Rollback?

```bash
cd migrations/auth-v2-integration
./rollback-migrations.sh staging
```

**Rollback script will**:
- ⚠️ Check for Firebase users (may lose associations)
- ✅ Create backup before rollback
- ✅ Remove all new columns
- ✅ Remove all new constraints
- ✅ Verify rollback success

### Database Connection Issues?

```bash
# Check container status
docker ps | grep postgres

# Check logs
docker logs atma-postgres

# Test connection
docker exec atma-postgres psql -U atma_user -d atma_db -c "SELECT 1;"

# Restart container if needed
docker restart atma-postgres
```

---

## 📚 File Structure

```
atma-backend/
├── docs/
│   ├── auth-v2-integration-plan.md          ← Main plan (50 pages)
│   ├── auth-v2-integration-summary.md       ← Quick summary
│   ├── auth-v2-service-testing-report...    ← Test results
│   └── AUTH_V2_INTEGRATION_README.md        ← This file
│
├── migrations/
│   └── auth-v2-integration/
│       ├── README.md                        ← Migration guide
│       ├── 001_add_firebase_uid.sql         ← Migration 1
│       ├── 002_add_federation_metadata.sql  ← Migration 2
│       ├── 003_optional_password_hash.sql   ← Migration 3
│       ├── run-migrations.sh                ← Automated runner
│       └── rollback-migrations.sh           ← Rollback script
│
└── auth-v2-service/
    ├── src/
    │   ├── config/
    │   │   ├── firebase-config.ts           ← Existing
    │   │   └── database.ts                  ← TO CREATE
    │   ├── repositories/
    │   │   └── user.repository.ts           ← TO CREATE
    │   ├── services/
    │   │   └── user-federation.service.ts   ← TO CREATE
    │   └── adapters/
    │       └── auth-adapter.ts              ← TO CREATE
    └── docs/
        └── user-federation-strategy.md      ← Reference docs
```

---

## 🎯 Success Criteria

Project is complete when:

- ✅ All database migrations applied successfully
- ✅ Auth-v2-service integrated with PostgreSQL
- ✅ All services can verify Firebase tokens
- ✅ Backward compatibility maintained (no breaking changes)
- ✅ Test coverage > 80%
- ✅ Performance metrics met (response time < 200ms)
- ✅ Zero data loss during migration
- ✅ Documentation complete
- ✅ Production deployment successful
- ✅ Old auth-service can be deprecated

---

## 📊 Key Metrics

### Performance Targets

```
Response Time:
├── Token verification: < 50ms
├── User lookup: < 100ms
├── Lazy user creation: < 150ms
└── Overall response: < 200ms (p95)

Reliability:
├── Uptime: > 99.9%
├── Error rate: < 0.1%
├── User sync rate: 100%
└── Fallback success: 100%

Quality:
├── Test coverage: > 80%
├── Breaking changes: 0
├── Security issues: 0
└── Data loss: 0
```

---

## 💰 Cost Estimation

### Firebase (Monthly)

```
Free Tier (covers most use cases):
├── 10,000 token verifications/month: FREE
├── 50,000 users: FREE
└── Basic features: FREE

Paid (if exceeded free tier):
├── Phone auth: $0.06/verification
├── Additional users: Minimal cost
└── Monitoring: $25/month (optional)

Estimated: $0-50/month for small to medium scale
```

### Development

```
Team: 2-3 developers + 1 QA + 1 DevOps
Duration: 6-8 weeks
Total Effort: 240-320 hours

Breakdown:
├── Database migrations: 16 hours
├── Backend implementation: 120 hours
├── Service integration: 60 hours
├── Testing: 40 hours
├── Deployment: 20 hours
└── Documentation: 24 hours
```

---

## 🔐 Security Features

### Authentication
- ✅ Firebase Auth (SOC 2 compliant)
- ✅ Token verification on every request
- ✅ Encrypted token transmission (HTTPS)
- ✅ Rate limiting on auth endpoints

### Database
- ✅ Encrypted connections (SSL)
- ✅ Prepared statements (SQL injection prevention)
- ✅ Regular backups
- ✅ Row-level security (optional)

### Token Management
- ✅ Short-lived tokens (1 hour)
- ✅ Refresh token rotation
- ✅ Token revocation support
- ✅ HTTPS only

---

## 📞 Support & Resources

### Documentation Links

- **Main Plan**: [`docs/auth-v2-integration-plan.md`](./docs/auth-v2-integration-plan.md)
- **Quick Summary**: [`docs/auth-v2-integration-summary.md`](./docs/auth-v2-integration-summary.md)
- **Migration Guide**: [`migrations/auth-v2-integration/README.md`](./migrations/auth-v2-integration/README.md)
- **Testing Report**: [`docs/auth-v2-service-testing-report-2025-10-03.md`](./docs/auth-v2-service-testing-report-2025-10-03.md)

### Scripts

```bash
# Run migrations (with backup)
./migrations/auth-v2-integration/run-migrations.sh staging

# Rollback migrations
./migrations/auth-v2-integration/rollback-migrations.sh staging

# Manual backup
docker exec atma-postgres pg_dump -U atma_user atma_db > backup.sql

# Verify schema
docker exec -it atma-postgres psql -U atma_user -d atma_db -c "\d auth.users"
```

### Common Commands

```bash
# Check services
docker ps | grep auth

# View logs
docker logs atma-auth-v2-service
docker logs atma-postgres

# Database connection
docker exec -it atma-postgres psql -U atma_user -d atma_db

# Restart service
docker restart atma-auth-v2-service
```

---

## ✅ Next Steps

### Immediate Actions (This Week)

1. **Review all documentation** (~3 hours)
   - Read main plan
   - Read summary
   - Read migration guide

2. **Setup development environment**
   - Create development branch
   - Setup project tracking (Jira/Trello)
   - Assign roles

3. **Schedule team meetings**
   - Kickoff meeting
   - Technical deep-dive
   - Sprint planning

### Week 1: Database Preparation

1. **Backup production database**
2. **Run migrations on staging**
3. **Verify schema changes**
4. **Test rollback procedure**
5. **Document any issues**

### Week 2-3: Implementation

1. **Implement database integration in auth-v2-service**
2. **Create user repository**
3. **Create federation service**
4. **Add /verify-token endpoint**
5. **Write unit tests**

### Week 4-5: Integration & Testing

1. **Update all service middlewares**
2. **Integration testing**
3. **Performance testing**
4. **Security audit**
5. **Bug fixes**

### Week 6-8: Deployment

1. **Deploy to staging**
2. **Gradual traffic shift**
3. **Monitor & validate**
4. **Production deployment**
5. **Deprecate old service**

---

## 🎓 Learning Resources

### For Developers

1. **Firebase Authentication**: https://firebase.google.com/docs/auth
2. **PostgreSQL Advanced Features**: https://www.postgresql.org/docs/
3. **User Federation Patterns**: See `auth-v2-service/docs/user-federation-strategy.md`
4. **Testing Best Practices**: Jest/Bun testing documentation

### Internal Documentation

- Read existing auth-v2-service code
- Review user federation strategy document
- Study migration scripts
- Check testing report for insights

---

## 📈 Benefits

### For Users
- ✅ Faster authentication
- ✅ Better security (Firebase)
- ✅ Social login ready (future)
- ✅ Improved reliability

### For Developers
- ✅ Cleaner architecture
- ✅ Separation of concerns
- ✅ Easier maintenance
- ✅ Better testing

### For Business
- ✅ Scalable authentication
- ✅ Reduced maintenance costs
- ✅ Modern tech stack
- ✅ Future-proof solution

---

## ⭐ Project Status

| Item | Status | Notes |
|------|--------|-------|
| **Planning** | ✅ Complete | 50-page comprehensive plan |
| **Database Design** | ✅ Complete | Schema changes documented |
| **Migration Scripts** | ✅ Complete | 3 SQL files + helper scripts |
| **Documentation** | ✅ Complete | 4 detailed documents |
| **Implementation** | ⏳ Pending | Ready to start |
| **Testing** | ⏳ Pending | Test plans ready |
| **Deployment** | ⏳ Pending | Deployment strategy ready |

---

## 🏆 Conclusion

Semua planning dan preparation untuk auth-v2-service integration sudah **COMPLETE** dan **READY FOR IMPLEMENTATION**.

**What's Ready**:
- ✅ Comprehensive planning document (50 pages)
- ✅ Database migration scripts (3 SQL files)
- ✅ Helper scripts (run, rollback)
- ✅ Detailed documentation (4 files)
- ✅ Code examples for all components
- ✅ Testing strategies
- ✅ Deployment procedures
- ✅ Risk mitigation plans

**What's Next**:
- Team review & approval
- Sprint planning
- Begin implementation (Phase 1: Database Preparation)

**Estimated Timeline**: 6-8 weeks to production

**Success Probability**: 🟢 HIGH (with proper execution)

---

**Created**: 4 Oktober 2025  
**Last Updated**: 4 Oktober 2025  
**Status**: ✅ READY FOR IMPLEMENTATION  
**Version**: 1.0

---

## 📧 Questions?

For questions or clarifications:
1. Review the documentation first
2. Check troubleshooting sections
3. Run scripts with `--help` flag (if available)
4. Contact team lead

**Remember**: Always test on staging first! 🧪

---

**Happy Coding! 🚀**
