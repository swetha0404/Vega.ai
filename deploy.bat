@echo off
REM Simple deployment script for VEGA.ai on Windows

echo 🚀 Starting VEGA.ai deployment...

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker and try again.
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist "agenbotc\.env" (
    echo ⚠️  Creating .env file from template...
    copy "agenbotc\.env.example" "agenbotc\.env"
    echo 📝 Please edit agenbotc\.env and add your API keys before continuing.
    echo    Required: OPENAI_API_KEY, HEYGEN_API_KEY
    pause
)

REM Check if frontend .env exists
if not exist "frontend\.env" (
    echo ⚠️  Creating frontend .env file...
    copy "frontend\.env.example" "frontend\.env"
)

REM Build and start the application
echo 🔨 Building and starting the application...
docker-compose up --build -d

REM Wait a moment for services to start
echo ⏳ Waiting for services to start...
timeout /t 10 /nobreak >nul

REM Check if services are running
docker-compose ps | findstr "Up" >nul
if %errorlevel% equ 0 (
    echo ✅ VEGA.ai is running!
    echo.
    echo 🌐 Access the application:
    echo    Frontend: http://localhost:3000
    echo    Backend API: http://localhost:8000
    echo    API Docs: http://localhost:8000/docs
    echo.
    echo 📊 To view logs: docker-compose logs -f
    echo 🛑 To stop: docker-compose down
) else (
    echo ❌ Something went wrong. Check the logs:
    docker-compose logs
)

pause
