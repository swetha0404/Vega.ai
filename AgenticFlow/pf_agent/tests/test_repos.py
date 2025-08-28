"""Tests for repository classes"""

import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timezone

from ..domain.models import LicenseRecord, AuditRecord
from ..tools.repos import LicenseRepository, AuditRepository


@pytest.fixture
def mock_db():
    """Mock database for testing"""
    db = Mock()
    collection = Mock()
    db.licenses = collection
    db.audits = collection
    return db, collection


@patch('pf_agent.tools.repos.get_database')
def test_license_repository_upsert(mock_get_db, mock_db):
    """Test license repository upsert operation"""
    db, collection = mock_db
    mock_get_db.return_value = db
    
    repo = LicenseRepository()
    
    record = LicenseRecord(
        instance_id="test-instance",
        instance_name="Test Instance",
        env="test",
        license_key_id="LIC-TEST-123",
        issued_to="Test Corp",
        product="PingFederate",
        expiry_date="2026-01-01",
        days_to_expiry=100,
        status="OK",
        last_synced_at=datetime.now(timezone.utc).isoformat()
    )
    
    repo.upsert_license(record)
    
    collection.replace_one.assert_called_once()
    args, kwargs = collection.replace_one.call_args
    assert args[0] == {"instance_id": "test-instance"}
    assert kwargs["upsert"] is True


@patch('pf_agent.tools.repos.get_database')
def test_license_repository_get_all(mock_get_db, mock_db):
    """Test getting all license records"""
    db, collection = mock_db
    mock_get_db.return_value = db
    
    # Mock cursor with sort
    mock_cursor = Mock()
    collection.find.return_value = mock_cursor
    mock_cursor.sort.return_value = [
        {
            "instance_id": "test-1",
            "instance_name": "Test 1",
            "env": "test",
            "license_key_id": "LIC-1",
            "issued_to": "Test Corp",
            "product": "PingFederate",
            "expiry_date": "2026-01-01",
            "days_to_expiry": 100,
            "status": "OK",
            "last_synced_at": "2025-08-23T10:00:00Z",
            "source": "pf-api"
        }
    ]
    
    repo = LicenseRepository()
    records = repo.get_all()
    
    assert len(records) == 1
    assert records[0].instance_id == "test-1"
    collection.find.assert_called_once()
    mock_cursor.sort.assert_called_once_with("instance_id", 1)


@patch('pf_agent.tools.repos.get_database')
def test_license_repository_get_by_instance(mock_get_db, mock_db):
    """Test getting license by instance ID"""
    db, collection = mock_db
    mock_get_db.return_value = db
    
    collection.find_one.return_value = {
        "instance_id": "test-instance",
        "instance_name": "Test Instance", 
        "env": "test",
        "license_key_id": "LIC-TEST",
        "issued_to": "Test Corp",
        "product": "PingFederate",
        "expiry_date": "2026-01-01",
        "days_to_expiry": 100,
        "status": "OK",
        "last_synced_at": "2025-08-23T10:00:00Z",
        "source": "pf-api"
    }
    
    repo = LicenseRepository()
    record = repo.get_by_instance("test-instance")
    
    assert record is not None
    assert record.instance_id == "test-instance"
    collection.find_one.assert_called_once_with({"instance_id": "test-instance"})


@patch('pf_agent.tools.repos.get_database')
def test_license_repository_get_by_instance_not_found(mock_get_db, mock_db):
    """Test getting non-existent license"""
    db, collection = mock_db
    mock_get_db.return_value = db
    
    collection.find_one.return_value = None
    
    repo = LicenseRepository()
    record = repo.get_by_instance("non-existent")
    
    assert record is None


@patch('pf_agent.tools.repos.get_database')
def test_audit_repository_insert(mock_get_db, mock_db):
    """Test audit record insertion"""
    db, collection = mock_db
    mock_get_db.return_value = db
    
    repo = AuditRepository()
    
    record = AuditRecord(
        timestamp="2025-08-23T10:00:00Z",
        actor="test-user",
        action="refresh",
        instance_id="test-instance",
        details={"status": "OK"}
    )
    
    repo.insert(record)
    
    collection.insert_one.assert_called_once()
    args = collection.insert_one.call_args[0]
    assert args[0]["actor"] == "test-user"
    assert args[0]["action"] == "refresh"


@patch('pf_agent.tools.repos.get_database')
def test_audit_repository_get_recent(mock_get_db, mock_db):
    """Test getting recent audit records"""
    db, collection = mock_db
    mock_get_db.return_value = db
    
    # Mock cursor with chained methods
    mock_cursor = Mock()
    collection.find.return_value = mock_cursor
    mock_cursor.sort.return_value = mock_cursor
    mock_cursor.limit.return_value = [
        {
            "timestamp": "2025-08-23T10:00:00Z",
            "actor": "system",
            "action": "refresh",
            "instance_id": "test-1",
            "details": {"status": "OK"}
        }
    ]
    
    repo = AuditRepository()
    records = repo.get_recent(50)
    
    assert len(records) == 1
    assert records[0].actor == "system"
    collection.find.assert_called_once()
    mock_cursor.sort.assert_called_once_with("timestamp", -1)
    mock_cursor.limit.assert_called_once_with(50)
