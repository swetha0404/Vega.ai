#!/usr/bin/env python3
"""
Test script to verify the duplicate response fix
"""
import sys
import os
import asyncio

# Add the agenbotc directory to path
agenbotc_dir = os.path.join(os.path.dirname(__file__), "agenbotc")
sys.path.append(os.path.abspath(agenbotc_dir))

from dotenv import load_dotenv

# Load environment variables
env_path = os.path.join(agenbotc_dir, ".env")
load_dotenv(dotenv_path=env_path)

from llm_agent import LLMAgent

async def test_agent():
    """Test the LLM agent with a sample query"""
    print("Testing LLM Agent fix...")
    
    # Get API key from environment
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("ERROR: OPENAI_API_KEY not found in .env file")
        return
    
    # Initialize agent
    agent = LLMAgent(api_key=api_key)
    
    # Test query
    test_query = "What are the steps to set up PingFederate?"
    
    print(f"Testing query: {test_query}")
    print("-" * 50)
    
    try:
        result = await agent.process_query(test_query)
        print(f"Result type: {type(result)}")
        
        if isinstance(result, dict):
            print(f"Verbose response length: {len(result.get('verbose', ''))}")
            print(f"Avatar response length: {len(result.get('avatar', ''))}")
            print("\n--- VERBOSE RESPONSE ---")
            print(result.get('verbose', 'No verbose response'))
            print("\n--- AVATAR RESPONSE ---")
            print(result.get('avatar', 'No avatar response'))
        else:
            print(f"Unexpected result format: {result}")
            
    except Exception as e:
        print(f"Error during test: {e}")

if __name__ == "__main__":
    asyncio.run(test_agent())
