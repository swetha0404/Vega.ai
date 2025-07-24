# Backend Dockerfile - Optimized for Render
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install minimal system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy requirements first for better caching (use lighter requirements for Render)
COPY requirements-render.txt requirements.txt
COPY requirements.txt requirements-full.txt

# Install Python dependencies (use lighter requirements for cloud)
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/agenbotc/uploads
RUN mkdir -p /app/agenbotc/vectorstore
RUN mkdir -p /app/logs

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PYTHONUNBUFFERED=1

# Create a non-root user for security
RUN groupadd -r vegauser && useradd -r -g vegauser vegauser
RUN chown -R vegauser:vegauser /app
USER vegauser

# Expose the port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
