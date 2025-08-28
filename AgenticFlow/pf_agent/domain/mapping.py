"""Mapping between API views and domain models"""

from datetime import datetime, timezone
from dateutil.parser import parse as parse_date
from .models import LicenseView, LicenseRecord
from ..config import InstanceConfig


def to_record(view: LicenseView, instance: InstanceConfig) -> LicenseRecord:
    """Convert API LicenseView to domain LicenseRecord"""
    
    # Parse expiry date and calculate days to expiry
    expiry_dt = parse_date(view.expiryDate)
    now = datetime.now(timezone.utc)
    
    # Handle timezone-naive dates by assuming UTC
    if expiry_dt.tzinfo is None:
        expiry_dt = expiry_dt.replace(tzinfo=timezone.utc)
    
    days_to_expiry = (expiry_dt - now).days
    
    # Determine status based on days to expiry
    if days_to_expiry < 0:
        status = "EXPIRED"
    elif days_to_expiry <= 30:
        status = "WARNING"
    else:
        status = "OK"
    
    return LicenseRecord(
        instance_id=instance.id,
        instance_name=instance.name,
        env=instance.env,
        license_key_id=view.licenseKeyId,
        issued_to=view.issuedTo,
        product=view.product,
        expiry_date=view.expiryDate,
        days_to_expiry=days_to_expiry,
        status=status,
        last_synced_at=now.isoformat(),
        source="pf-api"
    )


def to_view(record: LicenseRecord) -> LicenseView:
    """Convert domain LicenseRecord to API LicenseView"""
    return LicenseView(
        issuedTo=record.issued_to,
        product=record.product,
        expiryDate=record.expiry_date,
        licenseKeyId=record.license_key_id
    )
