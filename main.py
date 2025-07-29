import sys
import os
import subprocess

# Function to install required packages automatically
def install_requirements():
    """Install all required packages from requirements.txt before starting the server"""
    try:
        requirements_path = os.path.join(os.path.dirname(__file__), "requirements.txt")
        if not os.path.exists(requirements_path):
            print("requirements.txt not found - skipping package installation")
            return
        
        # Check if key packages are already installed to avoid reinstalling on every reload
        try:
            import fastapi
            import uvicorn
            import langchain
            import chromadb
            # import knowledge
            print("Key packages already installed - skipping installation")
            return
        except ImportError:
            # If any key package is missing, proceed with installation
            pass
        
        print("Installing packages from requirements.txt...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", requirements_path])
        print("All requirements installed successfully!")
        
    except subprocess.CalledProcessError as e:
        print(f"Error installing requirements: {e}")
        print("Continuing with startup - some features may not work properly")
    except Exception as e:
        print(f"Unexpected error during package installation: {e}")
        print("Continuing with startup - some features may not work properly")

# Install requirements before importing other modules
print("Checking and installing required packages...")
install_requirements()


import uvicorn
from datetime import datetime
from dotenv import load_dotenv

agenbotc_dir = (os.path.join(os.path.dirname(__file__),".", "agenbotc"))
sys.path.append(os.path.abspath(agenbotc_dir))
env_path = os.path.join(agenbotc_dir, ".env")

from fastapi import FastAPI, HTTPException, Request, File, Response, UploadFile, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from pydantic import BaseModel
import yaml
from typing import List, Optional
from datetime import timedelta
import warnings

# === Load credentials from .env file (place it with content - OPENAI_API_KEY=<your-api-key> within the agenbotc folder)===
print(f"Loading .env file from: {env_path}")
print(f"File exists: {os.path.exists(env_path)}")
load_dotenv()
OPENAI_TOKEN = os.getenv('OPENAI_API_KEY')
HEYGEN_API_KEY = os.getenv('HEYGEN_API_KEY')
HEYGEN_SERVER_URL = os.getenv('HEYGEN_SERVER_URL', 'https://api.heygen.com')  # Default URL if not set
# Set the environment variable explicitly for child processes
if OPENAI_TOKEN:
    print("OPENAI_API_KEY found in .env file!")
else:
    print("WARNING: OPENAI_API_KEY not found in .env file!")

if HEYGEN_API_KEY:
    print("HEYGEN_API_KEY found in .env file!")
else:
    print("WARNING: HEYGEN_API_KEY not found in .env file!")

from ingestion import process_pdf, process_docx, process_ppt, process_website
from chatbot import get_chatbot_response
from llm_agent import LLMAgent
from tomcat_monitor import TomcatMonitor
from auth import (
    user_manager, 
    create_access_token, 
    get_current_user, 
    get_current_active_user,
    require_admin,
    require_role,
    User, 
    UserLogin, 
    UserCreate, 
    Token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

llm_agent = LLMAgent()
tomcat_monitor = TomcatMonitor()   

# Comprehensive warning suppression - must be done before any other imports
warnings.filterwarnings("ignore", category=DeprecationWarning) 
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", message=".*HuggingFaceEmbeddings.*deprecated.*")
warnings.filterwarnings("ignore", message=".*Chroma.*deprecated.*")
warnings.filterwarnings("ignore", message=".*langchain.*")

# Load config
def load_config():
    config_path = os.path.join(os.path.dirname(__file__), "config.yaml")
    with open(config_path, "r") as f:
        return yaml.safe_load(f)

app = FastAPI(title="Vega.ai Backend API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoginRequest(BaseModel):
    username: str
    password: str

import psutil

def get_memory_usage():
    process = psutil.Process(os.getpid())
    mem = process.memory_info().rss / (1024 * 1024)  # in MB
    return round(mem, 2)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat(), "memory_usage": get_memory_usage()}

# Enhanced authentication system with JWT tokens and secure password hashing
@app.post("/login", response_model=Token)
async def login(login_data: UserLogin):
    """Authenticate user and return JWT token"""
    user = user_manager.authenticate_user(login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, 
        expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=User(
            username=user.username,
            email=user.email,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
            last_login=user.last_login
        )
    )

# Get current user profile
@app.get("/profile", response_model=User)
async def get_profile(current_user: User = Depends(get_current_active_user)):
    """Get current user profile"""
    return current_user

# Create new user (admin only)
@app.post("/users", response_model=User)
async def create_user(
    user_data: UserCreate, 
    current_user: User = Depends(require_admin)
):
    """Create a new user (admin only)"""
    new_user = user_manager.create_user(user_data)
    return User(
        username=new_user.username,
        email=new_user.email,
        role=new_user.role,
        is_active=new_user.is_active,
        created_at=new_user.created_at,
        last_login=new_user.last_login
    )

# List all users (admin only)
@app.get("/users", response_model=List[User])
async def list_users(current_user: User = Depends(require_admin)):
    """List all users (admin only)"""
    return user_manager.list_users()

# Delete user (admin only)
@app.delete("/users/{username}")
async def delete_user(
    username: str,
    current_user: User = Depends(require_admin)
):
    """Delete a user (admin only)"""
    if username == current_user.username:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete your own account"
        )
    
    success = user_manager.delete_user(username)
    if not success:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    return {"message": "User deleted successfully"}

