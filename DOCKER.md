# Vega.ai Docker Setup

This guide explains how to containerize and run the Vega.ai application using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose (usually included with Docker Desktop)

## Quick Start

1. **Build and run with Docker Compose (Recommended)**:
   ```bash
   docker-compose up --build
   ```

2. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

## Manual Build and Run

### Backend

```bash
# Build the backend image
docker build -t vega-backend .

# Run the backend container
docker run -p 8000:8000 vega-backend
```

### Frontend

```bash
# Build the frontend image
cd frontend
docker build -t vega-frontend .

# Run the frontend container
cd ..
docker run -p 3000:80 vega-frontend
```

## Build Scripts

For convenience, use the provided build scripts:

**Windows:**
```cmd
build.bat
```

**Linux/Mac:**
```bash
chmod +x build.sh
./build.sh
```

## Configuration

### Environment Variables

The frontend uses the following environment variable:
- `VITE_BACKEND_URL`: Backend API URL (default: http://localhost:8000)

### Backend Configuration

The backend uses:
- `config.yaml` for LDAP and application settings
- `users.json` for user management
- `.env` file in the `agenbotc` folder for API keys

### Volume Mounts

The docker-compose setup mounts:
- `./agenbotc/vectorstore` - Vector database storage
- `./config.yaml` - Application configuration
- `./users.json` - User data

## Architecture

### Backend Container
- Based on Python 3.11-slim
- Runs FastAPI application with Uvicorn server
- Exposes port 8000
- Includes all Python dependencies from requirements.txt

### Frontend Container
- Multi-stage build using Node.js 18-alpine and Nginx Alpine
- Build stage: Compiles React application with Vite
- Production stage: Serves static files with Nginx
- Exposes port 80 (mapped to 3000 on host)

## API Endpoints

The backend provides endpoints like:
- `GET /health` - Health check
- `POST /login` - User authentication  
- `POST /Agentchat` - Chat with AI agent
- And more...

## Troubleshooting

### Common Issues

1. **Port conflicts**: Make sure ports 3000 and 8000 are available
2. **Environment variables**: Ensure the frontend can reach the backend URL
3. **Build failures**: Check Docker logs for specific error messages

### Logs

View container logs:
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend
```

### Rebuild

To rebuild after changes:
```bash
docker-compose down
docker-compose up --build
```

## Development vs Production

This setup is optimized for development and testing. For production:
- Use production-ready environment variables
- Configure proper SSL/TLS
- Set up proper database persistence
- Configure logging and monitoring
- Use secrets management for API keys

# Or in detached mode
docker-compose up -d --build
```

### Option 2: Using Build Scripts
```bash
# Windows
build.bat

# Linux/Mac
chmod +x build.sh
./build.sh
```

### Option 3: Manual Build
```bash
# Build backend
docker build -t vega-backend .

# Build frontend
docker build -t vega-frontend ./frontend

# Run containers
docker run -d -p 8000:8000 --name vega-backend vega-backend
docker run -d -p 3000:80 --name vega-frontend vega-frontend
```

## Services

- **Backend**: Runs on port 8000 (FastAPI + Python)
- **Frontend**: Runs on port 3000 (React + Nginx)

## API Endpoints

The backend exposes endpoints directly without `/api/` prefix:
- `GET /health` - Health check
- `POST /login` - User authentication
- `POST /Agentchat` - Chat with AI agent
- `POST /upload` - File upload
- And more...

## Environment Variables

### Frontend (.env in frontend folder)
```
VITE_BACKEND_URL=http://localhost:8000
```

### Backend (agenbotc/.env)
```
OPENAI_API_KEY=your_openai_api_key
HEYGEN_API_KEY=your_heygen_api_key
HEYGEN_SERVER_URL=https://api.heygen.com
```

## Volumes

The docker-compose setup includes persistent volumes for:
- Vector store data: `./agenbotc/vectorstore`
- Configuration: `./config.yaml`
- User data: `./users.json`

## Troubleshooting

1. **Backend not starting**: Check if `.env` file exists in `agenbotc/` folder with required API keys
2. **Frontend can't connect**: Verify `VITE_BACKEND_URL` in frontend `.env` file
3. **Build taking too long**: The backend includes ML libraries which may take time to install

## Development

For development, you can still use:
```bash
# Backend
uvicorn main:app --reload

# Frontend
cd frontend && npm run dev
```

## Production Notes

- Frontend is served by Nginx with optimized static file serving
- Backend uses Uvicorn ASGI server
- Both containers use multi-stage builds for smaller image sizes
- Security headers are configured in Nginx
