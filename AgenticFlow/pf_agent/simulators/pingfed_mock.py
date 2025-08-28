"""FastAPI-based PingFederate API simulator"""

import base64
import re
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, status, Depends, Header
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import uvicorn

from .seed_data import generate_instance_data, generate_cluster_status
from ..domain.models import LicenseView, ApplyLicenseRequest, LicenseAgreement


class PingFederateSimulator:
    """PingFederate API simulator with multi-instance support and authentication"""
    
    def __init__(self) -> None:
        self.app = FastAPI(
            title="PingFederate API Simulator",
            description="Mock PingFederate Admin API for testing with authentication",
            version="1.0.0"
        )
        
        # Initialize security
        self.security = HTTPBasic()
        
        # Mock credentials (matches real PingFederate defaults)
        self.valid_users = {
            "Administrator": "2FederateM0re",  # Default PF admin
            "admin": "admin123",              # Common test credential
            "testuser": "testpass"            # Additional test user
        }
        
        # Initialize instance data
        self.license_data = generate_instance_data()
        self.agreement_data = {
            instance: LicenseAgreement() for instance in self.license_data.keys()
        }
        
        self._setup_routes()
    
    def _verify_credentials(self, credentials: HTTPBasicCredentials = Depends(HTTPBasic())) -> str:
        """Verify HTTP Basic Auth credentials like real PingFederate"""
        username = credentials.username
        password = credentials.password
        
        if username not in self.valid_users or self.valid_users[username] != password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Basic"},
            )
        return username
    
    def _verify_csrf_header(self, x_xsrf_header: Optional[str] = Header(None, alias="X-XSRF-Header")) -> None:
        """Verify CSRF header like real PingFederate"""
        if not x_xsrf_header or x_xsrf_header != "PingFederate":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token validation failed. X-XSRF-Header must be 'PingFederate'",
            )
    
    def _setup_routes(self) -> None:
        """Setup FastAPI routes for all instances"""
        
        # Create routes for each instance dynamically
        for instance_key in self.license_data.keys():
            self._create_instance_routes(instance_key)
        
        # Optional cluster status endpoint
        @self.app.get("/cluster/status")
        async def get_cluster_status() -> Dict[str, Any]:
            """Get cluster status information"""
            return generate_cluster_status()
    
    def _create_instance_routes(self, instance: str) -> None:
        """Create license routes for a specific instance with authentication"""
        
        @self.app.get(f"/{instance}/license", response_model=LicenseView)
        async def get_license(
            username: str = Depends(self._verify_credentials),
            csrf_check: None = Depends(self._verify_csrf_header)
        ) -> LicenseView:
            """Get license information for this instance (requires auth)"""
            if instance not in self.license_data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Instance {instance} not found"
                )
            
            data = self.license_data[instance]
            return LicenseView(**data)
        
        @self.app.put(f"/{instance}/license", response_model=LicenseView)
        async def put_license(
            request: ApplyLicenseRequest,
            username: str = Depends(self._verify_credentials),
            csrf_check: None = Depends(self._verify_csrf_header)
        ) -> LicenseView:
            """Apply a new license to this instance (requires auth)"""
            if instance not in self.license_data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Instance {instance} not found"
                )
            
            try:
                # Decode base64 license content
                license_content = base64.b64decode(request.value).decode('utf-8')
                
                # Parse expiry date from license content
                # Look for multiple date patterns
                expiry_match = None
                
                # Pattern 1: EXPIRY=YYYY-MM-DD
                expiry_match = re.search(r'EXPIRY=(\d{4}-\d{2}-\d{2})', license_content)
                
                # Pattern 2: ExpirationDate=YYYY-MM-DD 
                if not expiry_match:
                    expiry_match = re.search(r'ExpirationDate=(\d{4}-\d{2}-\d{2})', license_content)
                
                if expiry_match:
                    new_expiry = expiry_match.group(1)
                    # Validate date format
                    datetime.strptime(new_expiry, "%Y-%m-%d")
                else:
                    # Default to 1 year from now if no expiry found
                    new_expiry = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
                
                # Parse organization from license content
                org_match = re.search(r'Organization=(.+)', license_content)
                if org_match:
                    new_organization = org_match.group(1).strip()
                else:
                    new_organization = self.license_data[instance]["issuedTo"]
                
                # Parse license ID
                id_match = re.search(r'ID=(\w+)', license_content)
                if id_match:
                    license_id = id_match.group(1)
                else:
                    # Generate new license key ID
                    import random
                    import string
                    license_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
                
                # Update license data
                self.license_data[instance]["expiryDate"] = new_expiry
                self.license_data[instance]["issuedTo"] = new_organization
                self.license_data[instance]["licenseKeyId"] = f"LIC-{license_id}"
                
                return LicenseView(**self.license_data[instance])
                
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid license file: {str(e)}"
                )
        
        @self.app.get(f"/{instance}/license/agreement", response_model=LicenseAgreement)
        async def get_license_agreement(
            username: str = Depends(self._verify_credentials),
            csrf_check: None = Depends(self._verify_csrf_header)
        ) -> LicenseAgreement:
            """Get license agreement status (requires auth)"""
            if instance not in self.agreement_data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Instance {instance} not found"
                )
            
            return self.agreement_data[instance]
        
        @self.app.put(f"/{instance}/license/agreement", response_model=LicenseAgreement)
        async def put_license_agreement(
            agreement: LicenseAgreement,
            username: str = Depends(self._verify_credentials),
            csrf_check: None = Depends(self._verify_csrf_header)
        ) -> LicenseAgreement:
            """Update license agreement status (requires auth)"""
            if instance not in self.agreement_data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Instance {instance} not found"
                )
            
            self.agreement_data[instance] = agreement
            return agreement


def create_simulator() -> FastAPI:
    """Create and configure the simulator application"""
    simulator = PingFederateSimulator()
    return simulator.app


def run_simulator(port: int = 8080) -> None:
    """Run the simulator server"""
    app = create_simulator()
    
    try:
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=port,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n🛑 Simulator stopped")


if __name__ == "__main__":
    run_simulator()
