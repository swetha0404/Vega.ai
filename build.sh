#!/bin/bash
echo "Building Vega AI Containers..."

echo ""
echo "Building Backend..."
docker build -t vega-backend .

echo ""
echo "Building Frontend..."
docker build -t vega-frontend ./frontend

echo ""
echo "Build complete! You can now run:"
echo "  docker-compose up"
echo ""
echo "Or run containers individually:"
echo "  docker run -p 8000:8000 vega-backend"
echo "  docker run -p 3000:80 vega-frontend"
