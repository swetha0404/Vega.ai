# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Copy and make start script executable
COPY start.sh .
RUN chmod +x start.sh

# Create necessary directories
RUN mkdir -p agenbotc/vectorstore

# Expose port
EXPOSE 8000

# Command to run the application - use start script for better logging
CMD ["./start.sh"]
