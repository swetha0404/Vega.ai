#!/bin/sh

# Frontend entry-point script
echo "Starting Vega AI Frontend..."

# Check if backend is available
echo "Waiting for backend to be ready..."
while ! nc -z backend 8000; do
  sleep 1
done
echo "Backend is ready!"

# Start nginx
echo "Starting nginx..."
exec nginx -g "daemon off;"
