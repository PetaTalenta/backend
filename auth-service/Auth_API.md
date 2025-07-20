# Auth Service API Documentation

## Overview
Auth Service menyediakan API untuk autentikasi user dan admin, manajemen profil, dan operasi sekolah dalam sistem ATMA.

**Base URL**: `http://localhost:3001`

## Error Codes
- **VALIDATION_ERROR** (400): Data input tidak valid atau format salah
- **EMAIL_EXISTS** (400): Email sudah terdaftar
- **DUPLICATE_ERROR** (400): Resource sudah ada
- **REFERENCE_ERROR** (400): Referenced resource tidak ditemukan
- **UNAUTHORIZED** (401): Token tidak valid atau tidak ada
- **INVALID_CREDENTIALS** (401): Email/password salah
- **INVALID_TOKEN** (401): Token tidak valid
- **TOKEN_EXPIRED** (401): Token sudah expired
- **FORBIDDEN** (403): Akses ditolak
- **USER_NOT_FOUND** (404): User tidak ditemukan
- **NOT_FOUND** (404): Resource tidak ditemukan
- **INTERNAL_ERROR** (500): Error internal server
- **DATABASE_ERROR** (503): Database connection failed

---

## Authentication Endpoints

### POST /auth/register
Registrasi user baru.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "user_type": "user",
      "is_active": true,
      "token_balance": 0,
      "created_at": "2025-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

### POST /auth/register/batch
Registrasi batch multiple users.

**Request Body:**
```json
{
  "users": [
    {
      "email": "user1@example.com",
      "password": "password123"
    },
    {
      "email": "user2@example.com", 
      "password": "password456"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Batch registration completed",
  "data": {
    "successful": 2,
    "failed": 0,
    "results": [...]
  }
}
```

### POST /auth/login
Login user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "user_type": "user",
      "is_active": true,
      "token_balance": 5,
      "last_login": "2025-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

### POST /auth/logout
**Headers:** `Authorization: Bearer <token>`

Logout user (invalidate token di client side).

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### POST /auth/change-password
**Headers:** `Authorization: Bearer <token>`

Ubah password user.

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## Profile Endpoints

### GET /auth/profile
**Headers:** `Authorization: Bearer <token>`

Mendapatkan profil user lengkap dengan informasi sekolah.

**Response Fields Explanation:**
- `school_origin`: Legacy field untuk nama sekolah manual
- `school_id`: ID sekolah dari master data
- `school`: Object lengkap sekolah (jika menggunakan school_id)
- `school_info`: **NEW** - Object yang menggabungkan informasi sekolah dengan metadata:
  - `type`: "structured" (menggunakan school_id) atau "manual" (menggunakan school_origin)
  - `school_id`: ID sekolah (null jika manual)
  - `school_origin`: Nama manual (null jika structured)
  - `school`: Object sekolah lengkap (null jika manual)

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "john@example.com",
      "user_type": "user",
      "is_active": true,
      "token_balance": 5,
      "last_login": "2025-01-01T00:00:00.000Z",
      "created_at": "2025-01-01T00:00:00.000Z",
      "profile": {
        "user_id": "uuid",
        "full_name": "John Doe",
        "school_origin": "SMA Negeri 1 Jakarta",
        "school_id": 123,
        "date_of_birth": "1995-01-01",
        "gender": "male",
        "school": {
          "id": 123,
          "name": "SMA Negeri 1 Jakarta",
          "city": "Jakarta",
          "province": "DKI Jakarta"
        },
        "school_info": {
          "type": "structured",
          "school_id": 123,
          "school_origin": null,
          "school": {
            "id": 123,
            "name": "SMA Negeri 1 Jakarta",
            "city": "Jakarta",
            "province": "DKI Jakarta"
          }
        }
      }
    }
  }
}
```

### PUT /auth/profile
**Headers:** `Authorization: Bearer <token>`

Update profil user.

**School Information Fields:**
- `school_id`: Integer - ID sekolah dari master data (recommended)
- `school_origin`: String - Nama sekolah manual input (alternative)
- **Note**: Hanya gunakan salah satu field. Jika `school_id` diberikan, `school_origin` akan di-clear, dan sebaliknya.

**Request Body:**
```json
{
  "username": "johndoe",
  "full_name": "John Doe",
  "school_id": 123,
  "date_of_birth": "1995-01-01",
  "gender": "male"
}
```

**Alternative dengan school_origin:**
```json
{
  "username": "johndoe",
  "full_name": "John Doe",
  "school_origin": "SMA Negeri 1 Jakarta",
  "date_of_birth": "1995-01-01",
  "gender": "male"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "john@example.com",
      "profile": {
        "full_name": "John Doe",
        "school_id": 123,
        "school": {
          "id": 123,
          "name": "SMA Negeri 1 Jakarta"
        }
      }
    },
    "message": "Profile updated successfully"
  }
}
```

### DELETE /auth/profile
**Headers:** `Authorization: Bearer <token>`

Hapus profil user.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Profile deleted successfully"
  }
}
```

### GET /auth/token-balance
**Headers:** `Authorization: Bearer <token>`

