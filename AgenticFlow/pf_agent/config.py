"""Configuration management for PF Agent"""

import os
from pathlib import Path
from typing import List, Dict, Any
import yaml
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class InstanceConfig(BaseModel):
    """Configuration for a single PingFederate instance"""
    id: str
    name: str
    env: str
    base_url: str


class Config:
    """Application configuration"""
    
    def __init__(self) -> None:
        # Database configuration
        self.mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
        self.db_name = os.getenv("DB_NAME", "pf_agent")
        
        # AI/LLM configuration
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self.crewai_model = os.getenv("CREWAI_MODEL", "gpt-4o-mini")
        
        # Simulator configuration
        self.sim_base_url = os.getenv("SIM_BASE_URL", "http://localhost:8080")
        
        # Notification configuration
        self.slack_webhook = os.getenv("SLACK_WEBHOOK", "")
        self.alert_email_to = os.getenv("ALERT_EMAIL_TO", "")
        
        # Authentication configuration
        self.pf_admin_username = os.getenv("PF_ADMIN_USERNAME", "Administrator")
        self.pf_admin_password = os.getenv("PF_ADMIN_PASSWORD", "")
        self.pf_oauth_client_id = os.getenv("PF_OAUTH_CLIENT_ID", "")
        self.pf_oauth_client_secret = os.getenv("PF_OAUTH_CLIENT_SECRET", "")
        
        # Development/Debug configuration
        self.debug = os.getenv("DEBUG", "false").lower() == "true"
        self.log_level = os.getenv("LOG_LEVEL", "INFO")
        self.use_file_storage = os.getenv("USE_FILE_STORAGE", "false").lower() == "true"
        self.skip_ssl_verify = os.getenv("SKIP_SSL_VERIFY", "false").lower() == "true"
        
        # Security configuration
        self.jwt_secret = os.getenv("JWT_SECRET", "dev-secret-key")
        self.vault_url = os.getenv("VAULT_URL", "")
        self.vault_token = os.getenv("VAULT_TOKEN", "")
        
        # File paths
        self.inventory_file = Path(__file__).parent / "inventory.yaml"
        
    def get_instances(self) -> List[InstanceConfig]:
        """Load instance configuration from inventory.yaml"""
        if not self.inventory_file.exists():
            raise FileNotFoundError(f"Inventory file not found: {self.inventory_file}")
            
        with open(self.inventory_file, 'r') as f:
            data = yaml.safe_load(f)
            
        return [InstanceConfig(**instance) for instance in data['instances']]
    
    def get_instance_by_id(self, instance_id: str) -> InstanceConfig:
        """Get a specific instance configuration by ID"""
        instances = self.get_instances()
        for instance in instances:
            if instance.id == instance_id:
                return instance
        raise ValueError(f"Instance not found: {instance_id}")


# Global config instance
config = Config()
