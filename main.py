import sys
import os
import subprocess
import shutil

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
# print("Checking and installing required packages...")
# install_requirements()


import uvicorn
from datetime import datetime
from dotenv import load_dotenv

agenbotc_dir = os.path.join(os.path.dirname(__file__), "agenbotc")
sys.path.append(os.path.abspath(agenbotc_dir))
env_path = os.path.join(agenbotc_dir, ".env")

from fastapi import FastAPI, HTTPException, Request, File, Response, UploadFile, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from pydantic import BaseModel
import yaml
import json
import tempfile
from typing import List, Optional
from datetime import timedelta, datetime
import warnings

# === Load credentials from .env file (place it with content - OPENAI_API_KEY=<your-api-key> within the agenbotc folder)===
print(f"Loading .env file from: {env_path}")
print(f"File exists: {os.path.exists(env_path)}")
load_dotenv(env_path)
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
from llm_agent import LLMAgent
from tomcat_monitor import TomcatMonitor
from vector_store import delete_from_vector_store, get_document_count
from readfile import read_file
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

# File tracking functionality
agenbotc_dir = os.path.join(os.path.dirname(__file__), "agenbotc")
os.makedirs(agenbotc_dir, exist_ok=True)  # Ensure agenbotc directory exists
FILES_JSON_PATH = os.path.join(agenbotc_dir, "files.json")

def load_files_data():
    """Load files data from JSON file"""
    try:
        if os.path.exists(FILES_JSON_PATH):
            with open(FILES_JSON_PATH, 'r') as f:
                return json.load(f)
        return {}
    except Exception as e:
        print(f"Error loading files data: {e}")
        return {}

def save_files_data(files_data):
    """Save files data to JSON file"""
    try:
        with open(FILES_JSON_PATH, 'w') as f:
            json.dump(files_data, f, indent=2, default=str)
    except Exception as e:
        print(f"Error saving files data: {e}")

def add_file_record(filename, file_type, file_size, username, doc_id=None, url=None):
    """Add a file record to the tracking system"""
    files_data = load_files_data()
    
    file_record = {
        "id": doc_id or f"file_{len(files_data) + 1}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "name": filename,
        "type": file_type.upper(),
        "size": file_size,
        "status": "indexed",
        "uploadDate": datetime.now().isoformat(),
        "lastModified": datetime.now().isoformat(),
        "uploadedBy": username,
        "url": url  # For website URLs
    }
    
    files_data[file_record["id"]] = file_record
    save_files_data(files_data)
    return file_record["id"]

def get_user_files(username):
    """Get all files uploaded by a specific user"""
    files_data = load_files_data()
    user_files = []
    
    for file_id, file_info in files_data.items():
        if file_info.get("uploadedBy") == username:
            user_files.append(file_info)
    
    # Sort by upload date (newest first)
    user_files.sort(key=lambda x: x.get("uploadDate", ""), reverse=True)
    return user_files

def delete_file_record(file_id, username):
    """Delete a file record and its vectors from files.json and ChromaDB"""
    files_data = load_files_data()
    
    if file_id in files_data:
        file_info = files_data[file_id]
        if file_info.get("uploadedBy") == username:
            # Delete from JSON file
            del files_data[file_id]
            save_files_data(files_data)
            
            # Delete from ChromaDB vector store
            try:
                vector_deleted = delete_from_vector_store(file_id)
                if vector_deleted:
                    print(f"Successfully deleted vectors for doc_id: {file_id}")
                else:
                    print(f"No vectors found to delete for doc_id: {file_id}")
            except Exception as e:
                print(f"Error deleting vectors for doc_id {file_id}: {str(e)}")
                # Don't fail the entire operation if vector deletion fails
            
            return True
    return False

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

# Update user (admin only)
@app.put("/users/{username}", response_model=User)
async def update_user(
    username: str,
    user_data: dict,
    current_user: User = Depends(require_admin)
):
    """Update a user (admin only)"""
    updated_user = user_manager.update_user(username, **user_data)
    if not updated_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    return User(
        username=updated_user.username,
        email=updated_user.email,
        role=updated_user.role,
        is_active=updated_user.is_active,
        created_at=updated_user.created_at,
        last_login=updated_user.last_login
    )


# -------------------------------------------------------------------------------------------------------------
# File Management Endpoints
@app.get("/files")
async def get_files(current_user: User = Depends(get_current_active_user)):
    """Get all files uploaded by the current user"""
    user_files = get_user_files(current_user.username)
    return {"files": user_files}

