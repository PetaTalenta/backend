# Implementasi Auth Service V2 (Firebase-based)

## Ringkasan

Dokumen ini menjelaskan implementasi Auth Service V2 yang menggunakan Firebase Authentication sebagai backend autentikasi. Service ini berjalan secara paralel dengan Auth Service V1 yang sudah ada, dengan prefix endpoint `/api/auth/v2/*`.

## Tanggal Implementasi

**Tanggal:** 3 Oktober 2025

## Tujuan

1. Menyediakan alternatif autentikasi menggunakan Firebase Authentication
2. Mempertahankan Auth Service V1 yang sudah ada (tidak menghapus)
3. Mengintegrasikan service baru ke dalam Docker network yang sudah ada
4. Menyediakan dokumentasi lengkap untuk endpoint baru

## Komponen yang Diimplementasikan

### 1. Micro-Auth Service

**Lokasi:** `/micro-auth/`

**Teknologi:**
- Runtime: Bun (bukan Node.js)
- Framework: Hono (bukan Express)
- Authentication: Firebase Admin SDK
- Language: TypeScript

**Port:** 3008 (internal Docker network)

**Endpoint Base Path:** `/v1/auth/*` (internal)

**Fitur:**
- Register user dengan email/password
- Login user
- Refresh token
- Forgot password (kirim email reset)
- Reset password
- Logout (revoke refresh tokens)
- Update profile (displayName, photoURL)
- Delete user account
- Health check

### 2. Dockerfile untuk Micro-Auth

**File:** `/micro-auth/Dockerfile`

**Highlights:**
- Menggunakan base image `oven/bun:1-alpine`
- Support untuk development dan production builds
- Non-root user untuk keamanan
- Health check endpoint
- Volume untuk logs

### 3. Docker Compose Configuration

#### Production (docker-compose.yml)

**Service Name:** `auth-v2-service`

**Environment Variables:**
```yaml
NODE_ENV: production
PORT: 3008
FIREBASE_PROJECT_ID: ${FIREBASE_PROJECT_ID}
FIREBASE_PRIVATE_KEY: ${FIREBASE_PRIVATE_KEY}
FIREBASE_CLIENT_EMAIL: ${FIREBASE_CLIENT_EMAIL}
FIREBASE_API_KEY: ${FIREBASE_API_KEY}
LOG_LEVEL: info
```

**Network:** `atma-network` (shared dengan service lain)

**Volumes:**
- `./micro-auth/logs:/app/logs`

#### Development (docker-compose.override.yml)

**Command:** `bun run dev` (hot reload)

**Volumes:**
- `./micro-auth:/app` (code mounting)
- `/app/node_modules` (anonymous volume)
- `./micro-auth/logs:/app/logs`

**Environment:**
- `NODE_ENV: development`
- `LOG_LEVEL: debug`

### 4. API Gateway Integration

#### Config Update

**File:** `/api-gateway/src/config/index.js`

Menambahkan:
```javascript
authV2: process.env.AUTH_V2_SERVICE_URL || 'http://localhost:3008'
```

#### Proxy Middleware

**File:** `/api-gateway/src/middleware/proxy.js`

Menambahkan `authV2ServiceProxy` dengan path rewrite:
- `/api/auth/v2/health` → `/health`
- `/api/auth/v2` → `/v1/auth`

#### Routing

**File:** `/api-gateway/src/routes/index.js`

**Public Endpoints (no auth):**
- `POST /api/auth/v2/register`
- `POST /api/auth/v2/login`
- `POST /api/auth/v2/refresh`
- `POST /api/auth/v2/forgot-password`
- `POST /api/auth/v2/reset-password`

**Protected Endpoints (Firebase token required):**
- `POST /api/auth/v2/logout`
- `PATCH /api/auth/v2/profile`
- `DELETE /api/auth/v2/user`

**Health Check:**
- `GET /api/auth/v2/health`

### 5. Documentation Service

**File:** `/documentation-service/src/data/auth-v2-service.js`

Berisi dokumentasi lengkap untuk semua endpoint Auth V2 dengan:
- Method dan path
- Deskripsi
- Request body dan parameters
- Response format
- Error responses
- cURL examples

**Integration:** Ditambahkan ke `main.js` dengan key `'auth-v2-service'`

## Perbedaan Auth V1 vs Auth V2

