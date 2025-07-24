#!/bin/bash
# Start script for Render deployment

echo "🚀 Starting VEGA.ai Backend on Render..."
echo "Port: ${PORT:-8000}"
echo "Environment: Production"

# Ensure port is set
if [ -z "$PORT" ]; then
    export PORT=8000
fi

echo "Binding to port: $PORT"

# Start the FastAPI application with proper port binding
exec uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1 --access-log
