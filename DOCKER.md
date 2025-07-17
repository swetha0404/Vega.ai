# 🐳 Vega.ai Docker Deployment Guide

This guide explains how to containerize and deploy the Vega.ai application using Docker.

## 📋 Prerequisites

- **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
- **Docker Compose** (included with Docker Desktop)
- **Git** (for cloning the repository)

## 🏗️ Container Architecture

The Vega.ai application uses a multi-container architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Frontend    │    │     Backend     │    │     Database    │
│   (React/Vite)  │    │   (FastAPI)     │    │   (PostgreSQL)  │
│     Port: 80    │    │    Port: 8000   │    │    Port: 5432   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │      Redis      │
                    │   (Caching)     │
                    │   Port: 6379    │
                    └─────────────────┘
```

## 🚀 Quick Start

### 1. Development Environment

```bash
# Clone the repository
git clone https://github.com/swetha0404/Vega.ai.git
cd Vega.ai/AI-MVP

# Start development environment
docker-compose up -d

# Or use the build script
./docker-build.sh dev  # Linux/Mac
docker-build.bat dev   # Windows
```

**Access Points:**
- Frontend: http://localhost
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### 2. Production Environment

```bash
# Start production environment
docker-compose -f docker-compose.prod.yml up -d

# Or use the build script
./docker-build.sh prod  # Linux/Mac
docker-build.bat prod   # Windows
```

## 📁 Project Structure

```
AI-MVP/
├── docker/                     # Docker configuration files
│   ├── docker-compose.prod.yml # Production compose
│   ├── docker-compose.backend-only.yml
│   ├── docker-compose.frontend-only.yml
│   ├── docker-debug.bat       # Docker debugging utilities
│   └── fix-docker.bat         # Docker fix utilities
├── tests/                      # All testing files
│   ├── conftest.py            # Backend test fixtures
│   ├── test_*.py              # Backend tests
│   ├── test-runner.bat        # Test runner script
│   ├── test-runner.sh         # Test runner script (Linux)
│   └── TESTING.md             # Testing documentation
├── frontend/                   # Frontend source code
│   ├── Dockerfile             # Frontend container
│   └── src/tests/             # Frontend tests
├── agenbotc/                   # Backend source code
├── Dockerfile                  # Backend container
├── docker-compose.yml          # Main compose (dev)
├── docker-build.bat           # Build script
├── docker-build.sh            # Build script (Linux)
└── test-runner.bat             # Test runner (delegates to tests/)
```

## 📁 Container Structure

### Backend Container (`vega-backend`)
- **Base Image:** `python:3.11-slim`
- **Port:** 8000
- **Environment:** FastAPI with uvicorn
- **Volumes:** 
  - `./agenbotc/uploads` → `/app/agenbotc/uploads`
  - `./agenbotc/vectorstore` → `/app/agenbotc/vectorstore`
  - `./logs` → `/app/logs`

### Frontend Container (`vega-frontend`)
- **Base Image:** `nginx:alpine`
- **Port:** 80
- **Build:** Multi-stage build with Node.js
- **Features:** Gzip compression, caching, health checks

### Database Container (`vega-postgres`)
- **Base Image:** `postgres:15-alpine`
- **Port:** 5432
- **Volume:** `postgres_data:/var/lib/postgresql/data`

### Cache Container (`vega-redis`)
- **Base Image:** `redis:7-alpine`
- **Port:** 6379
- **Volume:** `redis_data:/data`

## 🔧 Environment Configuration

### Backend Environment (`.env` in `agenbotc/` folder)

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
HEYGEN_API_KEY=your_heygen_api_key_here
HEYGEN_SERVER_URL=https://api.heygen.com

# Vector Store Configuration
CHROMA_PERSIST_DIRECTORY=./vectorstore

# Authentication
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database Configuration
DATABASE_URL=postgresql://vega:vega_password@postgres:5432/vega
REDIS_URL=redis://redis:6379

# Application Settings
DEBUG=False
LOG_LEVEL=INFO
ENVIRONMENT=production

# File Upload Settings
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_EXTENSIONS=pdf,docx,pptx,txt
```

