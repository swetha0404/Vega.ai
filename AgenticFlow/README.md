# PingFederate Ops Agent

A CLI tool for managing PingFederate license operations with intelligent AI-powered natural language interface.

## Features

- **License Management**: Monitor and update PingFederate licenses across multiple instances
- **AI Natural Language Interface**: Use plain English commands powered by OpenAI/CrewAI
- **Daily Monitoring**: Automated license status checks with expiry warnings
- **License Updates**: Apply new licenses with automatic validation
- **Simulated Environment**: Complete PingFederate API simulator for testing (no real PF needed)

## Installation

### Prerequisites
- **Python 3.11+**
- **Git** 

### Setup Steps

1. **Clone and Navigate**
   ```bash
   git clone <your-repo-url>
   cd "Agentic Workflow"
   ```

2. **Create Virtual Environment**
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate
   
   # macOS/Linux
   python -m venv venv
   source venv/bin/activate
   ```

3. **Install Dependencies** [MAKE SURE TO NOT MISS THE . (*DOT*) at the end]
   ```bash
   pip install -e .
   ```

4. **Configure Environment**
   ```bash
   # Copy example configuration
   copy .env.example .env
   ```

5. **Database Configuration (Choose One Option)**

   ### Option A: File Storage (Recommended for Quick Start)
   ```bash
   # Edit .env file with:
   USE_FILE_STORAGE=true
   OPENAI_API_KEY=sk-your-openai-api-key-here
   ```
   This stores data in local JSON files in the `data/` directory - no database setup required!

   ### Option B: MongoDB Setup
   ```bash
   # Edit .env file with:
   USE_FILE_STORAGE=false
   OPENAI_API_KEY=sk-your-openai-api-key-here
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net
   ```

   #### Setting up MongoDB Atlas (Free Tier):
   1. **Create Account**: Go to [MongoDB Atlas](https://cloud.mongodb.com) and sign up
   2. **Create Cluster**: 
      - Choose "Build a Database" → "M0 Sandbox" (Free)
      - Select cloud provider and region
      - Name your cluster (e.g., "pf-ops-cluster")
   3. **Create Database User**:
      - Go to "Database Access" → "Add New Database User"
      - Choose "Password" authentication
      - Username: `pfops-user`, Password: `generate-secure-password`
      - Database User Privileges: "Read and write to any database"
   4. **Configure Network Access**:
      - Go to "Network Access" → "Add IP Address"
      - Add your current IP or use `0.0.0.0/0` for testing (less secure)
   5. **Get Connection String**:
      - Go to "Database" → "Connect" → "Connect your application"
      - Copy the connection string and replace `<password>` with your user password
      - Example: `mongodb+srv://pfops-user:yourpassword@pf-ops-cluster.xyz123.mongodb.net/pingfederate_ops`

   #### Using VS Code MongoDB Extension:
   1. **Install Extension**: Search for "MongoDB for VS Code" in Extensions marketplace
   2. **Connect to Database**:
      - Open Command Palette (`Ctrl+Shift+P`)
      - Type "MongoDB: Connect" and select it
      - Paste your connection string
      - You can now browse your database, run queries, and manage collections directly in VS Code!

## Quick Start

### 1. Start the Simulator
```bash
pf-agent simulate up
```
The simulator runs on http://localhost:8080 and mimics real PingFederate instances.

### 2. Load Sample Data
```bash
pf-agent refresh
```
This loads sample license data from the simulator.

### 3. Check License Status
```bash
# Direct command
pf-agent license get

# Natural language (requires OpenAI API key)
pf-agent run "show me all license details"
```

## All Functionalities

### 1. License Monitoring
```bash
# View all licenses
pf-agent license get

# View specific instance
pf-agent license get --instance pf-prod-1

# Natural language queries
pf-agent run "check license status"
pf-agent run "show expired licenses"
pf-agent run "which licenses are expiring soon"
```

### 2. License Updates
```bash
# Apply new license file
pf-agent license apply --instance pf-dev-1 --file ./samples/pf_new.lic

# Available sample licenses:
# ./samples/pf_new.lic - Valid license
# ./samples/pf_expired.lic - Expired license
# ./samples/pf_expiring_soon.lic - Expiring within 30 days
# ./samples/pf_enterprise.lic - Enterprise license
```

