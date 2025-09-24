# ATMA Chatbot Service API Documentation

## Overview

The ATMA Chatbot Service is an AI-powered conversational service that provides intelligent chat interactions for career guidance, assessment interpretation, and personalized recommendations. It integrates with OpenRouter API to deliver contextual responses based on user assessment data.

## Service Information

- **Service Name**: ATMA Chatbot Service
- **Version**: 1.0.0
- **Default Port**: 3006
- **Base URL**: `http://localhost:3006` (development)
- **Authentication**: Bearer Token (JWT) required for all endpoints except health checks

## Features

- ✅ AI-powered conversations with context awareness
- ✅ Assessment integration for personalized career guidance
- ✅ Message history and conversation management
- ✅ Usage analytics and metrics
- ✅ Rate limiting and security middleware
- ✅ Health monitoring and metrics endpoints

## Authentication

All API endpoints (except health checks) require authentication using JWT Bearer tokens:

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

## Rate Limiting

- **Global API Limit**: 200 requests per 15 minutes
- **Conversation Creation**: 100 conversations per day per user
- **Free Model Usage**: 50 requests per hour per user

## API Endpoints

### Root Endpoint

#### GET /
Get service information and health status.

**Response:**
```json
{
  "success": true,
  "message": "ATMA Chatbot Service is running",
  "version": "1.0.0",
  "timestamp": "2024-01-01T10:00:00.000Z",
  "service": "chatbot-service"
}
```

---

## Conversation Management

### Create Conversation

#### POST /conversations
Create a new conversation for the authenticated user.

**Request Body:**
```json
{
  "title": "Career Guidance Session",
  "context_type": "assessment",
  "context_data": {
    "assessment_id": "550e8400-e29b-41d4-a716-446655440000"
  },
  "metadata": {
    "source": "web_app"
  }
}
```

**Parameters:**
- `title` (string, optional): Conversation title (max 255 characters)
- `context_type` (string, optional): One of `general`, `assessment`, `career_guidance`
- `context_data` (object, optional): Additional context information
- `metadata` (object, optional): Custom metadata

**Response:**
```json
{
  "success": true,
  "message": "Conversation created successfully",
  "data": {
    "conversation": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Career Guidance Session",
      "context_type": "assessment",
      "status": "active",
      "created_at": "2024-01-01T10:00:00.000Z",
      "updated_at": "2024-01-01T10:00:00.000Z"
    }
  }
}
```

### Get Conversations

#### GET /conversations
Retrieve conversations for the authenticated user with pagination.

**Query Parameters:**
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (1-100, default: 20)
- `include_archived` (string, optional): Include archived conversations (`true`/`false`, default: `false`)
- `context_type` (string, optional): Filter by context type

**Response:**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Career Guidance Session",
        "context_type": "assessment",
        "status": "active",
        "message_count": 12,
        "last_message_at": "2024-01-01T10:30:00.000Z",
        "created_at": "2024-01-01T10:00:00.000Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_items": 25,
      "items_per_page": 20,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### Get Single Conversation

#### GET /conversations/:id
Retrieve a specific conversation by ID.

