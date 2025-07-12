#!/usr/bin/env python3
"""
Simple test script to verify authentication system
"""
import sys
import os

# Add the agenbotc directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'agenbotc'))

try:
    from auth import user_manager, create_access_token
    print("✓ Authentication modules imported successfully")
    
    # Test user manager initialization
    print(f"✓ User manager initialized with {len(user_manager.users_db)} users")
    
    # List current users
    users = user_manager.list_users()
    print(f"✓ Current users: {[user.username for user in users]}")
    
    # Test password hashing
    test_password = "test123"
    hashed = user_manager.hash_password(test_password)
    print(f"✓ Password hashing works: {len(hashed)} characters")
    
    # Test password verification
    is_valid = user_manager.verify_password(test_password, hashed)
    print(f"✓ Password verification works: {is_valid}")
    
    # Test token creation
    token = create_access_token(data={"sub": "test_user"})
    print(f"✓ JWT token creation works: {len(token)} characters")
    
    print("\n🎉 All authentication tests passed!")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("You may need to install the required dependencies:")
    print("pip install python-jose[cryptography] passlib[bcrypt]")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
