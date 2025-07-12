# Enhanced Authentication System

## Overview
The authentication system has been upgraded from basic username/password validation to a secure JWT-based authentication system with proper password hashing and role-based access control.

## Key Features

### 1. JWT Token Authentication
- **Secure tokens**: Uses JSON Web Tokens (JWT) for stateless authentication
- **Token expiration**: Tokens expire after 30 minutes by default
- **Bearer token format**: Standard Authorization header format

### 2. Password Security
- **Password hashing**: Uses bcrypt for secure password storage
- **No plain text passwords**: All passwords are hashed before storage
- **Salt included**: Each password gets a unique salt

### 3. Role-Based Access Control
- **User roles**: Support for 'user' and 'admin' roles
- **Route protection**: Different endpoints require different permission levels
- **Admin-only features**: User management is restricted to admin users

### 4. User Management
- **Database storage**: Users stored in JSON file with proper structure
- **CRUD operations**: Create, read, update, delete users
- **Admin interface**: Web-based user management for admins

## Installation

1. Install required dependencies:
```bash
pip install python-jose[cryptography] passlib[bcrypt]
```

2. The system will automatically create default users from your `config.yaml` file or create a default admin user.

## API Endpoints

### Authentication Endpoints
- `POST /login` - Authenticate user and get JWT token
- `GET /profile` - Get current user profile (requires auth)

### User Management Endpoints (Admin only)
- `GET /users` - List all users
- `POST /users` - Create new user
- `DELETE /users/{username}` - Delete user

### Protected Endpoints
All chat and file upload endpoints now require authentication:
- `POST /chat` - Chat with basic chatbot
- `POST /Agentchat` - Chat with advanced AI agent
- `POST /upload/pdf` - Upload PDF files
- `POST /upload/docx` - Upload DOCX files
- `POST /upload/ppt` - Upload PPT files

## Frontend Integration

### Authentication Flow
1. User enters credentials on login page
2. Frontend receives JWT token on successful login
3. Token stored in localStorage
4. All API requests include Authorization header
5. Automatic logout on token expiration

### New Components
- `UserManagement.jsx` - Admin interface for managing users
- `auth.js` - Authentication utility functions
- Enhanced `LoginPage.jsx` - Updated to handle JWT tokens

## Security Features

### Token Security
- **Expiration**: 30-minute token lifetime
- **Secure headers**: Proper CORS and security headers
- **Automatic logout**: Expired tokens trigger logout

### Password Security
- **Bcrypt hashing**: Industry-standard password hashing
- **Salt per password**: Each password gets unique salt
- **No password exposure**: Passwords never sent in responses

### Route Protection
- **Middleware**: Authentication middleware on all protected routes
- **Role checking**: Admin-only routes verify user role
- **Automatic redirects**: Unauthenticated users redirected to login

## Configuration

### Environment Variables
```bash
JWT_SECRET_KEY=your-secret-key-here  # Change this in production!
```

### Default Users
The system will create users from your `config.yaml` file. If no users exist, it creates a default admin:
- Username: `admin`
- Password: `admin123`
- Role: `admin`

**Important**: Change the default password immediately in production!

## Usage Examples

### Login (Frontend)
```javascript
const response = await fetch('/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' })
});

const data = await response.json();
localStorage.setItem('authToken', data.access_token);
```

### Authenticated Request (Frontend)
```javascript
const response = await fetch('/Agentchat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
  },
  body: JSON.stringify({ question: 'Hello' })
});
```

### Create User (Admin)
```javascript
const response = await fetch('/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    username: 'newuser',
    password: 'securepassword',
    email: 'user@example.com',
    role: 'user'
  })
});
```

## Migration from Old System

### Database Migration
The system automatically migrates users from `config.yaml` to the new JSON-based storage on first run.

### Frontend Changes
- Login now returns JWT token instead of success boolean
- All API calls need Authorization header
- User information stored in localStorage instead of sessionStorage

### Backward Compatibility
- Old config.yaml format still supported for initial user creation
- Existing functionality preserved with added authentication

## Security Best Practices

1. **Change default passwords**: Always change default admin password
2. **Use environment variables**: Set JWT_SECRET_KEY in production
3. **Regular token rotation**: Consider shorter token lifetimes for high-security environments
4. **HTTPS only**: Always use HTTPS in production
5. **Monitor failed attempts**: Log and monitor authentication failures

## Troubleshooting

### Common Issues
1. **Import errors**: Install required dependencies
2. **Token expired**: Tokens expire after 30 minutes
3. **Permission denied**: Check user role for admin features
4. **Login fails**: Verify username/password and check server logs

### Testing
Run the authentication test script:
```bash
python test_auth.py
```

## Future Enhancements

Potential future improvements:
- Two-factor authentication (2FA)
- OAuth integration (Google, Microsoft, etc.)
- Password reset functionality
- User profile management
- Session management dashboard
- Audit logging
- Rate limiting for login attempts
