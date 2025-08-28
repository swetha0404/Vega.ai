#!/usr/bin/env python3
"""
Test script to verify MongoDB integration while simulator is running.
Run this in a separate terminal after starting the simulator.
"""

import sys
import requests
from pf_agent.domain.services import LicenseService
from pf_agent.tools.db import get_database

def test_mongodb_connection():
    """Test MongoDB connection"""
    print("🔍 Testing MongoDB connection...")
    try:
        db = get_database()
        print(f"✅ Connected to database: {db.name}")
        collections = db.list_collection_names()
        print(f"📁 Current collections: {collections}")
        return True
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        return False

def test_simulator_endpoints():
    """Test if simulator is responding"""
    print("\n🔍 Testing simulator endpoints...")
    try:
        response = requests.get("http://localhost:8080/pf1/license", timeout=5)
        if response.status_code == 200:
            print("✅ Simulator is responding")
            data = response.json()
            print(f"📄 Sample license data: {data}")
            return True
        else:
            print(f"❌ Simulator returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Simulator connection failed: {e}")
        print("💡 Make sure simulator is running: python -m pf_agent.simulators.pingfed_mock")
        return False

def test_license_service():
    """Test the license service with MongoDB"""
    print("\n🔍 Testing license service...")
    try:
        service = LicenseService()
        
        # Test refresh for one instance
        print("📥 Testing refresh for pf-prod-1...")
        result = service.refresh_one("pf-prod-1")
        print(f"✅ Refresh successful: {result}")
        
        # Test getting all licenses
        print("📋 Getting all licenses from MongoDB...")
        licenses = service.get_all_licenses()
        print(f"✅ Found {len(licenses)} licenses in database")
        
        for license in licenses:
            print(f"  - {license['instance_id']}: {license['status']} (expires {license['expiry_date'][:10]})")
        
        return True
        
    except Exception as e:
        print(f"❌ License service failed: {e}")
        return False

def test_collections_created():
    """Check if MongoDB collections were created"""
    print("\n🔍 Checking MongoDB collections...")
    try:
        db = get_database()
        collections = db.list_collection_names()
        
        if 'licenses' in collections:
            license_count = db.licenses.count_documents({})
            print(f"✅ Licenses collection exists with {license_count} documents")
        else:
            print("⚠️  Licenses collection not found")
            
        if 'audits' in collections:
            audit_count = db.audits.count_documents({})
            print(f"✅ Audits collection exists with {audit_count} documents")
        else:
            print("⚠️  Audits collection not found")
            
        return True
        
    except Exception as e:
        print(f"❌ Collection check failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 PingFederate Ops Agent - MongoDB Integration Test")
    print("="*60)
    
    # Test 1: MongoDB connection
    mongo_ok = test_mongodb_connection()
    
    # Test 2: Simulator endpoints
    sim_ok = test_simulator_endpoints()
    
    if mongo_ok and sim_ok:
        # Test 3: License service
        service_ok = test_license_service()
        
        # Test 4: Check collections
        collections_ok = test_collections_created()
        
        if service_ok and collections_ok:
            print("\n🎉 All tests passed! MongoDB integration is working!")
            print("\n💡 You can now use:")
            print("   - pf-agent refresh")
            print("   - pf-agent license get")
            print("   - pf-agent run 'check license status'")
        else:
            print("\n⚠️  Some tests failed. Check the errors above.")
    else:
        print("\n❌ Prerequisites failed. Fix MongoDB/Simulator issues first.")

if __name__ == "__main__":
    main()
