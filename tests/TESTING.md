# 🧪 Vega.ai Testing Guide

This guide provides comprehensive testing instructions for the Vega.ai application, covering both manual testing and automated testing approaches.

## 🎯 Testing Overview

### Testing Levels
1. **Unit Testing** - Individual components and functions
2. **Integration Testing** - API endpoints and database interactions
3. **End-to-End Testing** - Complete user workflows
4. **Manual Testing** - User acceptance and exploratory testing

### Testing Environments
- **Development** - Local development with hot reload
- **Docker Development** - Containerized development environment
- **Production** - Production-like environment testing

## 🚀 Quick Test Setup

### Prerequisites
- Docker and Docker Compose installed
- Git repository cloned
- Environment variables configured

### Start Test Environment
```bash
# Using Docker (Recommended)
docker-compose up -d

# Or using build script
./docker-build.sh dev  # Linux/Mac
docker-build.bat dev   # Windows

# Wait for services to be ready (about 30-60 seconds)
```

## 🔍 Manual Testing Guide

### 1. Health Check Testing

**Backend Health Check:**
```bash
# Test backend is running
curl http://localhost:8000/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-07-16T10:00:00.000Z",
  "service": "vega-backend",
  "version": "1.0.0"
}
```

**Frontend Health Check:**
```bash
# Test frontend is running
curl http://localhost/health

# Expected response:
healthy
```

### 2. Authentication Testing

**Test Login Page:**
1. Navigate to http://localhost
2. Should redirect to login page
3. Try invalid credentials:
   - Username: `invalid`
   - Password: `invalid`
   - Should show error message

4. Try valid credentials:
   - Username: `test`
   - Password: `Testformvp`
   - Should redirect to applications page

**Test Admin Login:**
1. Use admin credentials:
   - Username: `admin`
   - Password: `Testingadminformvp`
   - Should have access to Settings and User Management

### 3. API Endpoint Testing

**Authentication Endpoints:**
```bash
# Test login endpoint
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "Testformvp"}'

# Expected: JWT token response
```

**Chat Endpoints:**
```bash
# Test chat endpoint (requires authentication token)
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"message": "Hello, how are you?"}'

# Expected: AI response
```

**Document Upload:**
```bash
# Test file upload (requires authentication)
curl -X POST http://localhost:8000/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@path/to/test.pdf"

# Expected: Upload success response
```

### 4. Frontend Component Testing

**Navigation Testing:**
1. **Sidebar Navigation:**
   - Click on "Home" - should navigate to /applications
   - Click on "Chat" - should navigate to /chatpage
   - Click on "Services" - should navigate to /services
   - Click on "Settings" - should navigate to /settings (admin only)

2. **Top Bar Testing:**
   - User avatar should display
   - Logout button should work
   - User management button (admin only)