### Frontend Environment (`.env` in `frontend/` folder)

```env
# Backend API Configuration
VITE_API_BASE_URL=http://localhost:8000
VITE_API_TIMEOUT=30000

# Application Settings
VITE_APP_NAME=Vega.ai
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_VOICE_INPUT=true
VITE_ENABLE_DARK_MODE=true
VITE_ENABLE_ANALYTICS=false
```

## 🛠️ Build Commands

### Individual Container Builds

```bash
# Build backend only
docker build -t vega-backend .

# Build frontend only
cd frontend
docker build -t vega-frontend .

# Run individual containers
docker run -d --name vega-backend -p 8000:8000 --env-file ./agenbotc/.env vega-backend
docker run -d --name vega-frontend -p 80:80 vega-frontend
```

### Using Build Scripts

```bash
# Linux/Mac
chmod +x docker-build.sh

./docker-build.sh dev          # Development environment
./docker-build.sh prod         # Production environment
./docker-build.sh backend      # Build backend only
./docker-build.sh frontend     # Build frontend only
./docker-build.sh stop         # Stop all services
./docker-build.sh logs         # View logs
./docker-build.sh cleanup      # Clean up resources
```

```batch
# Windows
docker-build.bat dev          # Development environment
docker-build.bat prod         # Production environment
docker-build.bat backend      # Build backend only
docker-build.bat frontend     # Build frontend only
docker-build.bat stop         # Stop all services
docker-build.bat logs         # View logs
docker-build.bat cleanup      # Clean up resources
```

## 🔍 Monitoring and Debugging

### View Container Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Individual container
docker logs vega-backend
docker logs vega-frontend
```

### Health Checks

All containers include health checks:

```bash
# Check container health
docker ps

# Test health endpoints
curl http://localhost:8000/health  # Backend
curl http://localhost/health       # Frontend
```

### Container Shell Access

```bash
# Access backend container
docker exec -it vega-backend bash

# Access frontend container
docker exec -it vega-frontend sh

# Access database container
docker exec -it vega-postgres psql -U vega -d vega
```

## 🌐 Production Deployment

### Cloud Deployment Options

1. **AWS ECS/Fargate**
   - Upload images to ECR
   - Create ECS task definitions
   - Deploy with Application Load Balancer

2. **Google Cloud Run**
   - Build images in Cloud Build
   - Deploy containers to Cloud Run
   - Use Cloud SQL for PostgreSQL

3. **Azure Container Instances**
   - Push to Azure Container Registry
   - Deploy with Container Groups
   - Use Azure Database for PostgreSQL

4. **DigitalOcean Apps**
   - Connect GitHub repository
   - Configure app spec with containers
   - Automatic builds and deployments

### Docker Swarm Deployment

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.prod.yml vega

# Scale services
docker service scale vega_backend=3
docker service scale vega_frontend=2
```

### Kubernetes Deployment

```yaml
# Example Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vega-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: vega-backend
  template:
    metadata:
      labels:
        app: vega-backend
    spec:
      containers:
      - name: backend
        image: vega-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          value: "postgresql://vega:password@postgres:5432/vega"
```

## 🔐 Security Considerations

### Production Security

1. **Environment Variables**
   - Use Docker secrets for sensitive data
   - Never commit `.env` files to version control
   - Use separate environments for dev/staging/prod

2. **Network Security**
   - Use custom Docker networks
   - Implement proper firewall rules
   - Enable HTTPS with SSL certificates

3. **Container Security**
   - Use non-root users in containers
   - Scan images for vulnerabilities
   - Keep base images updated

4. **Database Security**
   - Use strong passwords
   - Enable SSL connections
   - Implement proper backup strategies

### SSL/HTTPS Setup

```nginx
# nginx SSL configuration
server {
    listen 443 ssl;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔄 Backup and Recovery

### Database Backup

```bash
# Create backup
docker exec vega-postgres pg_dump -U vega vega > backup.sql

