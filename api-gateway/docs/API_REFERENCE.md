# API Reference

Dokumentasi lengkap untuk semua endpoint yang tersedia di ATMA API Gateway.

## Base URL

```
Development: http://localhost:3000
Production: https://api.atma.com
```

## Authentication

API Gateway menggunakan JWT (JSON Web Token) untuk authentication. Token harus disertakan dalam header `Authorization` dengan format:

```
Authorization: Bearer <your_jwt_token>
```

### Authentication Types

1. **Public** (❌) - Tidak memerlukan authentication
2. **User** (✅) - Memerlukan valid JWT token
3. **Admin** (👑) - Memerlukan JWT token dengan role admin
4. **Internal** (🔧) - Memerlukan internal service key

## Response Format

Semua response menggunakan format JSON standar:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation successful",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Error description",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "details": {
    // Additional error details (optional)
  }
}
```

## Rate Limiting

API Gateway menerapkan rate limiting untuk melindungi dari abuse:

- **General**: 5000 requests per 10 minutes per IP
- **Auth endpoints**: 100 requests per 15 minutes per IP
- **Assessment**: 50 requests per 10 minutes per user
- **Admin**: 200 requests per 15 minutes per admin

Rate limit headers:
```
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4999
X-RateLimit-Reset: 1640995200
```

## Authentication Endpoints

### POST /api/auth/register

Register new user account.

**Authentication**: ❌ Public

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "school": "University Name",
  "major": "Computer Science"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully"
}
```

### POST /api/auth/login

User login.

**Authentication**: ❌ Public

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "tokenBalance": 100
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

### GET /api/auth/profile

Get user profile information.

**Authentication**: ✅ User

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe",
      "school": "University Name",
      "major": "Computer Science",
      "role": "user",
      "tokenBalance": 95,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z"
    }
  }
}
```

### PUT /api/auth/profile

Update user profile.

**Authentication**: ✅ User

**Request Body**:
```json
{
  "name": "John Smith",
  "school": "New University",
  "major": "Data Science"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Smith",
      "school": "New University",
      "major": "Data Science",
      "updatedAt": "2024-01-01T13:00:00.000Z"
    }
  },
  "message": "Profile updated successfully"
}
```

### POST /api/auth/change-password

Change user password.

**Authentication**: ✅ User

**Request Body**:
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### POST /api/auth/logout

Logout user (invalidate token).

**Authentication**: ✅ User

**Response**:
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### GET /api/auth/token-balance

Get user's token balance.

**Authentication**: ✅ User

**Response**:
```json
{
  "success": true,
  "data": {
    "tokenBalance": 95,
    "lastUpdated": "2024-01-01T12:00:00.000Z"
  }
}
```

## Assessment Endpoints

### POST /api/assessment/submit

Submit assessment for processing.

**Authentication**: ✅ User

**Request Body**:
```json
{
  "answers": [
    {
      "questionId": "q1",
      "answer": "A",
      "timeSpent": 30
    },
    {
      "questionId": "q2",
      "answer": "B",
      "timeSpent": 45
    }
  ],
  "metadata": {
    "startTime": "2024-01-01T10:00:00.000Z",
    "endTime": "2024-01-01T10:30:00.000Z",
    "userAgent": "Mozilla/5.0...",
    "screenResolution": "1920x1080"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "jobId": "job_abc123",
    "status": "queued",
    "estimatedProcessingTime": 300,
    "queuePosition": 3
  },
  "message": "Assessment submitted successfully"
}
```

### GET /api/assessment/status

Check assessment processing status.

**Authentication**: ✅ User

**Query Parameters**:
- `jobId` (optional): Specific job ID to check
- `limit` (optional): Number of recent jobs to return (default: 10)

**Response**:
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "jobId": "job_abc123",
        "status": "processing",
        "progress": 75,
        "estimatedTimeRemaining": 60,
        "createdAt": "2024-01-01T10:00:00.000Z",
        "updatedAt": "2024-01-01T10:25:00.000Z"
      }
    ]
  }
}
```

### POST /api/assessment/retry

Retry failed assessment.

**Authentication**: ✅ User

**Request Body**:
```json
{
  "jobId": "job_abc123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "jobId": "job_def456",
    "status": "queued",
    "originalJobId": "job_abc123"
  },
  "message": "Assessment retry initiated"
}
```

## Archive Endpoints

### GET /api/archive/results

Get user's assessment results.

**Authentication**: ✅ User

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10)
- `sortBy` (optional): Sort field (default: createdAt)
- `sortOrder` (optional): Sort order (asc/desc, default: desc)

