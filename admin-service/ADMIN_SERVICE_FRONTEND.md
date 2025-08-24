# Admin Service - Frontend Usage Guide

Admin Service diekspos melalui API Gateway agar frontend bisa mengakses endpoint administrasi secara aman.

Base URL (melalui API Gateway)
- http://<GATEWAY_HOST>:3000/api/admin-service

Autentikasi
- Login admin mengembalikan JWT
- Endpoint lain (profil, users, token) membutuhkan header:
  - Authorization: Bearer <admin_jwt>
- CORS: API Gateway mengizinkan semua origin (konfigurasi default)

Catatan keamanan
- Frontend TIDAK perlu mengirim header internal service (X-Internal-Service / X-Service-Key). Gateway akan menangani komunikasi internal antar service.

---

## Endpoints

### 1) Admin Login (Public)
POST /admin/login
Body JSON:
{
  "username": "admin",
  "password": "Admin123!"
}

Contoh (fetch)
```
const res = await fetch('/api/admin-service/admin/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});
const json = await res.json();
// json.data.token -> simpan ke storage sebagai Bearer token
```

Contoh (axios)
```
const { data } = await axios.post('/api/admin-service/admin/login', { username, password });
const token = data?.data?.token;
```

Response (contoh ringkas):
{
  "success": true,
  "data": {
    "admin": { "id": "uuid", "username": "admin", "user_type": "admin" },
    "token": "<jwt>"
  },
  "message": "Admin login successful"
}

---

### 2) Get Admin Profile (Protected)
GET /admin/profile
Headers: Authorization: Bearer <admin_jwt>

```
const res = await fetch('/api/admin-service/admin/profile', {
  headers: { Authorization: `Bearer ${token}` }
});
const json = await res.json();
```

### 3) Update Admin Profile (Protected)
PUT /admin/profile
Headers: Authorization: Bearer <admin_jwt>
Body JSON (opsional field):
{
  "username": "newusername",
  "email": "newemail@atma.com",
  "full_name": "Updated Admin Name"
}

```
await fetch('/api/admin-service/admin/profile', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ username, email, full_name })
});
```

### 4) Admin Logout (Protected)
POST /admin/logout
Headers: Authorization: Bearer <admin_jwt>

```
await fetch('/api/admin-service/admin/logout', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` }
});
```

---

## Manajemen User (Protected)
Semua membutuhkan Authorization: Bearer <admin_jwt>

### 5) List Users
GET /users?page=1&limit=10&search=&sortBy=created_at&sortOrder=DESC

```
const params = new URLSearchParams({ page: '1', limit: '10', search: '' });
const res = await fetch(`/api/admin-service/users?${params}`, {
  headers: { Authorization: `Bearer ${token}` }
});
const { data } = await res.json();
// data.users -> array user dengan { id, email, token_balance, created_at, updated_at }
// data.pagination -> info halaman
```

### 6) Get User Detail
GET /users/:userId

```
const res = await fetch(`/api/admin-service/users/${userId}`, {
  headers: { Authorization: `Bearer ${token}` }
});
const { data } = await res.json();
// data.user + stats (total_analyses, completed, etc.)
```

### 7) Delete User (Soft delete)
DELETE /users/:userId

```
await fetch(`/api/admin-service/users/${userId}`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${token}` }
});
```

---

## Token Operations (Protected)
Direkomendasikan menggunakan jalur utama (auth-service) di bawah ini.

### 8) Update Token Balance (Main path via auth-service)
POST /users/:userId/token-balance
Body JSON:
{
  "operation": "add" | "subtract" | "set",
  "amount": 50
}

```
await fetch(`/api/admin-service/users/${userId}/token-balance`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ operation: 'add', amount: 50 })
});
```

Response (contoh ringkas, dari auth-service):
{
  "success": true,
  "data": {
    "userId": "uuid",
    "previousBalance": 100,
    "newBalance": 150,
    "operation": "add",
    "amount": 50,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}

### 9) Opsi Alternatif: Update via archive-service
PUT /users/:userId/token-balance/archive
Body JSON:
{
  "token_balance": 120,
  "action": "set" | "add" | "subtract"
}

```
await fetch(`/api/admin-service/users/${userId}/token-balance/archive`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ token_balance: 120, action: 'set' })
});
```

---

## Error & Status Codes (umum)
- 200 OK: Operasi berhasil
- 201 Created: Berhasil membuat resource
- 400 VALIDATION_ERROR: Body/param tidak valid
- 401 UNAUTHORIZED: Token tidak ada/invalid
- 403 FORBIDDEN: Bukan admin/superadmin
- 404 USER_NOT_FOUND/NOT_FOUND: Resource tidak ditemukan
- 500 INTERNAL_ERROR: Error internal

Payload error (contoh):
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Token balance must be a non-negative number"
  }
}

---

## Praktik baik di frontend
- Simpan JWT admin (localStorage/Memory) secara aman; tambahkan ke Authorization header untuk setiap request protected
- Tangani 401/403 dengan redirect ke halaman login
- Tampilkan pesan error dari server (error.code, error.message)
- Debounce pencarian pada /users?search= untuk mengurangi beban
- Pastikan konfirmasi sebelum DELETE user atau set token balance

---

## Catatan
- Rate limiting admin di gateway aktif; batasi request berulang dalam waktu singkat
- Skema response merupakan pass-through dari service hulu (auth-service / archive-service)
- Endpoint dapat berkembang; cek dokumentasi internal jika ada perubahan

