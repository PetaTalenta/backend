# Dokumentasi Endpoint Baru: GET /admin/jobs/all

## Overview

Endpoint baru ini ditambahkan untuk memenuhi requirement bahwa admin harus bisa melihat **semua jobs termasuk yang berstatus `deleted`**. Endpoint ini berbeda dengan `/jobs/monitor` yang hanya menampilkan jobs dengan status `processing` dan `queued`.

## Endpoint Details

**URL**: `/api/admin-service/jobs/all`  
**Method**: `GET`  
**Authentication**: Required (Admin JWT Token)  
**Rate Limit**: Admin Limiter (1000 requests/15 minutes)

## Request

### Headers

```
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 50 | Number of jobs to return (max: 100) |
| `offset` | integer | No | 0 | Number of jobs to skip for pagination |
| `status` | string | No | - | Filter by job status: `queued`, `processing`, `completed`, `failed`, `deleted` |
| `assessment_name` | string | No | - | Filter by assessment name: `AI-Driven Talent Mapping`, `AI-Based IQ Test`, `Custom Assessment` |
| `user_id` | UUID | No | - | Filter by user ID |
| `include_deleted` | string | No | `true` | Include deleted jobs: `true` or `false` |
| `sort_by` | string | No | `created_at` | Sort field: `created_at`, `updated_at`, `status`, `assessment_name`, `priority` |
| `sort_order` | string | No | `DESC` | Sort order: `ASC` or `DESC` |

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "job_id": "job-550e8400",
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "status": "completed",
        "assessment_name": "AI-Driven Talent Mapping",
        "priority": 0,
        "retry_count": 0,
        "max_retries": 3,
        "error_message": null,
        "result_id": "789e0123-e89b-12d3-a456-426614174000",
        "created_at": "2025-09-30T10:00:00.000Z",
        "updated_at": "2025-09-30T10:05:00.000Z",
        "completed_at": "2025-09-30T10:05:00.000Z",
        "processing_started_at": "2025-09-30T10:00:30.000Z",
        "processing_time_minutes": 4.5,
        "archetype": "The Innovator"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "job_id": "job-660e8400",
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "status": "deleted",
        "assessment_name": "AI-Based IQ Test",
        "priority": 0,
        "retry_count": 0,
        "max_retries": 3,
        "error_message": null,
        "result_id": null,
        "created_at": "2025-09-29T15:00:00.000Z",
        "updated_at": "2025-09-29T15:01:00.000Z",
        "completed_at": null,
        "processing_started_at": null,
        "processing_time_minutes": null,
        "archetype": null
      }
    ],
    "pagination": {
      "total": 479,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### Error Response (401 Unauthorized)

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Admin access required"
  }
}
```

### Error Response (500 Internal Server Error)

```json
{
  "success": false,
  "error": {
    "code": "UPSTREAM_ERROR",
    "message": "A database error occurred"
  }
}
```

## Example Usage

### Get all jobs including deleted

```bash
curl -X GET "http://localhost:3000/api/admin-service/jobs/all?limit=20&include_deleted=true" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

### Get only active jobs (exclude deleted)

```bash
curl -X GET "http://localhost:3000/api/admin-service/jobs/all?limit=20&include_deleted=false" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

### Get jobs by specific status

```bash
curl -X GET "http://localhost:3000/api/admin-service/jobs/all?status=deleted&limit=50" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

### Get jobs by user ID

```bash
curl -X GET "http://localhost:3000/api/admin-service/jobs/all?user_id=123e4567-e89b-12d3-a456-426614174000&limit=10" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

### Get jobs with pagination

```bash
# Page 1
curl -X GET "http://localhost:3000/api/admin-service/jobs/all?limit=50&offset=0" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"

# Page 2
curl -X GET "http://localhost:3000/api/admin-service/jobs/all?limit=50&offset=50" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

### Get jobs sorted by priority

```bash
curl -X GET "http://localhost:3000/api/admin-service/jobs/all?sort_by=priority&sort_order=DESC&limit=20" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

## Implementation Details

### Files Modified/Created

1. **archive-service/src/controllers/adminSystemController.js**
   - Added `getAllJobs` function
   - Implements complex SQL query with LEFT JOIN to analysis_results
   - Calculates processing time for jobs
   - Supports flexible filtering and sorting

2. **archive-service/src/routes/admin.js**
   - Added route definition for `/admin/jobs/all`
   - Added validation schema `getAllJobsQuerySchema`
   - Applied authentication and logging middleware

3. **admin-service/src/routes/index.js**
   - Added proxy route to forward requests to archive-service

4. **docker-compose.override.yml**
   - Added network configuration for admin-service
   - Added environment variables

### Database Query

The endpoint uses a complex SQL query that:
- Joins `archive.analysis_jobs` with `archive.analysis_results`
- Calculates processing time based on job status
- Extracts archetype from persona_profile JSON field
- Supports dynamic filtering and sorting
- Uses parameterized queries to prevent SQL injection

### Security Considerations

1. **Authentication**: Requires valid admin JWT token
2. **Authorization**: Only accessible by admin users
3. **Rate Limiting**: Protected by admin rate limiter
4. **SQL Injection**: Uses parameterized queries
5. **Input Validation**: All query parameters are validated using Joi schema

## Differences from /jobs/monitor

| Feature | /jobs/monitor | /jobs/all |
|---------|---------------|-----------|
| Purpose | Monitor active jobs | View all jobs including history |
| Status Filter | Only `processing` and `queued` | All statuses including `deleted` |
| Deleted Jobs | Not included | Included by default |
| Pagination | Limited to 50 | Configurable up to 100 |
| Sorting | Fixed (status, priority, created_at) | Flexible (multiple fields) |
| Filtering | None | By status, user_id, assessment_name |
| Processing Time | Estimated for active jobs | Actual for completed jobs |

## Known Issues

1. **Database Error**: Currently experiencing SQL query execution error
   - Status: Under investigation
   - Impact: Endpoint returns 500 error
   - Workaround: Use `/jobs/monitor` for active jobs monitoring

2. **Performance**: Query may be slow with large datasets
   - Recommendation: Add database indexes
   - Recommendation: Implement caching

## Future Enhancements

1. **Export Functionality**: Add ability to export jobs data to CSV/Excel
2. **Advanced Filters**: Add date range filter, multiple status filter
3. **Bulk Operations**: Add ability to perform bulk operations on filtered jobs
4. **Real-time Updates**: Add WebSocket support for real-time job updates
5. **Analytics**: Add aggregated statistics for filtered jobs

## Testing

### Manual Testing

```bash
# 1. Login as admin
TOKEN=$(curl -s http://localhost:3000/api/admin-service/admin/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"admin123"}' \
  | jq -r '.data.token')

# 2. Test endpoint
curl -s "http://localhost:3000/api/admin-service/jobs/all?limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  | jq .
```

### Automated Testing

See `admin-service/test-admin-endpoints.sh` for automated testing script.

## Support

For issues or questions, please contact the development team or create an issue in the repository.

---

**Last Updated**: 30 September 2025  
**Version**: 1.0.0  
**Author**: System Administrator

