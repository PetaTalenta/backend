@echo off
title ATMA Backend - Docker Compose Startup

echo ==========================================
echo ATMA Backend - Docker Compose Startup
echo ==========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker first.
    pause
    exit /b 1
)

REM Check if docker-compose is available
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ docker-compose is not installed. Please install docker-compose first.
    pause
    exit /b 1
)

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file from .env.docker template...
    copy .env.docker .env >nul
    echo ⚠️  Please edit .env file and update the GOOGLE_AI_API_KEY and other secrets!
    echo.
)

REM Build and start services
echo 🔨 Building and starting ATMA services...
docker-compose up --build -d

echo.
echo ⏳ Waiting for services to be ready...
timeout /t 10 /nobreak >nul

REM Check service health
echo 🔍 Checking service health...
echo.

REM Check PostgreSQL
docker-compose exec -T postgres pg_isready -U atma_user -d atma_db >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ PostgreSQL is ready
) else (
    echo ❌ PostgreSQL is not ready
)

REM Check RabbitMQ
docker-compose exec -T rabbitmq rabbitmq-diagnostics ping >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ RabbitMQ is ready
) else (
    echo ❌ RabbitMQ is not ready
)

echo.
echo 🚀 ATMA Backend services are starting up!
echo.
echo Services:
echo - API Gateway: http://localhost:3000
echo - Auth Service: http://localhost:3001
echo - Archive Service: http://localhost:3002
echo - Assessment Service: http://localhost:3003
echo - Notification Service: http://localhost:3005
echo - RabbitMQ Management: http://localhost:15672 (user: atma_user, pass: atma_password)
echo.
echo To view logs: docker-compose logs -f [service-name]
echo To stop services: docker-compose down
echo To stop and remove volumes: docker-compose down -v
echo.
pause
