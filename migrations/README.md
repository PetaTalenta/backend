# Database Migrations for Chatbot Service

This directory contains SQL migration scripts for the chatbot service database schema.

## Running Migrations

### Prerequisites
- PostgreSQL database with `auth` schema already set up
- Database user `fg_user` with appropriate permissions
- Connection to the FutureGuide database

### Manual Migration Execution

To run the chat schema migration manually, execute the following command:

```bash
# Connect to PostgreSQL and run the migration
psql -h localhost -U fg_user -d fg_db -f migrations/001_create_chat_schema.sql
```

### Using Docker

If running in Docker environment:

```bash
# Copy migration file to running postgres container
docker cp migrations/001_create_chat_schema.sql fg-postgres:/tmp/

# Execute migration inside container
docker exec -it fg-postgres psql -U fg_user -d fg_db -f /tmp/001_create_chat_schema.sql
```

### Environment Variables

Make sure these environment variables are set:
- `POSTGRES_DB=fg_db`
- `POSTGRES_USER=fg_user`
- `POSTGRES_PASSWORD=fg_password`

## Migration Details

### 001_create_chat_schema.sql

Creates the complete chat service database schema including:

**Schema:**
- `chat` schema with proper ownership

**Tables:**
- `chat.conversations` - Conversation metadata and context
- `chat.messages` - Individual messages within conversations  
- `chat.usage_tracking` - Token usage and cost tracking

**Security:**
- Row Level Security (RLS) policies for user data isolation
- Proper foreign key constraints
- Check constraints for data validation

**Performance:**
- Optimized indexes for common query patterns
- Proper data types for efficient storage

**Features:**
- UUID primary keys for scalability
- JSONB columns for flexible metadata storage
- Automatic timestamp management
- Comprehensive commenting for documentation

## Verification

After running the migration, verify the schema was created correctly:

```sql
-- Check if schema exists
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'chat';

-- Check tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'chat';

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'chat';

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'chat';
```

## Rollback

If you need to rollback the migration:

```sql
-- WARNING: This will delete all chat data
DROP SCHEMA chat CASCADE;
```

## Notes

- This migration assumes the `auth.users` table already exists
- The migration is idempotent and can be run multiple times safely
- RLS policies ensure users can only access their own data
- All timestamps are stored with timezone information
- The schema supports future extensibility through JSONB metadata columns
