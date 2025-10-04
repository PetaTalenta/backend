# 🔄 Panduan Migrasi Frontend: Auth Service → Auth-v2 Service

## 📋 Tujuan

Dokumen ini memandu tim frontend untuk melakukan migrasi dari **auth-service** (legacy) ke **auth-v2-service** (Firebase-based) yang baru.

**Target Audience**: Frontend Developers  
**Created**: 4 Oktober 2025  
**Status**: Ready for Implementation

---

## 🎯 Target Migrasi

### Mengapa Migrasi?

1. **Teknologi Modern**: Auth-v2 menggunakan Firebase Authentication yang lebih reliable dan scalable
2. **Security Enhancement**: Firebase memiliki security features yang lebih comprehensive
3. **Better Performance**: Runtime yang lebih cepat dengan Bun
4. **Unified Authentication**: Standardisasi dengan Firebase ecosystem
5. **Future-ready**: Mendukung berbagai provider OAuth (Google, Facebook, etc.)

### Target Hasil

- ✅ Semua fitur autentikasi menggunakan auth-v2
- ✅ Token format baru (Firebase JWT)
- ✅ Flow autentikasi yang konsisten
- ✅ Backward compatibility selama fase transisi (hybrid mode)

---

## 📊 Perbedaan Utama

### 1. Base URL & Port

| Aspect | Auth Service (Old) | Auth-v2 Service (New) |
|--------|-------------------|----------------------|
| **Internal Port** | 3001 | 3008 |
| **Via Gateway** | `/api/auth/*` | `/api/auth/v2/*` |
| **Direct Access** | `http://localhost:3001` | `http://localhost:3008` |
| **Docker Service** | `auth-service:3001` | `auth-v2-service:3008` |
| **Health Check** | `/health` | `/health` |

### 2. Endpoint Prefix

| Service | Endpoint Pattern | Notes |
|---------|-----------------|-------|
| **Old (auth)** | `/api/auth/*` | Legacy endpoints |
| **New (auth-v2)** | `/api/auth/v2/*` | Via API Gateway (recommended) |
### 4. Token Format

#### Auth Service (Old)
- **Type**: Custom JWT
- **Algorithm**: HS256 (HMAC with SHA-256)
- **Issuer**: Internal auth-service
- **Payload**: Custom fields (userId, username, email, user_type)
- **Expiry**: Configurable (typically 24h or longer)
- **Verification**: Via `/api/auth/verify-token`

#### Auth-v2 Service (New)
- **Type**: Firebase JWT (ID Token)
- **Algorithm**: RS256 (RSA with SHA-256)
- **Issuer**: Firebase (`https://securetoken.google.com/<project-id>`)
- **Payload**: Firebase standard fields (sub, email, email_verified, auth_time, iat, exp)
- **Expiry**: **1 hour** (3600 seconds) ⚠️ **PENTING!**
- **Verification**: Via `/api/auth/v2/token/verify` (internal) atau Firebase SDK

### 5. Response Format

Kedua service menggunakan format response yang **sama**:

```json
{
  "success": true,
  "data": { ... },
  "message": "...",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

Namun, struktur `data` berbeda untuk beberapa endpoint.

### 6. API Gateway Features

API Gateway menyediakan:
- ✅ **Automatic Token Detection**: Deteksi otomatis JWT vs Firebase token
- ✅ **Dual Token Support**: Support kedua token format secara bersamaan
- ✅ **Automatic Fallback**: Coba Firebase first, fallback ke JWT
- ✅ **Rate Limiting**: 5000 requests per 10 minutes (configurable)
- ✅ **CORS Handling**: Pre-configured untuk frontend
- ✅ **Request Logging**: Centralized logging untuk debugging
- ✅ **Error Handling**: Standardized error responsesail_verified, auth_time, iat, exp)

### 4. Response Format

Kedua service menggunakan format response yang **sama**:

```json
{
  "success": true,
  "data": { ... },
  "message": "...",
  "timestamp": "2025-10-03T10:30:00Z"
}
```

Namun, struktur `data` berbeda untuk beberapa endpoint.

---

## 🔄 Mapping Endpoint

### Public Endpoints

#### Register

| Old | New | Changes |
|-----|-----|---------|
| `POST /api/auth/register` | `POST /api/auth/v2/register` | ✅ Response includes Firebase tokens |
| Body: `{username, email, password}` | Body: `{email, password, displayName?, photoURL?}` | ⚠️ `username` → `displayName` (optional) |

**Response Changes**:
```diff
// OLD
{
  "user": {
    "id": "uuid",
    "username": "johndoe",
    "email": "...",
    "user_type": "user",
    "token_balance": 5
  },
  "token": "jwt-token"
}

