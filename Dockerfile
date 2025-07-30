FROM python:3.11-slim

WORKDIR /app

# Install build dependencies for potential package compilations
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt || \
    (pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt)

# Copy application code
COPY . .

# Create necessary directories that might be referenced
RUN mkdir -p vectorstore

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Expose the port the app runs on
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
