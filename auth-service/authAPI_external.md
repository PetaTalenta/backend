# Auth Service - External API Documentation

## Overview
Auth Service menyediakan API untuk autentikasi, manajemen user, dan administrasi sistem ATMA. API ini diakses melalui **API Gateway** pada port **3000** dengan prefix `/api/auth/` dan `/api/admin/`.

**Service Information:**
- **Service Name:** auth-service
- **Internal Port:** 3001
- **External Access:** Via API Gateway (Port 3000)
- **Base URL:** `http://localhost:3000/api/`
- **Version:** 1.0.0

## Authentication
Sebagian besar endpoint eksternal memerlukan autentikasi JWT token.

**Header Required:**
```
Authorization: Bearer <jwt_token>
```

## Rate Limiting
- Auth Endpoints: 2500 requests per 15 minutes per IP
- Admin Endpoints: 1000 requests per 15 minutes per IP
- General Gateway: 5000 requests per 15 minutes

---

## 🔐 Public Authentication Endpoints

### POST /api/auth/register
Registrasi user baru.

**Authentication:** None (Public)
**Rate Limit:** Auth Limiter (100/15min)

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "user@example.com",
  "password": "MyPassword1"
}
```

**Validation Rules:**
- username: Alphanumeric only, 3-100 characters, required
- email: Valid email format, maximum 255 characters, required
- password: Minimum 8 characters, must contain at least one letter and one number, required

**Response Success (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "username": "johndoe",
      "user_type": "user",
      "is_active": true,
      "token_balance": 5,
      "created_at": "2024-01-15T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully"
}
```

### POST /api/auth/register/batch
Registrasi batch user (untuk admin/testing).

**Authentication:** None (Public)
**Rate Limit:** Auth Limiter (100/15min)

**Request Body:**
```json
{
  "users": [
    {
      "email": "user1@example.com",
      "password": "myPassword1"
    },
    {
      "email": "user2@example.com",
      "password": "anotherPass2"
    }
  ]
}
```

**Validation Rules:**
- **users**: Array of user objects, maximum 50 users per batch, required
- Each user object follows same validation as single registration
- Duplicate emails within batch are not allowed

**Response Success (201):**
```json
{
  "success": true,
  "message": "Batch user registration processed successfully",
  "data": {
    "total": 2,
    "successful": 2,
    "failed": 0,
    "results": [
      {
        "index": 0,
        "success": true,
        "user": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "email": "user1@example.com",
          "token_balance": 5,
          "created_at": "2024-01-15T10:30:00.000Z"
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "error": null
      }
    ]
  }
}

### POST /api/auth/login
Login user (bisa pakai email ATAU username).

- Authentication: None (Public)
- Rate Limit: Auth Limiter (2500/15min)

Request Body (gunakan salah satu identifier: email atau username):
```json
{
  "email": "user@example.com",
  "password": "MyPassword1"
}
```
atau
```json
{
  "username": "johndoe",
  "password": "MyPassword1"
}
```

Validation Rules:
- email: Valid email format, optional jika pakai username
- username: Alphanumeric 3-100, optional jika pakai email
- password: Required

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "username": "johndoe",
      "user_type": "user",
      "is_active": true,
      "token_balance": 5
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

---

## 👤 Protected User Endpoints

### GET /api/auth/profile
Mengambil data user + profil (termasuk info sekolah terstruktur bila ada).

- Authentication: Bearer Token Required
- Rate Limit: General Gateway (5000/15min)

Response Success (200):
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "username": "johndoe",
      "user_type": "user",
      "is_active": true,
      "token_balance": 5,
      "last_login": "2024-01-15T10:25:00.000Z",
      "created_at": "2024-01-15T10:30:00.000Z",
      "profile": {
        "full_name": "John Doe",
        "date_of_birth": "1990-01-15",
        "gender": "male",
        "school_id": 1,
        "school": { "id": 1, "name": "SMA 1", "city": "Jakarta", "province": "DKI Jakarta" },
        "school_info": {
          "type": "structured",
          "school_id": 1,
          "school": { "id": 1, "name": "SMA 1", "city": "Jakarta", "province": "DKI Jakarta" }
        }
      }
    }
  }
}
```

### PUT /api/auth/profile
Update data user dan/atau profil.

- Authentication: Bearer Token Required

Request Body (semua optional):
```json
{
  "username": "johndoe",
  "full_name": "John Doe",
  "school_id": 1,
  "date_of_birth": "1990-01-15",
  "gender": "male"
}
```

Validation Rules:
- username: Alphanumeric 3-100
- email: Email valid, max 255
- full_name: 1-100 karakter
- school_id: Integer positif dan harus ada di tabel schools
- date_of_birth: ISO date (YYYY-MM-DD), tidak boleh di masa depan
- gender: "male" atau "female"

