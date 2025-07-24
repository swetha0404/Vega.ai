"""
Authentication and authorization module for secure user management.
Provides JWT token-based authentication, password hashing, and role-based access control.
"""

import os
import json
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import yaml

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Bearer token extraction
security = HTTPBearer()


class User(BaseModel):
    """User model for authentication"""
    username: str
    email: Optional[str] = None
    role: str = "user"
    is_active: bool = True
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None


class UserInDB(User):
    """User model including hashed password"""
    hashed_password: str


class UserCreate(BaseModel):
    """Model for creating new users"""
    username: str
    password: str
    email: Optional[str] = None
    role: str = "user"


class UserLogin(BaseModel):
    """Model for user login"""
    username: str
    password: str


class Token(BaseModel):
    """Token response model"""
    access_token: str
    token_type: str
    expires_in: int
    user: User


class UserManager:
    """Manages users with secure password hashing and file-based storage"""
    
    def __init__(self, users_file: str = "users.json"):
        self.users_file = users_file
        self.users_db = self._load_users()
    
    def _load_users(self) -> Dict[str, UserInDB]:
        """Load users from file or create default admin user"""
        if os.path.exists(self.users_file):
            try:
                with open(self.users_file, 'r') as f:
                    users_data = json.load(f)
                    users = {}
                    for username, user_data in users_data.items():
                        users[username] = UserInDB(**user_data)
                    return users
            except Exception as e:
                print(f"Error loading users file: {e}")
        
        # Create default admin user if no users file exists
        default_users = self._create_default_users()
        self._save_users(default_users)
        return default_users
    
    def _create_default_users(self) -> Dict[str, UserInDB]:
        """Create default users from config.yaml or hardcoded defaults"""
        default_users = {}
        
        try:
            # Try to load from config.yaml first
            config_path = os.path.join(os.path.dirname(__file__), "..", "config.yaml")
            if os.path.exists(config_path):
                with open(config_path, 'r') as f:
                    config = yaml.safe_load(f)
                    yaml_users = config.get("users", [])
                    
                    for user_data in yaml_users:
                        username = user_data.get("username")
                        password = user_data.get("password")
                        role = user_data.get("role", "user")
                        
                        if username and password:
                            hashed_password = self.hash_password(password)
                            default_users[username] = UserInDB(
                                username=username,
                                hashed_password=hashed_password,
                                role=role,
                                is_active=True,
                                created_at=datetime.now()
                            )
        except Exception as e:
            print(f"Error loading config.yaml: {e}")
        
        # If no users loaded from config, create default admin
        if not default_users:
            admin_password = "admin123"  # Change this in production
            default_users["admin"] = UserInDB(
                username="admin",
                hashed_password=self.hash_password(admin_password),
                role="admin",
                is_active=True,
                created_at=datetime.now()
            )
            print("Created default admin user with password: admin123")
        
        return default_users
    
    def _save_users(self, users: Dict[str, UserInDB]):
        """Save users to file"""
        try:
            users_data = {}
            for username, user in users.items():
                users_data[username] = user.dict()
                # Convert datetime objects to ISO format strings
                if users_data[username].get("created_at"):
                    users_data[username]["created_at"] = users_data[username]["created_at"].isoformat()
                if users_data[username].get("last_login"):
                    users_data[username]["last_login"] = users_data[username]["last_login"].isoformat()
            
            with open(self.users_file, 'w') as f:
                json.dump(users_data, f, indent=2)
        except Exception as e:
            print(f"Error saving users: {e}")
    
    def hash_password(self, password: str) -> str:
        """Hash a password using bcrypt"""
        return pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_user(self, username: str) -> Optional[UserInDB]:
        """Get user by username"""
        return self.users_db.get(username)
    
    def create_user(self, user_data: UserCreate) -> UserInDB:
        """Create a new user"""
        if user_data.username in self.users_db:
            raise HTTPException(
                status_code=400,
                detail="Username already exists"
            )
        
        hashed_password = self.hash_password(user_data.password)
        new_user = UserInDB(
            username=user_data.username,
            email=user_data.email,
            role=user_data.role,
            hashed_password=hashed_password,
            is_active=True,
            created_at=datetime.now()
        )
        
        self.users_db[user_data.username] = new_user
        self._save_users(self.users_db)
        return new_user
    
    def authenticate_user(self, username: str, password: str) -> Optional[UserInDB]:
        """Authenticate user credentials"""
        user = self.get_user(username)
        if not user:
            return None
        if not self.verify_password(password, user.hashed_password):
            return None
        if not user.is_active:
            return None
        
        # Update last login
        user.last_login = datetime.now()
        self.users_db[username] = user
        self._save_users(self.users_db)
        
        return user
    
    def update_user(self, username: str, **kwargs) -> Optional[UserInDB]:
        """Update user information"""
        user = self.get_user(username)
        if not user:
            return None
        
        for key, value in kwargs.items():
            if hasattr(user, key):
                setattr(user, key, value)
        
        self.users_db[username] = user
        self._save_users(self.users_db)
        return user
    
    def delete_user(self, username: str) -> bool:
        """Delete a user"""
        if username in self.users_db:
            del self.users_db[username]
            self._save_users(self.users_db)
            return True
        return False
    
    def list_users(self) -> List[User]:
        """List all users (without password hashes)"""
        return [
            User(
                username=user.username,
                email=user.email,
                role=user.role,
                is_active=user.is_active,
                created_at=user.created_at,
                last_login=user.last_login
            )
            for user in self.users_db.values()
        ]


# Initialize user manager
user_manager = UserManager()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = user_manager.get_user(username)
    if user is None:
        raise credentials_exception
    
    return User(
        username=user.username,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login
    )


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def require_role(required_role: str):
    """Decorator to require specific role"""
    def role_checker(current_user: User = Depends(get_current_active_user)):
        if current_user.role != required_role and current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user
    return role_checker


def require_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """Require admin role"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user


# Optional dependency for routes that may or may not require authentication
async def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[User]:
    """Get current user (optional - returns None if not authenticated)"""
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