Mendapatkan token balance user.

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "token_balance": 5
  }
}
```

---

## School Endpoints

### GET /auth/schools
**Headers:** `Authorization: Bearer <token>`

Mendapatkan daftar sekolah dengan pencarian dan pagination.

**Query Parameters:**
- `search` (optional): Kata kunci pencarian
- `city` (optional): Filter berdasarkan kota
- `province` (optional): Filter berdasarkan provinsi
- `page` (optional): Halaman (default: 1)
- `limit` (optional): Jumlah per halaman (default: 20)
- `useFullText` (optional): Gunakan full-text search (default: false)

**Response:**
```json
{
  "success": true,
  "data": {
    "schools": [
      {
        "id": 1,
        "name": "SMA Negeri 1 Jakarta",
        "address": "Jl. Budi Kemuliaan I",
        "city": "Jakarta",
        "province": "DKI Jakarta",
        "created_at": "2025-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 20,
      "pages": 5
    }
  }
}
```

### POST /auth/schools
**Headers:** `Authorization: Bearer <token>`

Membuat sekolah baru.

**Request Body:**
```json
{
  "name": "SMA Negeri 2 Jakarta",
  "address": "Jl. Kramat Raya No. 106",
  "city": "Jakarta",
  "province": "DKI Jakarta"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "school": {
      "id": 2,
      "name": "SMA Negeri 2 Jakarta",
      "address": "Jl. Kramat Raya No. 106",
      "city": "Jakarta",
      "province": "DKI Jakarta",
      "created_at": "2025-01-01T00:00:00.000Z"
    },
    "message": "School created successfully"
  }
}
```

### GET /auth/schools/by-location
**Headers:** `Authorization: Bearer <token>`

Mendapatkan sekolah berdasarkan lokasi.

**Query Parameters:**
- `province` (required): Nama provinsi
- `city` (optional): Nama kota
- `limit` (optional): Jumlah maksimal (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "schools": [
      {
        "id": 1,
        "name": "SMA Negeri 1 Jakarta",
        "city": "Jakarta",
        "province": "DKI Jakarta"
      }
    ],
    "filters": {
      "province": "DKI Jakarta",
      "city": "Jakarta"
    },
    "total": 25
  }
}
```

### GET /auth/schools/location-stats
**Headers:** `Authorization: Bearer <token>`

Mendapatkan statistik lokasi sekolah.

**Response:**
```json
{
  "success": true,
  "data": {
    "locationStats": [
      {
        "province": "DKI Jakarta",
        "city_count": 5,
        "school_count": 150
      },
      {
        "province": "Jawa Barat",
        "city_count": 18,
        "school_count": 320
      }
    ]
  }
}
```

### GET /auth/schools/:schoolId/users
**Headers:** `Authorization: Bearer <token>`

Mendapatkan user yang terdaftar di sekolah tertentu.

**Query Parameters:**
- `page` (optional): Halaman (default: 1)
- `limit` (optional): Jumlah per halaman (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "userProfiles": [
      {
        "user_id": "uuid",
        "full_name": "John Doe",
        "school_id": 1,
        "user": {
          "id": "uuid",
          "email": "john@example.com",
          "username": "johndoe"
        },
        "school": {
          "id": 1,
          "name": "SMA Negeri 1 Jakarta"
        }
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 20,
      "pages": 3
    }
  }
}
```

### GET /auth/schools/distribution
**Headers:** `Authorization: Bearer <token>`

Mendapatkan distribusi user per sekolah.

**Response:**
```json
{
  "success": true,
  "data": {
    "schoolDistribution": [
      {
        "school_id": 1,
        "school_name": "SMA Negeri 1 Jakarta",
        "city": "Jakarta",
        "province": "DKI Jakarta",
        "user_count": 25,
        "percentage": 15.5
      }
    ]
  }
}
```

---

## Admin Endpoints

### POST /admin/login
Login admin.

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "admin",
      "email": "admin@example.com",
      "user_type": "admin",
      "is_active": true
    },
    "token": "jwt_token_here",
    "message": "Login successful"
  }
}
```

### GET /admin/profile
**Headers:** `Authorization: Bearer <admin_token>`

Mendapatkan profil admin.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "admin",
      "email": "admin@example.com",
      "user_type": "admin",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

### PUT /admin/profile
**Headers:** `Authorization: Bearer <admin_token>`

Update profil admin.

**Request Body:**
```json
{
  "username": "newadmin",
  "email": "newadmin@example.com",
  "full_name": "New Admin Name"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "newadmin",
      "email": "newadmin@example.com",
      "user_type": "admin"
    },
    "message": "Profile updated successfully"
  }
}
```

---

## Internal Service Endpoints

### POST /auth/verify-token
Verifikasi token untuk internal service.

**Request Body:**
```json
{
  "token": "jwt_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "user_type": "user"
    }
  }
}
```

### PUT /auth/token-balance
**Headers:** `X-Service-Key: <internal_service_key>`

Update token balance user (internal service only).

**Request Body:**
```json
{
  "userId": "uuid",
  "amount": 5,
  "operation": "subtract"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token balance updated",
  "data": {
    "user_id": "uuid",
    "new_balance": 0
  }
}
```

---

## Health Check

### GET /health
Cek status service.

**Response:**
```json
{
  "success": true,
  "message": "Auth Service is healthy",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "database": "connected"
}
```