Catatan:
- Bila school_id diisi, service memastikan school_id valid.
- Response menyertakan objek profile dengan school_info terstruktur.

### DELETE /api/auth/profile
Hapus hanya profil (tabel user_profiles), bukan akun.

- Authentication: Bearer Token Required
- Rate Limit: General Gateway (5000/15min)

Response Success (200):
```json
{
  "success": true,
  "message": "Profile deleted successfully"
}
```

Error (404) bila profil belum ada.


**Response Error (404):**
```json
{
  "success": false,
  "error": {
    "code": "PROFILE_NOT_FOUND",
    "message": "Profile not found"
  }
}
```

**⚠️ Note:** Endpoint ini hanya menghapus profil user (user_profiles table), bukan akun user itu sendiri. Untuk menghapus akun user secara keseluruhan, gunakan endpoint DELETE /api/auth/account.

### DELETE /api/auth/account
Hapus akun user (soft delete) – mengubah email, reset token_balance=0, is_active=false, hapus profil.

- Authentication: Bearer Token Required
- Rate Limit: General Gateway (5000/15min)

Response Success (200):
```json
{
  "success": true,
  "message": "Account deleted successfully",
  "data": {
    "deletedAt": "2024-01-15T10:30:00.000Z",
    "originalEmail": "user@example.com"
  }
}
```

Catatan: Setelah penghapusan, user tidak bisa login lagi.


**Response Error (404):**
```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found or already inactive"
  }
}
```

**⚠️ Important Notes:**
- Endpoint ini melakukan **soft delete** dengan mengubah email user menjadi format `deleted_{timestamp}_{original_email}`
- Token balance user akan direset ke 0
- Status `is_active` akan diubah menjadi `false`
- Profil user juga akan dihapus secara otomatis
- Operasi ini tidak dapat di-undo, pastikan konfirmasi sebelum menghapus akun
- Setelah akun dihapus, user tidak dapat login lagi dengan akun tersebut

### POST /api/auth/change-password
Ubah password user.

- Authentication: Bearer Token Required

Request Body:
```json
{
  "currentPassword": "OldPass1",
  "newPassword": "NewPass2"
}
```

Validation Rules:
- currentPassword: Required
- newPassword: Min 8 karakter, mengandung huruf dan angka (divalidasi via Joi + utils/password)

### POST /api/auth/logout
Logout user.

**Authentication:** Bearer Token Required

### GET /api/auth/token-balance
Mendapatkan saldo token user (legacy endpoint; gunakan GET /api/auth/profile untuk data terbaru yang terjamin fresh).

- Authentication: Bearer Token Required

Response Success (200):
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "token_balance": 5
  }
}
```

---

## 🏫 School Management Endpoints

### GET /api/auth/schools
Mendapatkan daftar sekolah (mendukung pencarian dan paginasi cepat).

- Authentication: Bearer Token Required
- Query params: search, city, province, page=1, limit=20, useFullText=false
- Response menyertakan pagination { total, page, limit, pages }

### POST /api/auth/schools
Membuat sekolah baru.

- Authentication: Bearer Token Required

Request Body:
```json
{
  "name": "SMA Negeri 1 Jakarta",
  "address": "Jl. Sudirman No. 1",
  "city": "Jakarta",
  "province": "DKI Jakarta"
}
```

Validation Rules:
- name: Max 200, required
- address: Optional
- city: Max 100, optional
- province: Max 100, optional

### GET /api/auth/schools/by-location
Mendapatkan sekolah berdasarkan lokasi.

- Authentication: Bearer Token Required
- Query params: province (wajib), city (opsional), limit=50
- 400 bila province tidak dikirim

### GET /api/auth/schools/location-stats
Mendapatkan statistik lokasi sekolah.

- Authentication: Bearer Token Required

### GET /api/auth/schools/distribution
Mendapatkan distribusi sekolah.

- Authentication: Bearer Token Required

### GET /api/auth/schools/:schoolId/users
Mendapatkan user berdasarkan sekolah dengan paginasi.

- Authentication: Bearer Token Required
- Query params: page=1, limit=20
- 400 bila schoolId invalid

---

## 👨‍💼 Admin Authentication Endpoints

### POST /api/admin/login
Login admin (identifier bisa username ATAU email).

- Authentication: None (Public)
- Rate Limit: Auth Limiter (2500/15min)

Request Body:
```json
{
  "username": "admin", // atau email
  "password": "Admin123!"
}
```

Validation Rules:
- username: Required (boleh username atau email)
- password: Required

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "admin": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "admin",
      "email": "admin@atma.com",
      "user_type": "admin",
      "is_active": true,
      "created_at": "2024-01-15T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Admin login successful"
}
```

---

## 🛡️ Protected Admin Endpoints

### GET /api/admin/profile
Mendapatkan profil admin.

