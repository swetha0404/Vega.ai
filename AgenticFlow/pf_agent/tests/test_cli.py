"""Tests for CLI interface"""

import pytest
from typer.testing import CliRunner
from unittest.mock import patch, Mock
import tempfile
import os

from ..cli import app


@pytest.fixture
def runner():
    """Create CLI test runner"""
    return CliRunner()


@patch('pf_agent.cli.LicenseService')
def test_license_get_all(mock_service_class, runner):
    """Test pf-agent license get command"""
    mock_service = Mock()
    mock_service_class.return_value = mock_service
    
    # Mock license data
    mock_service.get_all_licenses.return_value = [
        {
            'instance_id': 'test-1',
            'env': 'test',
            'issued_to': 'Test Corp',
            'product': 'PingFederate',
            'expiry_date': '2026-01-01T00:00:00Z',
            'days_to_expiry': 100,
            'status': 'OK',
            'last_synced_at': '2025-08-23T10:00:00Z'
        }
    ]
    
    result = runner.invoke(app, ["license", "get"])
    
    assert result.exit_code == 0
    assert "test-1" in result.stdout
    assert "OK" in result.stdout
    mock_service.get_all_licenses.assert_called_once()


@patch('pf_agent.cli.LicenseService')
def test_license_get_specific_instance(mock_service_class, runner):
    """Test pf-agent license get --instance command"""
    mock_service = Mock()
    mock_service_class.return_value = mock_service
    
    # Mock license data for specific instance
    mock_service.get_license.return_value = {
        'instance_id': 'test-instance',
        'env': 'test',
        'issued_to': 'Test Corp',
        'product': 'PingFederate',
        'expiry_date': '2026-01-01T00:00:00Z',
        'days_to_expiry': 100,
        'status': 'OK',
        'last_synced_at': '2025-08-23T10:00:00Z'
    }
    
    result = runner.invoke(app, ["license", "get", "--instance", "test-instance"])
    
    assert result.exit_code == 0
    assert "test-instance" in result.stdout
    mock_service.get_license.assert_called_once_with("test-instance")


@patch('pf_agent.cli.LicenseService')
def test_license_apply(mock_service_class, runner):
    """Test pf-agent license apply command"""
    mock_service = Mock()
    mock_service_class.return_value = mock_service
    
    # Create temporary license file
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.lic') as f:
        f.write("EXPIRY=2026-06-01\nProduct=PingFederate")
        license_file_path = f.name
    
    try:
        # Mock successful application
        from ..domain.models import InstanceSummary
        mock_service.apply_license.return_value = InstanceSummary(
            instance_id="test-instance",
            expiry_date="2026-06-01",
            status="OK",
            days_to_expiry=200
        )
        
        result = runner.invoke(app, [
            "license", "apply", 
            "--instance", "test-instance",
            "--file", license_file_path
        ])
        
        assert result.exit_code == 0
        assert "License applied successfully" in result.stdout
        assert "test-instance" in result.stdout
        mock_service.apply_license.assert_called_once_with("test-instance", license_file_path)
        
    finally:
        os.unlink(license_file_path)


def test_license_apply_file_not_found(runner):
    """Test license apply with non-existent file"""
    result = runner.invoke(app, [
        "license", "apply",
        "--instance", "test-instance", 
        "--file", "/non/existent/file.lic"
    ])
    
    assert result.exit_code == 1
    assert "License file not found" in result.stdout


@patch('pf_agent.cli.LicenseService')
def test_refresh_command(mock_service_class, runner):
    """Test pf-agent refresh command"""
    mock_service = Mock()
    mock_service_class.return_value = mock_service
    
    # Mock refresh results
    mock_service.refresh_all.return_value = [
        {
            'instance_id': 'test-1',
            'status': 'OK',
            'days_to_expiry': 100,
            'expiry_date': '2026-01-01'
        },
        {
            'instance_id': 'test-2', 
            'status': 'WARNING',
            'days_to_expiry': 15,
            'expiry_date': '2025-09-07'
        }
    ]
    
    result = runner.invoke(app, ["refresh"])
    
    assert result.exit_code == 0
    assert "Refresh completed: 2 instances processed" in result.stdout
    assert "1 instances with warnings" in result.stdout
    mock_service.refresh_all.assert_called_once()


@patch('pf_agent.cli.route_intent')
def test_run_command_with_nl(mock_route_intent, runner):
    """Test pf-agent run command with natural language"""
    mock_route_intent.return_value = "License status retrieved successfully"
    
    result = runner.invoke(app, ["run", "check license status"])
    
    assert result.exit_code == 0
    assert "License status retrieved successfully" in result.stdout
    mock_route_intent.assert_called_once_with("check license status", None)


@patch('pf_agent.cli._show_license_status')
def test_run_command_no_nl(mock_show_status, runner):
    """Test pf-agent run command with --no-nl flag"""
    result = runner.invoke(app, ["run", "check license", "--no-nl"])
    
    assert result.exit_code == 0
    mock_show_status.assert_called_once_with(None)


@patch('pf_agent.cli.run_simulator')
def test_simulate_up_command(mock_run_simulator, runner):
    """Test pf-agent simulate up command"""
    # Mock to avoid actually starting server
    mock_run_simulator.side_effect = KeyboardInterrupt()
    
    result = runner.invoke(app, ["simulate", "up"])
    
    # Should start but be interrupted
    assert "Starting PingFederate API simulator" in result.stdout
    mock_run_simulator.assert_called_once_with(8080)


def test_simulate_up_custom_port(runner):
    """Test pf-agent simulate up with custom port"""
    with patch('pf_agent.cli.run_simulator') as mock_run_simulator:
        mock_run_simulator.side_effect = KeyboardInterrupt()
        
        result = runner.invoke(app, ["simulate", "up", "--port", "9090"])
        
        assert "simulator on port 9090" in result.stdout
        mock_run_simulator.assert_called_once_with(9090)


@patch('pf_agent.cli.LicenseService')
def test_license_get_no_data(mock_service_class, runner):
    """Test license get with no data in cache"""
    mock_service = Mock()
    mock_service_class.return_value = mock_service
    
    mock_service.get_all_licenses.return_value = []
    
    result = runner.invoke(app, ["license", "get"])
    
    assert result.exit_code == 0
    assert "No license data found" in result.stdout
    assert "Run 'pf-agent refresh' first" in result.stdout