# Restore backup
docker exec -i vega-postgres psql -U vega -d vega < backup.sql
```

### Volume Backup

```bash
# Backup volumes
docker run --rm -v vega_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
docker run --rm -v vega_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis_backup.tar.gz /data
```

## 🚨 Troubleshooting

### Common Issues

1. **Container won't start**
   ```bash
   # Check logs
   docker logs container_name
   
   # Check system resources
   docker system df
   docker system prune
   ```

2. **Database connection issues**
   ```bash
   # Check network connectivity
   docker exec backend ping postgres
   
   # Check database status
   docker exec postgres pg_isready -U vega
   ```

3. **Port conflicts**
   ```bash
   # Check what's using the port
   netstat -tulpn | grep :8000
   
   # Use different ports
   docker run -p 8080:8000 vega-backend
   ```

4. **Permission issues**
   ```bash
   # Fix volume permissions
   sudo chown -R $(id -u):$(id -g) ./agenbotc/uploads
   ```

## 📊 Performance Optimization

### Container Optimization

1. **Multi-stage builds** (already implemented)
2. **Layer caching** optimization
3. **Resource limits** in docker-compose

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

### Production Scaling

```bash
# Scale services
docker-compose up -d --scale backend=3 --scale frontend=2

# Or with Docker Swarm
docker service scale vega_backend=5
```

## 🤝 Contributing

1. Test changes in development environment
2. Build and test containers locally
3. Update documentation if needed
4. Submit pull request with container tests

## 📞 Support

For Docker-related issues:
- Check the troubleshooting section
- Review container logs
- Verify environment variables
- Test with minimal configurations

For application issues:
- Check main README.md
- Review API documentation
- Test individual components

## 🎯 Individual Container Deployment

Sometimes you may want to run only the frontend or backend container independently for testing, development, or sharing purposes.

### Frontend Only Deployment

**Using dedicated compose file:**
```bash
# Start frontend only
docker-compose -f docker/docker-compose.frontend-only.yml up -d

# Stop frontend
docker-compose -f docker/docker-compose.frontend-only.yml down

# Access: http://localhost
```

**Using Docker directly:**
```bash
# Build frontend container
docker build -t vega-frontend ./frontend

# Run frontend container standalone
docker run -d -p 80:80 --name vega-frontend-standalone vega-frontend
```

### Backend Only Deployment

**Using dedicated compose file:**
```bash
# Start backend only (with Redis dependency)
docker-compose -f docker/docker-compose.backend-only.yml up -d

# Stop backend
docker-compose -f docker/docker-compose.backend-only.yml down

# Access: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

**Using Docker directly:**
```bash
# Build backend container
docker build -t vega-backend .

# Run backend container standalone
docker run -d -p 8000:8000 --name vega-backend-standalone --env-file ./agenbotc/.env vega-backend
```

### Use Cases for Individual Containers

1. **Frontend Development:** Test UI changes without backend dependencies
2. **Backend Development:** Develop API features independently
3. **Microservice Testing:** Test individual service behavior
4. **Performance Testing:** Isolate and benchmark specific services
5. **Sharing/Demo:** Share specific functionality with team members

### Testing Individual Containers

```bash
# Test frontend only
docker-compose -f docker/docker-compose.frontend-only.yml up -d
./test-runner.bat frontend

# Test backend only
docker-compose -f docker/docker-compose.backend-only.yml up -d
./test-runner.bat backend

# Using build script (recommended)
./docker-build.bat frontend-only
./docker-build.bat backend-only
```

### Sharing Containers

**Export as Docker images:**
```bash
# Save frontend image
docker save vega-frontend > vega-frontend.tar

# Save backend image
docker save vega-backend > vega-backend.tar
```

**Import on another machine:**
```bash
# Load frontend image
docker load < vega-frontend.tar

# Load backend image
docker load < vega-backend.tar
```

**Push to Docker Hub:**
```bash
# Tag and push frontend
docker tag vega-frontend yourusername/vega-frontend:latest
docker push yourusername/vega-frontend:latest

# Tag and push backend
docker tag vega-backend yourusername/vega-backend:latest
docker push yourusername/vega-backend:latest
```
