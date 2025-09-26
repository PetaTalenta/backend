# Troubleshooting Guide

Panduan untuk mengatasi masalah umum yang mungkin terjadi pada ATMA API Gateway.

## 🚨 Common Issues

### 1. Service Connection Errors

#### Problem: Gateway cannot connect to backend services

**Symptoms**:
- 503 Service Unavailable errors
- "ECONNREFUSED" errors in logs
- Health check failures

**Diagnosis**:
```bash
# Check service URLs configuration
echo $AUTH_SERVICE_URL
echo $ARCHIVE_SERVICE_URL
echo $ASSESSMENT_SERVICE_URL

# Test connectivity to services
curl -f http://localhost:3001/health
curl -f http://localhost:3002/health
curl -f http://localhost:3003/health

# Check network connectivity
ping auth-service
telnet auth-service 3001
```

**Solutions**:
1. **Verify service URLs**:
   ```bash
   # Update .env file with correct URLs
   AUTH_SERVICE_URL=http://correct-host:3001
   ```

2. **Check service status**:
   ```bash
   # For Docker services
   docker ps
   docker logs auth-service
   
   # For PM2 services
   pm2 list
   pm2 logs auth-service
   ```

3. **Network connectivity**:
   ```bash
   # Check if services are running
   netstat -tlnp | grep :3001
   
   # For Docker networks
   docker network ls
   docker network inspect atma-network
   ```

### 2. Authentication Failures

#### Problem: JWT token verification fails

**Symptoms**:
- 401 Unauthorized errors
- "Invalid or expired token" messages
- Authentication middleware failures

**Diagnosis**:
```bash
# Check JWT secret configuration
echo $JWT_SECRET

# Verify token manually (Node.js)
node -e "
const jwt = require('jsonwebtoken');
const token = 'YOUR_TOKEN_HERE';
const secret = process.env.JWT_SECRET;
try {
  console.log(jwt.verify(token, secret));
} catch (err) {
  console.error('Token verification failed:', err.message);
}
"

# Check auth service health
curl -f http://localhost:3001/health
```

**Solutions**:
1. **JWT Secret mismatch**:
   ```bash
   # Ensure all services use the same JWT secret
   # Update .env files across all services
   JWT_SECRET=same_secret_for_all_services
   ```

2. **Token expiration**:
   ```bash
   # Check token expiration time
   # Re-login to get fresh token
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","password":"password"}'
   ```

3. **Auth service issues**:
   ```bash
   # Restart auth service
   pm2 restart auth-service
   # or
   docker restart auth-service
   ```

### 3. Rate Limiting Issues

#### Problem: Requests being blocked by rate limiter

**Symptoms**:
- 429 Too Many Requests errors
- Rate limit headers in response
- Legitimate requests being blocked

**Diagnosis**:
```bash
# Check rate limit configuration
echo $RATE_LIMIT_MAX_REQUESTS
echo $RATE_LIMIT_WINDOW_MS

# Monitor rate limit headers
curl -I http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check current rate limit status
curl -s http://localhost:3000/health | jq '.rateLimits'
```

**Solutions**:
1. **Adjust rate limits**:
   ```bash
   # Increase limits in .env
   RATE_LIMIT_MAX_REQUESTS=10000
   RATE_LIMIT_WINDOW_MS=600000
   
   # Restart gateway
   pm2 restart atma-api-gateway
   ```

2. **Whitelist specific IPs**:
   ```javascript
   // In rateLimiter.js
   const generalLimiter = rateLimit({
     windowMs: 10 * 60 * 1000,
     max: 5000,
     skip: (req) => {
       // Skip rate limiting for specific IPs
       const whitelist = ['127.0.0.1', '::1'];
       return whitelist.includes(req.ip);
     }
   });
   ```

3. **Clear rate limit cache**:
   ```bash
   # If using Redis for rate limiting
   redis-cli FLUSHDB
   
   # Restart gateway to reset in-memory limits
   pm2 restart atma-api-gateway
   ```

