"""File-based repository implementation for testing without MongoDB"""

import json
import os
from datetime import datetime
from typing import List, Optional
from pathlib import Path

from ..domain.models import LicenseRecord, AuditRecord


class FileLicenseRepository:
    """File-based license repository for testing"""
    
    def __init__(self, data_dir: str = "data") -> None:
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.licenses_file = self.data_dir / "licenses.json"
        self.audits_file = self.data_dir / "audits.json"
    
    def _load_licenses(self) -> List[dict]:
        """Load licenses from JSON file"""
        if not self.licenses_file.exists():
            return []
        
        with open(self.licenses_file, 'r') as f:
            return json.load(f)
    
    def _save_licenses(self, licenses: List[dict]) -> None:
        """Save licenses to JSON file"""
        with open(self.licenses_file, 'w') as f:
            json.dump(licenses, f, indent=2)
    
    def upsert_license(self, record: LicenseRecord) -> None:
        """Insert or update a license record"""
        licenses = self._load_licenses()
        
        # Find existing record
        for i, lic in enumerate(licenses):
            if lic.get('instance_id') == record.instance_id:
                licenses[i] = record.model_dump()
                break
        else:
            # Not found, append new
            licenses.append(record.model_dump())
        
        self._save_licenses(licenses)
    
    def get_all(self) -> List[LicenseRecord]:
        """Get all license records"""
        licenses = self._load_licenses()
        return [LicenseRecord(**lic) for lic in licenses]
    
    def get_by_instance(self, instance_id: str) -> Optional[LicenseRecord]:
        """Get license record by instance ID"""
        licenses = self._load_licenses()
        for lic in licenses:
            if lic.get('instance_id') == instance_id:
                return LicenseRecord(**lic)
        return None


class FileAuditRepository:
    """File-based audit repository for testing"""
    
    def __init__(self, data_dir: str = "data") -> None:
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.audits_file = self.data_dir / "audits.json"
    
    def _load_audits(self) -> List[dict]:
        """Load audits from JSON file"""
        if not self.audits_file.exists():
            return []
        
        with open(self.audits_file, 'r') as f:
            return json.load(f)
    
    def _save_audits(self, audits: List[dict]) -> None:
        """Save audits to JSON file"""
        with open(self.audits_file, 'w') as f:
            json.dump(audits, f, indent=2)
    
    def insert(self, record: AuditRecord) -> None:
        """Insert an audit record"""
        audits = self._load_audits()
        audits.append(record.model_dump())
        
        # Keep only last 1000 audit records
        if len(audits) > 1000:
            audits = audits[-1000:]
        
        self._save_audits(audits)
    
    def get_recent(self, limit: int = 100) -> List[AuditRecord]:
        """Get recent audit records"""
        audits = self._load_audits()
        recent = audits[-limit:] if len(audits) > limit else audits
        return [AuditRecord(**audit) for audit in reversed(recent)]