**Query Parameters:**
- `include_messages` (string, optional): Include messages (`true`/`false`, default: `false`)
- `message_limit` (integer, optional): Limit messages returned (1-200, default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "conversation": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Career Guidance Session",
      "context_type": "assessment",
      "status": "active",
      "context_data": {},
      "metadata": {},
      "created_at": "2024-01-01T10:00:00.000Z",
      "updated_at": "2024-01-01T10:00:00.000Z",
      "messages": []
    }
  }
}
```

### Update Conversation

#### PUT /conversations/:id
Update conversation details.

**Request Body:**
```json
{
  "title": "Updated Career Session",
  "status": "archived",
  "metadata": {
    "updated_reason": "session_completed"
  }
}
```

**Parameters:**
- `title` (string, optional): New title (max 255 characters)
- `context_data` (object, optional): Updated context data
- `metadata` (object, optional): Updated metadata
- `status` (string, optional): `active` or `archived`

### Delete Conversation

#### DELETE /conversations/:id
Delete a conversation and all its messages.

**Response:**
```json
{
  "success": true,
  "message": "Conversation deleted successfully"
}
```

---

## Message Management

### Send Message

#### POST /conversations/:conversationId/messages
Send a message and receive AI response.

**Request Body:**
```json
{
  "content": "What career paths would be best suited for my personality type?",
  "content_type": "text",
  "parent_message_id": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Parameters:**
- `content` (string, required): Message content (max 10,000 characters)
- `content_type` (string, optional): `text`, `image`, or `file` (default: `text`)
- `parent_message_id` (string, optional): UUID of parent message for threading

**Response:**
```json
{
  "success": true,
  "data": {
    "user_message": {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "content": "What career paths would be best suited for my personality type?",
      "sender_type": "user",
      "content_type": "text",
      "created_at": "2024-01-01T10:15:00.000Z"
    },
    "assistant_message": {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "content": "Based on your assessment results, I can see you have strong interests in...",
      "sender_type": "assistant",
      "content_type": "text",
      "created_at": "2024-01-01T10:15:02.000Z"
    },
    "usage": {
      "model": "openai/gpt-3.5-turbo",
      "prompt_tokens": 150,
      "completion_tokens": 200,
      "total_tokens": 350,
      "cost": 0.0007
    },
    "processing_time": 1200
  }
}
```

### Get Messages

#### GET /conversations/:conversationId/messages
Retrieve messages for a conversation.

**Query Parameters:**
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Messages per page (1-100, default: 50)
- `include_usage` (string, optional): Include usage stats (`true`/`false`, default: `false`)

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "content": "Hello! How can I help you today?",
        "sender_type": "assistant",
        "content_type": "text",
        "parent_message_id": null,
        "created_at": "2024-01-01T10:00:00.000Z",
        "usage": {
          "model": "openai/gpt-3.5-turbo",
          "total_tokens": 25
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 2,
      "total_items": 15,
      "items_per_page": 50,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### Regenerate Response

#### POST /conversations/:conversationId/messages/:messageId/regenerate
Regenerate AI response for a specific message.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": {
      "id": "550e8400-e29b-41d4-a716-446655440004",
      "content": "Let me provide you with an alternative perspective...",
      "sender_type": "assistant",
      "content_type": "text",
      "created_at": "2024-01-01T10:20:00.000Z"
    },
    "usage": {
      "model": "openai/gpt-3.5-turbo",
      "prompt_tokens": 150,
      "completion_tokens": 180,
      "total_tokens": 330,
      "cost": 0.0006
    },
    "processing_time": 1100
  }
}
```

---

## Usage Analytics

### Get User Usage Statistics

#### GET /usage/stats
Get usage statistics for the authenticated user.

**Query Parameters:**
- `start_date` (string, optional): ISO date string
- `end_date` (string, optional): ISO date string  
- `group_by` (string, optional): `day`, `week`, or `month` (default: `day`)

**Response:**
```json
{
  "success": true,
  "data": {
    "usage_stats": [
      {
        "date": "2024-01-01",
        "conversations": 5,
        "messages": 25,
        "tokens_used": 1500,
        "cost": 0.025
      }
    ],
    "summary": {
      "total_conversations": 15,
      "total_messages": 75,
      "total_tokens": 4500,
      "total_cost": 0.075
    }
  }
}
```

### Get Usage Summary

#### GET /usage/summary
Get usage summary for dashboard display.

**Response:**
```json
{
  "success": true,
  "data": {
    "today": {
      "conversations": 3,
      "messages": 12,
      "tokens": 800
    },
    "this_month": {
      "conversations": 25,
      "messages": 150,
      "tokens": 12000
    },
    "limits": {
      "daily_conversations": 100,
      "hourly_messages": 50
    }
  }
}
```

### Get System Usage Statistics (Admin)

#### GET /usage/system
Get system-wide usage statistics (admin only).

**Query Parameters:**
- `start_date` (string, optional): ISO date string
- `end_date` (string, optional): ISO date string

---

## Assessment Integration

### Create Conversation from Assessment

#### POST /assessment/from-assessment
Create a conversation based on assessment results.

**Request Body:**
```json
{
  "assessment_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Career Guidance Based on Assessment",
  "auto_start_message": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "550e8400-e29b-41d4-a716-446655440001",
    "messages": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "content": "Hello! I've analyzed your assessment results...",
        "sender": "ai",
        "timestamp": "2024-01-01T10:00:00Z"
      }
    ]
  }
}
```

### Check Assessment Readiness

#### GET /assessment/assessment-ready/:userId
Check if assessment data is ready for conversation creation.

**Response:**
```json
{
  "success": true,
  "data": {
    "ready": true,
    "assessment_id": "550e8400-e29b-41d4-a716-446655440000",
    "completion_date": "2024-01-01T09:00:00Z"
  }
}
```

### Get Conversation Suggestions

#### GET /assessment/conversations/:conversationId/suggestions
Get AI-generated suggestions for conversation continuation.

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      "Tell me more about software engineering roles",
      "What skills should I develop for data science?",
      "How do I transition into a tech career?"
    ]
  }
}
```

---

## Health & Monitoring

### Health Check

#### GET /health
Comprehensive health check with service dependencies.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T10:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "service": "chatbot-service",
  "services": {
    "database": {
      "status": "healthy",
      "connected": true,
      "pool": {
        "total": 10,
        "available": 8,
        "using": 2
      }
    }
  },
  "system": {
    "memory": {
      "rss": 45678592,
      "heapTotal": 20971520,
      "heapUsed": 15728640
    },
    "platform": "linux",
    "nodeVersion": "v18.17.0"
  },
  "responseTime": "25ms"
}
```

### Readiness Probe

#### GET /health/ready
Kubernetes readiness probe endpoint.

### Liveness Probe

#### GET /health/live
Kubernetes liveness probe endpoint.

### Metrics

#### GET /health/metrics
Get service metrics and performance data.

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": ["Content is required"]
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` (400): Request validation failed
- `UNAUTHORIZED` (401): Authentication required
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `RATE_LIMIT_EXCEEDED` (429): Rate limit exceeded
- `INTERNAL_ERROR` (500): Server error

## Environment Variables

Key environment variables for configuration:

```bash
# Server Configuration
PORT=3006
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/atma_chatbot

# OpenRouter API
OPENROUTER_API_KEY=your_api_key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Security
JWT_SECRET=your_jwt_secret
ALLOWED_ORIGINS=http://localhost:3000,https://app.futureguide.id

# Rate Limiting
MAX_MESSAGE_LENGTH=10000
ENABLE_ASSESSMENT_INTEGRATION=true
```

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run Database Migrations**
   ```bash
   npm run migrate
   ```

4. **Start the Service**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

5. **Run Tests**
   ```bash
   npm test
   ```

## Support

For questions or issues, please contact the ATMA development team or create an issue in the project repository.
