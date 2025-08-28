# .env File Configuration Guide

## Quick Setup

1. **Copy the example .env file:**
   ```bash
   copy .env.example .env
   ```

2. **Edit the .env file with your values:**
   ```bash
   notepad .env
   ```

## Required Configuration

### MongoDB Configuration
```bash
# Option 1: Local MongoDB
MONGO_URI=mongodb://localhost:27017

# Option 2: MongoDB Atlas (Cloud)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/

# Option 3: Use file storage (no MongoDB needed)
USE_FILE_STORAGE=true
```

### OpenAI API Key
```bash
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
```

## Current .env File Status

✅ **Created**: `.env` file with development defaults
✅ **Configured**: File-based storage (MongoDB disabled)
⚠️ **Missing**: OpenAI API key (CrewAI won't work without it)

## Testing the Configuration

```bash
# Test with simulator (works without external dependencies)
python test_simulator.py

# Test CLI with file storage
pf-agent refresh   # (needs simulator running)

# Test with MongoDB (if you install it)
# 1. Install MongoDB
# 2. Set USE_FILE_STORAGE=false in .env
# 3. Run: pf-agent refresh
```

## Production Configuration

For production use, also configure:

```bash
# Slack notifications
SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# PingFederate authentication
PF_ADMIN_USERNAME=Administrator
PF_ADMIN_PASSWORD=your-admin-password

# Security
JWT_SECRET=your-super-secret-key
```

## Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017` | No (if USE_FILE_STORAGE=true) |
| `DB_NAME` | Database name | `pf_agent` | No |
| `OPENAI_API_KEY` | OpenAI API key for CrewAI | - | Yes (for NL features) |
| `CREWAI_MODEL` | CrewAI model to use | `gpt-4o-mini` | No |
| `USE_FILE_STORAGE` | Use JSON files instead of MongoDB | `true` | No |
| `SIM_BASE_URL` | Simulator base URL | `http://localhost:8080` | No |
| `SLACK_WEBHOOK` | Slack webhook for notifications | - | No |
| `ALERT_EMAIL_TO` | Email for alerts | - | No |
| `PF_ADMIN_USERNAME` | PingFederate admin username | `Administrator` | No |
| `PF_ADMIN_PASSWORD` | PingFederate admin password | - | No |
| `PF_OAUTH_CLIENT_ID` | OAuth client ID | - | No |
| `PF_OAUTH_CLIENT_SECRET` | OAuth client secret | - | No |
| `DEBUG` | Enable debug logging | `false` | No |
| `LOG_LEVEL` | Logging level | `INFO` | No |
