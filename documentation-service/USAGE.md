# ATMA API Documentation - Usage Guide

## Cara Menggunakan Dokumentasi

### 1. Navigasi
- Gunakan sidebar di sebelah kiri untuk navigasi antar section
- Klik pada section yang ingin Anda lihat
- Section yang aktif akan ditandai dengan warna biru

### 2. Copy Code
- Setiap code block memiliki tombol "Copy" di pojok kanan atas
- Klik tombol tersebut untuk menyalin code ke clipboard
- Tombol akan berubah menjadi "Copied!" selama 2 detik

### 3. Section yang Tersedia

#### 📋 Overview
- Informasi umum tentang ATMA API Gateway
- Base URL dan versi API
- Arsitektur sistem
- Rate limiting
- Getting started guide

#### 🔐 Authentication
- Register user baru
- Login dan logout
- Manajemen profil user
- Change password
- Token balance
- Delete account

#### 🏫 School Management
- CRUD operations untuk data sekolah
- Filter sekolah berdasarkan lokasi
- Manajemen data sekolah

#### 👨‍💼 Admin Management
- Admin login
- Register admin baru (superadmin only)
- Manajemen user oleh admin
- Admin-specific endpoints

#### 🎯 Assessment Service
- Submit assessment data
- Monitor status assessment
- Queue management
- Real-time tracking

#### 📊 Archive Service
- Retrieve hasil analysis
- Manajemen data historis
- User statistics
- Delete results

#### 🔔 WebSocket
- Real-time notifications
- Socket.IO connection
- Event handling
- Authentication via WebSocket

#### 🔍 Health & Monitoring
- Health check endpoints
- Service monitoring
- System status

#### ❌ Error Handling
- Standard error response format
- HTTP status codes
- Common error codes
- Troubleshooting guide

### 4. Format Endpoint Documentation

Setiap endpoint memiliki informasi berikut:
- **Method Badge**: GET, POST, PUT, DELETE
- **URL**: Endpoint path
- **Description**: Penjelasan fungsi endpoint
- **Headers**: Required headers (jika ada)
- **Query Parameters**: Parameter URL (jika ada)
- **Request Body**: Format request body (jika ada)
- **Validation Rules**: Aturan validasi input
- **Response Example**: Contoh response (jika ada)
- **Warning**: Peringatan khusus (jika ada)

### 5. Tips Penggunaan

1. **Authentication**: Hampir semua endpoint memerlukan JWT token
2. **Rate Limiting**: Perhatikan batas request per endpoint
3. **Validation**: Pastikan data sesuai dengan validation rules
4. **Error Handling**: Selalu handle error response dengan baik
5. **Token Management**: Monitor token balance untuk assessment
6. **Idempotency**: Gunakan idempotency key untuk operasi penting

### 6. Quick Start Example

```javascript
// 1. Register
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'myPassword1'
  })
});

// 2. Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'myPassword1'
  })
});

const { data } = await loginResponse.json();
const token = data.token;

// 3. Use token for protected endpoints
const profileResponse = await fetch('/api/auth/profile', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### 7. Responsive Design

Dokumentasi ini responsive dan dapat diakses dari:
- Desktop (optimal experience)
- Tablet (sidebar akan collapse)
- Mobile (single column layout)

### 8. Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

### 9. Development

Untuk development dan customization, lihat README.md untuk detail teknis.
