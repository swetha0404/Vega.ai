"""Tests for core service logic"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone
import tempfile
import os

from ..domain.services import LicenseService
from ..domain.models import LicenseView, LicenseRecord, InstanceSummary
from ..config import InstanceConfig


@pytest.fixture
def mock_dependencies():
    """Mock all service dependencies"""
    with patch('pf_agent.domain.services.LicenseRepository') as mock_license_repo, \
         patch('pf_agent.domain.services.AuditRepository') as mock_audit_repo, \
         patch('pf_agent.domain.services.PFClient') as mock_pf_client, \
         patch('pf_agent.domain.services.config') as mock_config:
        
        yield {
            'license_repo': mock_license_repo.return_value,
            'audit_repo': mock_audit_repo.return_value,
            'pf_client': mock_pf_client.return_value,
            'config': mock_config
        }


def test_refresh_one_success(mock_dependencies):
    """Test successful refresh of single instance"""
    mocks = mock_dependencies
    
    # Setup mock instance
    instance = InstanceConfig(
        id="test-instance",
        name="Test Instance",
        env="test",
        base_url="http://localhost:8080/test"
    )
    mocks['config'].get_instance_by_id.return_value = instance
    
    # Setup mock license response
    license_view = LicenseView(
        issuedTo="Test Corp",
        product="PingFederate",
        expiryDate="2026-01-01",
        licenseKeyId="LIC-TEST-123"
    )
    mocks['pf_client'].get_license.return_value = license_view
    
    service = LicenseService()
    result = service.refresh_one("test-instance")
    
    # Verify API call
    mocks['pf_client'].get_license.assert_called_once_with(instance)
    
    # Verify repository operations
    mocks['license_repo'].upsert_license.assert_called_once()
    mocks['audit_repo'].insert.assert_called_once()
    
    # Verify result
    assert result['instance_id'] == "test-instance"
    assert 'status' in result
    assert 'days_to_expiry' in result


def test_refresh_all_success(mock_dependencies):
    """Test successful refresh of all instances"""
    mocks = mock_dependencies
    
    # Setup mock instances
    instances = [
        InstanceConfig(id="test-1", name="Test 1", env="test", base_url="http://localhost:8080/test1"),
        InstanceConfig(id="test-2", name="Test 2", env="test", base_url="http://localhost:8080/test2")
    ]
    mocks['config'].get_instances.return_value = instances
    mocks['config'].get_instance_by_id.side_effect = lambda id: next(i for i in instances if i.id == id)
    
    # Setup mock license responses
    license_view = LicenseView(
        issuedTo="Test Corp",
        product="PingFederate", 
        expiryDate="2026-01-01",
        licenseKeyId="LIC-TEST"
    )
    mocks['pf_client'].get_license.return_value = license_view
    
    service = LicenseService()
    results = service.refresh_all()
    
    # Verify all instances processed
    assert len(results) == 2
    assert mocks['pf_client'].get_license.call_count == 2
    assert mocks['license_repo'].upsert_license.call_count == 2


def test_apply_license_success(mock_dependencies):
    """Test successful license application"""
    mocks = mock_dependencies
    
    # Setup mock instance
    instance = InstanceConfig(
        id="test-instance",
        name="Test Instance", 
        env="test",
        base_url="http://localhost:8080/test"
    )
    mocks['config'].get_instance_by_id.return_value = instance
    
    # Create temporary license file
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.lic') as f:
        f.write("EXPIRY=2026-06-01\nProduct=PingFederate")
        license_file_path = f.name
    
    try:
        # Setup mock responses
        updated_license = LicenseView(
            issuedTo="Test Corp",
            product="PingFederate",
            expiryDate="2026-06-01",
            licenseKeyId="LIC-NEW-123"
        )
        mocks['pf_client'].put_license.return_value = updated_license
        mocks['pf_client'].get_license.return_value = updated_license
        
        service = LicenseService()
        result = service.apply_license("test-instance", license_file_path)
        
        # Verify API calls
        mocks['pf_client'].put_license.assert_called_once()
        mocks['pf_client'].get_license.assert_called_once()
        
        # Verify repository operations
        mocks['license_repo'].upsert_license.assert_called_once()
        mocks['audit_repo'].insert.assert_called_once()
        
        # Verify result
        assert isinstance(result, InstanceSummary)
        assert result.instance_id == "test-instance"
        assert result.expiry_date == "2026-06-01"
        
    finally:
        # Clean up temp file
        os.unlink(license_file_path)


def test_get_all_licenses(mock_dependencies):
    """Test getting all licenses from cache"""
    mocks = mock_dependencies
    
    # Setup mock records
    mock_records = [
        LicenseRecord(
            instance_id="test-1",
            instance_name="Test 1",
            env="test",
            license_key_id="LIC-1",
            issued_to="Test Corp",
            product="PingFederate",
            expiry_date="2026-01-01",
            days_to_expiry=100,
            status="OK",
            last_synced_at="2025-08-23T10:00:00Z"
        )
    ]
    mocks['license_repo'].get_all.return_value = mock_records
    
    service = LicenseService()
    results = service.get_all_licenses()
    
    assert len(results) == 1
    assert results[0]['instance_id'] == "test-1"
    mocks['license_repo'].get_all.assert_called_once()


def test_get_license_by_instance(mock_dependencies):
    """Test getting specific license from cache"""
    mocks = mock_dependencies
    
    # Setup mock record
    mock_record = LicenseRecord(
        instance_id="test-instance",
        instance_name="Test Instance",
        env="test", 
        license_key_id="LIC-TEST",
        issued_to="Test Corp",
        product="PingFederate",
        expiry_date="2026-01-01",
        days_to_expiry=100,
        status="OK",
        last_synced_at="2025-08-23T10:00:00Z"
    )
    mocks['license_repo'].get_by_instance.return_value = mock_record
    
    service = LicenseService()
    result = service.get_license("test-instance")
    
    assert result['instance_id'] == "test-instance"
    mocks['license_repo'].get_by_instance.assert_called_once_with("test-instance")


def test_get_license_not_found(mock_dependencies):
    """Test getting non-existent license"""
    mocks = mock_dependencies
    
    mocks['license_repo'].get_by_instance.return_value = None
    
    service = LicenseService()
    
    with pytest.raises(ValueError, match="No license data found"):
        service.get_license("non-existent")


def test_apply_license_file_not_found(mock_dependencies):
    """Test applying license with non-existent file"""
    mocks = mock_dependencies
    
    instance = InstanceConfig(
        id="test-instance",
        name="Test Instance",
        env="test", 
        base_url="http://localhost:8080/test"
    )
    mocks['config'].get_instance_by_id.return_value = instance
    
    service = LicenseService()
    
    with pytest.raises(FileNotFoundError):
        service.apply_license("test-instance", "/non/existent/file.lic")
