@echo off
setlocal enabledelayedexpansion

REM Test runner script for Vega.ai (Windows)
echo 🧪 Running Vega.ai Test Suite...

if "%1"=="backend" goto run_backend_tests
if "%1"=="frontend" goto run_frontend_tests
if "%1"=="docker" goto run_docker_tests
if "%1"=="quick" goto run_quick_tests
if "%1"=="all" goto run_all_tests
if "%1"=="" goto run_all_tests
goto usage

:run_backend_tests
echo 📊 Running Backend Tests...

REM Check if we're in the right directory
if not exist "requirements.txt" (
    echo ❌ Please run this script from the AI-MVP directory
    exit /b 1
)

REM Install test dependencies if needed
python -c "import pytest" 2>nul || (
    echo Installing test dependencies...
    pip install pytest pytest-asyncio httpx
)

REM Run backend tests
python -m pytest tests/ -v --tb=short
if %errorlevel% equ 0 (
    echo ✅ Backend tests passed!
    exit /b 0
) else (
    echo ❌ Backend tests failed!
    exit /b 1
)

:run_frontend_tests
echo 🎨 Running Frontend Tests...

cd frontend

REM Check if package.json exists
if not exist "package.json" (
    echo ❌ Frontend directory not found or invalid
    exit /b 1
)

REM Install test dependencies if needed
npm list @testing-library/react >nul 2>&1 || (
    echo Installing test dependencies...
    npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event vitest jsdom
)

REM Add test script to package.json if not present
findstr /C:"\"test\"" package.json >nul || (
    echo Adding test script to package.json...
    npm pkg set scripts.test="vitest --config vite.config.test.js"
)

REM Run frontend tests
npm run test -- --run
if %errorlevel% equ 0 (
    echo ✅ Frontend tests passed!
    cd ..
    exit /b 0
) else (
    echo ❌ Frontend tests failed!
    cd ..
    exit /b 1
)

:run_docker_tests
echo 🐳 Running Docker Tests...

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker first.
    exit /b 1
)

REM Test Docker build
echo Testing Docker build...
docker-compose build
if %errorlevel% neq 0 (
    echo ❌ Docker build failed!
    exit /b 1
)

REM Test Docker startup
echo Testing Docker startup...
docker-compose up -d
if %errorlevel% neq 0 (
    echo ❌ Docker startup failed!
    exit /b 1
)

echo Waiting for services to start...
timeout /t 30 /nobreak >nul

REM Test health endpoints
curl -f http://localhost:8000/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Backend health check failed!
    docker-compose down
    exit /b 1
)

curl -f http://localhost/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Frontend health check failed!
    docker-compose down
    exit /b 1
)

REM Clean up
docker-compose down
echo ✅ Docker tests passed!
exit /b 0

:run_quick_tests
echo ⚡ Running Quick Tests...

REM Check if services are running
curl -f http://localhost:8000/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Backend is not responding
    echo Try running: docker-compose up -d
    exit /b 1
)

curl -f http://localhost/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Frontend is not responding
    echo Try running: docker-compose up -d
    exit /b 1
)

echo ✅ Backend is healthy
echo ✅ Frontend is healthy
echo 🎉 Quick tests passed!
exit /b 0

:run_all_tests
echo 🚀 Running All Tests...

set backend_result=0
set frontend_result=0
set docker_result=0

REM Run backend tests
call :run_backend_tests
set backend_result=%errorlevel%

REM Run frontend tests
call :run_frontend_tests
set frontend_result=%errorlevel%

REM Run Docker tests
call :run_docker_tests
set docker_result=%errorlevel%

REM Summary
echo 📊 Test Summary:

if %backend_result% equ 0 (
    echo Backend Tests: PASSED
) else (
    echo Backend Tests: FAILED
)

if %frontend_result% equ 0 (
    echo Frontend Tests: PASSED
) else (
    echo Frontend Tests: FAILED
)

if %docker_result% equ 0 (
    echo Docker Tests: PASSED
) else (
    echo Docker Tests: FAILED
)

REM Overall result
if %backend_result% equ 0 if %frontend_result% equ 0 if %docker_result% equ 0 (
    echo 🎉 All tests passed!
    exit /b 0
) else (
    echo ❌ Some tests failed!
    exit /b 1
)

:usage
echo 🧪 Vega.ai Test Runner
echo.
echo Usage: %0 {backend^|frontend^|docker^|quick^|all}
echo.
echo Commands:
echo   backend   - Run backend tests only
echo   frontend  - Run frontend tests only
echo   docker    - Run Docker tests only
echo   quick     - Run quick health checks
echo   all       - Run all tests (default)
echo.
echo Examples:
echo   %0 backend  # Run backend tests
echo   %0 quick    # Quick health check
echo   %0 all      # Run all tests

:end
endlocal
