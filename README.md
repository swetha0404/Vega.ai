# Vega.ai - AI-Powered Educational Assistant

Vega.ai is an intelligent educational assistant that combines advanced AI capabilities with modern web technologies to provide personalized learning experiences. This project features a FastAPI backend with LLM integration, vector storage for document retrieval, and a React frontend with a modern, responsive design.

## 🚀 Features

### Backend (AI Agent)
- **Intelligent Chatbot**: Advanced conversational AI powered by LLM agents
- **Document Processing**: Automated ingestion and processing of educational materials (PDF, DOCX, PPTX)
- **Vector Storage**: ChromaDB integration for semantic search and document retrieval
- **Authentication System**: Multi-layer authentication with LDAP and local user support
- **Voice Integration**: Voice-to-text capabilities for accessibility
- **Monitoring**: Tomcat server monitoring and health checks
- **RESTful API**: Comprehensive API endpoints for all functionalities

### Frontend (React + Vite)
- **Modern UI**: Clean, responsive design with custom fonts and animations
- **Real-time Chat**: Interactive chat interface with suggestion system
- **Voice Input**: Voice-to-text integration for hands-free interaction
- **User Management**: Complete user authentication and profile management
- **Multi-page Application**: Home, Chat, Services, and Settings pages
- **Responsive Design**: Mobile-first approach with cross-device compatibility

## � Quick Start with Docker (Recommended)

The easiest way to run Vega.ai is using Docker:

### Prerequisites
- Docker and Docker Compose installed on your system
- OpenAI API key
- HeyGen API key (optional, for avatar features)

### Steps
1. **Clone the repository**:
   ```bash
   git clone https://github.com/swetha0404/Vega.ai.git
   cd Vega.ai/AI-MVP
   ```

2. **Run the deployment script**:
   ```bash
   # Windows
   deploy.bat
   
   # Mac/Linux
   chmod +x deploy.sh
   ./deploy.sh
   ```

3. **Configure API keys**:
   - Edit `agenbotc/.env` and add your API keys
   - Required: `OPENAI_API_KEY=your_key_here`
   - Optional: `HEYGEN_API_KEY=your_key_here`

4. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Manual Docker Commands
```bash
# Build and start all services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## �📋 Manual Installation Prerequisites

- **Python 3.8+** (recommended: Python 3.11)
- **Node.js 16+** (recommended: Node.js 18 or higher)
- **Git**
- **OpenAI API Key** (for LLM functionality)

## 🛠️ Manual Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/swetha0404/Vega.ai.git
cd Vega.ai/AI-MVP
```

### 2. Backend Setup

#### Create Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Mac/Linux
python -m venv venv
source venv/bin/activate
```

#### Install Dependencies
```bash
pip install -r requirements.txt
```

#### Environment Configuration
Create a `.env` file in the `agenbotc/` directory with the following variables:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

#Heygen Avatar Configuration
HEYGEN_API_KEY=your_heygen_api_key_here

HEYGEN_SERVER_URL=https://api.heygen.com

```

#### Configure LDAP (Optional)
Update `config.yaml` with your PingDirectory LDAP details:

```yaml
ldap:
  host: "your-pingdirectory-host"
  port: 1389
  bind_dn: "cn=Directory Manager"
  bind_password: "your-password"
  base_dn: "dc=example,dc=com"

# Default test users (remove in production)
users:
  - username: "test"
    password: "Testformvp"
    role: "user"
  - username: "admin"
    password: "Testingadminformvp"
    role: "admin"
```

#### Start the Backend Server
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup

#### Navigate to Frontend Directory
```bash
cd frontend
```

#### Install Dependencies
```bash
npm install
```

#### Environment Configuration
Create a `.env` file in the `frontend/` directory:

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

# Development Settings
VITE_DEBUG=true
```

#### Start the Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## � Docker Deployment (Recommended)

### Quick Start with Docker

The easiest way to run Vega.ai is using Docker containers. This approach handles all dependencies automatically and provides a consistent environment.

#### Prerequisites
- **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
- **Docker Compose** (included with Docker Desktop)

#### 1. Development Environment
```bash
# Clone and navigate to project
git clone https://github.com/swetha0404/Vega.ai.git
cd Vega.ai/AI-MVP

# Start all services with Docker Compose
docker-compose up -d
```

**Access Points:**
- 🌐 Frontend: http://localhost
- 🔗 Backend API: http://localhost:8000  
- 📊 API Documentation: http://localhost:8000/docs

#### 2. Production Environment
```bash
# Start production environment
docker-compose -f docker-compose.prod.yml up -d
```

#### 3. Using Build Scripts (Recommended)

**Windows:**
```batch
# Quick start - development environment
docker-build.bat dev

# Production environment
docker-build.bat prod

