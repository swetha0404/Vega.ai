# Vega.ai - Enhanced Authentication System

## 🔐 Security Upgrade Complete

Your application now features a robust, production-ready authentication system with JWT tokens, secure password hashing, and role-based access control.

## 🚀 Quick Start

### Option 1: Using the Startup Script
```bash
python start.py
```

### Option 2: Manual Setup
1. **Install dependencies:**
   ```bash
   pip install python-jose[cryptography] passlib[bcrypt]
   ```

2. **Set environment variables (optional):**
   ```bash
   export JWT_SECRET_KEY="your-super-secure-secret-key-here"
   export OPENAI_API_KEY="your-openai-api-key"
   export HEYGEN_API_KEY="your-heygen-api-key"
   ```

3. **Test the authentication system:**
   ```bash
   python test_auth.py
   ```

4. **Start the backend:**
   ```bash
   python main.py
   ```

5. **Start the frontend (in a new terminal):**
   ```bash
   cd frontend
   npm run dev
   ```

## 👤 Default Login Credentials

The system creates users from your `config.yaml` file. If no users exist, it creates:
- **Username:** `admin`
- **Password:** `admin123`
- **Role:** `admin`

**⚠️ Important:** Change the default password immediately after first login!

## 🔑 New Features

### Authentication Features
- **JWT Token Authentication** - Secure, stateless authentication
- **Password Hashing** - Bcrypt encryption with individual salts
- **Token Expiration** - 30-minute automatic logout for security
- **Role-Based Access** - User and admin roles with different permissions

### User Management (Admin Only)
- **Create Users** - Add new users with roles
- **List Users** - View all users and their status
- **Delete Users** - Remove users from the system
- **User Profiles** - View creation date and last login

### Protected Endpoints
All chat and file upload endpoints now require authentication:
- `/chat` - Basic chatbot conversations
- `/Agentchat` - Advanced AI agent conversations
- `/upload/pdf` - PDF file uploads
- `/upload/docx` - Word document uploads
- `/upload/ppt` - PowerPoint uploads

## 🛡️ Security Improvements

### Before (Insecure)
- Plain text passwords in config files
- No token expiration
- Only 2 hardcoded users
- No session management

### After (Secure)
- Bcrypt-hashed passwords
- JWT tokens with expiration
- Unlimited users with proper management
- Role-based access control
- Automatic logout on token expiration

## 🎯 API Endpoints

### Authentication
- `POST /login` - Login and receive JWT token
- `GET /profile` - Get current user profile

### User Management (Admin Only)
- `GET /users` - List all users
- `POST /users` - Create new user
- `DELETE /users/{username}` - Delete user

### Protected Chat Endpoints
- `POST /chat` - Basic chat (requires auth)
- `POST /Agentchat` - Advanced AI chat (requires auth)

## 📱 Frontend Updates

### New Components
- **UserManagement.jsx** - Admin interface for user management
- **auth.js** - Authentication utilities
- **authComponents.jsx** - Route protection components

### Updated Login Flow
1. User enters credentials
2. Receives JWT token on successful login
3. Token stored in localStorage
4. All API requests include Authorization header
5. Automatic redirect to login on token expiration

## 🔧 Configuration

### Environment Variables
```bash
# Required for production
JWT_SECRET_KEY=your-super-secure-secret-key-here

# Optional - will use defaults if not set
OPENAI_API_KEY=your-openai-api-key
HEYGEN_API_KEY=your-heygen-api-key
```

### User Configuration
Users are now stored in `users.json` but can be initialized from `config.yaml`:
```yaml
users:
  - username: "john_doe"
    password: "secure_password_123"
    role: "user"
  - username: "admin_user"
    password: "admin_password_456"
    role: "admin"
```

## 📊 User Management Interface

Access user management at `/user-management` (admin only):
- **Create Users** - Add new users with username, password, email, and role
- **View Users** - See all users with their status and login history
- **Delete Users** - Remove users (cannot delete yourself)
- **Role Management** - Assign user or admin roles

## 🔒 Security Best Practices

1. **Change default passwords immediately**
2. **Use strong JWT secret key in production**
3. **Enable HTTPS in production**
4. **Regularly review user access**
5. **Monitor failed login attempts**
6. **Keep dependencies updated**

## 🐛 Troubleshooting

### Common Issues

1. **"Invalid credentials" error**
   - Check username and password
   - Verify user exists in system

2. **"No authentication token found"**
   - Login again to get new token
   - Check if token expired

3. **"Access denied" for admin features**
   - Verify user has admin role
   - Check if logged in as correct user

4. **Import errors**
   - Install required dependencies: `pip install python-jose[cryptography] passlib[bcrypt]`

5. **Frontend auth errors**
   - Clear browser localStorage
   - Refresh page and login again

### Debug Mode
Run the authentication test script to verify everything is working:
```bash
python test_auth.py
```

## 🎨 Customization

### Adding New Roles
Edit `auth.py` to add new roles:
```python
# Add new role validation
def require_role(required_role: str):
    # Implementation for custom roles
```

### Custom Token Expiration
Edit `auth.py`:
```python
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # Change from 30 to 60 minutes
```

### Additional User Fields
Extend the `User` model in `auth.py`:
```python
class User(BaseModel):
    username: str
    email: Optional[str] = None
    role: str = "user"
    department: Optional[str] = None  # Add custom fields
    phone: Optional[str] = None
```

## 📈 Next Steps

Consider these future enhancements:
- Two-factor authentication (2FA)
- OAuth integration (Google, Microsoft)
- Password reset functionality
- User profile management
- Session management dashboard
- Audit logging
- Rate limiting for login attempts

## 🆘 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Run `python test_auth.py` to verify system integrity
3. Check server logs for error messages
4. Verify all dependencies are installed

## 🎉 Success!

Your application now has enterprise-grade authentication and user management. The system is secure, scalable, and ready for production use!