// NEW
{
  "uid": "firebase-uid",
  "email": "...",
  "displayName": "John Doe",
  "photoURL": "...",
  "idToken": "firebase-jwt-token",
  "refreshToken": "firebase-refresh-token",
  "expiresIn": "3600"
}
```

#### Login

| Old | New | Changes |
|-----|-----|---------|
| `POST /api/auth/login` | `POST /api/auth/v2/login` | ✅ Response includes Firebase tokens |
| Body: `{email, password}` | Body: `{email, password}` | ✅ Same request body |

**Response Changes**: Sama seperti register (lihat di atas)

#### Token Refresh

| Old | New | Changes |
|-----|-----|---------|
| ❌ Not available | `POST /api/auth/v2/refresh` | ✅ New endpoint |
| - | Body: `{refreshToken}` | 🆕 Required for token renewal |

**New Feature**:
```json
// Request
{
  "refreshToken": "firebase-refresh-token"
}

// Response
{
  "idToken": "new-firebase-jwt",
  "refreshToken": "new-refresh-token",
  "expiresIn": "3600"
}
```

#### Password Reset

| Old | New | Changes |
|-----|-----|---------|
| ❌ Not available | `POST /api/auth/v2/forgot-password` | 🆕 Email-based reset |
| - | Body: `{email}` | 🆕 Sends reset email |
| ❌ Not available | `POST /api/auth/v2/reset-password` | 🆕 Complete reset flow |
| - | Body: `{oobCode, newPassword}` | 🆕 Uses Firebase OOB code |

### Protected Endpoints

#### Get Profile

| Old | New | Changes |
|-----|-----|---------|
| `GET /api/auth/profile` | ❌ Not available in v2 | ⚠️ Use Firebase SDK or other profile service |
| Header: `Authorization: Bearer <token>` | - | Use separate user/profile service |

**Note:** Auth-v2 tidak menyediakan GET profile endpoint. User data tersedia dari login/register response atau gunakan service terpisah untuk profile management.

**Response Changes**:
```diff
// OLD
{
  "id": "uuid",
  "username": "johndoe",
  "email": "...",
  "user_type": "user",
  "token_balance": 5,
  "profile": {
    "full_name": "...",
    "bio": "...",
    "phone": "..."
  }
}

// NEW
{
  "uid": "firebase-uid",
  "email": "...",
  "displayName": "John Doe",
  "photoURL": "...",
  "emailVerified": true,
  "metadata": {
    "creationTime": "...",
    "lastSignInTime": "..."
  }
}
#### Update Profile

| Old | New | Changes |
|-----|-----|---------|
| `PUT /api/auth/profile` | `PATCH /api/auth/v2/profile` | ⚠️ Method changed: PUT → PATCH |
| Body: `{full_name?, bio?, phone?, ...}` | Body: `{displayName?, photoURL?}` | ⚠️ Limited fields (Firebase only) |
| `PUT /api/auth/profile` | `PATCH /api/v2/auth/profile` | ⚠️ Method changed: PUT → PATCH |
#### Change Password

| Old | New | Changes |
|-----|-----|---------|
| `POST /api/auth/change-password` | ❌ Use `/auth/v2/forgot-password` flow | ⚠️ Different mechanism |
| Body: `{oldPassword, newPassword}` | - | Use Firebase password reset flow instead |
| `POST /api/auth/change-password` | ❌ Use `/forgot-password` flow | ⚠️ Different mechanism |
#### Logout

