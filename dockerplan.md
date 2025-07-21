Rencana Dockerisasi Per Service
1. API Gateway
Fungsi: Entry point untuk semua request, routing ke service lain
Dependencies: Tidak ada database, hanya komunikasi HTTP ke service lain

Langkah Dockerisasi:

Buat Dockerfile dengan Node.js 18+ base image
Copy package.json dan install dependencies
Copy source code dan set working directory
Expose port 3000
Set environment variables untuk service URLs
Implement health check endpoint
Configure logging untuk container environment
2. Auth Service
Fungsi: Autentikasi, autorisasi, manajemen user
Dependencies: PostgreSQL (schema: auth), Redis (optional cache)

Langkah Dockerisasi:

Buat Dockerfile dengan Node.js 18+ base image
Copy package.json dan Install dependencies termasuk bcrypt, jsonwebtoken, sequelize
Copy source code dan migrations
Expose port 3001
Set database connection environment variables
Configure Redis connection (dengan fallback jika tidak tersedia)
Implement database migration pada startup
Setup health check untuk database connectivity
3. Archive Service
Fungsi: Penyimpanan hasil analisis, query data historis
Dependencies: PostgreSQL (schema: archive), Redis (cache), RabbitMQ (event consumer)

Langkah Dockerisasi:

Buat Dockerfile dengan Node.js 18+ base image
Install dependencies termasuk sequelize, redis, amqplib
Copy source code dan database migrations
Expose port 3002
Configure database, Redis, dan RabbitMQ connections
Setup database migration dan seeding
Implement health check untuk semua dependencies
Configure event consumer untuk RabbitMQ
4. Assessment Service
Fungsi: Menerima assessment data, queue ke analysis worker
Dependencies: PostgreSQL (schema: assessment), RabbitMQ (publisher & consumer)

Langkah Dockerisasi:

Buat Dockerfile dengan Node.js 18+ base image
Install dependencies termasuk sequelize, amqplib, joi
Copy source code dan migrations
Expose port 3003
Configure database dan RabbitMQ connections
Setup queue publisher dan event consumer
Implement health check untuk database dan queue connectivity
Configure job tracking dan idempotency
5. Analysis Worker
Fungsi: Background worker untuk AI analysis menggunakan Google Gemini
Dependencies: RabbitMQ (consumer), Google AI API, Archive Service (HTTP)

Langkah Dockerisasi:

Buat Dockerfile dengan Node.js 18+ base image
Install dependencies termasuk @google/genai, amqplib
Copy source code dan AI prompt templates
Tidak expose port (background worker)
Configure RabbitMQ consumer connection
Set Google AI API key dan model configuration
Configure service URLs untuk Archive Service
Implement health check untuk queue connectivity
Setup retry logic dan error handling
Configure concurrency dan worker scaling
6. Notification Service
Fungsi: Real-time notifications via WebSocket
Dependencies: RabbitMQ (event consumer), Socket.IO

Langkah Dockerisasi:

Buat Dockerfile dengan Node.js 18+ base image
Install dependencies termasuk socket.io, amqplib
Copy source code
Expose port 3005
Configure RabbitMQ event consumer
Setup WebSocket server dengan authentication
Implement health check untuk queue connectivity
Configure CORS untuk WebSocket connections
Dependencies Eksternal
7. PostgreSQL Database
Fungsi: Primary database untuk semua services

Langkah Kontainerisasi:

Gunakan official PostgreSQL image (versi 15+)
Create custom initialization script dari init-database.sql
Setup schemas: auth, archive, assessment, public
Configure persistent volume untuk data
Set environment variables untuk credentials
Configure connection pooling
Setup backup strategy
8. Redis Cache
Fungsi: Caching layer untuk Auth dan Archive services

Langkah Kontainerisasi:

Gunakan official Redis image (versi 7+)
Configure persistence (RDB + AOF)
Setup memory limits dan eviction policy
Configure password authentication
Setup persistent volume untuk data
Configure monitoring dan health checks
9. RabbitMQ Message Queue
Fungsi: Message broker untuk async processing

Langkah Kontainerisasi:

Gunakan official RabbitMQ image dengan management plugin
Setup exchanges: atma_exchange, atma_events_exchange
Configure queues: assessment_analysis, analysis_events_*
Setup dead letter queues untuk error handling
Configure persistent volume untuk queue data
Enable management UI untuk monitoring
Setup clustering untuk high availability
Docker Compose Strategy
Development Environment:
Single docker-compose.yml dengan semua services
Shared networks untuk inter-service communication
Volume mounts untuk development (hot reload)
Environment-specific configurations
Production Environment:
Multi-stage builds untuk optimized images
Separate docker-compose files per environment
Health checks dan restart policies
Resource limits dan scaling configurations
Secrets management untuk sensitive data
Load balancing untuk high availability services
Networking:
Create custom bridge networks
Isolate database network dari public access
Configure service discovery via container names
Setup reverse proxy untuk external access
Monitoring & Logging:
Centralized logging dengan structured JSON format
Health check endpoints untuk semua services
Metrics collection untuk performance monitoring
Container resource monitoring
Rencana ini memberikan foundation yang solid untuk containerisasi sistem ATMA backend dengan fokus pada scalability, maintainability, dan production readiness.

