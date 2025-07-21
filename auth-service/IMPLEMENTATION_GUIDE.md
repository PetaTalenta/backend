# Auth Service Optimization - Implementation Guide

## Phase 1: Quick Wins Implementation

### 1.1 Password Hashing Optimization

#### File: `package.json`
**Change**: Replace bcryptjs dengan bcrypt native
```json
"dependencies": {
  "bcrypt": "^5.1.1",
  // Remove: "bcryptjs": "^2.4.3",
}
```

#### File: `src/utils/password.js`
**Changes**:
- Switch dari bcryptjs ke bcrypt
- Add environment-based rounds configuration
- Add performance monitoring

**Tujuan**: Improve password hashing performance by 50-60%
**Efek**: Faster login/register operations, reduced CPU usage
**Perhatian**: Test thoroughly, bcrypt requires native compilation

### 1.2 Database Query Optimization

#### File: `src/services/authService.js`
**Changes**:
1. **Registration Optimization**:
   - Use upsert instead of check-then-create
   - Implement transaction untuk atomicity
   - Add query performance monitoring

2. **Login Optimization**:
   - Make last_login update asynchronous
   - Add query result caching
   - Optimize user lookup query

**Tujuan**: Reduce database round trips by 50%
**Efek**: Faster response times, reduced database load
**Perhatian**: Ensure transaction rollback handling

### 1.3 Connection Pool Optimization

#### File: `src/config/database.js`
**Changes**:
- Increase pool size untuk high concurrency
- Optimize timeout settings
- Add connection health monitoring
- Implement connection retry logic

**Tujuan**: Better handling untuk concurrent requests
**Efek**: Improved stability under load
**Perhatian**: Monitor connection usage patterns

## Phase 2: Caching Implementation

### 2.1 Redis Cache Service

#### New File: `src/services/cacheService.js`
**Purpose**: Centralized caching service
**Features**:
- User session caching
- JWT verification cache
- Configurable TTL
- Fallback mechanisms

**Tujuan**: Reduce database load by 70-80%
**Efek**: Much faster token verification
**Perhatian**: Redis dependency, cache invalidation strategy

#### New File: `src/middleware/cacheMiddleware.js`
**Purpose**: Request-level caching middleware
**Features**:
- Response caching
- Cache key generation
- Cache invalidation
- Performance metrics

### 2.2 In-Memory User Cache

#### New File: `src/services/userCacheService.js`
**Purpose**: LRU cache untuk frequently accessed users
**Features**:
- Memory-efficient user caching
- Automatic cache warming
- Cache statistics
- Memory usage monitoring

**Tujuan**: Faster user data access
**Efek**: Reduced database queries
**Perhatian**: Memory usage monitoring

## Phase 3: Advanced Optimizations

### 3.1 JWT Optimization

#### File: `src/utils/jwt.js`
**Changes**:
- Implement JWT blacklisting
- Add refresh token mechanism
- Optimize token payload
- Add token validation caching

**Tujuan**: Better security dan performance
**Efek**: More secure authentication flow
**Perhatian**: Breaking changes, migration needed

### 3.2 Database Schema Optimization

#### New Files: Database migrations
**Changes**:
- Add composite indexes
- Optimize existing indexes
- Add partial indexes
- Create materialized views

**Tujuan**: Faster database queries
**Efek**: Significant performance improvement
**Perhatian**: Schema changes, downtime required

## Implementation Steps

### Step 1: Environment Preparation
1. **Development Environment**:
   ```bash
   # Install Redis
   npm install redis ioredis
   
   # Install native bcrypt
   npm uninstall bcryptjs
   npm install bcrypt
   
   # Install monitoring tools
   npm install prom-client
   ```

2. **Environment Variables**:
   ```env
   # Redis Configuration
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=
   REDIS_DB=0
   
   # Cache Configuration
   CACHE_TTL_USER=3600
   CACHE_TTL_JWT=1800
   ENABLE_CACHE=true
   
   # Performance Configuration
   BCRYPT_ROUNDS=10
   ASYNC_LAST_LOGIN=true
   ENABLE_QUERY_CACHE=true
   ```

### Step 2: Code Implementation

#### 2.1 Password Hashing Update
```javascript
// src/utils/password.js
const bcrypt = require('bcrypt');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

const hashPassword = async (password) => {
  const startTime = Date.now();
  try {
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const duration = Date.now() - startTime;
    
    logger.debug('Password hashed', { duration });
    return hash;
  } catch (error) {
    logger.error('Password hashing failed', { error: error.message });
    throw new Error('Password hashing failed');
  }
};
```