| Old | New | Changes |
|-----|-----|---------|
| `POST /api/auth/logout` | `POST /api/auth/v2/logout` | ✅ Similar endpoint |
| Server-side token invalidation | Revokes refresh tokens + client clear tokens | ⚠️ Different mechanism (Firebase) |
| Body: none | Body: `{refreshToken}` | 🆕 Requires refreshToken |
#### Delete Account

| Old | New | Changes |
|-----|-----|---------|
| `DELETE /api/auth/account` | `DELETE /api/auth/v2/user` | ⚠️ Different path |
| Requires auth token | Requires auth token + password | ✅ Both need confirmation |
| Body: none | Body: `{password}` | 🆕 Password confirmation required |
|-----|-----|---------|
| `DELETE /api/auth/account` | `DELETE /api/v2/auth/user` | ⚠️ Different path |
| Requires password confirmation | Requires active session | ✅ Both need auth |

### Endpoints Tidak Ada di Auth-v2

Endpoint berikut **hanya ada di auth-service lama** dan **tidak tersedia** di auth-v2:

| Endpoint | Alternative |
|----------|-------------|
| `GET /api/auth/token-balance` | Gunakan user service atau profile service |
| `PUT /api/auth/token-balance` | Internal service only, tidak perlu di frontend |
| `GET /api/auth/schools` | Pindah ke school/profile service |
| `POST /api/auth/schools` | Pindah ke school/profile service |
| `POST /api/auth/verify-token` | Firebase auto-verify via SDK |

---

## 🌐 API Gateway Architecture

### Request Flow
```
┌─────────────┐         ┌─────────────────┐
│   Frontend  │ ────────▶│   API Gateway   │
│  (Browser)  │         │  (Port 3000)    │
└─────────────┘         └─────────────────┘
      │                         │
      │  POST /api/auth/v2/login
      │ ─────────────────────▶  │
      │                         │
      │  ◀───── Response ────── │
```
### Gateway Features

API Gateway menyediakan:
- ✅ **Rate Limiting**: 5000 requests per 10 minutes
- ✅ **CORS Handling**: Pre-configured untuk frontend
- ✅ **Error Handling**: Standardized error responses
- ✅ **Request Logging**: Untuk debugging
---

## 🔀 Flow Baru

### 1. Registration Flow

**Step-by-step**:
1. Frontend kirim POST `/api/auth/v2/register` dengan `{email, password, displayName}`
2. Frontend terima response dengan `idToken`, `refreshToken`, `uid`
3. Frontend simpan tokens di localStorage/cookies
4. Frontend update UI dengan user info

**Key Points**:
- ✅ Single request untuk create user
- ✅ Langsung dapat token
- ✅ No need separate token request
- ⚠️ Simpan `refreshToken` untuk refresh later

### 2. Login Flow

**Step-by-step**:
1. Frontend kirim POST `/api/auth/v2/login` dengan `{email, password}`
2. Frontend terima response dengan user data + tokens
3. Frontend simpan `idToken`, `refreshToken`, `uid`
4. Frontend redirect ke dashboard

**Key Points**:
- ✅ Token expiry: 1 hour (3600s)
- ⚠️ Must implement refresh mechanism
    ↓
[Firebase]
    |
    | Validate refreshToken
    | Return new idToken + refreshToken
    ↓
[Frontend]
    |
    | Update stored tokens
    | Retry original request with new idToken
