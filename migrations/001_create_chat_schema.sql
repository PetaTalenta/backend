-- migrations/001_create_chat_schema.sql
-- Chat Service Database Schema Migration
-- This script creates the chat schema with all necessary tables, indexes, and security policies

-- Create chat schema
CREATE SCHEMA IF NOT EXISTS chat;
ALTER SCHEMA chat OWNER TO atma_user;

-- Ensure uuid-ossp extension is available
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

-- Indexes for performance optimization
CREATE INDEX idx_conversations_user_id ON chat.conversations(user_id);
CREATE INDEX idx_conversations_status ON chat.conversations(status);
CREATE INDEX idx_conversations_created_at ON chat.conversations(created_at);
CREATE INDEX idx_conversations_context_type ON chat.conversations(context_type);

CREATE INDEX idx_messages_conversation_id ON chat.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON chat.messages(created_at);
CREATE INDEX idx_messages_sender_type ON chat.messages(sender_type);
CREATE INDEX idx_messages_parent_message_id ON chat.messages(parent_message_id);

CREATE INDEX idx_usage_tracking_conversation_id ON chat.usage_tracking(conversation_id);
CREATE INDEX idx_usage_tracking_message_id ON chat.usage_tracking(message_id);
CREATE INDEX idx_usage_tracking_created_at ON chat.usage_tracking(created_at);
CREATE INDEX idx_usage_tracking_model_used ON chat.usage_tracking(model_used);

-- Row Level Security (RLS) Setup
ALTER TABLE chat.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat.usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY conversations_user_policy ON chat.conversations
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

-- RLS Policies for messages
CREATE POLICY messages_user_policy ON chat.messages
    FOR ALL USING (
        conversation_id IN (
            SELECT id FROM chat.conversations 
            WHERE user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- RLS Policies for usage tracking
CREATE POLICY usage_tracking_user_policy ON chat.usage_tracking
    FOR ALL USING (
        conversation_id IN (
            SELECT id FROM chat.conversations 
            WHERE user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for conversations table
CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON chat.conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions to atma_user
GRANT USAGE ON SCHEMA chat TO atma_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA chat TO atma_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA chat TO atma_user;

-- Comments for documentation
COMMENT ON SCHEMA chat IS 'Chat service schema for conversations and messages';
COMMENT ON TABLE chat.conversations IS 'Stores conversation metadata and context';
COMMENT ON TABLE chat.messages IS 'Stores individual messages within conversations';
COMMENT ON TABLE chat.usage_tracking IS 'Tracks token usage and costs for AI model interactions';

COMMENT ON COLUMN chat.conversations.context_type IS 'Type of conversation context: general, assessment, career_guidance';
COMMENT ON COLUMN chat.conversations.context_data IS 'Additional context data stored as JSON';
COMMENT ON COLUMN chat.conversations.status IS 'Conversation status: active, archived, deleted';

COMMENT ON COLUMN chat.messages.sender_type IS 'Who sent the message: user, assistant, system';
COMMENT ON COLUMN chat.messages.content_type IS 'Type of content: text, image, file';
COMMENT ON COLUMN chat.messages.parent_message_id IS 'Reference to parent message for threading';

COMMENT ON COLUMN chat.usage_tracking.model_used IS 'AI model identifier used for the response';
COMMENT ON COLUMN chat.usage_tracking.cost_credits IS 'Cost in credits for this interaction';
COMMENT ON COLUMN chat.usage_tracking.is_free_model IS 'Whether this was a free model usage';
