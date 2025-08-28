"""Domain models for PF Agent"""

from datetime import datetime
from typing import Optional, Literal, Dict, Any
from pydantic import BaseModel, Field


class LicenseView(BaseModel):
    """API response model matching PingFederate swagger"""
    issuedTo: str
    product: str
    expiryDate: str  # ISO date
    licenseKeyId: str


class LicenseRecord(BaseModel):
    """Internal license record stored in MongoDB"""
    instance_id: str
    instance_name: str
    env: str
    license_key_id: str
    issued_to: str
    product: str
    expiry_date: str  # ISO date
    days_to_expiry: int
    status: Literal["OK", "WARNING", "EXPIRED"]
    last_synced_at: str  # ISO datetime
    source: Literal["pf-api", "manual"] = "pf-api"


class AuditRecord(BaseModel):
    """Audit trail record"""
    timestamp: str  # ISO datetime
    actor: str  # "system" or "user:<name>"
    action: Literal["refresh", "apply_license"]
    instance_id: str
    details: Dict[str, Any]


class ApplyLicenseRequest(BaseModel):
    """Request to apply a license"""
    value: str  # base64 encoded license file


class LicenseAgreement(BaseModel):
    """License agreement model"""
    link: str = "https://example/license-agreement"
    accepted: bool = True


class InstanceSummary(BaseModel):
    """Summary of license application result"""
    instance_id: str
    expiry_date: str
    status: str
    days_to_expiry: int
