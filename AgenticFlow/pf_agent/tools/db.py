"""MongoDB connection and utilities"""

from pymongo import MongoClient
from pymongo.database import Database
from ..config import config


def get_database() -> Database:
    """Get MongoDB database connection"""
    client = MongoClient(config.mongo_uri)
    return client[config.db_name]


def ensure_indexes() -> None:
    """Ensure required database indexes exist"""
    db = get_database()
    
    # License collection indexes
    licenses = db.licenses
    licenses.create_index("instance_id", unique=True)
    licenses.create_index([("env", 1), ("status", 1)])
    licenses.create_index("expiry_date")
    
    # Audit collection indexes  
    audits = db.audits
    audits.create_index([("timestamp", -1)])
    audits.create_index([("instance_id", 1), ("timestamp", -1)])
    audits.create_index([("action", 1), ("timestamp", -1)])
