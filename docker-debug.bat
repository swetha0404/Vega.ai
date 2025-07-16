@echo off
setlocal enabledelayedexpansion

echo 🐳 Docker Build Troubleshooting Script
echo.

REM Check if Docker is running
echo Checking Docker status...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)
echo ✅ Docker is running

REM Navigate to project directory
cd /d "c:\Users\meswe\Desktop\EduServIT\VEGA\AI-MVP"

REM Check if required files exist
echo.
echo Checking required files...
if not exist "docker-compose.yml" (
    echo ❌ docker-compose.yml not found
    pause
    exit /b 1
)
echo ✅ docker-compose.yml found

if not exist "frontend\package.json" (
    echo ❌ frontend\package.json not found
    pause
    exit /b 1
)
echo ✅ frontend\package.json found

if not exist "agenbotc\.env" (
    echo ❌ agenbotc\.env not found
    echo Please create agenbotc\.env with your API keys
    pause
    exit /b 1
)
echo ✅ agenbotc\.env found

if not exist "frontend\.env" (
    echo ❌ frontend\.env not found
    echo Please create frontend\.env
    pause
    exit /b 1
)
echo ✅ frontend\.env found

echo.
echo 🔧 Step 1: Testing frontend build locally...
cd frontend

echo Installing dependencies...
npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo ❌ npm install failed
    pause
    exit /b 1
)

echo Testing build...
npm run build
if %errorlevel% neq 0 (
    echo ❌ Frontend build failed locally
    echo This needs to be fixed before Docker will work
    pause
    exit /b 1
)
echo ✅ Frontend builds successfully locally

cd ..

echo.
echo 🔧 Step 2: Testing Docker build...
echo Building frontend Docker image...
docker build -t vega-frontend-test ./frontend
if %errorlevel% neq 0 (
    echo ❌ Docker build failed
    echo Check the error messages above
    pause
    exit /b 1
)
echo ✅ Frontend Docker image built successfully

echo.
echo 🔧 Step 3: Testing full Docker Compose...
echo Starting Docker Compose...
docker-compose up -d
if %errorlevel% neq 0 (
    echo ❌ Docker Compose failed
    echo Check the error messages above
    pause
    exit /b 1
)

echo.
echo ⏳ Waiting for services to start...
timeout /t 30 /nobreak >nul

echo.
echo 🔍 Checking service status...
docker-compose ps

echo.
echo 🔍 Testing health endpoints...
curl -f http://localhost:8000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Backend is healthy
) else (
    echo ❌ Backend health check failed
)

curl -f http://localhost/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Frontend is healthy
) else (
    echo ❌ Frontend health check failed
)

echo.
echo 🎉 Docker setup complete!
echo.
echo Access your application at:
echo - Frontend: http://localhost
echo - Backend: http://localhost:8000
echo - API Docs: http://localhost:8000/docs
echo.
echo To stop services: docker-compose down
echo.
pause