# Individual services
docker-build.bat backend      # Build backend only
docker-build.bat frontend     # Build frontend only

# Management commands
docker-build.bat stop         # Stop all services
docker-build.bat logs         # View logs
docker-build.bat cleanup      # Clean up resources
```

**Linux/Mac:**
```bash
# Make script executable
chmod +x docker-build.sh

# Quick start - development environment
./docker-build.sh dev

# Production environment
./docker-build.sh prod

# Individual services
./docker-build.sh backend      # Build backend only
./docker-build.sh frontend     # Build frontend only

# Management commands
./docker-build.sh stop         # Stop all services
./docker-build.sh logs         # View logs
./docker-build.sh cleanup      # Clean up resources
```

### 🔧 Docker Environment Configuration

Before running with Docker, create these environment files:

#### Backend Environment (`agenbotc/.env`)
```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Heygen Avatar Configuration
HEYGEN_API_KEY=your_heygen_api_key_here
HEYGEN_SERVER_URL=https://api.heygen.com

# Vector Store Configuration
CHROMA_PERSIST_DIRECTORY=./vectorstore

# Authentication
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database Configuration (for production)
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

#### Frontend Environment (`frontend/.env`)
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

# Development Settings
VITE_DEBUG=true
```

### 🏗️ Container Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Frontend    │    │     Backend     │    │   PostgreSQL    │
│   (React/Vite)  │◄──►│   (FastAPI)     │◄──►│   (Database)    │
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

### 🔍 Docker Management Commands

```bash
# View container status
docker-compose ps

# View logs
docker-compose logs -f              # All services
docker-compose logs -f backend      # Backend only
docker-compose logs -f frontend     # Frontend only

# Stop services
docker-compose down

# Rebuild containers
docker-compose build --no-cache
docker-compose up -d

# Access container shell
docker exec -it vega-backend bash   # Backend container
docker exec -it vega-frontend sh    # Frontend container

# View resource usage
docker stats
```

### 🛠️ Individual Container Builds

If you prefer to run containers separately:

```bash
# Build backend container
docker build -t vega-backend .

# Build frontend container
cd frontend
docker build -t vega-frontend .

# Run backend container
docker run -d --name vega-backend -p 8000:8000 --env-file ./agenbotc/.env vega-backend

# Run frontend container
docker run -d --name vega-frontend -p 80:80 vega-frontend
```

### 🌐 Cloud Deployment

The Docker containers are ready for cloud deployment:

**AWS ECS/Fargate:**
```bash
# Push to ECR
docker tag vega-backend:latest your-account.dkr.ecr.region.amazonaws.com/vega-backend:latest
docker push your-account.dkr.ecr.region.amazonaws.com/vega-backend:latest
```

**Google Cloud Run:**
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/your-project/vega-backend
gcloud run deploy --image gcr.io/your-project/vega-backend --platform managed
```

**Digital Ocean Apps:**
- Connect your GitHub repository
- Configure app spec with Docker containers
- Automatic builds and deployments

### 🔐 Production Security

For production deployments:

1. **Environment Variables**: Use Docker secrets or cloud provider secret management
2. **SSL/HTTPS**: Configure nginx with SSL certificates
3. **Database**: Use managed database services (AWS RDS, Google Cloud SQL)
4. **Monitoring**: Add application monitoring and logging
5. **Backup**: Implement automated backup strategies

### 📊 Docker Troubleshooting

**Common Issues:**

1. **Port conflicts:**
   ```bash
   # Check what's using the port
   netstat -tulpn | grep :8000
   
   # Use different ports
   docker-compose up -d --scale backend=1 -p 8080:8000
   ```

2. **Container won't start:**
   ```bash
   # Check logs
   docker logs vega-backend
   
   # Check system resources
   docker system df
   ```

3. **Database connection issues:**
   ```bash
   # Check network connectivity
   docker exec vega-backend ping postgres
   
   # Check database status
   docker exec vega-postgres pg_isready -U vega
   ```

4. **Volume permission issues:**
   ```bash
   # Fix permissions (Linux/Mac)
   sudo chown -R $(id -u):$(id -g) ./agenbotc/uploads
   ```

For detailed Docker documentation, see [DOCKER.md](DOCKER.md)

## �📁 Project Structure

```
AI-MVP/
├── main.py              # FastAPI application entry point
├── config.yaml          # LDAP and user configuration
├── requirements.txt     # Python dependencies
├── agenbotc/           # Core backend modules
│   ├── .env            # Backend environment variables
│   ├── auth.py         # Authentication logic
│   ├── chatbot.py      # Chatbot implementation
│   ├── ingestion.py    # Document processing
│   ├── llm_agent.py    # LLM agent functionality
│   ├── vector_store.py # Vector storage operations
│   └── uploads/        # Document upload directory
└── frontend/           # React frontend application
    ├── .env            # Frontend environment variables
    ├── src/
    │   ├── components/ # Reusable UI components
    │   ├── pages/      # Application pages
    │   └── utils/      # Utility functions
    └── public/         # Static assets
```

