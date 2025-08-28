"""Tests for the PingFederate API simulator"""

import pytest
import base64
from fastapi.testclient import TestClient
from datetime import datetime

from ..simulators.pingfed_mock import create_simulator


@pytest.fixture
def client():
    """Create test client for simulator"""
    app = create_simulator()
    return TestClient(app)


def test_get_license_all_instances(client):
    """Test GET /license for all instances"""
    instances = ["pf1", "pf2", "pf3", "pf4", "pf5"]
    
    for instance in instances:
        response = client.get(f"/{instance}/license")
        assert response.status_code == 200
        
        data = response.json()
        assert "issuedTo" in data
        assert "product" in data
        assert "expiryDate" in data
        assert "licenseKeyId" in data
        assert data["product"] == "PingFederate"
        assert data["issuedTo"] == "Acme Corporation"


def test_put_license_with_expiry_format1(client):
    """Test PUT /license with EXPIRY=YYYY-MM-DD format"""
    instance = "pf1"
    
    # Create license content with EXPIRY format
    license_content = """
LICENSE_TYPE=PingFederate
ISSUED_TO=Test Corp
EXPIRY=2026-01-15
FEATURES=SSO,SAML
""".strip()
    
    encoded_license = base64.b64encode(license_content.encode()).decode()
    
    # Apply license
    response = client.put(
        f"/{instance}/license",
        json={"value": encoded_license}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["expiryDate"] == "2026-01-15"
    
    # Verify change persisted
    get_response = client.get(f"/{instance}/license")
    assert get_response.status_code == 200
    get_data = get_response.json()
    assert get_data["expiryDate"] == "2026-01-15"


def test_put_license_with_expiry_format2(client):
    """Test PUT /license with ExpirationDate=YYYY-MM-DD format"""
    instance = "pf2"
    
    # Create license content with ExpirationDate format
    license_content = """
ID=00759624
Product=PingFederate
ExpirationDate=2026-02-03
Organization=Test Corp
""".strip()
    
    encoded_license = base64.b64encode(license_content.encode()).decode()
    
    # Apply license
    response = client.put(
        f"/{instance}/license",
        json={"value": encoded_license}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["expiryDate"] == "2026-02-03"


def test_put_license_no_expiry_defaults(client):
    """Test PUT /license without expiry date defaults to 1 year"""
    instance = "pf3"
    
    # Create license content without expiry
    license_content = """
LICENSE_TYPE=PingFederate
ISSUED_TO=Test Corp
FEATURES=SSO
""".strip()
    
    encoded_license = base64.b64encode(license_content.encode()).decode()
    
    # Apply license
    response = client.put(
        f"/{instance}/license",
        json={"value": encoded_license}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    # Should be approximately 1 year from now
    expiry_date = datetime.strptime(data["expiryDate"], "%Y-%m-%d")
    now = datetime.now()
    days_diff = (expiry_date - now).days
    assert 360 <= days_diff <= 370  # Allow some tolerance


def test_get_license_agreement(client):
    """Test GET /license/agreement"""
    response = client.get("/pf1/license/agreement")
    assert response.status_code == 200
    
    data = response.json()
    assert "link" in data
    assert "accepted" in data
    assert data["accepted"] is True


def test_put_license_agreement(client):
    """Test PUT /license/agreement"""
    new_agreement = {
        "link": "https://custom/agreement",
        "accepted": False
    }
    
    response = client.put("/pf1/license/agreement", json=new_agreement)
    assert response.status_code == 200
    
    data = response.json()
    assert data["link"] == "https://custom/agreement"
    assert data["accepted"] is False


def test_cluster_status(client):
    """Test GET /cluster/status"""
    response = client.get("/cluster/status")
    assert response.status_code == 200
    
    data = response.json()
    assert "nodes" in data
    assert "cluster_state" in data
    assert len(data["nodes"]) == 5


def test_invalid_instance(client):
    """Test accessing non-existent instance"""
    response = client.get("/invalid/license")
    assert response.status_code == 404


def test_invalid_license_data(client):
    """Test PUT with invalid base64 data"""
    response = client.put(
        "/pf1/license",
        json={"value": "invalid-base64!"}
    )
    assert response.status_code == 400