### 4. Memory Leaks

#### Problem: Gateway memory usage keeps increasing

**Symptoms**:
- Increasing memory usage over time
- Out of memory errors
- Performance degradation

**Diagnosis**:
```bash
# Monitor memory usage
ps aux | grep node
top -p $(pgrep node)

# Check Node.js heap usage
curl http://localhost:3000/health/detailed | jq '.memory'

# Enable heap profiling
node --inspect src/server.js
```

**Solutions**:
1. **Increase memory limit**:
   ```bash
   # In PM2 ecosystem file
   node_args: '--max-old-space-size=2048'
   
   # Or set environment variable
   export NODE_OPTIONS="--max-old-space-size=2048"
   ```

2. **Profile memory usage**:
   ```bash
   # Install clinic.js
   npm install -g clinic
   
   # Profile memory
   clinic doctor -- node src/server.js
   clinic bubbleprof -- node src/server.js
   ```

3. **Fix memory leaks**:
   ```javascript
   // Ensure proper cleanup of event listeners
   process.on('SIGTERM', () => {
     server.close(() => {
       // Clean up resources
       process.exit(0);
     });
   });
   ```

### 5. High Response Times

#### Problem: API Gateway responses are slow

**Symptoms**:
- High response times (>1000ms)
- Timeout errors
- Poor user experience

**Diagnosis**:
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/auth/profile

# Create curl-format.txt
echo "
     time_namelookup:  %{time_namelookup}
        time_connect:  %{time_connect}
     time_appconnect:  %{time_appconnect}
    time_pretransfer:  %{time_pretransfer}
       time_redirect:  %{time_redirect}
  time_starttransfer:  %{time_starttransfer}
                     ----------
          time_total:  %{time_total}
" > curl-format.txt

# Monitor backend service response times
curl -w "%{time_total}" -o /dev/null -s http://localhost:3001/health
```

**Solutions**:
1. **Optimize connection pooling**:
   ```javascript
   // Increase connection pool size
   const httpAgent = new http.Agent({
     keepAlive: true,
     maxSockets: 100,
     maxFreeSockets: 20,
     timeout: 30000
   });
   ```

2. **Increase timeouts**:
   ```javascript
   // In proxy configuration
   timeout: 60000,
   proxyTimeout: 60000
   ```

3. **Enable caching**:
   ```javascript
   // Add response caching
   app.use('/api/static-data', cache('5 minutes'), proxy);
   ```

### 6. CORS Issues

#### Problem: Cross-origin requests are blocked

**Symptoms**:
- CORS errors in browser console
- Preflight request failures
- 403 Forbidden errors

**Diagnosis**:
```bash
# Check CORS configuration
echo $ALLOWED_ORIGINS

# Test CORS headers
curl -H "Origin: https://example.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://localhost:3000/api/auth/login
```

**Solutions**:
1. **Update CORS configuration**:
   ```bash
   # Allow specific origins
   ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
   
   # Or allow all origins (development only)
   ALLOWED_ORIGINS=*
   ```

2. **Fix CORS middleware**:
   ```javascript
   app.use(cors({
     origin: function (origin, callback) {
       const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
       if (!origin || allowedOrigins.includes(origin)) {
         callback(null, true);
       } else {
         callback(new Error('Not allowed by CORS'));
       }
     },
     credentials: true
   }));
   ```

### 7. SSL/TLS Issues

#### Problem: HTTPS connection problems

**Symptoms**:
- SSL certificate errors
- Mixed content warnings
- Connection refused on port 443

**Diagnosis**:
```bash
# Check SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Verify certificate expiration
echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates

