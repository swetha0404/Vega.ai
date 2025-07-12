# 👤 User Management & Authentication Components

## 📋 **What You Have Now**

Based on your `users.json` file, you have a working authentication system with:

### **Current Users:**
- **Admin User**: `admin` (can manage other users)
- **Regular User**: `test` (standard user access)

### **User Data Structure:**
```json
{
  "username": "admin",
  "email": null,
  "role": "admin", 
  "is_active": true,
  "created_at": "2025-07-12T15:46:52.498151",
  "last_login": "2025-07-12T15:59:35.493326",
  "hashed_password": "$2b$12$egRc4WkkPg6tvQxpDvuv/u7EUk5QbZrAL0Z6iHNVRTHW2p6Bqllg6"
}
```

## 🔐 **Authentication Components**

### **1. auth.js** 
**Location:** `frontend/src/utils/auth.js`
**Purpose:** Core authentication utilities
- `auth.getToken()` - Get JWT token
- `auth.isAuthenticated()` - Check if user is logged in
- `auth.isAdmin()` - Check if user is admin
- `auth.logout()` - Logout user

### **2. authComponents.jsx**
**Location:** `frontend/src/utils/authComponents.jsx`
**Purpose:** React components for route protection
- `withAuth(Component)` - Protect routes requiring login
- `withAdminAuth(Component)` - Protect admin-only routes

### **3. UserManagement.jsx**
**Location:** `frontend/src/components/UserManagement.jsx`
**Purpose:** Admin interface for managing users
- Create new users
- View all users
- Delete users
- Manage user roles

## 🌐 **How to Access User Management**

### **Option 1: Direct URL (Recommended)**
1. Make sure your backend is running: `python main.py`
2. Make sure your frontend is running: `cd frontend && npm run dev`
3. Login as admin: `http://localhost:5173/login`
   - Username: `admin`
   - Password: `admin123` (from your config.yaml)
4. Navigate to: `http://localhost:5173/users`

### **Option 2: Through Sidebar Navigation**
1. Login as admin
2. Look for "User Management" in the sidebar
3. Click to access the interface

## 🎯 **User Management Features**

### **Admin Dashboard:**
- **View Users**: See all users with their roles, status, and last login
- **Create Users**: Add new users with username, password, email, and role
- **Delete Users**: Remove users from the system
- **Role Management**: Assign 'user' or 'admin' roles

### **User Information Display:**
- Username
- Email address
- Role (User/Admin)
- Status (Active/Inactive)
- Creation date
- Last login date

### **Actions Available:**
- ✅ Create new users
- ✅ View user details
- ✅ Delete users
- ✅ Role assignment
- ❌ Cannot delete your own account (security feature)

## 🛡️ **Security Features**

### **Access Control:**
- Only admin users can access User Management
- Regular users see "Access Denied" message
- Automatic redirect to login if not authenticated

### **Current Roles:**
- **Admin**: Full access to all features + user management
- **User**: Access to chat and basic features only

## 🚀 **Getting Started**

1. **Start the backend:**
   ```bash
   python main.py
   ```

2. **Start the frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Login as admin:**
   - Go to `http://localhost:5173/login`
   - Username: `admin`
   - Password: `admin123`

4. **Access User Management:**
   - Method 1: Navigate to `http://localhost:5173/users`
   - Method 2: Click "User Management" in the sidebar

## 📊 **What You'll See**

### **User Management Interface:**
```
┌─────────────────────────────────────────────────────────────┐
│                     User Management                         │
│                                      [Create User]         │
├─────────────────────────────────────────────────────────────┤
│ Username │ Email │ Role  │ Status │ Created │ Last Login │   │
├─────────────────────────────────────────────────────────────┤
│ admin    │ N/A   │ Admin │ Active │ 7/12/25 │ 7/12/25    │[X]│
│ test     │ N/A   │ User  │ Active │ 7/12/25 │ Never      │[X]│
└─────────────────────────────────────────────────────────────┘
```

### **Create User Form:**
```
┌─────────────────────────────────────────────────────────────┐
│                    Create New User                          │
├─────────────────────────────────────────────────────────────┤
│ Username: [________________]                                │
│ Password: [________________]                                │
│ Email:    [________________]                                │
│ Role:     [User ▼]                                         │
│                                                             │
│ [Create User] [Cancel]                                      │
└─────────────────────────────────────────────────────────────┘
```

## 🎨 **Customization Options**

### **Adding More User Fields:**
Edit `auth.py` to add fields like department, phone, etc.

### **Custom Roles:**
Add more roles beyond 'user' and 'admin'

### **UI Styling:**
Modify `userManagement.css` to match your design

## 🔧 **Troubleshooting**

### **Can't Access User Management:**
- Ensure you're logged in as admin
- Check browser console for errors
- Verify backend is running on port 8000

### **"Access Denied" Message:**
- You're not logged in as admin
- Login with admin credentials

### **User Management Not in Sidebar:**
- Clear browser cache
- Ensure you're using the updated sidebar component

## 🎉 **Success!**

You now have a complete user management system! Admin users can create, view, and manage all user accounts through a clean, modern interface.

**Remember:** Change the default admin password immediately for security!
