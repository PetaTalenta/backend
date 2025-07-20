
# ATMA Backend - AI-Driven Talent Mapping Assessment

Ekosistem backend microservice untuk platform penilaian dan pemetaan bakat berbasis AI.

## Arsitektur Microservice

```
atma-backend/
├── api-gateway/          # Single entry point untuk semua request
├── auth-service/         # Manajemen autentikasi dan user
├── archive-service/      # Penyimpanan hasil analisis
├── assessment-service/   # Penerimaan data assessment
├── analysis-worker/      # Worker untuk analisis AI
├── notification-service/ # Real-time notifications
├── shared/              # Konfigurasi dan utilities bersama
└── README.md           # Dokumentasi utama
```

## Services Overview

### 1. API Gateway (Port: 3000)
- **Fungsi**: Single entry point, routing, rate limiting, logging
- **Dependencies**: Express.js, express-http-proxy, express-rate-limit

### 2. Auth Service (Port: 3001)
- **Fungsi**: Registrasi, login, JWT management
- **Database**: PostgreSQL (auth.users table)
- **Dependencies**: Express.js, Sequelize, bcrypt, JWT

### 3. Archive Service (Port: 3002)
- **Fungsi**: CRUD untuk hasil analisis persona
- **Database**: PostgreSQL (archive.analysis_results table)
- **Dependencies**: Express.js, Sequelize

### 4. Assessment Service (Port: 3003)
- **Fungsi**: Menerima data assessment, publish ke queue
- **Message Queue**: RabbitMQ
- **Dependencies**: Express.js, amqplib

### 5. Analysis Worker (No HTTP port)
- **Fungsi**: Consume queue, analisis AI, simpan hasil
- **AI Service**: Google Generative AI
- **Dependencies**: amqplib, @google/genai, axios

### 6. Notification Service (Port: 3005)
- **Fungsi**: WebSocket notifications
- **Dependencies**: Express.js, Socket.IO, amqplib

## Quick Start

### Prerequisites
- Node.js 18+ dan npm 8+
- PostgreSQL 14+
- RabbitMQ 3.11+
- Google AI API Key (dari Google AI Studio)

### Setup Steps

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd atma-backend
   ```

2. **Setup Environment**
   ```bash
   cp .env.example .env
   # Edit .env dan tambahkan GOOGLE_AI_API_KEY
   ```

3. **Start Infrastructure Services**
   ```bash
   # Start PostgreSQL and RabbitMQ locally
   # Make sure PostgreSQL and RabbitMQ are running on your system
   ```

4. **Install Dependencies**
   ```bash
   npm run install:all
   ```

5. **Initialize Database**
   ```bash
   # Database akan otomatis diinisialisasi dengan script init-databases.sql
   # Atau jalankan manual: npm run migrate
   ```

6. **Start All Services**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

7. **Verify Services**
   ```bash
   npm run health
   # Atau akses: http://localhost:3000/health
   ```

## Environment Variables

Setiap service memerlukan environment variables yang didefinisikan dalam file `.env` masing-masing.

## API Documentation

Dokumentasi lengkap API tersedia di direktori masing-masing service:
- [API Gateway](./api-gateway/README.md)
- [Auth Service](./auth-service/README.md)
- [Archive Service](./archive-service/README.md)
- [Assessment Service](./assessment-service/README.md)
- [Analysis Worker](./analysis-worker/README.md)
- [Notification Service](./notification-service/README.md)

## Development

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- RabbitMQ 3.11+

### Testing
```bash
npm run test        # Run all tests
npm run test:unit   # Unit tests only
npm run test:integration # Integration tests only
```

### Monitoring
- Health checks tersedia di `/health` untuk setiap service
- Logs terpusat menggunakan Winston
- Metrics dapat diintegrasikan dengan Prometheus

## Production Deployment

Deploy each service individually on your production environment:

1. Setup PostgreSQL and RabbitMQ
2. Configure environment variables for each service
3. Start services in order: auth-service, archive-service, assessment-service, analysis-worker, api-gateway

## Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

MIT License
