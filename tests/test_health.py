"""
Test health check endpoint
"""
import pytest

def test_health_check(client):
    """Test the health check endpoint"""
    response = client.get("/health")
    
    assert response.status_code == 200
    
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data
    assert data["service"] == "vega-backend"
    assert data["version"] == "1.0.0"

def test_health_check_response_format(client):
    """Test health check response format"""
    response = client.get("/health")
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/json"
    
    data = response.json()
    required_fields = ["status", "timestamp", "service", "version"]
    
    for field in required_fields:
        assert field in data, f"Missing required field: {field}"
