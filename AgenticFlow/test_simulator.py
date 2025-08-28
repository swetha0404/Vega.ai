#!/usr/bin/env python3
"""Simple test script for the PingFederate simulator"""

import requests
import time
import subprocess
import sys
from threading import Thread

def test_simulator():
    """Test the simulator endpoints"""
    
    # Wait a moment for server to start
    time.sleep(2)
    
    try:
        # Test GET license
        response = requests.get("http://localhost:8080/pf1/license", timeout=5)
        print(f"GET /pf1/license: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {response.json()}")
        
        # Test GET license agreement
        response = requests.get("http://localhost:8080/pf1/license/agreement", timeout=5)
        print(f"GET /pf1/license/agreement: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {response.json()}")
            
        # Test cluster status
        response = requests.get("http://localhost:8080/cluster/status", timeout=5)
        print(f"GET /cluster/status: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {response.json()}")
            
    except Exception as e:
        print(f"Error testing simulator: {e}")

if __name__ == "__main__":
    print("Testing PingFederate simulator...")
    
    # Start the simulator in a separate thread
    from pf_agent.simulators.pingfed_mock import run_simulator
    
    server_thread = Thread(target=lambda: run_simulator(8080), daemon=True)
    server_thread.start()
    
    # Run tests
    test_simulator()
    
    print("Test completed!")
