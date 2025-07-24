#!/bin/bash

# Simple deployment script for VEGA.ai

echo "🚀 Starting VEGA.ai deployment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if .env file exists
if [ ! -f "agenbotc/.env" ]; then
    echo "⚠️  Creating .env file from template..."
    cp agenbotc/.env.example agenbotc/.env
    echo "📝 Please edit agenbotc/.env and add your API keys before continuing."
    echo "   Required: OPENAI_API_KEY, HEYGEN_API_KEY"
    read -p "Press Enter after editing the .env file..."
fi

# Check if frontend .env exists
if [ ! -f "frontend/.env" ]; then
    echo "⚠️  Creating frontend .env file..."
    cp frontend/.env.example frontend/.env
fi

# Build and start the application
echo "🔨 Building and starting the application..."
docker-compose up --build -d

# Wait a moment for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo "✅ VEGA.ai is running!"
    echo ""
    echo "🌐 Access the application:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend API: http://localhost:8000"
    echo "   API Docs: http://localhost:8000/docs"
    echo ""
    echo "📊 To view logs: docker-compose logs -f"
    echo "🛑 To stop: docker-compose down"
else
    echo "❌ Something went wrong. Check the logs:"
    docker-compose logs
fi
