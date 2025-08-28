"""Core business services for license management"""

import base64
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional

from .models import LicenseRecord, AuditRecord, InstanceSummary
from .mapping import to_record
from ..config import config
from ..tools.pf_client import PFClient

# Choose storage backend based on configuration
if config.use_file_storage:
    from ..tools.file_repos import FileLicenseRepository as LicenseRepository, FileAuditRepository as AuditRepository
    print("📁 Using file-based storage (MongoDB disabled)")
else:
    try:
        from ..tools.repos import LicenseRepository, AuditRepository
        print("🗄️  Using MongoDB storage")
    except Exception as e:
        print(f"⚠️  MongoDB connection failed ({e}), falling back to file storage")
        from ..tools.file_repos import FileLicenseRepository as LicenseRepository, FileAuditRepository as AuditRepository


class LicenseService:
    """Core license management service"""
    
    def __init__(self) -> None:
        self.license_repo = LicenseRepository()
        self.audit_repo = AuditRepository()
        self.pf_client = PFClient()
    
    def refresh_all(self) -> List[Dict[str, Any]]:
        """Refresh license data for all instances from APIs"""
        instances = config.get_instances()
        results = []
        
        for instance in instances:
            try:
                result = self.refresh_one(instance.id)
                results.append(result)
            except Exception as e:
                # Log error but continue with other instances
                print(f"Error refreshing {instance.id}: {e}")
                
        return results
    
    def refresh_one(self, instance_id: str) -> Dict[str, Any]:
        """Refresh license data for a single instance"""
        instance = config.get_instance_by_id(instance_id)
        
        # Get license from API
        license_view = self.pf_client.get_license(instance)
        
        # Convert to domain model
        record = to_record(license_view, instance)
        
        # Store in repository
        self.license_repo.upsert_license(record)
        
        # Create audit record
        audit = AuditRecord(
            timestamp=datetime.now(timezone.utc).isoformat(),
            actor="system",
            action="refresh",
            instance_id=instance_id,
            details={
                "status": record.status,
                "days_to_expiry": record.days_to_expiry,
                "expiry_date": record.expiry_date
            }
        )
        self.audit_repo.insert(audit)
        
        return {
            "instance_id": record.instance_id,
            "status": record.status,
            "days_to_expiry": record.days_to_expiry,
            "expiry_date": record.expiry_date
        }
    
    def apply_license(self, instance_id: str, file_path: str) -> InstanceSummary:
        """Apply a new license to an instance"""
        instance = config.get_instance_by_id(instance_id)
        
        # Read and encode license file
        with open(file_path, 'rb') as f:
            license_content = f.read()
        
        encoded_license = base64.b64encode(license_content).decode('utf-8')
        
        # Apply license via API
        self.pf_client.put_license(instance, encoded_license)
        
        # Re-fetch to confirm update
        license_view = self.pf_client.get_license(instance)
        record = to_record(license_view, instance)
        
        # Update repository
        self.license_repo.upsert_license(record)
        
        # Create audit record
        audit = AuditRecord(
            timestamp=datetime.now(timezone.utc).isoformat(),
            actor="user:admin",  # In real implementation, get from auth
            action="apply_license",
            instance_id=instance_id,
            details={
                "file_path": file_path,
                "new_expiry": record.expiry_date,
                "status": record.status
            }
        )
        self.audit_repo.insert(audit)
        
        return InstanceSummary(
            instance_id=record.instance_id,
            expiry_date=record.expiry_date,
            status=record.status,
            days_to_expiry=record.days_to_expiry
        )
    
    def get_all_licenses(self) -> List[Dict[str, Any]]:
        """Get all license records from cache"""
        records = self.license_repo.get_all()
        return [record.model_dump() for record in records]
    
    def get_license(self, instance_id: str) -> Dict[str, Any]:
        """Get license record for specific instance from cache"""
        record = self.license_repo.get_by_instance(instance_id)
        if not record:
            raise ValueError(f"No license data found for instance: {instance_id}")
        return record.model_dump()