**Response**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "result_123",
        "jobId": "job_abc123",
        "archetype": "The Innovator",
        "scores": {
          "creativity": 85,
          "leadership": 78,
          "analytical": 92
        },
        "recommendations": [
          "Consider roles in product development",
          "Explore opportunities in tech startups"
        ],
        "createdAt": "2024-01-01T11:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalResults": 25,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### GET /api/archive/results/:id

Get specific assessment result.

**Authentication**: ❌ Public (with result ID)

**Response**:
```json
{
  "success": true,
  "data": {
    "result": {
      "id": "result_123",
      "archetype": "The Innovator",
      "description": "You are a creative problem-solver...",
      "scores": {
        "creativity": 85,
        "leadership": 78,
        "analytical": 92,
        "communication": 80,
        "teamwork": 75
      },
      "strengths": [
        "Creative thinking",
        "Problem solving",
        "Technical skills"
      ],
      "recommendations": [
        "Consider roles in product development",
        "Explore opportunities in tech startups",
        "Develop leadership skills further"
      ],
      "careerPaths": [
        {
          "title": "Product Manager",
          "match": 88,
          "description": "Lead product development..."
        },
        {
          "title": "Software Architect",
          "match": 85,
          "description": "Design system architecture..."
        }
      ],
      "createdAt": "2024-01-01T11:00:00.000Z"
    }
  }
}
```

### GET /api/archive/stats

Get user statistics.

**Authentication**: ✅ User

**Response**:
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalAssessments": 5,
      "completedAssessments": 4,
      "averageScore": 82.5,
      "topArchetype": "The Innovator",
      "improvementAreas": ["Leadership", "Communication"],
      "progressTrend": "improving",
      "lastAssessment": "2024-01-01T11:00:00.000Z"
    }
  }
}
```

## Chatbot Endpoints

### GET /api/chatbot/conversations

Get user's chat conversations.

**Authentication**: ✅ User

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Conversations per page (default: 10)

**Response**:
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "conv_123",
        "title": "Career Guidance Discussion",
        "lastMessage": "Thank you for the advice!",
        "messageCount": 15,
        "createdAt": "2024-01-01T09:00:00.000Z",
        "updatedAt": "2024-01-01T09:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalConversations": 12
    }
  }
}
```

### POST /api/chatbot/conversations

Create new conversation.

**Authentication**: ✅ User

**Request Body**:
```json
{
  "title": "Career Questions",
  "initialMessage": "I need help with career planning"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "conversation": {
      "id": "conv_456",
      "title": "Career Questions",
      "messages": [
        {
          "id": "msg_789",
          "role": "user",
          "content": "I need help with career planning",
          "timestamp": "2024-01-01T14:00:00.000Z"
        },
        {
          "id": "msg_790",
          "role": "assistant",
          "content": "I'd be happy to help you with career planning! Based on your assessment results...",
          "timestamp": "2024-01-01T14:00:05.000Z"
        }
      ],
      "createdAt": "2024-01-01T14:00:00.000Z"
    }
  },
  "message": "Conversation created successfully"
}
```

## Health Check Endpoints

### GET /health

Basic health check.

**Authentication**: ❌ Public

**Response**:
```json
{
  "success": true,
  "status": "healthy",
  "service": "api-gateway",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

### GET /health/detailed

Detailed health check with service status.

**Authentication**: ❌ Public

**Response**:
```json
{
  "success": true,
  "status": "healthy",
  "service": "api-gateway",
  "version": "1.0.0",
  "services": {
    "auth": {
      "status": "healthy",
      "responseTime": 45,
      "lastCheck": "2024-01-01T00:00:00.000Z"
    },
    "archive": {
      "status": "healthy",
      "responseTime": 32,
      "lastCheck": "2024-01-01T00:00:00.000Z"
    },
    "assessment": {
      "status": "degraded",
      "responseTime": 1200,
      "lastCheck": "2024-01-01T00:00:00.000Z",
      "error": "High response time"
    }
  },
  "summary": {
    "total": 6,
    "healthy": 5,
    "degraded": 1,
    "unhealthy": 0
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `UNAUTHORIZED` | Missing or invalid authentication | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `VALIDATION_ERROR` | Invalid request data | 400 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `SERVICE_UNAVAILABLE` | Backend service unavailable | 503 |
| `INTERNAL_ERROR` | Internal server error | 500 |
| `TOKEN_EXPIRED` | JWT token has expired | 401 |
| `INVALID_TOKEN` | JWT token is invalid | 401 |
| `INSUFFICIENT_TOKENS` | Not enough tokens for operation | 402 |

## WebSocket Support

API Gateway supports WebSocket connections for real-time features:

### Connection

```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Events

- `notification` - Real-time notifications
- `assessment_update` - Assessment processing updates
- `chat_message` - Chatbot messages

---

**Last Updated**: 2024-01-01  
**API Version**: 1.0.0