**Chat Interface Testing:**
1. **Chat Page (http://localhost/chatpage):**
   - Type a message and send
   - Should receive AI response
   - Message history should persist
   - Voice input button should work (if enabled)

2. **Chat Suggestions:**
   - Should display suggested prompts
   - Clicking suggestions should populate chat input
   - Suggestions should be relevant to context

**Voice-to-Text Testing:**
1. Click microphone button
2. Allow microphone permissions
3. Speak clearly
4. Should transcribe speech to text
5. Should send message after speech

### 5. User Management Testing (Admin Only)

**User Management Page:**
1. Navigate to http://localhost/users
2. Should display user list
3. Test user creation:
   - Add new user
   - Verify user appears in list
4. Test user editing:
   - Edit existing user
   - Verify changes are saved
5. Test user deletion:
   - Delete user
   - Verify user is removed

### 6. File Upload Testing

**Document Upload:**
1. Navigate to chat or relevant upload section
2. Upload test files:
   - PDF document
   - Word document (.docx)
   - PowerPoint presentation (.pptx)
3. Verify files are processed
4. Test document search/retrieval

**Supported File Types:**
- PDF (.pdf)
- Word Documents (.docx)
- PowerPoint Presentations (.pptx)
- Text files (.txt)

### 7. Responsive Design Testing

**Mobile Testing:**
1. Open browser developer tools
2. Switch to mobile view (320px width)
3. Test all pages:
   - Login page
   - Home page
   - Chat page
   - Settings page
4. Verify responsive behavior

**Tablet Testing:**
1. Test at 768px width
2. Verify layout adapts properly
3. Test touch interactions

**Desktop Testing:**
1. Test at various desktop resolutions
2. Verify layout scales properly
3. Test keyboard navigation

## 🔬 Automated Testing

### Backend Testing

**Setup Backend Tests:**
```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run backend tests
cd AI-MVP
python -m pytest tests/ -v

# Run with coverage
python -m pytest tests/ --cov=agenbotc --cov-report=html
```

**Create Test Files:**

Create `tests/test_auth.py`:
```python
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_login_valid_credentials():
    response = client.post("/login", json={
        "username": "test",
        "password": "Testformvp"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_invalid_credentials():
    response = client.post("/login", json={
        "username": "invalid",
        "password": "invalid"
    })
    assert response.status_code == 401

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
```

Create `tests/test_chat.py`:
```python
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_chat_endpoint():
    # First login to get token
    login_response = client.post("/login", json={
        "username": "test",
        "password": "Testformvp"
    })
    token = login_response.json()["access_token"]
    
    # Test chat endpoint
    response = client.post("/chat", 
        json={"message": "Hello"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert "response" in response.json()
```

### Frontend Testing

**Setup Frontend Tests:**
```bash
cd frontend

# Install test dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event vitest jsdom

# Run tests
npm run test

# Run tests with coverage
npm run test -- --coverage
```

**Create Test Files:**

Create `frontend/src/tests/App.test.jsx`:
```jsx
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';

// Mock auth module
jest.mock('../utils/auth.js', () => ({
  isAuthenticated: () => false,
  isAdmin: () => false,
}));

test('renders login page when not authenticated', () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
  
  expect(screen.getByText(/login/i)).toBeInTheDocument();
});
```

Create `frontend/src/tests/ChatPage.test.jsx`:
```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import ChatPage from '../pages/ChatPage';

test('renders chat input', () => {
  render(<ChatPage />);
  const chatInput = screen.getByPlaceholderText(/type your message/i);
  expect(chatInput).toBeInTheDocument();
});

test('sends message on form submit', () => {
  render(<ChatPage />);
  const chatInput = screen.getByPlaceholderText(/type your message/i);
  const sendButton = screen.getByRole('button', { name: /send/i });
  
  fireEvent.change(chatInput, { target: { value: 'Hello' } });
  fireEvent.click(sendButton);
  
  expect(chatInput.value).toBe('');
});
```

### Docker Testing

**Test Docker Containers:**
```bash
# Test container builds
docker-compose build

# Test container startup
docker-compose up -d

# Test container health
docker-compose ps

# Test container logs
docker-compose logs

# Test container networking
docker exec vega-backend ping vega-frontend
docker exec vega-frontend ping vega-backend
```

## 🔄 Continuous Integration Testing

### GitHub Actions Setup

Create `.github/workflows/test.yml`:
```yaml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        pip install -r requirements.txt
        pip install pytest pytest-asyncio httpx
    
    - name: Run backend tests
      run: |
        cd AI-MVP
        python -m pytest tests/ -v

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: |
        cd AI-MVP/frontend
        npm install
    
    - name: Run frontend tests
      run: |
        cd AI-MVP/frontend
        npm run test

  docker-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Test Docker build
      run: |
        cd AI-MVP
        docker-compose build
        docker-compose up -d
        sleep 30
        curl -f http://localhost:8000/health
        curl -f http://localhost/health
        docker-compose down
```

## 📊 Performance Testing

### Load Testing

**Install Artillery:**
```bash
npm install -g artillery
```

**Create Load Test:**
Create `tests/load-test.yml`:
```yaml
config:
  target: 'http://localhost:8000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Load test"

scenarios:
  - name: "Health check"
    weight: 20
    flow:
      - get:
          url: "/health"

  - name: "Login and chat"
    weight: 80
    flow:
      - post:
          url: "/login"
          json:
            username: "test"
            password: "Testformvp"
          capture:
            - json: "$.access_token"
              as: "token"
      - post:
          url: "/chat"
          headers:
            Authorization: "Bearer {{ token }}"
          json:
            message: "Hello"
```

**Run Load Test:**
```bash
artillery run tests/load-test.yml
```

### Database Performance Testing

**Test Vector Store Performance:**
```bash
# Test document ingestion speed
curl -X POST http://localhost:8000/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@large_document.pdf"

# Test search performance
curl -X POST http://localhost:8000/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"query": "test query"}'
```

## 🔍 Security Testing

### Authentication Testing

**Test JWT Token Security:**
```bash
# Test expired token
curl -X POST http://localhost:8000/chat \
  -H "Authorization: Bearer expired_token" \
  -d '{"message": "test"}'

# Test invalid token
curl -X POST http://localhost:8000/chat \
  -H "Authorization: Bearer invalid_token" \
  -d '{"message": "test"}'
```

**Test Authorization:**
```bash
# Test user accessing admin endpoint
curl -X GET http://localhost:8000/users \
  -H "Authorization: Bearer USER_TOKEN"

# Should return 403 Forbidden
```

### Input Validation Testing

**Test SQL Injection:**
```bash
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin'\'''; DROP TABLE users; --", "password": "test"}'
```

**Test XSS Prevention:**
```bash
curl -X POST http://localhost:8000/chat \
  -H "Authorization: Bearer TOKEN" \
  -d '{"message": "<script>alert(\"XSS\")</script>"}'
```

## 📝 Testing Checklist

### Pre-Deployment Testing

- [ ] Health checks pass for all services
- [ ] Authentication works correctly
- [ ] All API endpoints respond appropriately
- [ ] Frontend navigation works
- [ ] Chat functionality works
- [ ] File upload works
- [ ] User management works (admin)
- [ ] Responsive design works on mobile/tablet
- [ ] Voice-to-text works (if enabled)
- [ ] Error handling works correctly
- [ ] Database connections are stable
- [ ] Docker containers start and stop properly
- [ ] Load testing passes
- [ ] Security tests pass

### Post-Deployment Testing

- [ ] Production health checks pass
- [ ] SSL/HTTPS works correctly
- [ ] Database backups work
- [ ] Monitoring and logging work
- [ ] Performance meets requirements
- [ ] User acceptance testing complete

## 🚨 Troubleshooting Test Issues

### Common Test Failures

1. **Backend tests fail:**
   ```bash
   # Check if services are running
   docker-compose ps
   
   # Check logs
   docker-compose logs backend
   ```

2. **Frontend tests fail:**
   ```bash
   # Clear cache and reinstall
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Docker tests fail:**
   ```bash
   # Clean up Docker
   docker system prune -a
   docker volume prune
   ```

4. **Authentication tests fail:**
   ```bash
   # Check environment variables
   docker exec vega-backend env | grep OPENAI_API_KEY
   ```

### Getting Help

- Check logs: `docker-compose logs -f`
- Test individual components
- Verify environment variables
- Check network connectivity
- Review error messages carefully

## 📈 Test Reporting

### Generate Test Reports

```bash
# Backend coverage report
cd AI-MVP
python -m pytest tests/ --cov=agenbotc --cov-report=html
open htmlcov/index.html

# Frontend coverage report
cd frontend
npm run test -- --coverage
open coverage/lcov-report/index.html
```

### Continuous Monitoring

- Set up health check monitoring
- Configure error tracking (Sentry, Rollbar)
- Set up performance monitoring
- Configure automated testing alerts

This comprehensive testing guide ensures your Vega.ai application is thoroughly tested and ready for production deployment!
