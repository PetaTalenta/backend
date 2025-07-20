# ATMA API Gateway - Usage Guide

## 🚀 Quick Start

### 1. Installation
```bash
cd api-gateway
npm install
```

### 2. Configuration
Copy dan edit file environment:
```bash
cp .env.example .env
```

### 3. Start API Gateway
```bash
# Development mode (dengan auto-reload)
npm run dev

# Production mode
npm start
```

### 4. Start All Services
Gunakan script batch untuk menjalankan semua services sekaligus:
```bash
# Dari root directory atma-backend
start-with-gateway.bat
```

## 📋 Prerequisites

Pastikan services berikut sudah berjalan sebelum start API Gateway:

1. **Auth Service** - Port 3001
2. **Archive Service** - Port 3002  
3. **Assessment Service** - Port 3003

## 🌐 API Usage Examples

### Base URL
```
http://localhost:3000/api
```

### 1. User Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### 2. User Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### 3. Get User Profile (Authenticated)
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/auth/profile
```

### 4. Submit Assessment (Authenticated)
```bash
curl -X POST http://localhost:3000/api/assessment/submit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "riasec": {
      "realistic": 75,
      "investigative": 85,
      "artistic": 60,
      "social": 50,
      "enterprising": 70,
      "conventional": 55
    },
    "ocean": {
      "conscientiousness": 65,
      "extraversion": 55,
      "agreeableness": 45,
      "neuroticism": 30,
      "openness": 80
    },
    "viaIs": {
      "creativity": 85,
      "curiosity": 78,
      "judgment": 70,
      "loveOfLearning": 82,
      "perspective": 60,
      "bravery": 55,
      "perseverance": 68,
      "honesty": 73,
      "zest": 66,
      "love": 80,
      "kindness": 75,
      "socialIntelligence": 65,
      "teamwork": 60,
      "fairness": 70,
      "leadership": 67,
      "forgiveness": 58,
      "humility": 62,
      "prudence": 69,
      "selfRegulation": 61,
      "appreciationOfBeauty": 50,
      "gratitude": 72,
      "hope": 77,
      "humor": 65,
      "spirituality": 55
    }
  }'
```

### 5. Check Assessment Status
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/archive/jobs/YOUR_JOB_ID
```

### 6. Get Analysis Results
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:3000/api/archive/results?page=1&limit=10"
```

### 7. Admin Login
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

## 🔐 Authentication

### User Token
Setelah login, gunakan JWT token di header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Internal Service
Untuk komunikasi antar service:
```
X-Service-Key: internal_service_secret_key_change_in_production
X-Internal-Service: true
```

## 📊 Health Monitoring

### Basic Health Check
```bash
curl http://localhost:3000/health
```

### Detailed Health (All Services)
```bash
curl http://localhost:3000/health/detailed
```

### Readiness Check
```bash
curl http://localhost:3000/health/ready
```

### Liveness Check
```bash
curl http://localhost:3000/health/live
```

## ⚡ Rate Limiting

**Updated for High-Volume Testing (1000+ concurrent users)**

| Endpoint Type | Window | Max Requests | Key | Notes |
|---------------|--------|--------------|-----|-------|
| General | 15 min | 5000 | IP + User ID | Supports mass testing |
| Auth | 15 min | 2500 | IP | Register + Login + Profile |
| Assessment | 1 hour | 1000 | User ID | Mass assessment testing |
| Admin | 15 min | 1000 | IP | High-volume admin ops |

## 🛠️ Development

### Running Tests
```bash
npm test
```

### Watch Mode
```bash
npm run test:watch
```

### Development Mode
```bash
npm run dev
```

## 🔧 Configuration

### Environment Variables
```env
# Server
PORT=3000
NODE_ENV=development

# Services
AUTH_SERVICE_URL=http://localhost:3001
ARCHIVE_SERVICE_URL=http://localhost:3002
ASSESSMENT_SERVICE_URL=http://localhost:3003

# Security
JWT_SECRET=your_jwt_secret
INTERNAL_SERVICE_KEY=your_service_key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Custom Rate Limits
Edit `src/middleware/rateLimiter.js` untuk mengubah rate limiting.

### Custom Routes
Edit `src/routes/index.js` untuk menambah atau mengubah routing.

## 🚨 Troubleshooting

### Service Unavailable (503)
- Pastikan semua backend services berjalan
- Check health endpoint: `GET /health/detailed`

### Authentication Failed (401)
- Pastikan JWT token valid
- Check token dengan: `POST /api/auth/verify-token`

### Rate Limit Exceeded (429)
- Tunggu sampai window reset
- Atau adjust rate limit di config

### CORS Error
- Tambahkan origin ke `ALLOWED_ORIGINS` di .env
- Restart API Gateway setelah perubahan

## 📝 Logs

### Request Logs
API Gateway menggunakan Morgan untuk logging HTTP requests.

### Error Logs
Error logs include:
- Stack trace (development mode)
- Request context
- User information
- Timestamp

### Service Logs
Proxy logs untuk monitoring komunikasi dengan backend services.

## 🔄 Service Integration

### Adding New Service
1. Tambah service URL ke config
2. Buat proxy middleware di `src/middleware/proxy.js`
3. Tambah routes di `src/routes/index.js`
4. Update health checks

### Service Discovery
API Gateway menggunakan static configuration untuk service URLs. Untuk dynamic service discovery, implementasi bisa ditambahkan di `src/config/index.js`.

## 📞 Support

Untuk pertanyaan atau issues:
1. Check logs di console
2. Test individual services
3. Check health endpoints
4. Review configuration
