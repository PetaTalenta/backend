@echo off
echo.
echo ========================================
echo    ATMA Backend Testing Suite
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: package.json not found
    echo Please run this script from the testing directory
    pause
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Parse command line arguments
set TEST_TYPE=%1
if "%TEST_TYPE%"=="" set TEST_TYPE=all

echo Running %TEST_TYPE% tests...
echo.

REM Run the tests
node run-tests.js %TEST_TYPE%

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo    Tests completed successfully!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo    Tests failed!
    echo ========================================
)

echo.
pause
