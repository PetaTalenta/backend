# 🔄 Auth V2 User Migration Strategy

## Problem Statement

**Critical Issue**: Users registered with old auth-service (email + password in PostgreSQL) cannot login via auth-v2-service endpoints because they don't exist in Firebase.

**Status**: ⚠️ **BLOCKING ISSUE** - Must be resolved before deprecating old auth-service

---

## Current Situation

### Old Auth-Service Users
- Stored in PostgreSQL `auth.users` table
- Has `email` + `password_hash` (bcrypt)
- Can login via old auth-service JWT endpoints
- **Cannot login via auth-v2-service endpoints** ❌

### Auth-v2-Service Current Behavior
```
User → POST /v1/auth/login (email, password)
     → Firebase Authentication API
     → Firebase checks if user exists
     → If not exists: ERROR "USER_NOT_FOUND" ❌
```

---

## Solution Options

### Option 1: One-Time Migration Script (Recommended for Small User Base)

**Pros**:
- ✅ Clean migration, all users moved at once
- ✅ Simple to implement
- ✅ No complex dual-mode logic

**Cons**:
- ❌ Requires users to reset password (Firebase can't import bcrypt hashes directly)
- ❌ User impact - all users need to do password reset
- ❌ Not ideal for large user base

**Implementation Steps**:
1. Export all users from PostgreSQL
2. Create Firebase accounts with temporary passwords
3. Send password reset emails to all users
4. Users click link and set new password
5. Users can now login via auth-v2-service

**Script Example**:
```bash
# Run migration script
node scripts/migrate-users-to-firebase.js

# Script will:
# 1. Fetch all users from PostgreSQL
# 2. Create Firebase accounts
# 3. Send password reset emails
# 4. Update PostgreSQL with firebase_uid
```

---

### Option 2: Hybrid Authentication (Recommended for Large User Base)

**Pros**:
- ✅ Zero user impact - seamless migration
- ✅ No password resets required
- ✅ Users migrated on first login

**Cons**:
- ❌ More complex implementation
- ❌ Requires maintaining dual auth logic temporarily
- ❌ Security consideration - need to handle password migration carefully

**How It Works**:

```
User → POST /v1/auth/login (email, password)
     ↓
Check if user exists in Firebase
     ↓
     ├─ YES → Authenticate with Firebase (normal flow)
     │
     └─ NO → Check if user exists in PostgreSQL
            ↓
            ├─ NO → Return "User not found"
            │
            └─ YES → Verify password against PostgreSQL hash
                   ↓
                   ├─ INVALID → Return "Invalid credentials"
                   │
                   └─ VALID → Migrate user to Firebase
                            ↓
                            1. Create Firebase account with new password
                            2. Update PostgreSQL with firebase_uid
                            3. Return Firebase ID token
                            4. User successfully logged in ✅
```

**Implementation**:

**File**: `auth-v2-service/src/routes/auth.ts`

Add new hybrid login endpoint:

```typescript
// POST /v1/auth/login (hybrid mode)
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid('json') as LoginRequest;

    // STEP 1: Try Firebase authentication first
    const signInResponse = await fetch(FIREBASE_AUTH_ENDPOINTS.signIn, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    });

    const signInData = await signInResponse.json();

    // If Firebase authentication successful, return normally
    if (signInResponse.ok) {
      const firebaseAuth = getFirebaseAuth();
      const userRecord = await firebaseAuth.getUser(signInData.localId);

      // Sync with PostgreSQL (lazy creation)
      await userFederationService.getOrCreateUser(userRecord);

      return sendSuccess(c, {
        uid: signInData.localId,
        email: signInData.email,
        displayName: userRecord.displayName,
        idToken: signInData.idToken,
        refreshToken: signInData.refreshToken,
        expiresIn: signInData.expiresIn,
      }, 'Login successful');
    }

    // STEP 2: If Firebase says "USER_NOT_FOUND", check PostgreSQL
    if (signInData.error?.message?.includes('USER_NOT_FOUND') || 
        signInData.error?.message?.includes('EMAIL_NOT_FOUND')) {
      
      console.log(`🔄 User not found in Firebase, checking PostgreSQL: ${email}`);

      // Check if user exists in PostgreSQL
      const pgUser = await userRepository.findByEmail(email);

      if (!pgUser) {
        return sendUnauthorized(c, 'Invalid email or password');
      }

      // Check if user has password_hash (old local auth user)
      if (!pgUser.password_hash) {
        return sendBadRequest(c, 'User must reset password to use new authentication system');
      }

      // Verify password against PostgreSQL hash
      const bcrypt = require('bcrypt');
      const passwordValid = await bcrypt.compare(password, pgUser.password_hash);

      if (!passwordValid) {
        return sendUnauthorized(c, 'Invalid email or password');
      }

      // STEP 3: Password is valid - migrate user to Firebase
      console.log(`✅ Password valid, migrating user to Firebase: ${email}`);

      try {
        // Create Firebase user with the same password
        const firebaseAuth = getFirebaseAuth();
        const newFirebaseUser = await firebaseAuth.createUser({
          email: email,
          password: password, // Use the same password
          displayName: pgUser.username || undefined,
          emailVerified: true, // Trust existing users
        });

        console.log(`✅ Created Firebase user: ${newFirebaseUser.uid}`);

        // Update PostgreSQL with Firebase UID
        await userRepository.updateUser(pgUser.id, {
          firebase_uid: newFirebaseUser.uid,
          auth_provider: 'hybrid',
          last_firebase_sync: new Date(),
          federation_status: 'active',
        });

        console.log(`✅ Linked PostgreSQL user to Firebase: ${pgUser.id}`);

        // Generate Firebase tokens
        const customToken = await firebaseAuth.createCustomToken(newFirebaseUser.uid);
        
        // Exchange custom token for ID token
        const tokenResponse = await fetch(FIREBASE_AUTH_ENDPOINTS.customToken, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: customToken,
            returnSecureToken: true,
          }),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
          throw new Error('Failed to generate Firebase tokens');
        }

        return sendSuccess(c, {
          uid: newFirebaseUser.uid,
          email: newFirebaseUser.email,
          displayName: newFirebaseUser.displayName,
          idToken: tokenData.idToken,
          refreshToken: tokenData.refreshToken,
          expiresIn: tokenData.expiresIn,
          migrated: true, // Flag to indicate user was migrated
        }, 'Login successful - Account migrated to new authentication system');

      } catch (migrationError: any) {
        console.error('❌ Failed to migrate user to Firebase:', migrationError);
        
        // If migration fails, still allow login but mark for manual review
        await userRepository.updateUser(pgUser.id, {
          federation_status: 'failed',
        });

        return sendInternalError(c, 'Failed to migrate account. Please contact support.');
      }
    }

    // STEP 4: Other Firebase errors (wrong password, etc.)
    return handleFirebaseError(c, signInData.error);

  } catch (error: any) {
    console.error('Login error:', error);
    return handleGenericError(c, error);
  }
});
```

---

### Option 3: Password Reset for All Users (Simplest)

**Pros**:
- ✅ Very simple to implement
- ✅ Most secure (users set fresh passwords)
- ✅ Clean separation between old and new systems

**Cons**:
- ❌ Worst user experience
- ❌ Users must take action before using new system
- ❌ May lose inactive users

**Implementation Steps**:
1. Send email to all users: "We've upgraded our authentication system. Please reset your password."
2. Provide password reset link (Firebase password reset)
3. Users set new password
4. Can now login via auth-v2-service

---

## Recommendation

### For Your Situation

**I recommend: Option 2 - Hybrid Authentication**

**Reasons**:
1. ✅ **Zero user impact** - users don't even notice the migration
2. ✅ **Gradual migration** - users migrate on their next login
3. ✅ **No forced password resets** - better user experience
4. ✅ **Backward compatible** - old users can still login
5. ✅ **Automatic cleanup** - inactive users stay in old system

**Timeline**:
- Implementation: 2-3 days
- Testing: 1 day
- Deployment: Same day (no downtime)
- Full migration: 1-3 months (as users login naturally)

---

## Implementation Checklist

### Phase 1: Update auth-v2-service
- [ ] Add bcrypt dependency (`bun add bcrypt`)
- [ ] Update `/login` endpoint with hybrid logic
- [ ] Add migration logging and monitoring
- [ ] Test with existing PostgreSQL users
- [ ] Test with new Firebase users
- [ ] Test error cases (wrong password, no user, etc.)

### Phase 2: Database Changes
- [ ] Add `migration_status` column to track migration progress
- [ ] Create index on `auth_provider` for performance
- [ ] Add migration metrics tracking

### Phase 3: Monitoring
- [ ] Set up metrics for migration progress
- [ ] Monitor migration failures
- [ ] Track percentage of users migrated
- [ ] Alert on migration errors

### Phase 4: Documentation
- [ ] Update API documentation
- [ ] Add migration status to health check
- [ ] Document rollback procedure

---

## Migration Metrics

Track these metrics to monitor migration progress:

```sql
-- Total users
SELECT COUNT(*) FROM auth.users;

-- Users migrated (have firebase_uid)
SELECT COUNT(*) FROM auth.users WHERE firebase_uid IS NOT NULL;

-- Users pending migration (no firebase_uid)
SELECT COUNT(*) FROM auth.users WHERE firebase_uid IS NULL;

-- Migration progress percentage
SELECT 
  ROUND(
    COUNT(*) FILTER (WHERE firebase_uid IS NOT NULL)::numeric / 
    COUNT(*)::numeric * 100, 
    2
  ) as migration_percentage
FROM auth.users;

-- Users by auth provider
SELECT auth_provider, COUNT(*) 
FROM auth.users 
GROUP BY auth_provider;

-- Failed migrations
SELECT COUNT(*) 
FROM auth.users 
WHERE federation_status = 'failed';
```

---

## Security Considerations

### Password Migration
- ✅ **DO**: Use the password provided by user during login (they just proved they know it)
- ✅ **DO**: Create Firebase user with same password immediately
- ✅ **DO**: Clear password_hash from PostgreSQL after successful migration (optional)
- ❌ **DON'T**: Store password in plaintext anywhere
- ❌ **DON'T**: Log passwords in migration logs

### Error Handling
- ✅ **DO**: Mark user as `federation_status: 'failed'` if migration fails
- ✅ **DO**: Provide clear error messages to users
- ✅ **DO**: Retry failed migrations on next login
- ✅ **DO**: Alert admins of repeated migration failures

---

## Rollback Plan

If hybrid authentication causes issues:

1. **Immediate**: Route all traffic back to old auth-service
2. **Keep Firebase users working**: Don't delete Firebase accounts
3. **Fix issues**: Debug and fix hybrid auth logic in staging
4. **Retry**: Re-enable hybrid auth with fixes

---

## Testing Strategy

### Test Cases

1. **New Firebase user login** (should work normally)
   ```bash
# Register new user
   POST /v1/auth/register
   
   # Login
   POST /v1/auth/login
   # Expected: Success via Firebase
```

2. **Old PostgreSQL user first login** (should trigger migration)
   ```bash
# Login with old credentials
   POST /v1/auth/login
   # Expected: Success + account migrated + firebase_uid updated
```

3. **Old PostgreSQL user second login** (should use Firebase)
   ```bash
# Login again
   POST /v1/auth/login
   # Expected: Success via Firebase (no migration needed)
```

4. **Invalid password** (should fail)
   ```bash
POST /v1/auth/login (wrong password)
   # Expected: Unauthorized
```

5. **Non-existent user** (should fail)
   ```bash
POST /v1/auth/login (email not in system)
   # Expected: Unauthorized
```

---

## Completion Criteria

Migration is complete when:

- [ ] 95%+ of active users have been migrated
- [ ] No migration errors in last 7 days
- [ ] All services working correctly with Firebase tokens
- [ ] Old auth-service receiving <5% of traffic
- [ ] User satisfaction metrics maintained
- [ ] Zero security incidents related to migration

---

## Timeline

**Week 1**: Implementation
- Days 1-2: Update auth-v2-service with hybrid logic
- Days 3-4: Testing (unit + integration)
- Day 5: Deploy to staging

**Week 2**: Deployment
- Day 1: Deploy to production (10% traffic)
- Day 2: Monitor and validate
- Day 3: Increase to 50% traffic
- Day 4-5: Monitor migration progress

**Weeks 3-12**: Natural Migration
- Users migrate on their next login
- Monitor progress weekly
- Handle edge cases

**Week 13+**: Cleanup
- Deprecate old auth-service
- Optional: Force remaining users to reset password

---

## Frequently Asked Questions

### Q: What happens to users who never login again?

A: They remain in PostgreSQL with `auth_provider: 'local'`. When/if they eventually login, they'll be migrated then. If you want to force migration, you can send them password reset emails.

### Q: Can users still use the old auth-service during migration?

A: Yes! The hybrid approach allows both systems to work simultaneously. Dual mode is supported.

### Q: What if Firebase migration fails?

A: User sees error message. Their account is marked `federation_status: 'failed'`. On next login, migration is retried automatically.

### Q: Is this secure?

A: Yes! We only migrate the user when they prove they know the password. We don't expose or transfer password hashes anywhere.

### Q: How long does migration take per user?

A: ~500ms - 1 second for first login (includes Firebase account creation). Subsequent logins are fast (~50-200ms).

---

**Created**: October 4, 2025  
**Status**: 🟡 **PENDING IMPLEMENTATION**  
**Priority**: 🔴 **HIGH** - Blocking issue for auth-v2 production rollout

---
# 🔄 Auth V2 User Migration Strategy

## Problem Statement

**Critical Issue**: Users registered with old auth-service (email + password in PostgreSQL) cannot login via auth-v2-service endpoints because they don't exist in Firebase.

**Status**: ⚠️ **BLOCKING ISSUE** - Must be resolved before deprecating old auth-service

---

## Current Situation

### Old Auth-Service Users
- Stored in PostgreSQL `auth.users` table
- Has `email` + `password_hash` (bcrypt)
- Can login via old auth-service JWT endpoints
- **Cannot login via auth-v2-service endpoints** ❌

### Auth-v2-Service Current Behavior
```
User → POST /v1/auth/login (email, password)
     → Firebase Authentication API
     → Firebase checks if user exists
     → If not exists: ERROR "USER_NOT_FOUND" ❌
```

---

## Solution Options

### Option 1: One-Time Migration Script (Recommended for Small User Base)

**Pros**:
- ✅ Clean migration, all users moved at once
- ✅ Simple to implement
- ✅ No complex dual-mode logic

**Cons**:
- ❌ Requires users to reset password (Firebase can't import bcrypt hashes directly)
- ❌ User impact - all users need to do password reset
- ❌ Not ideal for large user base

**Implementation Steps**:
1. Export all users from PostgreSQL
2. Create Firebase accounts with temporary passwords
3. Send password reset emails to all users
4. Users click link and set new password
5. Users can now login via auth-v2-service

**Script Example**:
```bash
# Run migration script
node scripts/migrate-users-to-firebase.js

# Script will:
# 1. Fetch all users from PostgreSQL
# 2. Create Firebase accounts
# 3. Send password reset emails
# 4. Update PostgreSQL with firebase_uid
```

---

### Option 2: Hybrid Authentication (Recommended for Large User Base)

**Pros**:
- ✅ Zero user impact - seamless migration
- ✅ No password resets required
- ✅ Users migrated on first login

**Cons**:
- ❌ More complex implementation
- ❌ Requires maintaining dual auth logic temporarily
- ❌ Security consideration - need to handle password migration carefully

**How It Works**:

```
User → POST /v1/auth/login (email, password)
     ↓
Check if user exists in Firebase
     ↓
     ├─ YES → Authenticate with Firebase (normal flow)
     │
     └─ NO → Check if user exists in PostgreSQL
            ↓
            ├─ NO → Return "User not found"
            │
            └─ YES → Verify password against PostgreSQL hash
                   ↓
                   ├─ INVALID → Return "Invalid credentials"
                   │
                   └─ VALID → Migrate user to Firebase
                            ↓
                            1. Create Firebase account with new password
                            2. Update PostgreSQL with firebase_uid
                            3. Return Firebase ID token
                            4. User successfully logged in ✅
```

**Implementation**:

**File**: `auth-v2-service/src/routes/auth.ts`

Add new hybrid login endpoint:

```typescript
// POST /v1/auth/login (hybrid mode)
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid('json') as LoginRequest;

    // STEP 1: Try Firebase authentication first
    const signInResponse = await fetch(FIREBASE_AUTH_ENDPOINTS.signIn, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    });

    const signInData = await signInResponse.json();

    // If Firebase authentication successful, return normally
    if (signInResponse.ok) {
      const firebaseAuth = getFirebaseAuth();
      const userRecord = await firebaseAuth.getUser(signInData.localId);

      // Sync with PostgreSQL (lazy creation)
      await userFederationService.getOrCreateUser(userRecord);

      return sendSuccess(c, {
        uid: signInData.localId,
        email: signInData.email,
        displayName: userRecord.displayName,
        idToken: signInData.idToken,
        refreshToken: signInData.refreshToken,
        expiresIn: signInData.expiresIn,
      }, 'Login successful');
    }

    // STEP 2: If Firebase says "USER_NOT_FOUND", check PostgreSQL
    if (signInData.error?.message?.includes('USER_NOT_FOUND') || 
        signInData.error?.message?.includes('EMAIL_NOT_FOUND')) {
      
      console.log(`🔄 User not found in Firebase, checking PostgreSQL: ${email}`);

      // Check if user exists in PostgreSQL
      const pgUser = await userRepository.findByEmail(email);

      if (!pgUser) {
        return sendUnauthorized(c, 'Invalid email or password');
      }

      // Check if user has password_hash (old local auth user)
      if (!pgUser.password_hash) {
        return sendBadRequest(c, 'User must reset password to use new authentication system');
      }

      // Verify password against PostgreSQL hash
      const bcrypt = require('bcrypt');
      const passwordValid = await bcrypt.compare(password, pgUser.password_hash);

      if (!passwordValid) {
        return sendUnauthorized(c, 'Invalid email or password');
      }

      // STEP 3: Password is valid - migrate user to Firebase
      console.log(`✅ Password valid, migrating user to Firebase: ${email}`);

      try {
        // Create Firebase user with the same password
        const firebaseAuth = getFirebaseAuth();
        const newFirebaseUser = await firebaseAuth.createUser({
          email: email,
          password: password, // Use the same password
          displayName: pgUser.username || undefined,
          emailVerified: true, // Trust existing users
        });

        console.log(`✅ Created Firebase user: ${newFirebaseUser.uid}`);

        // Update PostgreSQL with Firebase UID
        await userRepository.updateUser(pgUser.id, {
          firebase_uid: newFirebaseUser.uid,
          auth_provider: 'hybrid',
          last_firebase_sync: new Date(),
          federation_status: 'active',
        });

        console.log(`✅ Linked PostgreSQL user to Firebase: ${pgUser.id}`);

        // Generate Firebase tokens
        const customToken = await firebaseAuth.createCustomToken(newFirebaseUser.uid);
        
        // Exchange custom token for ID token
        const tokenResponse = await fetch(FIREBASE_AUTH_ENDPOINTS.customToken, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: customToken,
            returnSecureToken: true,
          }),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
          throw new Error('Failed to generate Firebase tokens');
        }

        return sendSuccess(c, {
          uid: newFirebaseUser.uid,
          email: newFirebaseUser.email,
          displayName: newFirebaseUser.displayName,
          idToken: tokenData.idToken,
          refreshToken: tokenData.refreshToken,
          expiresIn: tokenData.expiresIn,
          migrated: true, // Flag to indicate user was migrated
        }, 'Login successful - Account migrated to new authentication system');

      } catch (migrationError: any) {
        console.error('❌ Failed to migrate user to Firebase:', migrationError);
        
        // If migration fails, still allow login but mark for manual review
        await userRepository.updateUser(pgUser.id, {
          federation_status: 'failed',
        });

        return sendInternalError(c, 'Failed to migrate account. Please contact support.');
      }
    }

    // STEP 4: Other Firebase errors (wrong password, etc.)
    return handleFirebaseError(c, signInData.error);

  } catch (error: any) {
    console.error('Login error:', error);
    return handleGenericError(c, error);
  }
});
```

---

### Option 3: Password Reset for All Users (Simplest)

**Pros**:
- ✅ Very simple to implement
- ✅ Most secure (users set fresh passwords)
- ✅ Clean separation between old and new systems

**Cons**:
- ❌ Worst user experience
- ❌ Users must take action before using new system
- ❌ May lose inactive users

**Implementation Steps**:
1. Send email to all users: "We've upgraded our authentication system. Please reset your password."
2. Provide password reset link (Firebase password reset)
3. Users set new password
4. Can now login via auth-v2-service

---

## Recommendation

### For Your Situation

**I recommend: Option 2 - Hybrid Authentication**

**Reasons**:
1. ✅ **Zero user impact** - users don't even notice the migration
2. ✅ **Gradual migration** - users migrate on their next login
3. ✅ **No forced password resets** - better user experience
4. ✅ **Backward compatible** - old users can still login
5. ✅ **Automatic cleanup** - inactive users stay in old system

**Timeline**:
- Implementation: 2-3 days
- Testing: 1 day
- Deployment: Same day (no downtime)
- Full migration: 1-3 months (as users login naturally)

---

## Implementation Checklist

### Phase 1: Update auth-v2-service
- [ ] Add bcrypt dependency (`bun add bcrypt`)
- [ ] Update `/login` endpoint with hybrid logic
- [ ] Add migration logging and monitoring
- [ ] Test with existing PostgreSQL users
- [ ] Test with new Firebase users
- [ ] Test error cases (wrong password, no user, etc.)

### Phase 2: Database Changes
- [ ] Add `migration_status` column to track migration progress
- [ ] Create index on `auth_provider` for performance
- [ ] Add migration metrics tracking

### Phase 3: Monitoring
- [ ] Set up metrics for migration progress
- [ ] Monitor migration failures
- [ ] Track percentage of users migrated
- [ ] Alert on migration errors

### Phase 4: Documentation
- [ ] Update API documentation
- [ ] Add migration status to health check
- [ ] Document rollback procedure

---

## Migration Metrics

Track these metrics to monitor migration progress:

```sql
-- Total users
SELECT COUNT(*) FROM auth.users;

-- Users migrated (have firebase_uid)
SELECT COUNT(*) FROM auth.users WHERE firebase_uid IS NOT NULL;

-- Users pending migration (no firebase_uid)
SELECT COUNT(*) FROM auth.users WHERE firebase_uid IS NULL;

-- Migration progress percentage
SELECT 
  ROUND(
    COUNT(*) FILTER (WHERE firebase_uid IS NOT NULL)::numeric / 
    COUNT(*)::numeric * 100, 
    2
  ) as migration_percentage
FROM auth.users;

-- Users by auth provider
SELECT auth_provider, COUNT(*) 
FROM auth.users 
GROUP BY auth_provider;

-- Failed migrations
SELECT COUNT(*) 
FROM auth.users 
WHERE federation_status = 'failed';
```

---

## Security Considerations

### Password Migration
- ✅ **DO**: Use the password provided by user during login (they just proved they know it)
- ✅ **DO**: Create Firebase user with same password immediately
- ✅ **DO**: Clear password_hash from PostgreSQL after successful migration (optional)
- ❌ **DON'T**: Store password in plaintext anywhere
- ❌ **DON'T**: Log passwords in migration logs

### Error Handling
- ✅ **DO**: Mark user as `federation_status: 'failed'` if migration fails
- ✅ **DO**: Provide clear error messages to users
- ✅ **DO**: Retry failed migrations on next login
- ✅ **DO**: Alert admins of repeated migration failures

---

## Rollback Plan

If hybrid authentication causes issues:

1. **Immediate**: Route all traffic back to old auth-service
2. **Keep Firebase users working**: Don't delete Firebase accounts
3. **Fix issues**: Debug and fix hybrid auth logic in staging
4. **Retry**: Re-enable hybrid auth with fixes

---

## Testing Strategy

### Test Cases

1. **New Firebase user login** (should work normally)
   ```bash
   # Register new user
   POST /v1/auth/register
   
   # Login
   POST /v1/auth/login
   # Expected: Success via Firebase
   ```

2. **Old PostgreSQL user first login** (should trigger migration)
   ```bash
   # Login with old credentials
   POST /v1/auth/login
   # Expected: Success + account migrated + firebase_uid updated
   ```

3. **Old PostgreSQL user second login** (should use Firebase)
   ```bash
   # Login again
   POST /v1/auth/login
   # Expected: Success via Firebase (no migration needed)
   ```

4. **Invalid password** (should fail)
   ```bash
   POST /v1/auth/login (wrong password)
   # Expected: Unauthorized
   ```

5. **Non-existent user** (should fail)
   ```bash
   POST /v1/auth/login (email not in system)
   # Expected: Unauthorized
   ```

---

## Completion Criteria

Migration is complete when:

- [ ] 95%+ of active users have been migrated
- [ ] No migration errors in last 7 days
- [ ] All services working correctly with Firebase tokens
- [ ] Old auth-service receiving <5% of traffic
- [ ] User satisfaction metrics maintained
- [ ] Zero security incidents related to migration

---

## Timeline

**Week 1**: Implementation
- Days 1-2: Update auth-v2-service with hybrid logic
- Days 3-4: Testing (unit + integration)
- Day 5: Deploy to staging

**Week 2**: Deployment
- Day 1: Deploy to production (10% traffic)
- Day 2: Monitor and validate
- Day 3: Increase to 50% traffic
- Day 4-5: Monitor migration progress

**Weeks 3-12**: Natural Migration
- Users migrate on their next login
- Monitor progress weekly
- Handle edge cases

**Week 13+**: Cleanup
- Deprecate old auth-service
- Optional: Force remaining users to reset password

---

## Frequently Asked Questions

### Q: What happens to users who never login again?

A: They remain in PostgreSQL with `auth_provider: 'local'`. When/if they eventually login, they'll be migrated then. If you want to force migration, you can send them password reset emails.

### Q: Can users still use the old auth-service during migration?

A: Yes! The hybrid approach allows both systems to work simultaneously. Dual mode is supported.

### Q: What if Firebase migration fails?

A: User sees error message. Their account is marked `federation_status: 'failed'`. On next login, migration is retried automatically.

### Q: Is this secure?

A: Yes! We only migrate the user when they prove they know the password. We don't expose or transfer password hashes anywhere.

### Q: How long does migration take per user?

A: ~500ms - 1 second for first login (includes Firebase account creation). Subsequent logins are fast (~50-200ms).

---

**Created**: October 4, 2025  
**Status**: 🟡 **PENDING IMPLEMENTATION**  
**Priority**: 🔴 **HIGH** - Blocking issue for auth-v2 production rollout

---
