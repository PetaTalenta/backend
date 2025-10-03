# Auth V2 Service - Database Integration Plan
## Plan Integrasi untuk Production Ready

**Tanggal**: 4 Oktober 2025  
**Status**: 📋 PLANNING  
**Target**: Production Ready dalam 2-3 Sprint (4-6 minggu)  
**Risk Level**: 🟡 MEDIUM-HIGH

---

## 📋 Executive Summary

Dokumen ini merupakan detailed implementation plan untuk mengintegrasikan **auth-v2-service** (Firebase-based) dengan PostgreSQL database agar dapat menggantikan **auth-service** yang lama dan production ready.

**Strategi Utama**: **Hybrid Authentication Architecture**
- Firebase Auth sebagai authentication provider (SSO)
- PostgreSQL sebagai business data storage
- Lazy user creation untuk efisiensi
- Backward compatibility dengan service yang ada

---

## 🎯 Goals & Success Criteria

### Primary Goals

1. ✅ Auth-v2-service dapat menyimpan user data ke PostgreSQL
2. ✅ Semua service lain dapat menggunakan auth-v2-service
3. ✅ Token Firebase dapat diverifikasi oleh semua service
4. ✅ Backward compatibility dengan auth-service (dual mode)
5. ✅ Zero downtime migration

### Success Criteria

| Criteria | Metric | Target |
|----------|--------|--------|
| **Data Consistency** | User sync rate | 100% |
| **API Compatibility** | Breaking changes | 0 |
| **Performance** | Response time | < 200ms |
| **Availability** | Uptime during migration | > 99.9% |
| **Test Coverage** | Unit + Integration tests | > 80% |

---

## 🏗️ Architecture Design

### Current Architecture (auth-service)

```
┌──────────┐    JWT     ┌──────────────┐     ┌────────────┐
│  Client  │───────────>│ auth-service │────>│ PostgreSQL │
└──────────┘            └──────────────┘     │ auth.users │
                              │               └────────────┘
                              │
                              v
                        ┌──────────┐
                        │  Redis   │
                        └──────────┘
```

### Target Architecture (auth-v2-service with Federation)

```
┌──────────┐  Firebase   ┌─────────────────┐     ┌────────────┐
│  Client  │   Token     │ auth-v2-service │────>│  Firebase  │
└──────────┘────────────>│  (Federation)   │     │    Auth    │
                         └─────────────────┘     └────────────┘
                                │                      │
                                │ Lazy Sync            │
                                v                      │
                         ┌────────────┐                │
                         │ PostgreSQL │<───────────────┘
                         │ auth.users │     Mirror User Data
                         └────────────┘
                                │
                                v
                         ┌──────────┐
                         │  Redis   │
                         └──────────┘
```

### Hybrid Architecture (Migration Phase)

```
┌──────────┐             ┌──────────────┐
│  Client  │────────────>│ API Gateway  │
└──────────┘             └──────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    v                       v
         ┌──────────────────┐    ┌─────────────────┐
         │  auth-service    │    │ auth-v2-service │
         │  (Legacy JWT)    │    │ (Firebase Token)│
         └──────────────────┘    └─────────────────┘
                    │                       │
                    └───────────┬───────────┘
                                v
                         ┌────────────┐
                         │ PostgreSQL │
                         │ auth.users │
                         └────────────┘
```

---

## 📊 Database Schema Changes

### 1. Add Firebase UID to auth.users

**Migration**: `001_add_firebase_uid.sql`

```sql
-- Add firebase_uid column
ALTER TABLE auth.users 
ADD COLUMN firebase_uid VARCHAR(128) UNIQUE;

-- Create index for performance
CREATE INDEX idx_users_firebase_uid 
ON auth.users(firebase_uid);

-- Add constraint
ALTER TABLE auth.users 
ADD CONSTRAINT chk_firebase_uid_format 
CHECK (firebase_uid IS NULL OR LENGTH(firebase_uid) >= 20);

-- Add comment
COMMENT ON COLUMN auth.users.firebase_uid IS 
'Firebase Authentication UID - Links to Firebase Auth user';
```

**Rollback**:
```sql
ALTER TABLE auth.users DROP COLUMN IF EXISTS firebase_uid;
DROP INDEX IF EXISTS idx_users_firebase_uid;
```

### 2. Add User Federation Tracking

**Migration**: `002_add_federation_metadata.sql`

```sql
-- Add federation metadata
ALTER TABLE auth.users 
ADD COLUMN auth_provider VARCHAR(20) DEFAULT 'local',
ADD COLUMN provider_data JSONB,
ADD COLUMN last_firebase_sync TIMESTAMP,
ADD COLUMN federation_status VARCHAR(20) DEFAULT 'active';

-- Create index
CREATE INDEX idx_users_auth_provider 
ON auth.users(auth_provider);

CREATE INDEX idx_users_federation_status 
ON auth.users(federation_status);

-- Add constraints
ALTER TABLE auth.users 
ADD CONSTRAINT chk_auth_provider 
CHECK (auth_provider IN ('local', 'firebase', 'hybrid'));

ALTER TABLE auth.users 
ADD CONSTRAINT chk_federation_status 
CHECK (federation_status IN ('active', 'syncing', 'failed', 'disabled'));

-- Comments
COMMENT ON COLUMN auth.users.auth_provider IS 
'Authentication provider: local (old), firebase (new), hybrid (both)';

COMMENT ON COLUMN auth.users.provider_data IS 
'Additional provider-specific data (JSON)';

COMMENT ON COLUMN auth.users.last_firebase_sync IS 
'Last successful sync with Firebase Auth';

COMMENT ON COLUMN auth.users.federation_status IS 
'Federation status: active, syncing, failed, disabled';
```

