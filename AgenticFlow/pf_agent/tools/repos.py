"""Repository pattern implementations for data access"""

from typing import List, Optional
from ..domain.models import LicenseRecord, AuditRecord
from .db import get_database, ensure_indexes


class LicenseRepository:
    """Repository for license data operations"""
    
    def __init__(self) -> None:
        self.db = get_database()
        self.collection = self.db.licenses
        ensure_indexes()
    
    def upsert_license(self, record: LicenseRecord) -> None:
        """Insert or update a license record"""
        self.collection.replace_one(
            {"instance_id": record.instance_id},
            record.model_dump(),
            upsert=True
        )
    
    def get_all(self) -> List[LicenseRecord]:
        """Get all license records"""
        documents = self.collection.find().sort("instance_id", 1)
        return [LicenseRecord(**doc) for doc in documents]
    
    def get_by_instance(self, instance_id: str) -> Optional[LicenseRecord]:
        """Get license record by instance ID"""
        doc = self.collection.find_one({"instance_id": instance_id})
        return LicenseRecord(**doc) if doc else None
    
    def get_by_status(self, status: str) -> List[LicenseRecord]:
        """Get all license records with specific status"""
        documents = self.collection.find({"status": status}).sort("expiry_date", 1)
        return [LicenseRecord(**doc) for doc in documents]
    
    def get_expiring_soon(self, days: int = 30) -> List[LicenseRecord]:
        """Get licenses expiring within specified days"""
        documents = self.collection.find(
            {"days_to_expiry": {"$lte": days}}
        ).sort("days_to_expiry", 1)
        return [LicenseRecord(**doc) for doc in documents]


class AuditRepository:
    """Repository for audit trail operations"""
    
    def __init__(self) -> None:
        self.db = get_database()
        self.collection = self.db.audits
        ensure_indexes()
    
    def insert(self, record: AuditRecord) -> None:
        """Insert an audit record"""
        self.collection.insert_one(record.model_dump())
    
    def get_by_instance(self, instance_id: str, limit: int = 100) -> List[AuditRecord]:
        """Get audit records for an instance"""
        documents = self.collection.find(
            {"instance_id": instance_id}
        ).sort("timestamp", -1).limit(limit)
        return [AuditRecord(**doc) for doc in documents]
    
    def get_recent(self, limit: int = 100) -> List[AuditRecord]:
        """Get recent audit records"""
        documents = self.collection.find().sort("timestamp", -1).limit(limit)
        return [AuditRecord(**doc) for doc in documents]
