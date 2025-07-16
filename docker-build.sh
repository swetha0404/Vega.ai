#!/bin/bash

# Build and run the complete Vega.ai application
echo "🚀 Starting Vega.ai Application Build..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Function to build and run development environment
dev_build() {
    echo "🔧 Building development environment..."
    
    # Build and start services
    docker-compose down
    docker-compose build --no-cache
    docker-compose up -d
    
    echo "✅ Development environment is ready!"
    echo "🌐 Frontend: http://localhost"
    echo "🔗 Backend API: http://localhost:8000"
    echo "📊 API Docs: http://localhost:8000/docs"
}

# Function to build and run production environment
prod_build() {
    echo "🏭 Building production environment..."
    
    # Build and start services
    docker-compose -f docker-compose.prod.yml down
    docker-compose -f docker-compose.prod.yml build --no-cache
    docker-compose -f docker-compose.prod.yml up -d
    
    echo "✅ Production environment is ready!"
    echo "🌐 Application: http://localhost"
}

# Function to build individual services
build_backend() {
    echo "🔧 Building backend container..."
    docker build -t vega-backend .
    echo "✅ Backend container built successfully!"
}

build_frontend() {
    echo "🔧 Building frontend container..."
    cd frontend
    docker build -t vega-frontend .
    cd ..
    echo "✅ Frontend container built successfully!"
}

# Function to run individual services
run_backend() {
    echo "🚀 Running backend container..."
    docker run -d --name vega-backend -p 8000:8000 --env-file ./agenbotc/.env vega-backend
    echo "✅ Backend is running on http://localhost:8000"
}

run_frontend() {
    echo "🚀 Running frontend container..."
    docker run -d --name vega-frontend -p 80:80 vega-frontend
    echo "✅ Frontend is running on http://localhost"
}

# Function to stop all services
stop_services() {
    echo "🛑 Stopping all services..."
    docker-compose down
    docker-compose -f docker-compose.prod.yml down
    docker stop vega-backend vega-frontend 2>/dev/null || true
    docker rm vega-backend vega-frontend 2>/dev/null || true
    echo "✅ All services stopped!"
}

# Function to show logs
show_logs() {
    echo "📝 Showing application logs..."
    docker-compose logs -f
}

# Function to clean up
cleanup() {
    echo "🧹 Cleaning up Docker resources..."
    docker system prune -f
    docker volume prune -f
    echo "✅ Cleanup completed!"
}

# Main script logic
case "$1" in
    "dev")
        dev_build
        ;;
    "prod")
        prod_build
        ;;
    "backend")
        build_backend
        ;;
    "frontend")
        build_frontend
        ;;
    "run-backend")
        run_backend
        ;;
    "run-frontend")
        run_frontend
        ;;
    "stop")
        stop_services
        ;;
    "logs")
        show_logs
        ;;
    "cleanup")
        cleanup
        ;;
    *)
        echo "🔧 Vega.ai Docker Build Script"
        echo ""
        echo "Usage: $0 {dev|prod|backend|frontend|run-backend|run-frontend|stop|logs|cleanup}"
        echo ""
        echo "Commands:"
        echo "  dev          - Build and run development environment"
        echo "  prod         - Build and run production environment"
        echo "  backend      - Build backend container only"
        echo "  frontend     - Build frontend container only"
        echo "  run-backend  - Run backend container only"
        echo "  run-frontend - Run frontend container only"
        echo "  stop         - Stop all running services"
        echo "  logs         - Show application logs"
        echo "  cleanup      - Clean up Docker resources"
        echo ""
        echo "Examples:"
        echo "  $0 dev       # Start development environment"
        echo "  $0 prod      # Start production environment"
        echo "  $0 backend   # Build backend only"
        echo "  $0 stop      # Stop all services"
        ;;
esac
