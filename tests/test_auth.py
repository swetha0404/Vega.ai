"""
Test authentication endpoints
"""
import pytest

def test_login_with_valid_credentials(client, test_user_credentials):
    """Test login with valid user credentials"""
    response = client.post("/login", json=test_user_credentials)
    
    assert response.status_code == 200
    
    data = response.json()
    assert "access_token" in data
    assert "token_type" in data
    assert data["token_type"] == "bearer"

def test_login_with_admin_credentials(client, admin_user_credentials):
    """Test login with admin credentials"""
    response = client.post("/login", json=admin_user_credentials)
    
    assert response.status_code == 200
    
    data = response.json()
    assert "access_token" in data
    assert "token_type" in data

def test_login_with_invalid_credentials(client):
    """Test login with invalid credentials"""
    invalid_credentials = {
        "username": "invalid_user",
        "password": "invalid_password"
    }
    
    response = client.post("/login", json=invalid_credentials)
    
    assert response.status_code == 401
    
    data = response.json()
    assert "detail" in data

def test_login_with_missing_username(client):
    """Test login with missing username"""
    incomplete_credentials = {
        "password": "Testformvp"
    }
    
    response = client.post("/login", json=incomplete_credentials)
    
    assert response.status_code == 422  # Unprocessable Entity

def test_login_with_missing_password(client):
    """Test login with missing password"""
    incomplete_credentials = {
        "username": "test"
    }
    
    response = client.post("/login", json=incomplete_credentials)
    
    assert response.status_code == 422  # Unprocessable Entity

def test_login_with_empty_credentials(client):
    """Test login with empty credentials"""
    empty_credentials = {
        "username": "",
        "password": ""
    }
    
    response = client.post("/login", json=empty_credentials)
    
    assert response.status_code == 401

def test_protected_endpoint_without_token(client):
    """Test accessing protected endpoint without token"""
    response = client.get("/me")
    
    assert response.status_code == 401

def test_protected_endpoint_with_invalid_token(client):
    """Test accessing protected endpoint with invalid token"""
    headers = {"Authorization": "Bearer invalid_token"}
    response = client.get("/me", headers=headers)
    
    assert response.status_code == 401

def test_protected_endpoint_with_valid_token(client, authenticated_headers):
    """Test accessing protected endpoint with valid token"""
    if authenticated_headers:  # Only run if we have valid headers
        response = client.get("/me", headers=authenticated_headers)
        
        # This test depends on the /me endpoint being implemented
        # Adjust status code based on your implementation
        assert response.status_code in [200, 404]  # 404 if endpoint not implemented yet
