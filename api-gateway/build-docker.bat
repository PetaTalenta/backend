@echo off
setlocal enabledelayedexpansion

REM ATMA API Gateway Docker Build Script for Windows
REM This script builds and optionally runs the API Gateway Docker container

REM Default values
set IMAGE_NAME=atma-api-gateway
set IMAGE_TAG=latest
set BUILD_ONLY=false
set RUN_CONTAINER=false
set DEVELOPMENT=false

REM Parse command line arguments
:parse_args
if "%~1"=="" goto end_parse
if "%~1"=="-t" (
    set IMAGE_TAG=%~2
    shift
    shift
    goto parse_args
)
if "%~1"=="--tag" (
    set IMAGE_TAG=%~2
    shift
    shift
    goto parse_args
)
if "%~1"=="-n" (
    set IMAGE_NAME=%~2
    shift
    shift
    goto parse_args
)
if "%~1"=="--name" (
    set IMAGE_NAME=%~2
    shift
    shift
    goto parse_args
)
if "%~1"=="-b" (
    set BUILD_ONLY=true
    shift
    goto parse_args
)
if "%~1"=="--build-only" (
    set BUILD_ONLY=true
    shift
    goto parse_args
)
if "%~1"=="-r" (
    set RUN_CONTAINER=true
    shift
    goto parse_args
)
if "%~1"=="--run" (
    set RUN_CONTAINER=true
    shift
    goto parse_args
)
if "%~1"=="-d" (
    set DEVELOPMENT=true
    shift
    goto parse_args
)
if "%~1"=="--dev" (
    set DEVELOPMENT=true
    shift
    goto parse_args
)
if "%~1"=="-h" goto show_usage
if "%~1"=="--help" goto show_usage
echo [ERROR] Unknown option: %~1
goto show_usage

:end_parse

REM Check if Docker is installed and running
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed or not in PATH
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker daemon is not running
    exit /b 1
)

REM Check if we're in the correct directory
if not exist "Dockerfile" (
    echo [ERROR] Dockerfile not found. Please run this script from the api-gateway directory.
    exit /b 1
)

if not exist "package.json" (
    echo [ERROR] package.json not found. Please run this script from the api-gateway directory.
    exit /b 1
)

REM Build the Docker image
echo [INFO] Building Docker image: %IMAGE_NAME%:%IMAGE_TAG%

REM Build arguments
set BUILD_ARGS=
if "%DEVELOPMENT%"=="true" (
    set BUILD_ARGS=--build-arg NODE_ENV=development
)

REM Execute build
docker build %BUILD_ARGS% -t "%IMAGE_NAME%:%IMAGE_TAG%" .
if errorlevel 1 (
    echo [ERROR] Failed to build Docker image
    exit /b 1
)

echo [SUCCESS] Docker image built successfully: %IMAGE_NAME%:%IMAGE_TAG%

REM Show image size
for /f "tokens=*" %%i in ('docker images "%IMAGE_NAME%:%IMAGE_TAG%" --format "{{.Size}}"') do set IMAGE_SIZE=%%i
echo [INFO] Image size: %IMAGE_SIZE%

REM If build-only flag is set, exit here
if "%BUILD_ONLY%"=="true" (
    echo [SUCCESS] Build completed. Use 'docker run' or 'docker-compose up' to run the container.
    exit /b 0
)

REM Run the container if requested
if "%RUN_CONTAINER%"=="true" (
    echo [INFO] Starting container...
    
    REM Stop existing container if running
    for /f %%i in ('docker ps -q -f name=atma-api-gateway 2^>nul') do (
        echo [WARNING] Stopping existing container...
        docker stop atma-api-gateway >nul 2>&1
        docker rm atma-api-gateway >nul 2>&1
    )
    
    REM Create network if it doesn't exist
    docker network ls | findstr atma-network >nul 2>&1
    if errorlevel 1 (
        echo [INFO] Creating Docker network: atma-network
        docker network create atma-network
    )
    
    REM Run container based on mode
    if "%DEVELOPMENT%"=="true" (
        echo [INFO] Running in development mode with docker-compose...
        docker-compose --version >nul 2>&1
        if errorlevel 1 (
            echo [ERROR] docker-compose not found. Please install docker-compose or use Docker directly.
            exit /b 1
        )
        docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
    ) else (
        echo [INFO] Running in production mode...
        docker run -d --name atma-api-gateway --network atma-network -p 3000:3000 -e NODE_ENV=production -e PORT=3000 -v "%cd%/logs:/app/logs" "%IMAGE_NAME%:%IMAGE_TAG%"
    )
    
    REM Wait for container to be ready
    echo [INFO] Waiting for container to be ready...
    timeout /t 5 /nobreak >nul
    
    REM Check if container is running
    for /f %%i in ('docker ps -q -f name=atma-api-gateway 2^>nul') do set CONTAINER_RUNNING=%%i
    if defined CONTAINER_RUNNING (
        echo [SUCCESS] Container is running!
        echo [INFO] Container logs:
        docker logs atma-api-gateway --tail 10
        
        REM Test health endpoint
        echo [INFO] Testing health endpoint...
        timeout /t 2 /nobreak >nul
        curl -f http://localhost:3000/health >nul 2>&1
        if not errorlevel 1 (
            echo [SUCCESS] Health check passed! API Gateway is ready.
            echo [INFO] Access the API Gateway at: http://localhost:3000
            echo [INFO] Health check: http://localhost:3000/health
            echo [INFO] Detailed health: http://localhost:3000/health/detailed
        ) else (
            echo [WARNING] Health check failed. Container may still be starting up.
            echo [INFO] Check logs with: docker logs atma-api-gateway
        )
    ) else (
        echo [ERROR] Container failed to start
        echo [INFO] Check logs with: docker logs atma-api-gateway
        exit /b 1
    )
)

echo [SUCCESS] Script completed successfully!
exit /b 0

:show_usage
echo Usage: %0 [OPTIONS]
echo.
echo Options:
echo   -t, --tag TAG        Set image tag (default: latest)
echo   -n, --name NAME      Set image name (default: atma-api-gateway)
echo   -b, --build-only     Build image only, don't run
echo   -r, --run            Build and run container
echo   -d, --dev            Run in development mode
echo   -h, --help           Show this help message
echo.
echo Examples:
echo   %0 --build-only                    # Build image only
echo   %0 --run                          # Build and run container
echo   %0 --run --dev                    # Build and run in development mode
echo   %0 --tag v1.0.0 --run             # Build with specific tag and run
exit /b 0
