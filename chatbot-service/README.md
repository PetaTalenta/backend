# ATMA Chatbot Service

Core conversation management service for the ATMA (AI-Driven Talent Mapping Assessment) platform.

## Overview

The Chatbot Service provides foundational conversation management capabilities including:

- **Conversation Management**: Create, read, update, and delete conversations
- **Message Storage**: Store and retrieve conversation messages
- **Usage Tracking**: Track token usage and costs for AI interactions
- **User Isolation**: Row-level security ensures users can only access their own data
- **Rate Limiting**: Protect against abuse with configurable rate limits

## Features

### Core Functionality
- ✅ Conversation CRUD operations
- ✅ Message management within conversations
- ✅ Usage tracking for AI model interactions
- ✅ JWT authentication integration
- ✅ Row-level security (RLS) for data isolation

### Security & Performance
- ✅ JWT token validation
- ✅ Rate limiting (conversations per day, messages per minute)
- ✅ Input validation with Joi schemas
- ✅ CORS configuration
- ✅ Request/response logging
- ✅ Health monitoring and metrics

### Database Schema
- **Conversations**: Store conversation metadata and context
- **Messages**: Store individual messages with threading support
- **Usage Tracking**: Track AI model usage, tokens, and costs

## API Endpoints

### Conversations
- `POST /conversations` - Create new conversation
- `GET /conversations` - List user conversations (with pagination)
- `GET /conversations/:id` - Get specific conversation
- `PUT /conversations/:id` - Update conversation
- `DELETE /conversations/:id` - Soft delete conversation
- `GET /conversations/:conversationId/messages` - Get conversation messages

### Health & Monitoring
- `GET /health` - Service health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
- `GET /health/metrics` - Service metrics

## Environment Configuration

```env
# Server
PORT=3006
NODE_ENV=development

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=atma_db
DB_USER=atma_user
DB_PASSWORD=atma_password
DB_SCHEMA=chat

# Security
JWT_SECRET=your_jwt_secret
INTERNAL_SERVICE_KEY=your_internal_key

# Rate Limiting
RATE_LIMIT_CONVERSATIONS_PER_DAY=100
MAX_MESSAGE_LENGTH=4000

# Logging
LOG_LEVEL=info
```

## Development

### Prerequisites
- Node.js 22+
- PostgreSQL with chat schema
- Auth service running (for JWT validation)

### Setup
1. Install dependencies: `npm install`
2. Run database migration: See `migrations/README.md`
3. Copy environment: `cp .env.example .env`
4. Start development: `npm run dev`

### Testing
- Run tests: `npm test`
- Run with coverage: `npm run test:coverage`
- Watch mode: `npm run test:watch`

### Docker
```bash
# Build image
docker build -t atma-chatbot-service .

# Run container
docker run -p 3006:3006 atma-chatbot-service
```

## Database Migration

Before running the service, execute the database migration:

```sql
-- Run the migration script
psql -h localhost -U atma_user -d atma_db -f migrations/001_create_chat_schema.sql
```

See `migrations/README.md` for detailed instructions.

## Integration

### API Gateway
The service is integrated with the API gateway at `/api/chatbot/*` routes.

### Authentication
All endpoints (except health checks) require JWT authentication via the `Authorization: Bearer <token>` header.

### Rate Limiting
- **Conversations**: 100 per day per user
- **Messages**: 30 per minute per user
- **General API**: 1000 requests per 15 minutes per user

## Architecture

### Security Model
- JWT token validation for all protected endpoints
- Row-level security (RLS) ensures data isolation
- Rate limiting prevents abuse
- Input validation with comprehensive schemas

### Database Design
- UUID primary keys for scalability
- JSONB columns for flexible metadata storage
- Proper foreign key constraints and cascading deletes
- Optimized indexes for common query patterns

### Monitoring
- Comprehensive health checks
- Request/response metrics collection
- Performance monitoring with slow request detection
- Structured logging with request correlation

## Future Enhancements (Phase 2+)

This service provides the foundation for:
- AI model integration (OpenRouter)
- Real-time messaging capabilities
- Advanced conversation analytics
- Multi-modal content support
- Conversation export/import

## License

MIT License - See LICENSE file for details.
