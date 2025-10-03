# Enhanced Archive Jobs API

## Overview
API endpoint untuk mengelola jobs analisis dengan data result yang lengkap, termasuk profile_persona dari tabel analysis_results.

## Endpoints

### 1. Get All User Jobs with Result Data
**GET** `/api/archive/jobs`

Mendapatkan semua jobs milik user yang terautentikasi beserta data result (profile_persona).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `page` (number, default: 1) - Halaman data
- `limit` (number, default: 10) - Jumlah data per halaman
- `status` (string, optional) - Filter berdasarkan status: queued, processing, completed, failed
- `assessment_name` (string, optional) - Filter berdasarkan nama assessment
- `sort` (string, default: 'created_at') - Field untuk sorting
- `order` (string, default: 'DESC') - Urutan sorting: ASC atau DESC

**Response Format:**
```json
{
  "success": true,
  "message": "Jobs retrieved successfully",
  "data": {
    "jobs": [
      {
        "id": "uuid",
        "job_id": "job_12345abcdef",
        "user_id": "550e8400-e29b-41d4-a716-446655440001",
        "status": "completed",
        "result_id": "550e8400-e29b-41d4-a716-446655440003",
        "error_message": null,
        "completed_at": "2024-01-15T10:35:00.000Z",
        "created_at": "2024-01-15T10:30:00.000Z",
        "updated_at": "2024-01-15T10:35:00.000Z",
        "assessment_name": "AI-Driven Talent Mapping",
        "priority": 0,
        "retry_count": 0,
        "max_retries": 3,
        "processing_started_at": "2024-01-15T10:31:00.000Z",
        "archetype": "The Innovator"
      }
    ],
    "pagination": {
      "total": 25,
      "limit": 10,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### 2. Get Specific Job with Result Data
**GET** `/api/archive/jobs/:jobId`

Mendapatkan detail job berdasarkan job ID beserta data result (profile_persona).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Parameters:**
- `jobId` (string) - Job ID yang ingin diambil

**Response Format:**
```json
{
  "success": true,
  "message": "Job retrieved successfully",
  "data": {
    "id": "uuid",
    "job_id": "job_12345abcdef",
    "user_id": "550e8400-e29b-41d4-a716-446655440001",
    "status": "completed",
    "result_id": "550e8400-e29b-41d4-a716-446655440003",
    "error_message": null,
    "completed_at": "2024-01-15T10:35:00.000Z",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:35:00.000Z",
    "assessment_name": "AI-Driven Talent Mapping",
    "priority": 0,
    "retry_count": 0,
    "max_retries": 3,
    "processing_started_at": "2024-01-15T10:31:00.000Z",
    "archetype": "The Innovator"
  }
}
```

## Data Fields Explanation

### Job Fields:
- `job_id`: Unique identifier untuk job
- `result_id`: ID dari hasil analisis (jika sudah selesai)
- `user_id`: ID user yang memiliki job
- `created_at`: Tanggal job dibuat
- `assessment_name`: Nama assessment
- `status`: Status job (queued, processing, completed, failed)

### Archetype Field:
- `archetype`: Tipe kepribadian utama dari hasil analisis persona (string atau null jika belum selesai)

## Error Responses

### 404 - Job Not Found
```json
{
  "success": false,
  "message": "Job not found",
  "error": "NOT_FOUND"
}
```

### 403 - Access Denied
```json
{
  "success": false,
  "message": "Access denied",
  "error": "FORBIDDEN"
}
```

### 401 - Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "UNAUTHORIZED"
}
```

## Notes

1. **Empty Results**: Jika job belum selesai atau gagal, field `archetype` akan bernilai `null`
2. **Simplified Response**: Hanya field `archetype` yang dikembalikan dari persona_profile untuk mengurangi ukuran response
3. **Pagination**: Endpoint `/jobs` mendukung pagination dengan parameter `page` dan `limit`
4. **Filtering**: Bisa filter berdasarkan `status` dan `assessment_name`
5. **Sorting**: Bisa sorting berdasarkan field apapun dengan parameter `sort` dan `order`
6. **Authentication**: Semua endpoint memerlukan JWT token yang valid
7. **Authorization**: User hanya bisa mengakses job milik mereka sendiri (kecuali admin)

## Example Usage

```bash
# Get all jobs for user (page 1, 10 items)
curl -X GET "http://localhost:3000/api/archive/jobs?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get completed jobs only
curl -X GET "http://localhost:3000/api/archive/jobs?status=completed" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get specific job by ID
curl -X GET "http://localhost:3000/api/archive/jobs/job_12345abcdef" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