**Rollback**:
```sql
ALTER TABLE auth.users 
DROP COLUMN IF EXISTS auth_provider,
DROP COLUMN IF EXISTS provider_data,
DROP COLUMN IF EXISTS last_firebase_sync,
DROP COLUMN IF EXISTS federation_status;

DROP INDEX IF EXISTS idx_users_auth_provider;
DROP INDEX IF EXISTS idx_users_federation_status;
```

### 3. Make password_hash Optional (for Firebase users)

**Migration**: `003_optional_password_hash.sql`

```sql
-- Remove NOT NULL constraint from password_hash
ALTER TABLE auth.users 
ALTER COLUMN password_hash DROP NOT NULL;

-- Add validation: password_hash required for local users
ALTER TABLE auth.users 
ADD CONSTRAINT chk_password_hash_required 
CHECK (
  (auth_provider = 'local' AND password_hash IS NOT NULL) OR
  (auth_provider != 'local')
);

COMMENT ON COLUMN auth.users.password_hash IS 
'Password hash (bcrypt) - Required for local auth, NULL for Firebase users';
```

**Rollback**:
```sql
-- WARNING: Cannot rollback if Firebase users exist without password_hash
-- This will fail if there are NULL values
ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS chk_password_hash_required;
ALTER TABLE auth.users ALTER COLUMN password_hash SET NOT NULL;
```

### 4. Updated Schema Structure

**Final auth.users table**:

```sql
CREATE TABLE auth.users (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Authentication
    firebase_uid VARCHAR(128) UNIQUE,  -- NEW
    auth_provider VARCHAR(20) DEFAULT 'local',  -- NEW
    password_hash VARCHAR(255),  -- NOW NULLABLE
    
    -- User Information
    username VARCHAR(100) UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    
    -- User Type & Status
    user_type VARCHAR(20) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    
    -- Business Data
    token_balance INTEGER DEFAULT 0,
    
    -- Federation Metadata
    provider_data JSONB,  -- NEW
    last_firebase_sync TIMESTAMP,  -- NEW
    federation_status VARCHAR(20) DEFAULT 'active',  -- NEW
    
    -- Timestamps
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_auth_provider 
        CHECK (auth_provider IN ('local', 'firebase', 'hybrid')),
    CONSTRAINT chk_federation_status 
        CHECK (federation_status IN ('active', 'syncing', 'failed', 'disabled')),
    CONSTRAINT chk_password_hash_required 
        CHECK (
            (auth_provider = 'local' AND password_hash IS NOT NULL) OR
            (auth_provider != 'local')
        ),
    CONSTRAINT chk_firebase_uid_format 
        CHECK (firebase_uid IS NULL OR LENGTH(firebase_uid) >= 20)
);

-- Indexes
CREATE INDEX idx_users_firebase_uid ON auth.users(firebase_uid);
CREATE INDEX idx_users_auth_provider ON auth.users(auth_provider);
CREATE INDEX idx_users_federation_status ON auth.users(federation_status);
CREATE INDEX idx_users_email ON auth.users(email);
CREATE INDEX idx_users_is_active ON auth.users(is_active);
```

---

## 💻 Implementation Steps

### Phase 1: Database Preparation (Week 1)

#### Step 1.1: Backup Database ✅ CRITICAL

```bash
# Backup full database
docker exec atma-postgres pg_dump -U atma_user atma_db \
  > backup_before_auth_v2_migration_$(date +%Y%m%d_%H%M%S).sql

# Backup only auth schema
docker exec atma-postgres pg_dump -U atma_user -n auth atma_db \
  > backup_auth_schema_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_*.sql
```

#### Step 1.2: Run Database Migrations

```bash
# Create migrations directory
mkdir -p /home/rayin/Desktop/atma-backend/migrations/auth-v2-integration

# Apply migrations
docker exec -it atma-postgres psql -U atma_user -d atma_db \
  -f /migrations/001_add_firebase_uid.sql

docker exec -it atma-postgres psql -U atma_user -d atma_db \
  -f /migrations/002_add_federation_metadata.sql

docker exec -it atma-postgres psql -U atma_user -d atma_db \
  -f /migrations/003_optional_password_hash.sql
```

#### Step 1.3: Verify Migrations

```sql
-- Check schema
\d+ auth.users

-- Verify constraints
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'auth.users'::regclass;

-- Verify indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'users' AND schemaname = 'auth';
```

**Deliverables**:
- ✅ Database backup files
- ✅ Migration scripts (SQL)
- ✅ Verification report

---

### Phase 2: Auth-v2-service Implementation (Week 2-3)

#### Step 2.1: Add PostgreSQL Dependencies

**File**: `auth-v2-service/package.json`

```json
{
  "dependencies": {
    "pg": "^8.11.3",
    "pg-hstore": "^2.3.4",
    "@types/pg": "^8.10.9"
  }
}
```

Install:
```bash
cd auth-v2-service
bun install
```

#### Step 2.2: Create Database Configuration