# Check Nginx SSL configuration
nginx -t
```

**Solutions**:
1. **Renew SSL certificate**:
   ```bash
   # For Let's Encrypt
   sudo certbot renew
   sudo systemctl reload nginx
   ```

2. **Fix SSL configuration**:
   ```nginx
   # In Nginx configuration
   ssl_certificate /path/to/certificate.crt;
   ssl_certificate_key /path/to/private.key;
   ssl_protocols TLSv1.2 TLSv1.3;
   ```

## 🔧 Debug Mode

### Enable Debug Logging

```bash
# Set debug log level
export LOG_LEVEL=debug
export NODE_ENV=development

# Start with debugging
node --inspect=0.0.0.0:9229 src/server.js

# Use Chrome DevTools
# Open chrome://inspect in Chrome browser
```

### Debug Specific Components

```javascript
// Add debug logging to middleware
const debug = require('debug')('gateway:auth');

const verifyToken = async (req, res, next) => {
  debug('Verifying token for request:', req.url);
  // ... rest of the code
};
```

### Performance Profiling

```bash
# Install profiling tools
npm install -g clinic autocannon

# Profile CPU usage
clinic doctor -- node src/server.js

# Profile memory usage
clinic bubbleprof -- node src/server.js

# Load testing
autocannon -c 100 -d 30 http://localhost:3000/health
```

## 📊 Monitoring Commands

### Health Checks

```bash
# Basic health check
curl http://localhost:3000/health

# Detailed health check
curl http://localhost:3000/health/detailed | jq '.'

# Check specific service health
curl http://localhost:3000/api/auth/health
curl http://localhost:3000/api/archive/health
curl http://localhost:3000/api/assessment/health
```

### Log Analysis

```bash
# View recent logs
tail -f logs/gateway-$(date +%Y-%m-%d).log

# Search for errors
grep -i error logs/gateway-$(date +%Y-%m-%d).log

# Count error types
grep -i error logs/gateway-$(date +%Y-%m-%d).log | cut -d' ' -f4 | sort | uniq -c

# Monitor real-time logs
pm2 logs atma-api-gateway --lines 100
```

### Performance Monitoring

```bash
# Check process status
pm2 status

# Monitor resource usage
pm2 monit

# View detailed metrics
curl http://localhost:3000/metrics
```

## 🆘 Emergency Procedures

### Service Recovery

```bash
# Quick restart
pm2 restart atma-api-gateway

# Full restart with logs
pm2 stop atma-api-gateway
pm2 start atma-api-gateway
pm2 logs atma-api-gateway

# Docker restart
docker restart atma-api-gateway
docker logs -f atma-api-gateway
```

### Rollback Procedures

```bash
# Git rollback
git log --oneline -10
git checkout <previous-commit-hash>
pm2 restart atma-api-gateway

# Docker rollback
docker images atma-api-gateway
docker stop atma-api-gateway
docker run -d --name atma-api-gateway-new atma-api-gateway:previous-tag
```

### Emergency Contacts

- **Development Team**: dev-team@atma.com
- **DevOps Team**: devops@atma.com
- **On-call Engineer**: +1-xxx-xxx-xxxx

## 📚 Additional Resources

### Log Files Locations

```
logs/
├── gateway-YYYY-MM-DD.log     # General application logs
├── error-YYYY-MM-DD.log       # Error logs only
├── pm2-error.log              # PM2 error logs
├── pm2-out.log                # PM2 output logs
└── nginx/
    ├── access.log             # Nginx access logs
    └── error.log              # Nginx error logs
```

### Useful Commands

```bash
# Check port usage
netstat -tlnp | grep :3000
lsof -i :3000

# Check disk space
df -h
du -sh logs/

# Check system resources
free -h
top
htop

# Network diagnostics
ping google.com
nslookup yourdomain.com
traceroute yourdomain.com
```

### Configuration Files

- Main config: `src/config/index.js`
- Environment: `.env`
- PM2 config: `ecosystem.config.js`
- Docker config: `Dockerfile`, `docker-compose.yml`
- Nginx config: `/etc/nginx/sites-available/atma-api-gateway`

---

**Last Updated**: 2024-01-01  
**Version**: 1.0.0