- Authentication: Bearer Token + Admin Role Required
- Rate Limit: Admin Limiter (1000/15min)

### PUT /api/admin/profile
Update profil admin.

- Authentication: Bearer Token + Admin Role Required
- Rate Limit: Admin Limiter (1000/15min)

**Request Body:**
```json
{
  "username": "newusername",
  "email": "newemail@atma.com",
  "full_name": "Updated Admin Name"
}
```

**Validation Rules:**
- **username**: Alphanumeric only, 3-100 characters, optional
- **email**: Valid email format, maximum 255 characters, optional
- **full_name**: Maximum 100 characters, optional

### POST /api/admin/change-password
Ubah password admin.

- Authentication: Bearer Token + Admin Role Required
- Rate Limit: Admin Limiter (1000/15min)

**Request Body:**
```json
{
  "currentPassword": "OldAdmin123!",
  "newPassword": "NewAdmin456!"
}
```

**Validation Rules:**
- **currentPassword**: Required
- **newPassword**: Minimum 8 characters, must contain at least one letter and one number, required

Catatan: Validasi password change admin saat ini sama aturan minimalnya dengan user (huruf+angka, min 8).

### POST /api/admin/logout
Logout admin.

- Authentication: Bearer Token + Admin Role Required
- Rate Limit: Admin Limiter (1000/15min)

### POST /api/admin/register
Registrasi admin baru (Superadmin only).

- Authentication: Bearer Token + Superadmin Role Required
- Rate Limit: Admin Limiter (1000/15min)

**Request Body:**
```json
{
  "username": "newadmin",
  "email": "newadmin@atma.com",
  "password": "NewAdmin123!",
  "full_name": "New Admin",
  "user_type": "admin"
}
```

**Validation Rules:**
- **username**: Alphanumeric only, 3-100 characters, required
- **email**: Valid email format, maximum 255 characters, required
- password: Minimum 8 characters, must contain at least one letter and one number, required
- **full_name**: Maximum 255 characters, optional
- **user_type**: Must be one of: "admin", "superadmin", "moderator", defaults to "admin"

---

## 🗑️ Admin User Management Endpoints

### DELETE /api/archive/admin/users/:userId
Hapus user secara permanen (soft delete) - hanya untuk admin.

**Authentication:** Bearer Token + Admin Role Required (admin atau superadmin)
**Rate Limit:** Admin Limiter (50/15min)
**Service:** Archive Service (via API Gateway)

**Path Parameters:**
- **userId**: UUID user yang akan dihapus

**Response Success (200):**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": {
    "deletedUser": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "originalEmail": "user@example.com",
      "deletedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Response Error (404):**
```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found"
  }
}
```

**⚠️ Important Notes:**
- Endpoint ini melakukan **soft delete** dengan mengubah email user menjadi format `deleted_{timestamp}_{original_email}`
- Token balance user akan direset ke 0
- Hanya admin dengan role `admin` atau `superadmin` yang dapat mengakses endpoint ini
- Operasi ini tidak dapat di-undo, pastikan konfirmasi sebelum menghapus user

### GET /api/archive/admin/users
Mendapatkan daftar semua user (untuk admin).

**Authentication:** Bearer Token + Admin Role Required
**Rate Limit:** Admin Limiter (50/15min)
**Service:** Archive Service (via API Gateway)

### GET /api/archive/admin/users/:userId
Mendapatkan detail user berdasarkan ID (untuk admin).

**Authentication:** Bearer Token + Admin Role Required
**Rate Limit:** Admin Limiter (50/15min)
**Service:** Archive Service (via API Gateway)

### PUT /api/archive/admin/users/:userId/token-balance
Update token balance user (untuk admin).

**Authentication:** Bearer Token + Admin Role Required
**Rate Limit:** Admin Limiter (50/15min)
**Service:** Archive Service (via API Gateway)

---

## 📋 Error Codes Reference

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `UNAUTHORIZED` | Missing or invalid authentication | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `USER_NOT_FOUND` | User not found | 404 |
| `EMAIL_EXISTS` | Email already registered | 409 |
| `USERNAME_EXISTS` | Username already taken | 409 |
| `INVALID_CREDENTIALS` | Invalid login credentials | 401 |
| `INSUFFICIENT_BALANCE` | Insufficient token balance | 400 |
| `PROFILE_NOT_FOUND` | User profile not found | 404 |
| `ACCESS_DENIED` | User does not have access to resource | 403 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Internal server error | 500 |

---

## ⚠️ Validation Notes & Known Issues

### Password Validation Inconsistencies
1. **Admin Registration vs Password Change:**
   - Admin registration requires: uppercase + lowercase + number + special character
   - Admin password change only requires: letter + number (same as regular users)
   - **Recommendation:** Standardize to use strong validation for both

