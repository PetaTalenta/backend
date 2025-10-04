# Auth V2 Integration - Rollback Procedure

**Created**: October 4, 2025  
**Phase**: 5 - Migration & Deployment  
**Status**: Ready for Use  
**Risk Level**: 🔴 CRITICAL - Use only when necessary

---

## 📋 Table of Contents

1. [When to Rollback](#when-to-rollback)
2. [Pre-Rollback Checklist](#pre-rollback-checklist)
3. [Rollback Procedures](#rollback-procedures)
4. [Post-Rollback Verification](#post-rollback-verification)
5. [Recovery Steps](#recovery-steps)

---

## ⚠️ When to Rollback

### Critical Issues (Immediate Rollback Required)

1. **Authentication Failure** - Users cannot login (>5% failure rate)
2. **Data Loss** - User data is being corrupted or lost
3. **Service Outage** - Auth-v2-service is down for >5 minutes
4. **Database Corruption** - Database integrity issues detected
5. **Security Breach** - Security vulnerability discovered

### Non-Critical Issues (Rollback Optional)

1. **Performance Degradation** - Response time >500ms (p95)
2. **Intermittent Errors** - Error rate 1-5%
3. **Feature Issues** - Specific features not working correctly

---

## 🔍 Pre-Rollback Checklist

Before initiating rollback, verify:

- [ ] Issue is confirmed and reproducible
- [ ] Issue cannot be fixed with quick patch
- [ ] Team lead has approved rollback
- [ ] Backup is available and verified
- [ ] Rollback procedure has been reviewed
- [ ] Team is ready to execute rollback
- [ ] Users have been notified (if applicable)

---

## 🔄 Rollback Procedures

### Procedure 1: Service-Level Rollback (Fastest - 5 minutes)

**Use Case**: Auth-v2-service issues, database is fine

**Steps**:

```bash
# 1. Stop auth-v2-service
docker compose stop auth-v2-service

# 2. Verify old auth-service is running
docker compose ps auth-service

# 3. If not running, start it
docker compose start auth-service

# 4. Verify auth-service health
curl http://localhost:3001/health

# 5. Update API Gateway routing (if needed)
# This depends on your API Gateway configuration
# Ensure all traffic goes to auth-service (port 3001)

# 6. Monitor logs
docker compose logs -f auth-service
```

**Verification**:
```bash
# Test login with old auth-service
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

---

### Procedure 2: Database Rollback (Medium - 15 minutes)

**Use Case**: Database schema issues, need to revert migrations

**Steps**:

```bash
# 1. Stop all services that use the database
docker compose stop auth-v2-service auth-service archive-service \
  assessment-service chatbot-service notification-service

# 2. Create emergency backup (just in case)
./scripts/backup-database.sh emergency_before_rollback

# 3. Restore from backup
BACKUP_FILE="backups/backup_YYYYMMDD_HHMMSS.sql"
docker exec -i atma-postgres psql -U atma_user -d atma_db < $BACKUP_FILE

# 4. Verify database restoration
docker exec atma-postgres psql -U atma_user -d atma_db -c "
  SELECT COUNT(*) as total_users FROM auth.users;
  SELECT auth_provider, COUNT(*) FROM auth.users GROUP BY auth_provider;
"

# 5. Restart services
docker compose start auth-service archive-service \
  assessment-service chatbot-service notification-service

# 6. Verify services are healthy
docker compose ps
```

**Verification**:
```bash
# Check database schema
docker exec atma-postgres psql -U atma_user -d atma_db -c "
  \d auth.users
"

# Verify user count matches backup
docker exec atma-postgres psql -U atma_user -d atma_db -c "
  SELECT COUNT(*) FROM auth.users;
"
```

---

### Procedure 3: Full Rollback (Slowest - 30 minutes)

**Use Case**: Complete system rollback, including code changes

**Steps**:

```bash
# 1. Stop all services
docker compose down

# 2. Restore database from backup
BACKUP_FILE="backups/backup_YYYYMMDD_HHMMSS.sql"
docker compose up -d postgres
sleep 10
docker exec -i atma-postgres psql -U atma_user -d atma_db < $BACKUP_FILE

# 3. Checkout previous Git commit (if code changes were made)
git log --oneline -10  # Find the commit before auth-v2 changes
git checkout <commit-hash>

# 4. Rebuild Docker images (if needed)
docker compose build auth-service

# 5. Start all services
docker compose up -d

# 6. Wait for services to be healthy
sleep 30

# 7. Verify all services
docker compose ps
```

**Verification**:
```bash
# Test all services
curl http://localhost:3001/health  # auth-service
curl http://localhost:3002/archive/health  # archive-service
curl http://localhost:3003/health  # assessment-service
curl http://localhost:3006/health  # chatbot-service
```

---

## ✅ Post-Rollback Verification

After rollback, verify the following:

### 1. Service Health

```bash
# Check all services are running
docker compose ps

# Check service health endpoints
curl http://localhost:3001/health
curl http://localhost:3002/archive/health
curl http://localhost:3003/health
curl http://localhost:3006/health
```

### 2. Authentication

```bash
# Test login with old auth-service
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"kasykoi@gmail.com","password":"Anjas123"}'
```

### 3. Database Integrity

```bash
# Check user count
docker exec atma-postgres psql -U atma_user -d atma_db -c "
  SELECT COUNT(*) as total_users FROM auth.users;
"

# Check for data corruption
docker exec atma-postgres psql -U atma_user -d atma_db -c "
  SELECT COUNT(*) as users_with_email FROM auth.users WHERE email IS NOT NULL;
  SELECT COUNT(*) as users_with_username FROM auth.users WHERE username IS NOT NULL;
"
```

### 4. Service Integration

```bash
# Test service-to-service communication
# (Use appropriate test endpoints for your services)
```

---

## 🔧 Recovery Steps

After successful rollback:

### 1. Incident Analysis

- Document what went wrong
- Identify root cause
- Determine if issue was preventable
- Update testing procedures

### 2. Fix Planning

- Create fix plan for the issue
- Test fix in staging environment
- Get approval for re-deployment
- Schedule re-deployment

### 3. Communication

- Notify stakeholders of rollback
- Explain what happened
- Provide timeline for fix
- Update status page

### 4. Prevention

- Add tests to prevent recurrence
- Update deployment checklist
- Improve monitoring/alerting
- Document lessons learned

---

## 📞 Emergency Contacts

**Team Lead**: [Name]  
**Database Admin**: [Name]  
**DevOps Lead**: [Name]  
**On-Call Engineer**: [Name]

---

## 📚 Related Documents

- [AUTH_V2_INTEGRATION_COMPREHENSIVE_PLAN.md](./AUTH_V2_INTEGRATION_COMPREHENSIVE_PLAN.md)
- [AUTH_V2_PHASE5_REPORT.md](./AUTH_V2_PHASE5_REPORT.md)
- [Migration Scripts](../migrations/auth-v2-integration/)

---

## 🔐 Security Notes

- All rollback operations should be logged
- Backup files should be encrypted
- Access to rollback procedures should be restricted
- Rollback should be approved by team lead

---

**Last Updated**: October 4, 2025  
**Version**: 1.0  
**Status**: Ready for Use