#### 2.2 Database Query Optimization
```javascript
// src/services/authService.js
const registerUser = async (userData, options = {}) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Use upsert for better performance
    const [user, created] = await User.findOrCreate({
      where: { email: userData.email },
      defaults: {
        ...userData,
        password_hash: await hashPassword(userData.password)
      },
      transaction
    });
    
    if (!created) {
      await transaction.rollback();
      throw new Error('Email already exists');
    }
    
    await transaction.commit();
    return { user, token: generateToken(user) };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
```

#### 2.3 Cache Service Implementation
```javascript
// src/services/cacheService.js
const Redis = require('ioredis');

class CacheService {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 1
    });
  }
  
  async get(key) {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.warn('Cache get failed', { key, error: error.message });
      return null;
    }
  }
  
  async set(key, value, ttl = 3600) {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.warn('Cache set failed', { key, error: error.message });
      return false;
    }
  }
}
```

### Step 3: Testing Strategy

#### 3.1 Unit Tests
```javascript
// tests/services/authService.test.js
describe('Auth Service Optimization', () => {
  test('should register user faster than 100ms', async () => {
    const startTime = Date.now();
    const result = await authService.registerUser(userData);
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(100);
    expect(result.user).toBeDefined();
  });
  
  test('should login user faster than 80ms', async () => {
    const startTime = Date.now();
    const result = await authService.loginUser(credentials);
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(80);
    expect(result.token).toBeDefined();
  });
});
```

#### 3.2 Load Testing
```javascript
// tests/load/auth-load.test.js
const loadTest = async () => {
  const concurrentUsers = 1000;
  const promises = [];
  
  for (let i = 0; i < concurrentUsers; i++) {
    promises.push(
      authService.loginUser({
        email: `user${i}@test.com`,
        password: 'password123'
      })
    );
  }
  
  const startTime = Date.now();
  const results = await Promise.allSettled(promises);
  const duration = Date.now() - startTime;
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  console.log({
    totalUsers: concurrentUsers,
    successful,
    failed,
    duration,
    avgResponseTime: duration / concurrentUsers
  });
};
```

### Step 4: Monitoring Implementation

#### 4.1 Performance Metrics
```javascript
// src/middleware/metricsMiddleware.js
const promClient = require('prom-client');

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const authOperationDuration = new promClient.Histogram({
  name: 'auth_operation_duration_seconds',
  help: 'Duration of auth operations in seconds',
  labelNames: ['operation']
});
```

#### 4.2 Health Checks
```javascript
// src/routes/health.js
router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date(),
    services: {
      database: await checkDatabaseHealth(),
      cache: await checkCacheHealth(),
      memory: process.memoryUsage(),
      uptime: process.uptime()
    }
  };
  
  res.json(health);
});
```

## Deployment Strategy

### 1. Blue-Green Deployment
- Deploy ke staging environment
- Run comprehensive tests
- Switch traffic gradually
- Monitor performance metrics

### 2. Feature Flags
```javascript
// src/config/features.js
const features = {
  useNativeBcrypt: process.env.USE_NATIVE_BCRYPT === 'true',
  enableCache: process.env.ENABLE_CACHE === 'true',
  asyncLastLogin: process.env.ASYNC_LAST_LOGIN === 'true'
};
```

### 3. Rollback Plan
- Keep previous version ready
- Monitor error rates
- Automatic rollback triggers
- Manual rollback procedures

## Success Metrics

### Performance Targets
- **Login Response Time**: < 80ms (P95)
- **Registration Response Time**: < 120ms (P95)
- **Token Verification**: < 20ms (P95)
- **Concurrent Users**: 1000+
- **Error Rate**: < 0.1%

### Monitoring Alerts
- Response time > 200ms
- Error rate > 1%
- Database connection failures
- Cache miss rate > 50%
- Memory usage > 80%

## Maintenance

### Regular Tasks
1. **Performance Review**: Weekly performance metrics review
2. **Cache Optimization**: Monthly cache hit rate analysis
3. **Database Maintenance**: Quarterly index optimization
4. **Security Updates**: Regular dependency updates
5. **Load Testing**: Monthly load testing

### Troubleshooting
1. **High Response Times**: Check database connections, cache status
2. **Memory Leaks**: Monitor heap usage, restart if needed
3. **Cache Issues**: Verify Redis connectivity, clear cache if corrupted
4. **Database Issues**: Check connection pool, slow query logs
