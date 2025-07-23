# Phase 1: Core Service Setup - Chatbot Service ATMA

## 🎯 Tujuan Fase

**Membangun fondasi solid untuk chatbot service** dengan fokus pada:
- Struktur database yang robust dan scalable
- Basic conversation management API
- Authentication dan security framework
- Service architecture yang siap untuk integrasi

**Mengapa Fase Ini Penting:**
- Menyediakan foundation yang akan mendukung semua fitur advanced di fase selanjutnya
- Memastikan data integrity dan security dari awal
- Membangun API structure yang consistent dan maintainable

## 🏗️ Komponen Utama

### 1. Database Schema Setup
- **Chat Schema**: Dedicated schema untuk chatbot data
- **Conversations Table**: Menyimpan metadata percakapan
- **Messages Table**: Menyimpan individual messages
- **Usage Tracking Table**: Tracking token usage dan costs
- **Row Level Security**: User isolation dan data protection

### 2. Basic Service Architecture
- **Express.js Application**: Main service framework
- **Database Configuration**: PostgreSQL connection dengan pooling
- **Authentication Middleware**: JWT validation
- **Basic API Routes**: Conversation CRUD operations

### 3. Security Implementation
- **JWT Token Validation**: Integration dengan auth service
- **Rate Limiting**: Basic rate limiting untuk API endpoints
- **Input Validation**: Joi schema validation
- **CORS Configuration**: Proper cross-origin setup

## 📋 Implementasi Detail

### Database Migration Script
```sql
-- migrations/001_create_chat_schema.sql
CREATE SCHEMA IF NOT EXISTS chat;
ALTER SCHEMA chat OWNER TO atma_user;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Conversations table
CREATE TABLE chat.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    title VARCHAR(255) DEFAULT 'New Conversation',
    context_type VARCHAR(50) DEFAULT 'general',
    context_data JSONB,
    status VARCHAR(20) DEFAULT 'active',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT conversations_status_check CHECK (status IN ('active', 'archived', 'deleted')),
    CONSTRAINT conversations_context_type_check CHECK (context_type IN ('general', 'assessment', 'career_guidance'))
);

-- Messages table
CREATE TABLE chat.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES chat.conversations(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text',
    metadata JSONB,
    parent_message_id UUID REFERENCES chat.messages(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT messages_sender_type_check CHECK (sender_type IN ('user', 'assistant', 'system')),
    CONSTRAINT messages_content_type_check CHECK (content_type IN ('text', 'image', 'file'))
);

-- Usage tracking table
CREATE TABLE chat.usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES chat.conversations(id),
    message_id UUID NOT NULL REFERENCES chat.messages(id),
    model_used VARCHAR(100) NOT NULL,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    cost_credits DECIMAL(10,6) DEFAULT 0,
    is_free_model BOOLEAN DEFAULT false,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_conversations_user_id ON chat.conversations(user_id);
CREATE INDEX idx_conversations_status ON chat.conversations(status);
CREATE INDEX idx_messages_conversation_id ON chat.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON chat.messages(created_at);
CREATE INDEX idx_usage_tracking_conversation_id ON chat.usage_tracking(conversation_id);

-- Row Level Security
ALTER TABLE chat.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat.usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY conversations_user_policy ON chat.conversations
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY messages_user_policy ON chat.messages
    FOR ALL USING (
        conversation_id IN (
            SELECT id FROM chat.conversations 
            WHERE user_id = current_setting('app.current_user_id')::UUID
        )
    );
```

### Project Structure
```
chatbot-service/
├── src/
│   ├── app.js                 # Main application entry
│   ├── config/
│   │   └── database.js        # Database configuration
│   ├── controllers/
│   │   └── conversationController.js
│   ├── models/
│   │   ├── Conversation.js
│   │   └── Message.js
│   ├── middleware/
│   │   ├── auth.js             # JWT validation
│   │   ├── rateLimiter.js      # Rate limiting
│   │   └── validation.js       # Input validation
│   ├── routes/
│   │   ├── conversations.js
│   │   └── health.js
│   └── utils/
│       └── logger.js
├── migrations/
│   └── 001_create_chat_schema.sql
├── tests/
├── package.json
└── .env.example
```

### Environment Configuration
```env
# Server Configuration
PORT=3006
NODE_ENV=development

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=atma_db
DB_USER=atma_user
DB_PASSWORD=atma_password
DB_SCHEMA=chat
DB_POOL_MAX=20
DB_POOL_MIN=5

# Security
JWT_SECRET=atma_secure_jwt_secret_key
INTERNAL_SERVICE_KEY=internal_service_secret_key

# Rate Limiting
RATE_LIMIT_CONVERSATIONS_PER_DAY=100
MAX_MESSAGE_LENGTH=4000

# Monitoring
LOG_LEVEL=info
LOG_FILE=logs/chatbot-service.log
```

## 🔗 Dependencies

**Prerequisites:**
- PostgreSQL database dengan auth schema sudah setup
- Auth service running untuk JWT validation
- Basic Docker environment untuk development

**External Services:**
- **Auth Service**: Untuk JWT token validation
- **PostgreSQL**: Database utama dengan auth.users table

## 📦 Deliverables

### ✅ Yang Harus Diselesaikan:

1. **Database Setup Complete**
   - Chat schema created dan configured
   - All tables dengan proper constraints
   - Indexes untuk performance optimization
   - RLS policies untuk security

2. **Basic API Endpoints**
   - `POST /conversations` - Create new conversation
   - `GET /conversations` - List user conversations
   - `GET /conversations/{id}` - Get conversation details
   - `PUT /conversations/{id}` - Update conversation
   - `DELETE /conversations/{id}` - Soft delete conversation

3. **Authentication & Security**
   - JWT middleware working
   - Rate limiting implemented
   - Input validation dengan Joi
   - CORS properly configured

4. **Health Check & Monitoring**
   - `/health` endpoint untuk container health checks
   - Basic logging setup
   - Error handling middleware

5. **Testing Framework**
   - Unit tests untuk core functions
   - Integration tests untuk API endpoints
   - Test database setup

## 🚀 Pengembangan Selanjutnya

**Persiapan untuk Phase 2:**
- Service architecture sudah siap untuk OpenRouter integration
- Database schema mendukung message storage dan usage tracking
- API structure yang consistent untuk message handling
- Authentication framework yang akan digunakan untuk semua endpoints

**Foundation yang Dibangun:**
- **Scalable Database Design**: Schema yang mendukung millions of messages
- **Security First**: RLS dan authentication dari awal- **Performance Ready**: Indexes dan connection pooling
- **Monitoring Ready**: Logging dan health checks

## ⏱️ Timeline & Resources

**Estimasi Waktu:** 1-2 minggu
**Team Requirements:**
- 1 Backend Developer (senior level)
- 1 DevOps Engineer (untuk database setup)

**Milestones:**
- **Week 1**: Database setup, basic API structure
- **Week 2**: Authentication, testing, documentation

**Success Criteria:**
- All API endpoints working dengan proper authentication
- Database performance tests passing
- Security audit completed
- Ready untuk OpenRouter integration di Phase 2

---

**🎯 Outcome:** Solid foundation service yang siap untuk AI integration dan advanced features di fase-fase selanjutnya.