# -------------------------------------------------------------------------------------------------------------
# api to test recording and transcription and saves it in recordings folder
RECORDINGS_DIR = os.path.join(os.path.dirname(__file__), "recording_tests")
os.makedirs(RECORDINGS_DIR, exist_ok=True)
@app.post("/save-recording")
async def save_recording(
    audio_file: UploadFile = File(...),
    transcript: str = Form(...)
):
    # Find next available record number
    existing = [f for f in os.listdir(RECORDINGS_DIR) if f.startswith("record") and f.endswith(".wav")]
    numbers = [int(f[6:-4]) for f in existing if f[6:-4].isdigit()]
    next_num = max(numbers, default=0) + 1

    audio_path = os.path.join(RECORDINGS_DIR, f"record{next_num}.wav")
    transcript_path = os.path.join(RECORDINGS_DIR, f"record{next_num}_transcript.txt")

    # Save audio
    with open(audio_path, "wb") as f:
        f.write(await audio_file.read())

    # Save transcript
    with open(transcript_path, "w", encoding="utf-8") as f:
        f.write(transcript)

    return {"success": True, "recording_number": next_num}

# -------------------------------------------------------------------------------------------------------------
# api to handle file upload (pdf type) for RAG training and vector storing
@app.post("/upload/pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """Upload PDF file for RAG training (requires authentication)"""
    print(f"PDF upload by user: {current_user.username}")
    # Ensure uploads go to agenbotc folder
    agenbotc_dir = os.path.join(os.path.dirname(__file__), "agenbotc")
    uploads_dir = os.path.join(agenbotc_dir, "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    
    file_location = os.path.join(uploads_dir, file.filename)
    with open(file_location, "wb") as f:
        f.write(await file.read())
    try:
        result = process_pdf(file_location)
        if isinstance(result, dict):
            if result.get("error"):
                return {"status": "error", "message": result["message"], "doc_id": None}
            elif result.get("is_duplicate"):
                return {"status": "duplicate", "message": result["message"], "doc_id": result["doc_id"]}
            else:
                return {"status": "success", "message": result["message"], "doc_id": result["doc_id"]}
        else:
            # Backward compatibility for old return format
            return {"status": "success", "message": f"PDF processed successfully", "doc_id": result}
    except Exception as e:
        return {"status": "error", "message": str(e), "doc_id": None}
    
# -------------------------------------------------------------------------------------------------------------
# api to handle docx file upload for RAG training and vector storing
@app.post("/upload/docx")
async def upload_docx(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """Upload DOCX file for RAG training (requires authentication)"""
    print(f"DOCX upload by user: {current_user.username}")
    # Ensure uploads go to agenbotc folder
    agenbotc_dir = os.path.join(os.path.dirname(__file__), "agenbotc")
    uploads_dir = os.path.join(agenbotc_dir, "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    
    file_location = os.path.join(uploads_dir, file.filename)
    with open(file_location, "wb") as f:
        f.write(await file.read())
    try:
        result = process_docx(file_location)
        if isinstance(result, dict):
            if result.get("error"):
                return {"status": "error", "message": result["message"], "doc_id": None}
            elif result.get("is_duplicate"):
                return {"status": "duplicate", "message": result["message"], "doc_id": result["doc_id"]}
            else:
                return {"status": "success", "message": result["message"], "doc_id": result["doc_id"]}
        else:
            # Backward compatibility for old return format
            return {"status": "success", "message": f"DOCX processed successfully", "doc_id": result}
    except Exception as e:
        return {"status": "error", "message": str(e), "doc_id": None}
    
# -------------------------------------------------------------------------------------------------------------
# api to handle ppt file upload for RAG training and vector storing
@app.post("/upload/ppt")
async def upload_ppt(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """Upload PPT file for RAG training (requires authentication)"""
    print(f"PPT upload by user: {current_user.username}")
    # Ensure uploads go to agenbotc folder
    agenbotc_dir = os.path.join(os.path.dirname(__file__), "agenbotc")
    uploads_dir = os.path.join(agenbotc_dir, "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    
    file_location = os.path.join(uploads_dir, file.filename)
    with open(file_location, "wb") as f:
        f.write(await file.read())
    try:
        result = process_ppt(file_location)
        if isinstance(result, dict):
            if result.get("error"):
                return {"status": "error", "message": result["message"], "doc_id": None}
            elif result.get("is_duplicate"):
                return {"status": "duplicate", "message": result["message"], "doc_id": result["doc_id"]}
            else:
                return {"status": "success", "message": result["message"], "doc_id": result["doc_id"]}
        else:
            # Backward compatibility for old return format
            return {"status": "success", "message": f"PPT processed successfully", "doc_id": result}
    except Exception as e:
        return {"status": "error", "message": str(e), "doc_id": None}

# -------------------------------------------------------------------------------------------------------------
# api to handle website content processing by URL for RAG training and vector storing
@app.post("/process/website")
async def process_web(url: str = Form(...)):
    try:
        result = process_website(url)
        if isinstance(result, dict):
            if result.get("error"):
                return {"status": "error", "message": result["message"], "doc_id": None}
            elif result.get("is_duplicate"):
                return {"status": "duplicate", "message": result["message"], "doc_id": result["doc_id"]}
            else:
                return {"status": "success", "message": result["message"], "doc_id": result["doc_id"]}
        else:
            # Backward compatibility for old return format
            return {"status": "success", "message": f"Website processed successfully", "doc_id": result}
    except Exception as e:
        return {"status": "error", "message": str(e), "doc_id": None}

# -------------------------------------------------------------------------------------------------------------
class ChatMessage(BaseModel):
    question: str = ""
    answer: str = ""

class ChatRequest(BaseModel):
    question: str
    history: List[ChatMessage] = []

# -------------------------------------------------------------------------------------------------------------
# Handles advanced chat interactions using the LLM agent for more sophisticated query processing
@app.post("/Agentchat")
async def Agentchat(
    request: ChatRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Main chat endpoint that routes queries through LLM agent with authentication"""
    print(f"@@@@@@@@@@@@@Processing query through LLM agent for user: {current_user.username}")
    try:
        # Process query and get both verbose and avatar responses
        response_data = await llm_agent.process_query(request.question)
        print(f"@@@@@@@@@@@@@LLM Agent response: {response_data}")
        
        # Handle different response formats
        if isinstance(response_data, dict):
            # If response is already a dict with verbose and avatar text
            return {
                "response": response_data.get("verbose", str(response_data)),
                "avatarText": response_data.get("avatar", str(response_data))
            }
        else:
            # If response is a string, use it as both verbose and avatar text
            response_str = str(response_data)
            return {
                "response": response_str,
                "avatarText": response_str
            }
    except Exception as e:
        error_message = f"Error processing query: {str(e)}"
        return {
            "response": error_message,
            "avatarText": "I encountered an error while processing your question. Please try again.",
            "status": "error"
        }

# -------------------------------------------------------------------------------------------------------------
# Get Heygen API key from env
@app.get("/heygenAPI")
async def get_heygen_api_key():
    return {"apiKey": HEYGEN_API_KEY, "url": HEYGEN_SERVER_URL}

# -------------------------------------------------------------------------------------------------------------
# Add health check endpoint for Docker
@app.get("/health")
async def health_check():
    """Health check endpoint for Docker containers and load balancers"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "vega-backend",
        "version": "1.0.0"
    }

# -------------------------------------------------------------------------------------------------------------
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)