@app.delete("/files/{file_id}")
async def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete a file record and its vectors from files.json and ChromaDB"""
    success = delete_file_record(file_id, current_user.username)
    if success:
        return {"status": "success", "message": "File record and vectors deleted successfully"}
    else:
        raise HTTPException(
            status_code=404,
            detail="File not found or you don't have permission to delete it"
        )

@app.get("/files/stats")
async def get_files_stats(current_user: User = Depends(get_current_active_user)):
    """Get statistics about files and vector store"""
    try:
        user_files = get_user_files(current_user.username)
        total_user_files = len(user_files)
        
        # Get vector count for user's files
        user_vector_count = 0
        for file_info in user_files:
            file_id = file_info.get("id")
            if file_id:
                count = get_document_count(file_id)
                user_vector_count += count
        
        total_vectors = get_document_count()
        
        return {
            "user_files": total_user_files,
            "user_vectors": user_vector_count,
            "total_vectors": total_vectors
        }
    except Exception as e:
        return {
            "error": str(e),
            "user_files": 0,
            "user_vectors": 0,
            "total_vectors": 0
        }

# -------------------------------------------------------------------------------------------------------------
# Unified file upload endpoint that handles multiple file types
@app.post("/upload/file")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """Upload any supported file type for RAG training (requires authentication)"""
    try:
        # Get file extension to determine type
        file_extension = file.filename.lower().split('.')[-1] if '.' in file.filename else ''
        
        # Save uploaded file temporarily
        agenbotc_dir = os.path.join(os.path.dirname(__file__), "agenbotc")
        upload_folder = os.path.join(agenbotc_dir, "uploads")
        os.makedirs(upload_folder, exist_ok=True)
        file_path = os.path.join(upload_folder, file.filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Process based on file extension
        if file_extension == 'pdf':
            result = process_pdf(file_path)
        elif file_extension in ['docx', 'doc']:
            result = process_docx(file_path)
        elif file_extension in ['ppt', 'pptx']:
            result = process_ppt(file_path)
        else:
            # Clean up the temporary file
            os.remove(file_path)
            return {"status": "error", "message": f"Unsupported file type: {file_extension}"}
        
        # Clean up the temporary file
        os.remove(file_path)
        
        # Handle the result
        if result.get("is_duplicate", False):
            return {"status": "duplicate", "message": result["message"], "doc_id": result["doc_id"]}
        elif result.get("error", False):
            return {"status": "error", "message": result["message"]}
        else:
            # Add file record to tracking system (file already deleted)
            file_size = f"{round(file.size / (1024 * 1024), 2)} MB" if file.size else "Unknown"
            file_record_id = add_file_record(
                filename=file.filename,
                file_type=file_extension,
                file_size=file_size,
                username=current_user.username,
                doc_id=result.get("doc_id")
            )
            return {"status": "success", "message": f"File processed successfully", "doc_id": result["doc_id"]}
            
    except Exception as e:
        # Clean up file if it exists
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        return {"status": "error", "message": f"Error processing file: {str(e)}"}

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
async def process_web(
    url: str = Form(...), 
    current_user: User = Depends(get_current_active_user)
):
    try:
        result = process_website(url)
        if isinstance(result, dict):
            if result.get("error"):
                return {"status": "error", "message": result["message"], "doc_id": None}
            elif result.get("is_duplicate"):
                return {"status": "duplicate", "message": result["message"], "doc_id": result["doc_id"]}
            else:
                # Add URL record to tracking system
                file_record_id = add_file_record(
                    filename=url,
                    file_type="URL",
                    file_size="N/A",
                    username=current_user.username,
                    doc_id=result.get("doc_id"),
                    url=url
                )
                return {"status": "success", "message": result["message"], "doc_id": result["doc_id"]}
        else:
            # Backward compatibility for old return format
            file_record_id = add_file_record(
                filename=url,
                file_type="URL", 
                file_size="N/A",
                username=current_user.username,
                doc_id=result,
                url=url
            )
            return {"status": "success", "message": f"Website processed successfully", "doc_id": result}
    except Exception as e:
        return {"status": "error", "message": str(e), "doc_id": None}

# -------------------------------------------------------------------------------------------------------------
class ChatRequest(BaseModel):
    question: str
    history: dict = {}
    file_content: Optional[str] = None
    file_name: Optional[str] = None
    file_content: Optional[str] = None
    file_name: Optional[str] = None

# -------------------------------------------------------------------------------------------------------------
# Handles advanced chat interactions using the LLM agent for more sophisticated query processing
@app.post("/Agentchat")
async def Agentchat(
    request: ChatRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Main chat endpoint that routes queries through LLM agent with authentication"""
    print(f"\n@@@@@@@@@@@@@Processing query through LLM agent for user: {current_user.username}")
    try:
        # Check if file content is provided and call read_file function silently
        if request.file_content and request.file_name:
            print(f"\n@@@@@@@@@@@File upload detected: {request.file_name}")
            
            # Create a temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as temp_file:
                temp_file.write(request.file_content)
                temp_file_path = temp_file.name
            
            try:
                # Call the read_file function silently for your workflow
                print(f"\n@@@@@@@@@@@@Calling read_file function for: {request.file_name}")
                read_file(temp_file_path)
                
                # Clean up the temporary file
                os.unlink(temp_file_path)
                print(f"\n@@@@@@@@@@@Temporary file cleaned up: {temp_file_path}")
                
            except Exception as file_error:
                print(f"\n@@@@@@@@@@@Error in read_file function: {str(file_error)}")
                # Clean up the temporary file in case of error
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                # Continue with normal processing even if file processing fails
        
        # Process query through LLM agent (same as before for all requests)
        response_data = await llm_agent.process_query(request.question, request.history)
        print(f"\n\n\n@@@@@@@@@@@@@ main.py LLM Agent response: {response_data}")
        
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
            "avatarText": "I encountered an error while processing your request. Please try again.",
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