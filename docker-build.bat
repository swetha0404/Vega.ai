@echo off
setlocal enabledelayedexpansion

echo 🚀 Starting Vega.ai Application Build...

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker first.
    exit /b 1
)

if "%1"=="dev" goto dev_build
if "%1"=="prod" goto prod_build
if "%1"=="backend" goto build_backend
if "%1"=="frontend" goto build_frontend
if "%1"=="run-backend" goto run_backend
if "%1"=="run-frontend" goto run_frontend
if "%1"=="stop" goto stop_services
if "%1"=="logs" goto show_logs
if "%1"=="cleanup" goto cleanup
goto usage

:dev_build
echo 🔧 Building development environment...
docker-compose down
docker-compose build --no-cache
docker-compose up -d
echo ✅ Development environment is ready!
echo 🌐 Frontend: http://localhost
echo 🔗 Backend API: http://localhost:8000
echo 📊 API Docs: http://localhost:8000/docs
goto end

:prod_build
echo 🏭 Building production environment...
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
echo ✅ Production environment is ready!
echo 🌐 Application: http://localhost
goto end

:build_backend
echo 🔧 Building backend container...
docker build -t vega-backend .
echo ✅ Backend container built successfully!
goto end

:build_frontend
echo 🔧 Building frontend container...
cd frontend
docker build -t vega-frontend .
cd ..
echo ✅ Frontend container built successfully!
goto end

:run_backend
echo 🚀 Running backend container...
docker run -d --name vega-backend -p 8000:8000 --env-file ./agenbotc/.env vega-backend
echo ✅ Backend is running on http://localhost:8000
goto end

:run_frontend
echo 🚀 Running frontend container...
docker run -d --name vega-frontend -p 80:80 vega-frontend
echo ✅ Frontend is running on http://localhost
goto end

:stop_services
echo 🛑 Stopping all services...
docker-compose down
docker-compose -f docker-compose.prod.yml down
docker stop vega-backend vega-frontend 2>nul
docker rm vega-backend vega-frontend 2>nul
echo ✅ All services stopped!
goto end

:show_logs
echo 📝 Showing application logs...
docker-compose logs -f
goto end

:cleanup
echo 🧹 Cleaning up Docker resources...
docker system prune -f
docker volume prune -f
echo ✅ Cleanup completed!
goto end

:usage
echo 🔧 Vega.ai Docker Build Script
echo.
echo Usage: %0 {dev^|prod^|backend^|frontend^|run-backend^|run-frontend^|stop^|logs^|cleanup}
echo.
echo Commands:
echo   dev          - Build and run development environment
echo   prod         - Build and run production environment
echo   backend      - Build backend container only
echo   frontend     - Build frontend container only
echo   run-backend  - Run backend container only
echo   run-frontend - Run frontend container only
echo   stop         - Stop all running services
echo   logs         - Show application logs
echo   cleanup      - Clean up Docker resources
echo.
echo Examples:
echo   %0 dev       # Start development environment
echo   %0 prod      # Start production environment
echo   %0 backend   # Build backend only
echo   %0 stop      # Stop all services

:end
endlocal