2. **Token Balance Default:**
   - Default token balance is configurable via `DEFAULT_TOKEN_BALANCE` environment variable
   - Falls back to 5 if not set, not 100 as shown in some examples

3. **Batch Registration:**
   - Currently has basic validation in controller only
   - No Joi schema validation middleware applied
   - Maximum 50 users per batch enforced

---

## 🔒 Security Features

1. JWT Authentication (Bearer)
2. Password Hashing (bcrypt; rounds configurable via BCRYPT_ROUNDS)
3. Rate Limiting (Gateway: general 5000, auth 2500, admin 1000 per 15 menit)
4. Input Validation (Joi schemas)
5. Role-based Access (user/admin/superadmin/moderator)
6. Audit Logging (morgan + custom logger)
7. CORS (allow all origins)
8. Helmet (security headers)

---

## ❗ Contoh Response Error per Endpoint

Berikut contoh-contoh response error yang umum untuk setiap endpoint. Struktur error mengikuti format global:

```json
{
  "success": false,
  "error": { "code": "...", "message": "...", "details": { } }
}
```

- POST /api/auth/register
  - 400 (VALIDATION_ERROR) – field tidak valid atau duplikat batch
  - 400 (EMAIL_EXISTS) – email sudah terdaftar
  - 400 (USERNAME_EXISTS) – username sudah terpakai

- POST /api/auth/register/batch
  - 400 (VALIDATION_ERROR) – body harus array users, maksimal 50
  - 200 (partial) – data.results berisi success=false dengan error per item (mis: "Email already exists")

- POST /api/auth/login
  - 404 (IDENTIFIER_NOT_FOUND) – username/email tidak ditemukan
  - 401 (INVALID_PASSWORD) – password salah

- GET /api/auth/profile
  - 401 (UNAUTHORIZED) – token tidak ada/invalid/expired
  - 404 (USER_NOT_FOUND) – user tidak ditemukan

- PUT /api/auth/profile
  - 401 (UNAUTHORIZED)
  - 400 (VALIDATION_ERROR) – data tidak valid (termasuk INVALID_SCHOOL_ID)
  - 409 (EMAIL_EXISTS | USERNAME_EXISTS) – constrained oleh DB

- DELETE /api/auth/profile
  - 401 (UNAUTHORIZED)
  - 404 (PROFILE_NOT_FOUND)

- DELETE /api/auth/account
  - 401 (UNAUTHORIZED)
  - 404 (USER_NOT_FOUND)

- POST /api/auth/change-password
  - 401 (UNAUTHORIZED)
  - 404 (USER_NOT_FOUND)
  - 400 (VALIDATION_ERROR) – password baru tidak memenuhi syarat
  - 400 (VALIDATION_ERROR) – current password salah (dibungkus sebagai error terkontrol)

- POST /api/auth/logout
  - 401 (UNAUTHORIZED)

- GET /api/auth/token-balance
  - 401 (UNAUTHORIZED)
  - 404 (USER_NOT_FOUND)

- GET /api/auth/schools
  - 401 (UNAUTHORIZED)

- POST /api/auth/schools
  - 401 (UNAUTHORIZED)
  - 400 (VALIDATION_ERROR)

- GET /api/auth/schools/by-location
  - 401 (UNAUTHORIZED)
  - 400 (MISSING_PROVINCE)

- GET /api/auth/schools/location-stats
  - 401 (UNAUTHORIZED)

- GET /api/auth/schools/distribution
  - 401 (UNAUTHORIZED)

- GET /api/auth/schools/:schoolId/users
  - 401 (UNAUTHORIZED)
  - 400 (INVALID_SCHOOL_ID)

- POST /api/admin/login
  - 401 (INVALID_CREDENTIALS) – bila kredensial tidak valid

- GET /api/admin/profile
  - 401 (UNAUTHORIZED) – bukan admin atau token invalid
  - 404 (ADMIN_NOT_FOUND)

- PUT /api/admin/profile
  - 401 (UNAUTHORIZED)
  - 400 (VALIDATION_ERROR)
  - 409 (EMAIL_EXISTS | USERNAME_EXISTS)

- POST /api/admin/change-password
  - 401 (UNAUTHORIZED)
  - 400 (VALIDATION_ERROR)

- POST /api/admin/logout
  - 401 (UNAUTHORIZED)

- POST /api/admin/register (superadmin saja)
  - 401 (UNAUTHORIZED)
  - 403 (FORBIDDEN)
  - 400 (VALIDATION_ERROR)
  - 409 (EMAIL_EXISTS | USERNAME_EXISTS)

- Admin User Management (via archive service)
  - 401 (UNAUTHORIZED)
  - 403 (FORBIDDEN)
  - 404 (USER_NOT_FOUND)
  - 400 (VALIDATION_ERROR) – untuk update token balance

