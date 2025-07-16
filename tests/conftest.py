"""
Test configuration and fixtures for Vega.ai backend tests
"""
import pytest
import os
import sys
from fastapi.testclient import TestClient

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

@pytest.fixture
def client():
    """Create a test client for the FastAPI app"""
    return TestClient(app)

@pytest.fixture
def test_user_credentials():
    """Test user credentials"""
    return {
        "username": "test",
        "password": "Testformvp"
    }

@pytest.fixture
def admin_user_credentials():
    """Admin user credentials"""
    return {
        "username": "admin",
        "password": "Testingadminformvp"
    }

@pytest.fixture
def authenticated_headers(client, test_user_credentials):
    """Get authentication headers for test user"""
    response = client.post("/login", json=test_user_credentials)
    if response.status_code == 200:
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    return {}

@pytest.fixture
def admin_headers(client, admin_user_credentials):
    """Get authentication headers for admin user"""
    response = client.post("/login", json=admin_user_credentials)
    if response.status_code == 200:
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    return {}