| Aspek | Auth V1 | Auth V2 |
|-------|---------|---------|
| Backend | PostgreSQL + JWT | Firebase Authentication |
| Runtime | Node.js | Bun |
| Framework | Express | Hono |
| Token Type | Custom JWT | Firebase ID Token |
| Database | Required | Not Required (Firebase handles) |
| User Management | Manual (DB) | Firebase Console |
| Email Verification | Custom | Firebase built-in |
| Password Reset | Custom | Firebase built-in |
| Prefix | `/api/auth/*` | `/api/auth/v2/*` |
| Port | 3001 | 3008 |

## Environment Variables yang Diperlukan

Tambahkan ke file `.env`:

```env
# Firebase Configuration for Auth V2
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Cara Mendapatkan Credentials:**

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Pilih project atau buat project baru
3. Go to Project Settings → Service Accounts
4. Click "Generate New Private Key"
5. Download JSON file
6. Extract values:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
7. Untuk API Key: Project Settings → General → Web API Key

## Cara Menjalankan

### 1. Setup Environment Variables

```bash
# Edit .env file dan tambahkan Firebase credentials
nano .env
```

### 2. Build dan Start Services

```bash
# Build semua services
docker-compose build

# Start semua services
docker-compose up -d

# Atau untuk development dengan hot reload
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

### 3. Verify Service Running

```bash
# Check logs
docker logs atma-auth-v2-service

# Test health endpoint
curl http://localhost:3000/api/auth/v2/health
```

### 4. Test Registration

```bash
curl -X POST http://localhost:3000/api/auth/v2/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "displayName": "Test User"
  }'
```

## Troubleshooting

### Service tidak start

**Cek logs:**
```bash
docker logs atma-auth-v2-service
```

**Kemungkinan masalah:**
1. Firebase credentials tidak valid
2. Port 3008 sudah digunakan
3. Network `atma-network` belum dibuat

### Firebase Error: "Firebase not configured"

Service akan tetap berjalan dalam test mode jika Firebase credentials tidak ada. Pastikan semua environment variables sudah diset dengan benar.

### API Gateway tidak bisa connect ke auth-v2-service

**Cek network:**
```bash
docker network inspect atma-network
```

Pastikan kedua service ada di network yang sama.

## Testing

### Manual Testing

Gunakan cURL atau Postman untuk test endpoint:

```bash
# Register
curl -X POST http://localhost:3000/api/auth/v2/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@test.com", "password": "test1234"}'

# Login
curl -X POST http://localhost:3000/api/auth/v2/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@test.com", "password": "test1234"}'

# Health Check
curl http://localhost:3000/api/auth/v2/health
```

### Automated Testing

Micro-auth service sudah memiliki test suite:

```bash
# Masuk ke container
docker exec -it atma-auth-v2-service sh

# Run tests
bun test
```

## Monitoring

### Logs

```bash
# Real-time logs
docker logs -f atma-auth-v2-service

# Logs dari file
tail -f micro-auth/logs/*.log
```

### Health Check

```bash
# Via API Gateway
curl http://localhost:3000/api/auth/v2/health

# Direct ke service
curl http://localhost:3008/health
```

## Keamanan

1. **Firebase Credentials:** Jangan commit credentials ke Git. Gunakan `.env` file.
2. **HTTPS:** Gunakan HTTPS di production (handled by Cloudflare Tunnel).
3. **Rate Limiting:** Auth endpoints sudah dilindungi rate limiter di API Gateway.
4. **Token Validation:** Protected endpoints memerlukan Firebase ID Token yang valid.

## Maintenance

### Update Dependencies

```bash
cd micro-auth
bun update
```

### Rebuild Service

```bash
docker-compose build auth-v2-service
docker-compose up -d auth-v2-service
```

## Dokumentasi Tambahan

- **API Endpoints:** Lihat dokumentasi lengkap di http://localhost:8080 (Documentation Service)
- **Firebase Setup:** `/micro-auth/docs/firebase-setup.md`
- **Error Handling:** `/micro-auth/docs/error-handling.md`
- **User Federation:** `/micro-auth/docs/user-federation-strategy.md`

## Kontak

Untuk pertanyaan atau issue terkait implementasi ini, hubungi tim development.

---

**Catatan:** Service ini berjalan paralel dengan Auth Service V1. Tidak ada perubahan pada Auth Service V1 yang sudah ada.

