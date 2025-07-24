#!/bin/bash
# Start script for Render deployment

echo "🚀 Starting VEGA.ai Backend on Render..."
echo "Port: ${PORT:-8000}"
echo "Environment: Production"

# Start the FastAPI application
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1
