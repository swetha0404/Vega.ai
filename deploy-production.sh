#!/bin/bash

# Production deployment script
# This script sets up the production environment with SSL and proper security

echo "🏭 Setting up VEGA.ai for production deployment..."

# Check if running as root (required for port 80/443)
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root for production deployment (ports 80/443)"
    exit 1
fi

# Create SSL directory if it doesn't exist
mkdir -p ssl

# Check for SSL certificates
if [ ! -f "ssl/cert.pem" ] || [ ! -f "ssl/key.pem" ]; then
    echo "⚠️  SSL certificates not found in ssl/ directory"
    echo "Please add your SSL certificates as:"
    echo "  ssl/cert.pem - SSL certificate"
    echo "  ssl/key.pem - SSL private key"
    echo ""
    echo "For testing, you can generate self-signed certificates:"
    echo "openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes"
    exit 1
fi

# Check for production environment file
if [ ! -f ".env.production" ]; then
    echo "⚠️  Creating production environment file..."
    cp .env.production.example .env.production
    echo "📝 Please edit .env.production with your production settings"
    exit 1
fi

# Deploy with production configuration
echo "🚀 Deploying with production configuration..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d

echo "✅ Production deployment complete!"
echo "🌐 Your application should be available at https://your-domain.com"