```
**Key Points**:
- 🆕 **WAJIB diimplement** - Firebase token expire setelah 1 jam
- ✅ Refresh before expiry atau on 401 error
- ✅ Update both idToken and refreshToken
- ⚠️ If refresh fails → logout user

**Step-by-step**:
1. Frontend check apakah `idToken` sudah expired (sebelum request) ATAU catch 401 error (setelah request failed)
2. Frontend kirim POST `/api/auth/v2/refresh` dengan `{refreshToken: stored_refresh_token}`
3. API Gateway forward ke auth-v2-service
4. Auth-v2 request new token dari Firebase
5. Firebase validate refreshToken, return new tokens
6. Frontend update stored tokens di localStorage
7. Frontend retry original request dengan new idToken
5. Frontend update stored tokens di localStorage
6. Frontend retry original request dengan new idToken

**Key Points**:
- 🆕 **WAJIB diimplement** - Firebase token expire setelah 1 jam
- ✅ Refresh before expiry atau on 401 error
- ✅ Update both idToken and refreshToken
- ⚠️ If refresh fails → logout user
    | Update password in Firebase
    ↓
[Frontend]
    |
    | Show success message
    | Redirect to login
```
### 5. Protected Request Flow
```
[Frontend]
    |
    | Any protected request (e.g., GET /api/v2/auth/profile)
    | Header: Authorization: Bearer <idToken>
    ↓
[Auth-v2 Service]
    |
**Step-by-step**:
1. User click "Forgot Password" di frontend
2. Frontend kirim POST `/api/auth/v2/forgot-password` dengan `{email}`
3. API Gateway forward ke auth-v2-service
4. Auth-v2 trigger Firebase send email
5. Firebase kirim email dengan reset link (berisi `oobCode`)
6. User click link di email → redirect ke frontend reset page dengan `?oobCode=xxx`
7. Frontend tampilkan form reset password
8. Frontend extract `oobCode` dari URL
9. Frontend kirim POST `/api/auth/v2/reset-password` dengan `{oobCode, newPassword}`
10. API Gateway forward ke auth-v2-service
11. Auth-v2 update password di Firebase
12. Frontend tampilkan success message → redirect to login

---

## 🔄 Hybrid Mode (Transisi Bertahap)

### Apa itu Hybrid Mode?

**Hybrid Mode** adalah strategi migrasi di mana **auth-service (v1) dan auth-v2-service berjalan bersamaan** selama periode transisi.

**PENTING**: 
- ✅ **Backend sudah support hybrid mode!** API Gateway sudah configured untuk handle kedua service
- ✅ **Automatic token detection** - Gateway detect JWT vs Firebase token otomatis
- ✅ **Zero downtime migration** - User existing tetap bisa pakai auth lama
- ⚠️ **Frontend yang perlu implement dual support** untuk smooth migration

### Backend Hybrid Mode (Already Configured)

**API Gateway Configuration:**
```javascript
// Gateway automatically handles both services
authServiceProxy      → http://auth-service:3001      (/api/auth/*)
authV2ServiceProxy    → http://auth-v2-service:3008   (/api/auth/v2/*)

