@echo off
echo 🔧 Fixing Docker Build Issues...

REM Navigate to project directory
cd /d "c:\Users\meswe\Desktop\EduServIT\VEGA\AI-MVP"

echo Step 1: Stopping any running containers...
docker-compose down

echo Step 2: Cleaning up Docker...
docker system prune -f
docker volume prune -f

echo Step 3: Fixing frontend dependencies...
cd frontend

REM Remove problematic lock files
if exist package-lock.json del package-lock.json
if exist yarn.lock del yarn.lock
if exist node_modules rmdir /s /q node_modules

echo Step 4: Installing fresh dependencies...
npm install --legacy-peer-deps

echo Step 5: Testing build locally...
npm run build
if %errorlevel% neq 0 (
    echo ❌ Local build failed! Check the errors above.
    pause
    exit /b 1
)
echo ✅ Local build successful!

echo Step 6: Going back to project root...
cd ..

echo Step 7: Building Docker containers...
docker-compose build --no-cache

echo Step 8: Starting containers...
docker-compose up -d

echo Step 9: Waiting for services to start...
timeout /t 45 /nobreak >nul

echo Step 10: Testing services...
echo Testing backend...
curl -f http://localhost:8000/health
if %errorlevel% equ 0 (
    echo ✅ Backend is healthy
) else (
    echo ❌ Backend not responding
)

echo Testing frontend...
curl -f http://localhost
if %errorlevel% equ 0 (
    echo ✅ Frontend is healthy
) else (
    echo ❌ Frontend not responding
)

echo.
echo 🎉 Setup complete! Access your app at:
echo - Frontend: http://localhost
echo - Backend: http://localhost:8000
echo - API Docs: http://localhost:8000/docs
echo.
echo Login with: username=test, password=Testformvp
echo.
pause