### 3. Data Refresh
```bash
# Manual refresh from simulator APIs
pf-agent refresh
```

### 4. Natural Language Interface
```bash
# AI-powered commands (requires OpenAI API key)
pf-agent run "check which licenses are expiring soon"
pf-agent run "show expired licenses"
pf-agent run "display all license information"
```

### 5. Testing & Development
```bash
# Start simulator
pf-agent simulate up

# Run test suite
pytest

# Run specific tests
pytest test_simulator.py
pytest test_endpoints.py
```

## Available Sample Data

The project includes 5 simulated PingFederate instances with different license states:

- **pf-prod-1**: Valid license (Production)
- **pf-prod-2**: Valid license (Production) 
- **pf-stage-1**: Warning - expires in 14 days (Staging)
- **pf-dev-1**: Valid license (Development)
- **pf-dev-2**: Expired license (Development)

## Testing All Features

### 1. Test License Monitoring
```bash
pf-agent refresh
pf-agent license get
```

### 2. Test License Updates
```bash
pf-agent license apply --instance pf-dev-1 --file ./samples/pf_new.lic
pf-agent license apply --instance pf-dev-2 --file ./samples/pf_enterprise.lic
```

### 3. Test Natural Language
```bash
pf-agent run "check which licenses are expiring soon"
pf-agent run "show expired licenses"
pf-agent run "display all license information"
```

### 4. Test Automated Monitoring
```bash
# The system automatically runs daily checks and shows notifications like:
# [SLACK] PF License WARNING: instance=pf-stage-1 expires in 14d (2025-09-09)
# [SLACK] PF License EXPIRED: instance=pf-dev-2 expired 6d ago (2025-08-20)
```

### 5. Run Test Suite
```bash
pytest
```

## License Status Indicators

- **🟢 OK**: More than 30 days until expiry
- **🟡 WARNING**: 30 days or less until expiry
- **🔴 EXPIRED**: Past expiry date

## Troubleshooting

### Python Environment Issues
```bash
# If python command not found, try:
python3 -m venv venv
# or
py -m venv venv
```

### Port 8080 Already in Use
```bash
# Find what's using the port
netstat -ano | findstr :8080

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

### MongoDB Connection Errors
**Quick Fix**: Use file storage instead by setting `USE_FILE_STORAGE=true` in your `.env` file.

**MongoDB Issues**:
- **Connection timeout**: Check your IP is whitelisted in MongoDB Atlas Network Access
- **Authentication failed**: Verify username/password in connection string
- **Invalid connection string**: Ensure format is `mongodb+srv://username:password@cluster.mongodb.net/database`
- **Database not found**: The database will be created automatically when first used

**Testing MongoDB Connection**:
```bash
# Test with MongoDB extension in VS Code:
# 1. Install "MongoDB for VS Code" extension
# 2. Use Command Palette: "MongoDB: Connect"
# 3. Enter your connection string
# 4. Browse collections to verify connection

# Or test programmatically:
python -c "
from pymongo import MongoClient
import os
client = MongoClient('your-connection-string-here')
print('Connected:', client.admin.command('ping'))
"
```

### File Storage vs MongoDB
**When to use File Storage** (`USE_FILE_STORAGE=true`):
- ✅ Quick setup and testing
- ✅ No external dependencies
- ✅ Good for single-user scenarios
- ✅ Data stored in `data/` directory as JSON files

**When to use MongoDB** (`USE_FILE_STORAGE=false`):
- ✅ Multi-user environments
- ✅ Better performance with large datasets
- ✅ Advanced querying capabilities
- ✅ Data persistence and backup features

### OpenAI API Errors
- Ensure valid API key in `.env` file
- Test without AI: `pf-agent license get --no-nl`

## Project Structure

```
pf_agent/
├── cli.py              # Main CLI interface
├── agents/             # AI/CrewAI natural language processing
├── domain/             # Business logic and models
├── tools/              # Database, API clients, utilities
├── simulators/         # PingFederate API simulator
└── tests/              # Test suite

samples/                # Sample license files for testing
```

This tool helps automate PingFederate license management across multiple environments with both direct commands and AI-powered natural language interface.