// Token verification fallback
verifyToken() {
  try Firebase verification first
  if failed → try JWT verification
  if both failed → return 401
}
```
**Both services running simultaneously:**
- ✅ Auth Service (v1): Running on port 3001
- ✅ Auth V2 Service (v2): Running on port 3008
- ✅ API Gateway: Routes to both based on endpoint prefix
- ✅ Token verification: Automatic fallback between Firebase and JWT

---

### Mengapa Perlu Hybrid Mode?

| Tanpa Hybrid | Dengan Hybrid |
|--------------|---------------|
| ❌ Big bang migration - risky | ✅ Gradual migration - safer |
| ❌ Semua user affected sekaligus | ✅ Bisa rollback per user/feature |
| ❌ Tidak bisa A/B testing | ✅ Bisa test dengan small percentage |
| ❌ Sulit troubleshoot | ✅ Mudah identify issue source |
| ❌ User existing harus logout/re-register | ✅ User existing tetap bisa pakai auth lama |

---

### 3 Strategi Hybrid (Pilih Salah Satu)

#### Strategi 1: Feature Flag (Recommended)

**Konsep**: Toggle on/off auth-v2 via environment variable atau config

**Kapan pakai**: 
- Development/staging testing
- Soft launch ke production
- Butuh rollback cepat

**PENTING**: 
- ✅ **Backend sudah support hybrid mode!** API Gateway siap handle kedua service
- ✅ **Zero downtime migration** - User existing tetap bisa pakai auth lama
- ⚠️ **Frontend yang perlu implement dual support** untuk smooth migration
**Kekurangan**: Lebih complex implementation
### Backend Support

Backend sudah support hybrid mode:
- ✅ Auth Service (v1): Accessible via `/api/auth/*`
- ✅ Auth V2 Service (v2): Accessible via `/api/auth/v2/*`
- ✅ API Gateway: Routes ke service yang sesuai
- ✅ Automatic token detection and verification

---- Abstract layer yang route ke endpoint correct
   - Handle different response format
   - Support both token types

5. **Migration Trigger** (Optional)
   - Button untuk migrate user lama ke v2
   - Background migration saat user login

---

### Timeline Migration Frontend

**Week 1-2: Preparation**
- Setup feature flag system
- Buat abstraction layer untuk auth
- Update API client support dual endpoint
- Testing di local dengan toggle flag
- Deploy ke staging

**Week 3-4: Soft Launch (10%)**
- Enable auth-v2 untuk user baru saja (atau 10% random)
- Monitor error rate, API latency
- Collect user feedback
- Fix critical bugs

**Week 5-6: Scale Up (50%)**
- Increase ke 50% users
- Monitor stability
- Optimize performance issues
- Update documentation

**Week 7-8: Full Migration (100% new)**
- 100% user baru pakai auth-v2
- User lama masih bisa pakai auth lama
- Optional: Start migrate user lama

**Week 9-12: Legacy Cleanup**
- Migrate remaining users (optional)
- Remove auth v1 code dari frontend (jika sudah 100%)
- Simplify codebase

---

### Rollback Strategy (Emergency)

**Jika ada masalah critical dengan auth-v2:**

1. **Toggle Feature Flag**: Set `USE_AUTH_V2=false` → instant rollback
2. **Clear New Tokens**: Remove Firebase tokens dari localStorage
3. **Keep Old Tokens**: User dengan old token tetap logged in
4. **Inform Users**: User dengan auth-v2 harus login ulang (minor disruption)

**Tidak perlu**:
- ❌ Deploy ulang backend
- ❌ Rollback database
- ❌ Logout semua users

**Cukup**:
- ✅ Toggle flag di frontend config
- ✅ Redeploy frontend (atau hot reload config)
- ✅ Monitor recovery

---

### Dual Support Selama Transisi

Selama hybrid mode aktif, frontend harus:

✅ **Support 2 endpoint sekaligus**
- `/api/auth/*` untuk v1 users
- `/api/v2/auth/*` untuk v2 users

✅ **Support 2 token format**
- Custom JWT untuk auth lama
- Firebase JWT untuk auth-v2

✅ **Support 2 response structure**
- Old: `{user: {...}, token: "..."}`
- New: `{uid: "...", idToken: "...", refreshToken: "..."}`

✅ **Handle migration flow**
- User login dengan auth lama → bisa pakai
- User login dengan auth-v2 → bisa pakai
- Optional: Button untuk migrate dari v1 ke v2

❌ **Tidak perlu**
- Tidak perlu sync kedua token
- Tidak perlu user punya both tokens
- Tidak perlu backend changes untuk hybrid (backend sudah ready)

---

## � URL Configuration Summary

### Development (Local)
```bash
# API Gateway
GATEWAY_URL=http://localhost:3000

# Frontend calls (through Gateway - RECOMMENDED)
AUTH_V1_BASE_URL=http://localhost:3000/api/auth
AUTH_V2_BASE_URL=http://localhost:3000/api/auth/v2

# Direct service calls (NOT RECOMMENDED - for testing only)
AUTH_SERVICE_DIRECT=http://localhost:3001
AUTH_V2_SERVICE_DIRECT=http://localhost:3008
```
**Frontend Configuration Example:**
```javascript
// .env.development
REACT_APP_API_BASE_URL=http://localhost:3000/api
REACT_APP_USE_AUTH_V2=true  // Feature flag

// API client
const API_BASE = process.env.REACT_APP_API_BASE_URL;
const AUTH_ENDPOINT = process.env.REACT_APP_USE_AUTH_V2 
  ? `${API_BASE}/auth/v2`  // New
  : `${API_BASE}/auth`;     // Old
```
### Production/Docker
```bash
# API Gateway (exposed)
GATEWAY_URL=https://api.yourdomain.com
# or 
GATEWAY_URL=http://your-server-ip:3000

# Frontend calls (through Gateway)
AUTH_V1_BASE_URL=https://api.yourdomain.com/api/auth
AUTH_V2_BASE_URL=https://api.yourdomain.com/api/auth/v2

# Internal Docker network (DO NOT use from frontend)
AUTH_SERVICE_INTERNAL=http://auth-service:3001
AUTH_V2_SERVICE_INTERNAL=http://auth-v2-service:3008
```
**Important Notes:**
- ⚠️ **ALWAYS** use API Gateway URL dari frontend (port 3000)
- ⚠️ **NEVER** access service directly dari frontend (port 3001/3008)
- ✅ Gateway handles CORS, rate limiting, logging, dan routing
- ✅ Gateway provides automatic token verification fallback

---

## �📝 Checklist Migrasi Frontend

### Pre-Migration
- [ ] Review dokumen ini lengkap
- [ ] Confirm API Gateway URL dengan backend team
- [ ] Setup environment variable untuk feature flag
- [ ] Identifikasi semua endpoint auth yang digunakan
- [ ] Buat abstraction layer untuk auth service
- [ ] Setup error tracking (Sentry, LogRocket, etc.)

### Development Phase
- [ ] Implement token refresh mechanism (CRITICAL!)
- [ ] Update registration flow
- [ ] Update login flow
- [ ] Update profile management
- [ ] Implement password reset flow
- [ ] Handle token storage (dual support)
- [ ] Update logout mechanism
- [ ] Add auth version detection
- [ ] Update API client base URLs

### Testing Phase
- [ ] Test registration (new format)
- [ ] Test login (token handling)
- [ ] Test token refresh (auto & manual)
- [ ] Test protected routes
- [ ] Test password reset flow
- [ ] Test logout
- [ ] Test account deletion
- [ ] Test error handling (expired token, invalid token)
- [ ] Test hybrid mode switching
- [ ] Load testing dengan concurrent users

### Deployment Phase
- [ ] Deploy dengan feature flag OFF
- [ ] Verify auth-v2 service running
- [ ] Enable feature flag untuk small percentage
- [ ] Monitor error rates & performance
- [ ] Gradually increase percentage
- [ ] Collect user feedback
- [ ] Full rollout if stable

### Post-Migration
- [ ] Monitor token refresh patterns
- [ ] Check for authentication errors
- [ ] Analyze user behavior changes
- [ ] Document issues & solutions
- [ ] Plan auth-service deprecation
- [ ] Update all documentation

---

## ⚠️ Important Notes

### 1. Token Expiry Management

**Auth-v2 tokens expire after 1 hour** - WAJIB implement auto-refresh!

**Strategy**: Setup interval check setiap 5 menit, jika token umur sudah 50 menit, lakukan refresh otomatis

### 2. Breaking Changes

Fields yang **hilang** di auth-v2:
- ❌ `username` - gunakan `displayName`
- ❌ `user_type` - implement di service lain
- ❌ `token_balance` - pindah ke user/profile service
- ❌ `profile` nested object - gunakan separate profile service

### 3. Network Errors

Auth-v2 depend on Firebase - handle network issues:
```javascript
try {
  await authV2.login(email, password);
} catch (error) {
### 3. Network Errors

Auth-v2 depend on Firebase - handle network issues dengan retry mechanism atau fallback strategyowedOrigins: [
  'http://localhost:3000',
  'https://your-frontend.com'
]
```

### 5. Security Considerations

- ✅ **NEVER** expose `refreshToken` di URL/logs
- ✅ Store tokens di httpOnly cookies (lebih aman) atau localStorage
- ✅ Clear tokens saat logout
- ✅ Implement CSRF protection jika pakai cookies
### 4. CORS Configuration

Pastikan backend auth-v2 sudah allow frontend domain Anda (localhost untuk dev, production domain untuk prod)
### Issue: 401 Unauthorized setelah beberapa saat

**Cause**: Token expire (1 hour), tidak di-refresh  
**Solution**: 
1. Catch 401 error
2. Try refresh token
3. Retry request dengan token baru
4. If refresh fails, logout user

### Issue: User data berbeda setelah login

**Cause**: Response structure berbeda (username vs displayName, dll)  
**Solution**: Update frontend code untuk handle new structure (lihat section Mapping Endpoint)

### Issue: Password reset tidak working

**Cause**: Email template belum configured di Firebase  
**Solution**: Configure email templates di Firebase Console → Authentication → Templates

### Issue: CORS error di browser

**Cause**: Auth-v2 service tidak allow your frontend domain  
**Solution**: Update CORS config di auth-v2-service

### Issue: Hybrid mode conflict (both tokens exist)

**Cause**: User ada di transition state  
**Solution**: 
1. Check `auth_version` flag first
2. Use corresponding token
3. Clear old tokens after successful v2 login

---

## 📞 Support

Jika ada pertanyaan atau issues:

1. **Check Documentation**:
   - Auth-v2 API Docs: `/auth-v2-service/docs/api-endpoints.md`
   - Error Handling: `/auth-v2-service/docs/error-handling.md`
   - Firebase Setup: `/auth-v2-service/docs/firebase-setup.md`

2. **Testing Endpoints**: Use provided test scripts di `/auth-v2-service/examples/`

3. **Contact Backend Team**: Untuk issues terkait service atau infrastructure

---

## 📚 Additional Resources

- [Auth-v2 Service README](../auth-v2-service/README.md)
- [Auth-v2 API Documentation](../auth-v2-service/docs/api-endpoints.md)
- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

**Last Updated**: 4 Oktober 2025  

---

## �� Quick Reference Card

### Architecture Overview
```
Frontend (Browser)
    ↓
API Gateway (Port 3000)
    ↓
Auth V2 Service (Port 3008)
    ↓
Firebase Authentication
```

### Base URLs

| Environment | API Gateway URL | Auth V2 Endpoints |
|-------------|----------------|-------------------|
| **Local Dev** | `http://localhost:3000` | `/api/auth/v2/*` |
| **Docker** | `http://api-gateway:3000` | `/api/auth/v2/*` |
| **Production** | `https://api.yourdomain.com` | `/api/auth/v2/*` |

### Complete Endpoint List

#### Public Endpoints (No Auth Required)
```
POST   /api/auth/v2/register          - Create new user
POST   /api/auth/v2/login             - Authenticate user  
POST   /api/auth/v2/refresh           - Refresh expired token
POST   /api/auth/v2/forgot-password   - Send password reset email
POST   /api/auth/v2/reset-password    - Reset password with OOB code
GET    /api/auth/v2/health            - Service health check
```

#### Protected Endpoints (Requires Firebase ID Token)
```
POST   /api/auth/v2/logout            - Revoke refresh tokens
PATCH  /api/auth/v2/profile           - Update displayName/photoURL
DELETE /api/auth/v2/user              - Delete user account
```

### Token Management

| Token Type | Purpose | Expiry | Storage |
|------------|---------|--------|---------|
| **ID Token** | Authentication | 1 hour | localStorage/cookies |
| **Refresh Token** | Renew ID token | Long-lived | Secure storage only |

**Authorization Header:**
```
Authorization: Bearer <firebase-id-token>
```

### Request Examples

**Login:**
```javascript
const response = await fetch('http://localhost:3000/api/auth/v2/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});
```

**Refresh Token:**
```javascript
### Architecture Overview
```
Frontend (Browser)
    ↓
API Gateway (Port 3000)
    ↓
Auth V2 Service
```pdate
Profile:**
```javascript
const response = await fetch('http://localhost:3000/api/auth/v2/profile', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`
  },
  body: JSON.stringify({
    displayName: 'New Name'
  })
});
```

### Error Handling

| Status | Meaning | Frontend Action |
|--------|---------|----------------|
| **200** | Success | Process response data |
| **201** | Created | User registered successfully |
| **400** | Bad Request | Show validation errors |
| **401** | Unauthorized | Try refresh token → logout if failed |
| **404** | Not Found | Check endpoint URL |
| **409** | Conflict | Email already exists |
| **429** | Rate Limited | Retry with exponential backoff |
| **500** | Server Error | Show generic error, retry later |
| **503** | Service Down | Show maintenance message |

### Critical Implementation Points

✅ **MUST DO:**
1. Use API Gateway URL (port 3000), not direct service
2. Implement automatic token refresh (1 hour expiry!)
3. Handle 401 errors with refresh attempt
4. Store tokens securely (httpOnly cookies preferred)
5. Clear tokens completely on logout

⚠️ **DON'T DO:**
1. Don't access auth-v2-service directly (port 3008)
2. Don't expose refreshToken in URL or logs
3. Don't store tokens in insecure storage
4. Don't forget to implement token refresh
5. Don't use old auth endpoints for new features

### Common Pitfalls

| Issue | Cause | Solution |
|-------|-------|----------|
| Token expires quickly | Firebase ID token = 1h | Implement auto-refresh |
| CORS errors | Wrong URL or domain | Use API Gateway URL |
| 404 errors | Wrong endpoint prefix | Use `/api/auth/v2/*` |
| Profile fields limited | Firebase limitation | Use separate profile service |
| Password change complex | No direct change endpoint | Use forgot-password flow |

---

## 🎯 Migration Success Criteria

### Definition of Done

- [ ] All frontend code uses `/api/auth/v2/*` endpoints
- [ ] Token refresh implemented and tested
- [ ] Error handling covers all status codes
- [ ] User can register, login, logout successfully
- [ ] Password reset flow working end-to-end
- [ ] Profile update functional
- [ ] Zero console errors related to auth
- [ ] All old auth endpoints deprecated
- [ ] Documentation updated
- [ ] Team trained on new flow

### Testing Checklist

**Functional:**
- [ ] New user registration
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (error handling)
- [ ] Token refresh before expiry
- [ ] Token refresh after expiry
- [ ] Logout clears all tokens
- [ ] Password reset email sent
- [ ] Password reset with OOB code
- [ ] Profile update (displayName, photoURL)
- [ ] Account deletion
- [ ] Concurrent requests with same token

**Non-Functional:**
- [ ] Load testing (100+ concurrent users)
- [ ] Token refresh doesn't interrupt user experience
- [ ] Error messages user-friendly
- [ ] Loading states for all auth operations
- [ ] Mobile responsive auth flows
- [ ] Browser compatibility (Chrome, Firefox, Safari)

---

## 📞 Support & Troubleshooting

### First Steps
1. Check `/api/auth/v2/health` endpoint
2. Verify API Gateway is running (port 3000)
3. Check browser console for errors
4. Verify token format and expiry

### Documentation
- **Endpoint Docs**: `/auth-v2-service/docs/ENDPOINT_DOCUMENTATION.md`
- **API Gateway**: `/api-gateway/docs/API_REFERENCE.md`
- **Error Codes**: `/auth-v2-service/docs/error-handling.md`

### Testing Tools
- Test Scripts: `/auth-v2-service/examples/`
- Postman Collection: Available from backend team
- Health Check: `GET /api/auth/v2/health`

### Contact
- Backend Team: For service issues
- DevOps: For deployment/infrastructure issues
- Frontend Lead: For migration strategy questions

---

**Document Version**: 2.0  
**Last Updated**: 4 Oktober 2025  
**Status**: Ready for Implementation  
**Maintained By**: Backend Team

**Changelog:**
- **v2.0** (2025-10-04): 
  - Added API Gateway configuration details
  - Corrected service port (3008)
  - Updated all endpoint URLs to `/api/auth/v2/*`
  - Added path rewriting explanation
  - Added comprehensive quick reference
  - Added migration success criteria
  
- **v1.0** (2025-10-03): 
  - Initial migration guide
  - Basic endpoint mapping
  - Flow descriptions
