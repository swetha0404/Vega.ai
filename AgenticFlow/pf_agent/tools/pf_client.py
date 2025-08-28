"""PingFederate REST client"""

import requests
from requests.auth import HTTPBasicAuth
from typing import Dict, Any
from ..config import InstanceConfig
from ..domain.models import LicenseView, ApplyLicenseRequest, LicenseAgreement


class PFClient:
    """REST client for PingFederate APIs with authentication support"""
    
    def __init__(self, username: str = "Administrator", password: str = "2FederateM0re", timeout: int = 30) -> None:
        self.timeout = timeout
        self.session = requests.Session()
        
        # Set up authentication and required headers for PingFederate
        self.session.auth = HTTPBasicAuth(username, password)
        self.session.headers.update({
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-XSRF-Header": "PingFederate"  # Required for CSRF protection
        })
    
    def get_license(self, instance: InstanceConfig) -> LicenseView:
        """Get license information from PingFederate instance"""
        url = f"{instance.base_url}/license"
        
        try:
            response = self.session.get(url, timeout=self.timeout, verify=False)
            response.raise_for_status()
            data = response.json()
            return LicenseView(**data)
        except requests.RequestException as e:
            raise RuntimeError(f"Failed to get license from {instance.id}: {e}")
    
    def put_license(self, instance: InstanceConfig, encoded_license: str) -> LicenseView:
        """Apply a new license to PingFederate instance"""
        url = f"{instance.base_url}/license"
        
        request_data = ApplyLicenseRequest(value=encoded_license)
        
        try:
            response = self.session.put(
                url, 
                json=request_data.model_dump(),
                timeout=self.timeout,
                verify=False
            )
            response.raise_for_status()
            data = response.json()
            return LicenseView(**data)
        except requests.RequestException as e:
            raise RuntimeError(f"Failed to apply license to {instance.id}: {e}")
    
    def get_license_agreement(self, instance: InstanceConfig) -> LicenseAgreement:
        """Get license agreement status"""
        url = f"{instance.base_url}/license/agreement"
        
        try:
            response = self.session.get(url, timeout=self.timeout, verify=False)
            response.raise_for_status()
            data = response.json()
            return LicenseAgreement(**data)
        except requests.RequestException as e:
            raise RuntimeError(f"Failed to get license agreement from {instance.id}: {e}")
    
    def put_license_agreement(self, instance: InstanceConfig, agreement: LicenseAgreement) -> LicenseAgreement:
        """Update license agreement status"""
        url = f"{instance.base_url}/license/agreement"
        
        try:
            response = self.session.put(
                url,
                json=agreement.model_dump(),
                timeout=self.timeout,
                verify=False
            )
            response.raise_for_status()
            data = response.json()
            return LicenseAgreement(**data)
        except requests.RequestException as e:
            raise RuntimeError(f"Failed to update license agreement for {instance.id}: {e}")
