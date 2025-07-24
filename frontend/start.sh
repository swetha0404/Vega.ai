#!/bin/bash
# Frontend start script for Render

echo "🌐 Starting VEGA.ai Frontend on Render..."
echo "Port: ${PORT:-3000}"

# Serve the built React application
exec serve -s dist -l ${PORT:-3000}