## 🔧 API Endpoints

### Authentication
- `POST /login` - User authentication
- `POST /logout` - User logout
- `GET /me` - Get current user information

### Chat & AI
- `POST /chat` - Send message to AI agent
- `GET /chat/history` - Get chat history
- `POST /chat/voice` - Voice input processing

### Document Management
- `POST /upload` - Upload documents for processing
- `GET /documents` - List uploaded documents
- `DELETE /documents/{id}` - Delete document

### User Management
- `GET /users` - List users (admin only)
- `POST /users` - Create new user
- `PUT /users/{id}` - Update user
- `DELETE /users/{id}` - Delete user

## 🚀 Deployment

### Recommended: Docker Deployment

The easiest and most reliable way to deploy Vega.ai is using Docker containers:

```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d

# Or use build script
./docker-build.sh prod  # Linux/Mac
docker-build.bat prod   # Windows
```

This provides:
- ✅ Consistent environment across all platforms
- ✅ Automatic service orchestration
- ✅ Built-in health checks and restart policies
- ✅ Production-ready nginx configuration
- ✅ Database and cache services included

### Alternative: Manual Deployment

#### Backend Deployment
```bash
# Production server
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# Or using individual Docker container
docker build -t vega-backend .
docker run -p 8000:8000 vega-backend
```

#### Frontend Deployment
```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to static hosting (Netlify, Vercel, etc.)
```

### Cloud Deployment Options

1. **AWS ECS/Fargate** - Container orchestration
2. **Google Cloud Run** - Serverless containers  
3. **Azure Container Instances** - Managed containers
4. **DigitalOcean Apps** - Platform-as-a-Service
5. **Heroku** - Using Docker containers

See [DOCKER.md](DOCKER.md) for detailed deployment instructions.

## 🧪 Testing

### Quick Testing Guide

After starting the application, verify it's working correctly:

#### 1. Health Check Tests
```bash
# Test backend health
curl http://localhost:8000/health

# Test frontend health
curl http://localhost/health
```

#### 2. Authentication Test
1. Navigate to http://localhost
2. Login with test credentials:
   - Username: `test`
   - Password: `Testformvp`
3. Should redirect to applications page

#### 3. Chat Functionality Test
1. Navigate to http://localhost/chatpage
2. Type a message: "Hello, how are you?"
3. Should receive AI response

#### 4. Admin Features Test
1. Login with admin credentials:
   - Username: `admin`
   - Password: `Testingadminformvp`
2. Access Settings and User Management pages

### Automated Testing

**Backend Tests:**
```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run backend tests
python -m pytest tests/ -v
```

**Frontend Tests:**
```bash
cd frontend

# Install test dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest

# Run frontend tests
npm run test
```

**Docker Testing:**
```bash
# Test container builds and startup
docker-compose build
docker-compose up -d

# Test all services are healthy
docker-compose ps
```

### Load Testing

**Install Artillery:**
```bash
npm install -g artillery
```

**Run Load Test:**
```bash
# Test API performance
artillery quick --duration 60 --rate 10 http://localhost:8000/health
```

### Manual Testing Checklist

- [ ] Health checks pass
- [ ] Authentication works
- [ ] Chat functionality works
- [ ] File upload works
- [ ] User management works (admin)
- [ ] Responsive design on mobile/tablet
- [ ] Voice-to-text works (if enabled)
- [ ] All navigation links work
- [ ] Error handling works correctly

For comprehensive testing instructions, see [TESTING.md](TESTING.md)

## 🔍 Troubleshooting

### Common Issues

1. **Backend Issues**
   - Ensure OpenAI API key is valid and has sufficient credits
   - Check that all required environment variables are set
   - Verify Python version compatibility (3.8+)
   - Clear `__pycache__` directories if encountering import errors

2. **Frontend Issues**
   - Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
   - Check Node.js version compatibility
   - Ensure backend server is running and accessible
   - Verify environment variables are properly set

3. **Database Issues**
   - Check ChromaDB installation: `pip install chromadb`
   - Ensure proper permissions for vector store directory
   - Clear vector store if corrupted: delete `vectorstore/` directory

4. **Authentication Issues**
   - Verify LDAP configuration in `config.yaml`
   - Check default user credentials
   - Ensure proper JWT secret key configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b yourname/feature/your-feature`
3. Make your changes and commit: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin yourname/feature/your-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Contact the development team
- Check the documentation for additional resources

