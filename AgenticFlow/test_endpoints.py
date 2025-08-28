#!/usr/bin/env python3
"""Test script to verify simulator endpoints are working"""

import requests
import json

def test_endpoints():
    """Test all simulator endpoints"""
    endpoints = [
        "http://localhost:8080/pf1/license",
        "http://localhost:8080/pf2/license", 
        "http://localhost:8080/pf3/license",
        "http://localhost:8080/pf4/license",
        "http://localhost:8080/pf5/license"
    ]
    
    print("Testing PingFederate Simulator Endpoints...")
    print("=" * 50)
    
    for endpoint in endpoints:
        try:
            print(f"\nTesting: {endpoint}")
            response = requests.get(endpoint, timeout=5)
            print(f"Status Code: {response.status_code}")
            print(f"Content-Type: {response.headers.get('content-type', 'unknown')}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    print(f"JSON Response: {json.dumps(data, indent=2)}")
                except json.JSONDecodeError:
                    print(f"Raw Response: {response.text[:200]}...")
            else:
                print(f"Error Response: {response.text[:200]}...")
                
        except Exception as e:
            print(f"Connection Error: {e}")
    
    print("\n" + "=" * 50)
    print("Test completed!")

if __name__ == "__main__":
    test_endpoints()