**File**: `auth-v2-service/src/config/database.ts`

```typescript
import { Pool } from 'pg';
import { logger } from '../utils/logger';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  schema: string;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

const config: DatabaseConfig = {
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'atma_db',
  user: process.env.DB_USER || 'atma_user',
  password: process.env.DB_PASSWORD || '',
  schema: process.env.DB_SCHEMA || 'auth',
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// Create connection pool
export const pool = new Pool(config);

// Set default schema
pool.on('connect', (client) => {
  client.query(`SET search_path TO ${config.schema}, public`);
});

// Handle errors
pool.on('error', (err) => {
  logger.error('Unexpected database error', { error: err.message });
});

// Test connection
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT NOW()');
    logger.info('Database connection established', {
      host: config.host,
      database: config.database,
      schema: config.schema,
      timestamp: result.rows[0].now,
    });
    return true;
  } catch (error) {
    logger.error('Database connection failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  await pool.end();
  logger.info('Database connection pool closed');
}

export default pool;
```

#### Step 2.3: Create User Repository

**File**: `auth-v2-service/src/repositories/user.repository.ts`

```typescript
import pool from '../config/database';
import { logger } from '../utils/logger';

export interface UserRecord {
  id: string;
  firebase_uid: string | null;
  auth_provider: 'local' | 'firebase' | 'hybrid';
  email: string;
  username: string | null;
  user_type: string;
  is_active: boolean;
  token_balance: number;
  password_hash: string | null;
  provider_data: Record<string, any> | null;
  last_firebase_sync: Date | null;
  federation_status: 'active' | 'syncing' | 'failed' | 'disabled';
  last_login: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class UserRepository {
  /**
   * Find user by Firebase UID
   */
  async findByFirebaseUid(firebaseUid: string): Promise<UserRecord | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE firebase_uid = $1',
        [firebaseUid]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by Firebase UID', {
        firebaseUid,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<UserRecord | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by email', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<UserRecord | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by ID', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Create Firebase user in database (Lazy Creation)
   */
  async createFirebaseUser(data: {
    firebase_uid: string;
    email: string;
    display_name?: string;
    provider_data?: Record<string, any>;
  }): Promise<UserRecord> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO users (
          firebase_uid, 
          auth_provider, 
          email, 
          username,
          user_type, 
          is_active, 
          token_balance,
          provider_data,
          last_firebase_sync,
          federation_status,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *`,
        [
          data.firebase_uid,
          'firebase',
          data.email,
          data.display_name || null,
          'user',
          true,
          0, // Initial token balance
          data.provider_data ? JSON.stringify(data.provider_data) : null,
          new Date(),
          'active',
        ]
      );

      await client.query('COMMIT');

      logger.info('Firebase user created in database', {
        userId: result.rows[0].id,
        firebaseUid: data.firebase_uid,
        email: data.email,
      });

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating Firebase user', {
        firebaseUid: data.firebase_uid,
        email: data.email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update user's last login
   */
  async updateLastLogin(id: string): Promise<void> {
    try {
      await pool.query(
        'UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1',
        [id]
      );
    } catch (error) {
      logger.error('Error updating last login', {
        userId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - this is not critical
    }
  }

  /**
   * Sync user data from Firebase
   */
  async syncFromFirebase(firebaseUid: string, data: {
    email?: string;
    display_name?: string;
    provider_data?: Record<string, any>;
  }): Promise<UserRecord> {
    try {
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (data.email) {
        updateFields.push(`email = $${paramIndex++}`);
        updateValues.push(data.email);
      }

      if (data.display_name) {
        updateFields.push(`username = $${paramIndex++}`);
        updateValues.push(data.display_name);
      }

      if (data.provider_data) {
        updateFields.push(`provider_data = $${paramIndex++}`);
        updateValues.push(JSON.stringify(data.provider_data));
      }

      updateFields.push(`last_firebase_sync = NOW()`);
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(firebaseUid);

      const result = await pool.query(
        `UPDATE users SET ${updateFields.join(', ')} 
         WHERE firebase_uid = $${paramIndex}
         RETURNING *`,
        updateValues
      );

      logger.info('User synced from Firebase', {
        firebaseUid,
        userId: result.rows[0]?.id,
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error syncing user from Firebase', {
        firebaseUid,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update token balance
   */
  async updateTokenBalance(id: string, amount: number): Promise<UserRecord> {
    try {
      const result = await pool.query(
        `UPDATE users 
         SET token_balance = token_balance + $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [amount, id]
      );

      if (!result.rows[0]) {
        throw new Error('User not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error updating token balance', {
        userId: id,
        amount,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Deactivate user
   */
  async deactivateUser(id: string): Promise<void> {
    try {
      await pool.query(
        'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1',
        [id]
      );

      logger.info('User deactivated', { userId: id });
    } catch (error) {
      logger.error('Error deactivating user', {
        userId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

export const userRepository = new UserRepository();
```

#### Step 2.4: Create User Federation Service

**File**: `auth-v2-service/src/services/user-federation.service.ts`

```typescript
import { getFirebaseAuth } from '../config/firebase-config';
import { userRepository, UserRecord } from '../repositories/user.repository';
import { logger } from '../utils/logger';

export class UserFederationService {
  /**
   * Get or create user (Lazy Creation Pattern)
   * 
   * This is the core of the federation strategy:
   * 1. Verify Firebase token (source of truth)
   * 2. Check if user exists in PostgreSQL
   * 3. If not exists, create user (lazy creation)
   * 4. Return user record
   */
  async getOrCreateUser(firebaseToken: string): Promise<UserRecord> {
    try {
      // 1. Verify Firebase token
      const decodedToken = await getFirebaseAuth().verifyIdToken(firebaseToken);
      
      logger.info('Firebase token verified', {
        firebaseUid: decodedToken.uid,
        email: decodedToken.email,
      });

      // 2. Try to find user in PostgreSQL
      let user = await userRepository.findByFirebaseUid(decodedToken.uid);

      // 3. Lazy creation - create if not exists
      if (!user) {
        logger.info('User not found in database, creating...', {
          firebaseUid: decodedToken.uid,
          email: decodedToken.email,
        });

        user = await userRepository.createFirebaseUser({
          firebase_uid: decodedToken.uid,
          email: decodedToken.email || '',
          display_name: decodedToken.name,
          provider_data: {
            provider: decodedToken.firebase.sign_in_provider,
            email_verified: decodedToken.email_verified,
          },
        });
      } else {
        // Update last login
        await userRepository.updateLastLogin(user.id);
      }

      // 4. Check if user is active
      if (!user.is_active) {
        throw new Error('User account is deactivated');
      }

      return user;
    } catch (error) {
      logger.error('Error in user federation', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Sync user data from Firebase (optional - for admin operations)
   */
  async syncUserFromFirebase(firebaseUid: string): Promise<UserRecord> {
    try {
      // Get user from Firebase
      const firebaseUser = await getFirebaseAuth().getUser(firebaseUid);

      // Check if user exists in PostgreSQL
      let user = await userRepository.findByFirebaseUid(firebaseUid);

      if (user) {
        // Update existing user
        user = await userRepository.syncFromFirebase(firebaseUid, {
          email: firebaseUser.email,
          display_name: firebaseUser.displayName || undefined,
          provider_data: {
            email_verified: firebaseUser.emailVerified,
            disabled: firebaseUser.disabled,
          },
        });
      } else {
        // Create new user
        user = await userRepository.createFirebaseUser({
          firebase_uid: firebaseUid,
          email: firebaseUser.email || '',
          display_name: firebaseUser.displayName || undefined,
          provider_data: {
            email_verified: firebaseUser.emailVerified,
            disabled: firebaseUser.disabled,
          },
        });
      }

      return user;
    } catch (error) {
      logger.error('Error syncing user from Firebase', {
        firebaseUid,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get user by Firebase token (for middleware)
   */
  async getUserByToken(firebaseToken: string): Promise<UserRecord> {
    return this.getOrCreateUser(firebaseToken);
  }

  /**
   * Verify token and get user (backward compatibility)
   */
  async verifyTokenAndGetUser(token: string): Promise<{
    user: UserRecord;
    firebaseUid: string;
  }> {
    const decodedToken = await getFirebaseAuth().verifyIdToken(token);
    const user = await this.getOrCreateUser(token);

    return {
      user,
      firebaseUid: decodedToken.uid,
    };
  }
}

export const userFederationService = new UserFederationService();
```

#### Step 2.5: Update Authentication Routes

**File**: `auth-v2-service/src/routes/auth.routes.ts`

Add new endpoint for token verification:

```typescript
import { Hono } from 'hono';
import { userFederationService } from '../services/user-federation.service';
import { authenticateFirebase } from '../middleware/auth.middleware';

// ... existing routes ...

/**
 * Verify token and get user data
 * This endpoint is used by other services for authentication
 */
authRouter.post('/verify-token', async (c) => {
  try {
    const { token } = await c.req.json();

    if (!token) {
      return c.json({
        success: false,
        message: 'Token is required',
      }, 400);
    }

    // Verify token and get/create user
    const result = await userFederationService.verifyTokenAndGetUser(token);

    return c.json({
      success: true,
      data: {
        user: {
          id: result.user.id,
          firebase_uid: result.user.firebase_uid,
          email: result.user.email,
          username: result.user.username,
          user_type: result.user.user_type,
          is_active: result.user.is_active,
          token_balance: result.user.token_balance,
        },
      },
      message: 'Token verified successfully',
    }, 200);
  } catch (error) {
    return c.json({
      success: false,
      message: error instanceof Error ? error.message : 'Token verification failed',
    }, 401);
  }
});

/**
 * Get current user info (with auto-creation)
 */
authRouter.get('/me', authenticateFirebase, async (c) => {
  try {
    const firebaseUser = c.get('firebaseUser');
    const token = c.req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return c.json({
        success: false,
        message: 'Token not found',
      }, 401);
    }

    // Get or create user in database
    const user = await userFederationService.getOrCreateUser(token);

    return c.json({
      success: true,
      data: {
        user: {
          id: user.id,
          firebase_uid: user.firebase_uid,
          email: user.email,
          username: user.username,
          user_type: user.user_type,
          is_active: user.is_active,
          token_balance: user.token_balance,
          auth_provider: user.auth_provider,
          last_login: user.last_login,
          created_at: user.created_at,
        },
      },
      message: 'User retrieved successfully',
    }, 200);
  } catch (error) {
    return c.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get user',
    }, 500);
  }
});
```

#### Step 2.6: Update Environment Variables

**File**: `docker-compose.override.yml`

```yaml
auth-v2-service:
  environment:
    # ... existing Firebase config ...
    
    # Database Configuration
    DB_HOST: postgres
    DB_PORT: 5432
    DB_NAME: atma_db
    DB_USER: atma_user
    DB_PASSWORD: ${DB_PASSWORD}
    DB_SCHEMA: auth
    DB_POOL_MAX: 20
    
    # Redis (optional - for caching)
    REDIS_HOST: redis
    REDIS_PORT: 6379
```

**Deliverables**:
- ✅ Database configuration module
- ✅ User repository with CRUD operations
- ✅ User federation service (lazy creation)
- ✅ Updated routes with /verify-token endpoint
- ✅ Environment configuration

---

### Phase 3: Service Integration (Week 3-4)

#### Step 3.1: Create Authentication Adapter

Create adapter untuk backward compatibility dengan service lain.

**File**: `auth-v2-service/src/adapters/auth-adapter.ts`

```typescript
import { userFederationService } from '../services/user-federation.service';
import { UserRecord } from '../repositories/user.repository';

/**
 * Authentication Adapter
 * Provides backward compatibility with old auth-service interface
 */
export class AuthAdapter {
  /**
   * Verify user (compatible with old auth-service)
   */
  async verifyUser(userId: string, token: string): Promise<{
    id: string;
    email: string;
    user_type: string;
    token_balance: number;
    is_active: boolean;
  }> {
    // Get user from database using federation service
    const { user } = await userFederationService.verifyTokenAndGetUser(token);

    // Return in old format
    return {
      id: user.id,
      email: user.email,
      user_type: user.user_type,
      token_balance: user.token_balance,
      is_active: user.is_active,
    };
  }

  /**
   * Format user for response (old format)
   */
  formatUserResponse(user: UserRecord) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      user_type: user.user_type,
      token_balance: user.token_balance,
      is_active: user.is_active,
      last_login: user.last_login,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }
}

export const authAdapter = new AuthAdapter();
```

#### Step 3.2: Update Other Services

**A. Update assessment-service**

**File**: `assessment-service/src/middleware/auth.js`

```javascript
// Add support for Firebase token
const verifyFirebaseToken = async (token) => {
  try {
    // Call auth-v2-service for verification
    const response = await axios.post(
      `${process.env.AUTH_V2_SERVICE_URL || 'http://auth-v2-service:3008'}/v1/auth/verify-token`,
      { token },
      { timeout: 5000 }
    );

    if (response.data.success) {
      return response.data.data.user;
    }

    throw new Error('Token verification failed');
  } catch (error) {
    logger.error('Firebase token verification failed', {
      error: error.message,
    });
    return null;
  }
};

// Update authenticate middleware
const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    // Try Firebase token first (new method)
    let user = await verifyFirebaseToken(token);

    // Fallback to old JWT method
    if (!user) {
      const decoded = verifyJWT(token);
      user = await authService.verifyUser(decoded.id, token);
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      user_type: user.user_type,
      token_balance: user.token_balance,
      is_active: user.is_active,
    };

    next();
  } catch (error) {
    logger.error('Authentication failed', { error: error.message });
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};
```

**B. Update archive-service**

Similar changes to `archive-service/src/middleware/auth.js`

**C. Update chatbot-service**

Similar changes to `chatbot-service/src/middleware/auth.js`

**D. Update api-gateway**

**File**: `api-gateway/src/middleware/auth.js`

```javascript
// Add auth-v2-service support
const AUTH_V2_SERVICE_URL = process.env.AUTH_V2_SERVICE_URL || 'http://auth-v2-service:3008';

// Update verifyToken function
const verifyToken = async (token) => {
  try {
    // Try auth-v2-service first
    const response = await axios.post(
      `${AUTH_V2_SERVICE_URL}/v1/auth/verify-token`,
      { token },
      { timeout: 3000 }
    );

    if (response.data.success) {
      return response.data.data.user;
    }
  } catch (error) {
    // Fallback to old auth-service
    try {
      const response = await axios.post(
        `${AUTH_SERVICE_URL}/auth/verify-token`,
        { token },
        { timeout: 3000 }
      );

      if (response.data.success) {
        return response.data.user;
      }
    } catch (fallbackError) {
      logger.error('Both auth services failed', {
        error: error.message,
        fallbackError: fallbackError.message,
      });
    }
  }

  throw new Error('Token verification failed');
};
```

**Deliverables**:
- ✅ Authentication adapter for backward compatibility
- ✅ Updated middleware in all services
- ✅ Fallback mechanism to old auth-service
- ✅ Integration tests

---

### Phase 4: Testing & Validation (Week 4-5)

#### Step 4.1: Unit Tests

**File**: `auth-v2-service/src/repositories/__tests__/user.repository.test.ts`

```typescript
import { UserRepository } from '../user.repository';
import pool from '../../config/database';

describe('UserRepository', () => {
  let repository: UserRepository;

  beforeAll(() => {
    repository = new UserRepository();
  });

  describe('createFirebaseUser', () => {
    it('should create a new Firebase user', async () => {
      const userData = {
        firebase_uid: 'test-firebase-uid-123',
        email: 'test@example.com',
        display_name: 'Test User',
      };

      const user = await repository.createFirebaseUser(userData);

      expect(user).toBeDefined();
      expect(user.firebase_uid).toBe(userData.firebase_uid);
      expect(user.email).toBe(userData.email);
      expect(user.auth_provider).toBe('firebase');
      expect(user.token_balance).toBe(0);
    });

    // ... more tests ...
  });

  // ... more test suites ...
});
```

#### Step 4.2: Integration Tests

**File**: `auth-v2-service/tests/integration/federation.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'bun:test';
import { testDatabaseConnection } from '../../src/config/database';
import { userFederationService } from '../../src/services/user-federation.service';

describe('User Federation Integration Tests', () => {
  beforeAll(async () => {
    const connected = await testDatabaseConnection();
    expect(connected).toBe(true);
  });

  it('should create user on first token verification', async () => {
    // Test lazy user creation
    // ... test implementation ...
  });

  it('should return existing user on subsequent verifications', async () => {
    // Test user retrieval
    // ... test implementation ...
  });

  // ... more tests ...
});
```

#### Step 4.3: End-to-End Test Script

**File**: `test-auth-v2-integration.js`

```javascript
const axios = require('axios');

const AUTH_V2_URL = 'http://localhost:3008';
const ASSESSMENT_URL = 'http://localhost:3001';

async function testEndToEndFlow() {
  console.log('🧪 Starting Auth V2 Integration Test...\n');

  try {
    // 1. Register user with Firebase
    console.log('1️⃣ Registering user...');
    const registerRes = await axios.post(`${AUTH_V2_URL}/v1/auth/register`, {
      email: 'integration-test@example.com',
      password: 'TestPassword123',
      displayName: 'Integration Test User',
    });
    console.log('✅ User registered:', registerRes.data.data.email);
    const firebaseToken = registerRes.data.data.idToken;

    // 2. Verify user exists in database
    console.log('\n2️⃣ Verifying user in database...');
    const meRes = await axios.get(`${AUTH_V2_URL}/v1/auth/me`, {
      headers: { Authorization: `Bearer ${firebaseToken}` },
    });
    console.log('✅ User in database:', meRes.data.data.user.id);
    console.log('   Token Balance:', meRes.data.data.user.token_balance);

    // 3. Test token verification endpoint
    console.log('\n3️⃣ Testing token verification...');
    const verifyRes = await axios.post(`${AUTH_V2_URL}/v1/auth/verify-token`, {
      token: firebaseToken,
    });
    console.log('✅ Token verified');
    console.log('   User ID:', verifyRes.data.data.user.id);

    // 4. Test with assessment service
    console.log('\n4️⃣ Testing with assessment service...');
    const assessmentRes = await axios.get(`${ASSESSMENT_URL}/api/assessments`, {
      headers: { Authorization: `Bearer ${firebaseToken}` },
    });
    console.log('✅ Assessment service authenticated user');

    // 5. Login and verify token persistence
    console.log('\n5️⃣ Testing login...');
    const loginRes = await axios.post(`${AUTH_V2_URL}/v1/auth/login`, {
      email: 'integration-test@example.com',
      password: 'TestPassword123',
    });
    console.log('✅ Login successful');
    const newToken = loginRes.data.data.idToken;

    // 6. Verify user data persists
    console.log('\n6️⃣ Verifying data persistence...');
    const me2Res = await axios.get(`${AUTH_V2_URL}/v1/auth/me`, {
      headers: { Authorization: `Bearer ${newToken}` },
    });
    console.log('✅ User data persisted');
    console.log('   Last Login:', me2Res.data.data.user.last_login);

    console.log('\n✅ All integration tests passed!');
    return true;
  } catch (error) {
    console.error('\n❌ Integration test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    return false;
  }
}

testEndToEndFlow();
```

**Run Tests**:
```bash
# Unit tests
cd auth-v2-service
bun test

# Integration tests
node test-auth-v2-integration.js
```

**Deliverables**:
- ✅ Unit tests (>80% coverage)
- ✅ Integration tests
- ✅ End-to-end test script
- ✅ Test report

---

### Phase 5: Migration & Deployment (Week 5-6)

#### Step 5.1: Data Migration Strategy

**Option A: Gradual Migration (RECOMMENDED)**

```
Week 1-2: Dual Mode
├── Both auth-service and auth-v2-service running
├── New users → auth-v2-service (Firebase)
├── Existing users → auth-service (JWT)
└── API Gateway routes to both

Week 3-4: User Migration
├── Migrate 10% users to Firebase
├── Monitor errors and performance
├── Rollback plan ready
└── Gradual increase to 50%, 80%, 100%

Week 5-6: Complete Migration
├── All users on auth-v2-service
├── Deprecate auth-service
└── Remove old code
```

**Option B: Big Bang Migration (NOT RECOMMENDED)**

Switch all users at once - High risk!

#### Step 5.2: Migration Script

**File**: `scripts/migrate-users-to-firebase.js`

```javascript
const { Pool } = require('pg');
const admin = require('firebase-admin');

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function migrateUsersToFirebase() {
  console.log('🚀 Starting user migration to Firebase...\n');

  try {
    // Get all local users (auth_provider = 'local')
    const result = await pool.query(
      "SELECT * FROM auth.users WHERE auth_provider = 'local' OR auth_provider IS NULL"
    );

    const users = result.rows;
    console.log(`Found ${users.length} users to migrate\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        // Create user in Firebase
        const firebaseUser = await admin.auth().createUser({
          email: user.email,
          emailVerified: true, // Trust existing users
          displayName: user.username,
          disabled: !user.is_active,
        });

        // Update user in database
        await pool.query(
          `UPDATE auth.users 
           SET firebase_uid = $1, 
               auth_provider = 'hybrid',
               last_firebase_sync = NOW(),
               updated_at = NOW()
           WHERE id = $2`,
          [firebaseUser.uid, user.id]
        );

        console.log(`✅ Migrated: ${user.email}`);
        successCount++;

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Failed to migrate ${user.email}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Migration completed:`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrateUsersToFirebase();
```

#### Step 5.3: Deployment Steps

**1. Deploy auth-v2-service (Dual Mode)**

```bash
# Build and start auth-v2-service
docker compose -f docker-compose.yml -f docker-compose.override.yml build auth-v2-service
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d auth-v2-service

# Verify health
curl http://localhost:3008/health
```

**2. Update API Gateway (Route to both services)**

```javascript
// api-gateway routing logic
if (isNewUser || useFirebaseAuth) {
  // Route to auth-v2-service
  proxyUrl = AUTH_V2_SERVICE_URL;
} else {
  // Route to old auth-service
  proxyUrl = AUTH_SERVICE_URL;
}
```

**3. Monitor & Rollback Plan**

```bash
# Monitor logs
docker logs -f atma-auth-v2-service

# Monitor errors
docker logs atma-auth-v2-service | grep ERROR

# Rollback if needed
docker compose -f docker-compose.yml -f docker-compose.override.yml down auth-v2-service
# Switch API Gateway back to auth-service
```

**4. Gradual Traffic Shift**

```javascript
// Percentage-based routing in API Gateway
const shouldUseAuthV2 = Math.random() < 0.1; // Start with 10%

if (shouldUseAuthV2) {
  // Route to auth-v2-service
} else {
  // Route to auth-service
}
```

**5. Complete Migration**

```bash
# When 100% traffic on auth-v2-service
# Stop old auth-service
docker compose -f docker-compose.yml -f docker-compose.override.yml down auth-service

# Remove from docker-compose.yml
# Update all service configs to use auth-v2-service
```

**Deliverables**:
- ✅ Migration scripts
- ✅ Deployment playbook
- ✅ Rollback plan
- ✅ Monitoring dashboards
- ✅ Production deployment

---

## 📊 Risk Assessment & Mitigation

### High Risks 🔴

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Database schema change breaks existing services** | HIGH | MEDIUM | • Extensive testing<br>• Backward compatibility<br>• Rollback scripts ready |
| **Firebase token incompatible with old middleware** | HIGH | HIGH | • Dual token support<br>• Gradual migration<br>• Fallback to old auth |
| **Data loss during migration** | CRITICAL | LOW | • Database backups<br>• Transaction safety<br>• Migration validation |
| **Performance degradation** | MEDIUM | MEDIUM | • Load testing<br>• Connection pooling<br>• Caching strategy |

### Medium Risks 🟡

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Firebase API rate limits** | MEDIUM | LOW | • Monitor usage<br>• Implement caching<br>• Upgrade plan if needed |
| **Token sync delays** | MEDIUM | MEDIUM | • Async processing<br>• Queue management<br>• Retry logic |
| **Missing user fields** | MEDIUM | LOW | • Field mapping<br>• Default values<br>• Validation |

### Low Risks 🟢

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Documentation outdated** | LOW | HIGH | • Update in parallel<br>• Version control |
| **Developer confusion** | LOW | MEDIUM | • Training sessions<br>• Clear migration guide |

---

## 📈 Success Metrics

### Technical Metrics

```
✅ Database Integration
   └── User creation success rate: > 99%
   └── Lazy creation time: < 100ms
   └── Sync accuracy: 100%

✅ API Performance
   └── Response time: < 200ms (p95)
   └── Error rate: < 0.1%
   └── Uptime: > 99.9%

✅ Token Validation
   └── Firebase token verification: < 50ms
   └── Token cache hit rate: > 80%
   └── Fallback success rate: 100%

✅ Service Integration
   └── Backward compatibility: 100%
   └── Breaking changes: 0
   └── Integration test pass rate: 100%
```

### Business Metrics

```
✅ User Experience
   └── Login success rate: > 99%
   └── Registration time: < 2s
   └── Error-free sessions: > 95%

✅ Migration
   └── User migration success: > 99%
   └── Zero data loss
   └── Downtime: < 1 minute

✅ Operational
   └── Incident count: < 2/month
   └── Mean time to recovery: < 5 minutes
   └── Cost increase: < 20%
```

---

## 📝 Checklist

### Phase 1: Database Preparation ✅
- [ ] Backup database
- [ ] Create migration scripts
- [ ] Run migrations on staging
- [ ] Verify schema changes
- [ ] Test rollback procedure

### Phase 2: Auth-v2-service Implementation ✅
- [ ] Add PostgreSQL dependencies
- [ ] Create database configuration
- [ ] Implement user repository
- [ ] Create federation service
- [ ] Add /verify-token endpoint
- [ ] Update environment variables
- [ ] Write unit tests

### Phase 3: Service Integration ✅
- [ ] Create authentication adapter
- [ ] Update assessment-service middleware
- [ ] Update archive-service middleware
- [ ] Update chatbot-service middleware
- [ ] Update api-gateway routing
- [ ] Add fallback mechanisms
- [ ] Test backward compatibility

### Phase 4: Testing & Validation ✅
- [ ] Unit tests (>80% coverage)
- [ ] Integration tests
- [ ] End-to-end tests
- [ ] Performance tests
- [ ] Security audit
- [ ] Generate test report

### Phase 5: Migration & Deployment ✅
- [ ] Deploy auth-v2-service (dual mode)
- [ ] Update API Gateway routing
- [ ] Test with 10% traffic
- [ ] Monitor logs and metrics
- [ ] Gradually increase traffic
- [ ] Migrate existing users
- [ ] Complete migration (100%)
- [ ] Deprecate old auth-service
- [ ] Update documentation

---

## 📚 Documentation Updates

### Files to Create/Update

1. **API Documentation**
   - `docs/api/auth-v2-endpoints.md`
   - Update all service API docs with new auth flow

2. **Architecture Documentation**
   - `docs/architecture/auth-federation.md`
   - Update system architecture diagrams

3. **Migration Guide**
   - `docs/guides/auth-v2-migration-guide.md`
   - Step-by-step guide for developers

4. **Runbook**
   - `docs/ops/auth-v2-runbook.md`
   - Operational procedures and troubleshooting

5. **Environment Setup**
   - Update `DEV_DOCKER_USAGE.md`
   - Update `.env.example`

---

## 🎓 Training & Knowledge Transfer

### Developer Training Sessions

**Session 1: Architecture Overview (2 hours)**
- Hybrid authentication architecture
- Firebase Auth basics
- User federation strategy
- Q&A

**Session 2: Implementation Details (3 hours)**
- Database schema changes
- User repository patterns
- Lazy user creation
- Hands-on coding

**Session 3: Integration & Testing (2 hours)**
- Service integration patterns
- Middleware updates
- Testing strategies
- Debugging tips

**Session 4: Deployment & Operations (2 hours)**
- Deployment procedures
- Monitoring & alerts
- Incident response
- Rollback procedures

---

## 📅 Timeline Summary

```
Week 1: Database Preparation
├── Day 1-2: Backup & migrations
├── Day 3-4: Schema verification
└── Day 5: Testing & validation

Week 2-3: Auth-v2 Implementation
├── Week 2: Core implementation
│   ├── Database integration
│   ├── User repository
│   └── Federation service
└── Week 3: Testing & refinement
    ├── Unit tests
    ├── Integration tests
    └── Bug fixes

Week 3-4: Service Integration
├── Week 3: Middleware updates
│   ├── assessment-service
│   ├── archive-service
│   └── chatbot-service
└── Week 4: API Gateway
    ├── Routing logic
    ├── Fallback mechanism
    └── Testing

Week 4-5: Testing & Validation
├── Week 4: Comprehensive testing
│   ├── End-to-end tests
│   ├── Performance tests
│   └── Security audit
└── Week 5: Bug fixes & refinement

Week 5-6: Migration & Deployment
├── Week 5: Gradual deployment
│   ├── Deploy dual mode
│   ├── 10% traffic
│   ├── 50% traffic
│   └── Monitor & adjust
└── Week 6: Complete migration
    ├── 100% traffic
    ├── Deprecate old service
    └── Documentation
```

**Total Duration**: **6 weeks**  
**Buffer**: **2 weeks** (for unexpected issues)  
**Total Project Time**: **8 weeks**

---

## 🎯 Next Actions

### Immediate (This Week)

1. **Review this plan** with team
2. **Schedule kickoff meeting**
3. **Assign roles and responsibilities**
4. **Setup development environment**
5. **Create project board** (Jira/Trello)

### Short Term (Next Week)

1. **Start Phase 1**: Database preparation
2. **Backup production database**
3. **Test migrations on staging**
4. **Begin implementation** of database module

### Medium Term (2-3 Weeks)

1. **Complete Phase 2**: Auth-v2 implementation
2. **Start Phase 3**: Service integration
3. **Write unit tests**
4. **Code review sessions**

### Long Term (4-6 Weeks)

1. **Complete all phases**
2. **Comprehensive testing**
3. **Gradual deployment**
4. **Complete migration**

---

## 📞 Support & Contact

### Development Team

- **Tech Lead**: [TBD]
- **Backend Developer**: [TBD]
- **DevOps Engineer**: [TBD]
- **QA Engineer**: [TBD]

### Stakeholders

- **Product Owner**: [TBD]
- **Project Manager**: [TBD]

### Emergency Contacts

- **On-Call Developer**: [TBD]
- **Database Admin**: [TBD]
- **Infrastructure Team**: [TBD]

---

## 📄 Appendix

### A. SQL Scripts

All migration scripts are in: `/home/rayin/Desktop/atma-backend/migrations/auth-v2-integration/`

### B. Test Data

Test users and scenarios: `auth-v2-service/tests/fixtures/`

### C. Monitoring Queries

Performance monitoring queries: `docs/ops/monitoring-queries.sql`

### D. Rollback Procedures

Detailed rollback steps: `docs/ops/rollback-procedures.md`

---

**Document Version**: 1.0  
**Last Updated**: 4 Oktober 2025  
**Status**: 📋 Ready for Review  
**Approval Required**: Yes

---

## ✅ Approval & Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Tech Lead | | | |
| Product Owner | | | |
| DevOps Lead | | | |
| QA Lead | | | |

---

**End of Document**
