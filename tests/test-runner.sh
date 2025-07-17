#!/bin/bash

# Test runner script for Vega.ai
echo "🧪 Running Vega.ai Test Suite..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run backend tests
run_backend_tests() {
    echo -e "${YELLOW}📊 Running Backend Tests...${NC}"
    
    # Check if we're in the right directory
    if [ ! -f "requirements.txt" ]; then
        echo -e "${RED}❌ Please run this script from the AI-MVP directory${NC}"
        exit 1
    fi
    
    # Install test dependencies if needed
    if ! python -c "import pytest" 2>/dev/null; then
        echo "Installing test dependencies..."
        pip install pytest pytest-asyncio httpx
    fi
    
    # Run backend tests
    if python -m pytest tests/ -v --tb=short; then
        echo -e "${GREEN}✅ Backend tests passed!${NC}"
        return 0
    else
        echo -e "${RED}❌ Backend tests failed!${NC}"
        return 1
    fi
}

# Function to run frontend tests
run_frontend_tests() {
    echo -e "${YELLOW}🎨 Running Frontend Tests...${NC}"
    
    cd frontend
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ Frontend directory not found or invalid${NC}"
        exit 1
    fi
    
    # Install test dependencies if needed
    if ! npm list @testing-library/react >/dev/null 2>&1; then
        echo "Installing test dependencies..."
        npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event vitest jsdom
    fi
    
    # Add test script to package.json if not present
    if ! grep -q '"test"' package.json; then
        echo "Adding test script to package.json..."
        npm pkg set scripts.test="vitest --config vite.config.test.js"
    fi
    
    # Run frontend tests
    if npm run test -- --run; then
        echo -e "${GREEN}✅ Frontend tests passed!${NC}"
        cd ..
        return 0
    else
        echo -e "${RED}❌ Frontend tests failed!${NC}"
        cd ..
        return 1
    fi
}

# Function to run Docker tests
run_docker_tests() {
    echo -e "${YELLOW}🐳 Running Docker Tests...${NC}"
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
        return 1
    fi
    
    # Test Docker build
    echo "Testing Docker build..."
    if docker-compose build; then
        echo -e "${GREEN}✅ Docker build successful!${NC}"
    else
        echo -e "${RED}❌ Docker build failed!${NC}"
        return 1
    fi
    
    # Test Docker startup
    echo "Testing Docker startup..."
    if docker-compose up -d; then
        echo "Waiting for services to start..."
        sleep 30
        
        # Test health endpoints
        if curl -f http://localhost:8000/health >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Backend health check passed!${NC}"
        else
            echo -e "${RED}❌ Backend health check failed!${NC}"
            docker-compose down
            return 1
        fi
        
        if curl -f http://localhost/health >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Frontend health check passed!${NC}"
        else
            echo -e "${RED}❌ Frontend health check failed!${NC}"
            docker-compose down
            return 1
        fi
        
        # Clean up
        docker-compose down
        echo -e "${GREEN}✅ Docker tests passed!${NC}"
        return 0
    else
        echo -e "${RED}❌ Docker startup failed!${NC}"
        return 1
    fi
}

# Function to run all tests
run_all_tests() {
    echo -e "${YELLOW}🚀 Running All Tests...${NC}"
    
    backend_result=0
    frontend_result=0
    docker_result=0
    
    # Run backend tests
    run_backend_tests
    backend_result=$?
    
    # Run frontend tests
    run_frontend_tests
    frontend_result=$?
    
    # Run Docker tests
    run_docker_tests
    docker_result=$?
    
    # Summary
    echo -e "${YELLOW}📊 Test Summary:${NC}"
    
    if [ $backend_result -eq 0 ]; then
        echo -e "Backend Tests: ${GREEN}PASSED${NC}"
    else
        echo -e "Backend Tests: ${RED}FAILED${NC}"
    fi
    
    if [ $frontend_result -eq 0 ]; then
        echo -e "Frontend Tests: ${GREEN}PASSED${NC}"
    else
        echo -e "Frontend Tests: ${RED}FAILED${NC}"
    fi
    
    if [ $docker_result -eq 0 ]; then
        echo -e "Docker Tests: ${GREEN}PASSED${NC}"
    else
        echo -e "Docker Tests: ${RED}FAILED${NC}"
    fi
    
    # Overall result
    if [ $backend_result -eq 0 ] && [ $frontend_result -eq 0 ] && [ $docker_result -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed!${NC}"
        return 0
    else
        echo -e "${RED}❌ Some tests failed!${NC}"
        return 1
    fi
}

# Function to run quick tests (health checks only)
run_quick_tests() {
    echo -e "${YELLOW}⚡ Running Quick Tests...${NC}"
    
    # Check if services are running
    if curl -f http://localhost:8000/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is healthy${NC}"
    else
        echo -e "${RED}❌ Backend is not responding${NC}"
        echo "Try running: docker-compose up -d"
        return 1
    fi
    
    if curl -f http://localhost/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend is healthy${NC}"
    else
        echo -e "${RED}❌ Frontend is not responding${NC}"
        echo "Try running: docker-compose up -d"
        return 1
    fi
    
    echo -e "${GREEN}🎉 Quick tests passed!${NC}"
    return 0
}

# Main script logic
case "$1" in
    "backend")
        run_backend_tests
        ;;
    "frontend")
        run_frontend_tests
        ;;
    "docker")
        run_docker_tests
        ;;
    "quick")
        run_quick_tests
        ;;
    "all"|"")
        run_all_tests
        ;;
    *)
        echo "🧪 Vega.ai Test Runner"
        echo ""
        echo "Usage: $0 {backend|frontend|docker|quick|all}"
        echo ""
        echo "Commands:"
        echo "  backend   - Run backend tests only"
        echo "  frontend  - Run frontend tests only"
        echo "  docker    - Run Docker tests only"
        echo "  quick     - Run quick health checks"
        echo "  all       - Run all tests (default)"
        echo ""
        echo "Examples:"
        echo "  $0 backend  # Run backend tests"
        echo "  $0 quick    # Quick health check"
        echo "  $0 all      # Run all tests"
        ;;
esac
