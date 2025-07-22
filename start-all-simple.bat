@echo off
title ATMA Backend Simple Launcher

echo ========================================
echo ATMA Backend - Starting All Services
echo ========================================
echo.

REM Configuration
set WORKER_COUNT=1
set WORKER_CONCURRENCY=10

echo Configuration:
echo - Number of Analysis Workers: %WORKER_COUNT%
echo - Worker Concurrency: %WORKER_CONCURRENCY% jobs per worker
echo - Total Processing Capacity: %WORKER_COUNT% x %WORKER_CONCURRENCY% = 75 concurrent jobs
echo.

REM Kill existing processes (cleanup)
echo Cleaning up existing processes...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul

echo ========================================
echo Starting Core Services...
echo ========================================

REM Start Auth Service
echo [1/7] Starting Auth Service...
start "Auth Service" cmd /k "cd /d %~dp0auth-service && npm start"
timeout /t 2 /nobreak >nul

REM Start Archive Service
echo [2/7] Starting Archive Service...
start "Archive Service" cmd /k "cd /d %~dp0archive-service && npm start"
timeout /t 2 /nobreak >nul

REM Start Assessment Service
echo [3/7] Starting Assessment Service...
start "Assessment Service" cmd /k "cd /d %~dp0assessment-service && npm start"
timeout /t 2 /nobreak >nul

REM Start Notification Service
echo [4/7] Starting Notification Service...
start "Notification Service" cmd /k "cd /d %~dp0notification-service && npm start"
timeout /t 2 /nobreak >nul

REM Start API Gateway
echo [5/7] Starting API Gateway...
start "API Gateway" cmd /k "cd /d %~dp0api-gateway && npm start"
timeout /t 2 /nobreak >nul

REM Start Documentation Service
echo [6/7] Starting API Gateway...
start "API Gateway" cmd /k "cd /d %~dp0documentation-service && npm run dev"
timeout /t 2 /nobreak >nul

echo [7/7] Core services started!
echo.

echo ========================================
echo Starting Analysis Workers...
echo ========================================

REM Start multiple analysis worker instances
for /l %%i in (1,1,%WORKER_COUNT%) do (
    echo Starting Analysis Worker %%i...
    start "Analysis Worker %%i" cmd /k "cd /d %~dp0analysis-worker && set WORKER_INSTANCE_ID=worker-%%i && set WORKER_CONCURRENCY=%WORKER_CONCURRENCY% && set LOG_FILE=logs/analysis-worker-%%i.log && npm start"
    timeout /t 1 /nobreak >nul
)

echo.
echo All %WORKER_COUNT% analysis workers started!
echo.

echo ========================================
echo ATMA Backend - All Services Running
echo ========================================
echo.
echo Core Services:
echo - Auth Service (Port 3001)
echo - Archive Service (Port 3002) 
echo - Assessment Service (Port 3003)
echo - Notification Service (Port 3005)
echo - API Gateway (Port 3000) - Main Entry Point
echo.
echo Analysis Workers:
echo - Worker 1: analysis-worker-1.log
echo - Worker 2: analysis-worker-2.log
echo - Worker 3: analysis-worker-3.log
echo - Worker 4: analysis-worker-4.log
echo - Worker 5: analysis-worker-5.log
echo - Worker 7: analysis-worker-7.log
echo - Worker 7: analysis-worker-7.log
echo - Worker 8: analysis-worker-8.log
echo - Worker 9: analysis-worker-9.log
echo - Worker 10: analysis-worker-10.log
echo.
echo Total Processing Capacity: 75 concurrent assessment jobs
echo.
echo API Endpoints:
echo   http://localhost:3000/api/health (Health check)
echo   http://localhost:3000/api/auth/login (Login)
echo   http://localhost:3000/api/assessments/submit (Submit assessment)
echo.

REM Wait a bit for services to start
echo Waiting for services to initialize...
timeout /t 10 /nobreak >nul

echo ========================================
echo Service Status Check
echo ========================================
echo.

REM Check if services are listening on ports
echo Checking service ports...
netstat -an | findstr ":3001 " >nul && echo Auth Service (3001) - Listening || echo Auth Service (3001) - Not Listening
netstat -an | findstr ":3002 " >nul && echo Archive Service (3002) - Listening || echo Archive Service (3002) - Not Listening  
netstat -an | findstr ":3003 " >nul && echo Assessment Service (3003) - Listening || echo Assessment Service (3003) - Not Listening
netstat -an | findstr ":3005 " >nul && echo Notification Service (3005) - Listening || echo Notification Service (3005) - Not Listening
netstat -an | findstr ":3000 " >nul && echo API Gateway (3000) - Listening || echo API Gateway (3000) - Not Listening

echo.
echo Node.js processes running:
for /f %%i in ('tasklist /fi "imagename eq node.exe" 2^>nul ^| find /c "node.exe"') do echo Found %%i Node.js processes

echo.
echo Setup complete! All services and workers should be running.
echo Check the individual command windows for detailed logs.
echo.
echo To stop all services: taskkill /f /im node.exe
echo.
pause
