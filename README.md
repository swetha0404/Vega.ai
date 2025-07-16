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

## 📋 Prerequisites

- **Python 3.8+** (recommended: Python 3.11)
- **Node.js 16+** (recommended: Node.js 18 or higher)
- **Git**
- **OpenAI API Key** (for LLM functionality)

## 🛠️ Installation & Setup

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

## 📁 Project Structure

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

### Backend Deployment
```bash
# Production server
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# Or using Docker
docker build -t vega-backend .
docker run -p 8000:8000 vega-backend
```

### Frontend Deployment
```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to static hosting (Netlify, Vercel, etc.)
```

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

