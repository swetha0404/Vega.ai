#!/usr/bin/env python3
"""
Startup script for Vega.ai application
"""
import os
import sys
import subprocess
import time

def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import jose
        import passlib
        print("✓ Security dependencies installed")
    except ImportError:
        print("❌ Missing security dependencies")
        print("Installing required dependencies...")
        subprocess.run([sys.executable, "-m", "pip", "install", "python-jose[cryptography]", "passlib[bcrypt]"])
        print("✓ Dependencies installed")

def setup_environment():
    """Set up environment variables"""
    if not os.getenv('JWT_SECRET_KEY'):
        print("⚠️  JWT_SECRET_KEY not set. Using default (not recommended for production)")
        os.environ['JWT_SECRET_KEY'] = 'dev-secret-key-change-in-production'
    
    if not os.getenv('OPENAI_API_KEY'):
        print("⚠️  OPENAI_API_KEY not found in environment")
        
    if not os.getenv('HEYGEN_API_KEY'):
        print("⚠️  HEYGEN_API_KEY not found in environment")

def run_auth_test():
    """Run authentication system test"""
    print("\n🧪 Running authentication tests...")
    result = subprocess.run([sys.executable, "test_auth.py"], capture_output=True, text=True)
    if result.returncode == 0:
        print("✓ Authentication tests passed")
    else:
        print("❌ Authentication tests failed")
        print(result.stdout)
        print(result.stderr)
        return False
    return True

def start_backend():
    """Start the backend server"""
    print("\n🚀 Starting backend server...")
    print("Backend will be available at: http://localhost:8000")
    print("API documentation at: http://localhost:8000/docs")
    print("\nPress Ctrl+C to stop the server")
    
    try:
        subprocess.run([sys.executable, "main.py"])
    except KeyboardInterrupt:
        print("\n👋 Backend server stopped")

def main():
    """Main startup function"""
    print("🧠 Vega.ai Startup Script")
    print("=" * 50)
    
    # Check dependencies
    check_dependencies()
    
    # Setup environment
    setup_environment()
    
    # Run tests
    if not run_auth_test():
        print("❌ Startup failed due to authentication test failure")
        return
    
    # Start backend
    start_backend()

if __name__ == "__main__":
    main()
