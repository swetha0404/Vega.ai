# Vega.ai Project

## Project Structure

```
Repo folder/
├── agenbotc/           # Backend Python code (FastAPI, chatbot, LLM agent, etc.)
├── frontend/           # Frontend React/Vite app
├── Dockerfile          # Backend Dockerfile
├── docker-compose.yml  # Orchestrates backend and frontend containers
├── requirements.txt    # Python dependencies
├── main.py             # FastAPI entrypoint
├── users.json, config.yaml, etc.
```

## Features
- Modern FastAPI backend with authentication, RAG, file upload, and LLM agent endpoints
- React/Vite/TS frontend served via Nginx
- Containerized for easy cloud deployment (Docker, Docker Compose)
- Environment variables managed via `.env` files

---

## Local Development

### 1. Backend (FastAPI)
- Create and activate a Python virtual environment (Optional)
  Windows:
  ```
  pythom -m venv myenv
  myenv\Scripts\activate
  deactivate (once done)
  ```
  MacOS:
  ```
  python -m venv myenv
  source myenv/bin/activate
  deactivate
  ```
- Install dependencies:
  ```
  pip install -r requirements.txt
  ```
- Copy your `.env` file to `agenbotc/.env` (must include `OPENAI_API_KEY` and `HEYGEN_API_KEY`)
- Run the backend server:
  ```
  uvicorn main:app --reload --host 0.0.0.0 --port 8000
  ```
- API docs available at: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Frontend (React/Vite)
- Navigate to `/frontend`
- Install dependencies:
  ```
  npm install
  ```
- Start the development server:
  ```
  npm run dev
  ```
- App available at: [http://localhost:8080](http://localhost:8080) (default Vite port)

---

## Production Deployment (Docker)

1. Make sure you have Docker and Docker Compose installed.
2. Place your `.env` file in `agenbotc/.env`.
3. From the home directory, build and run both containers:
   ```
   docker-compose up --build
   ```
4. Backend will be available at [http://localhost:8000](http://localhost:8000)
5. Frontend will be available at [http://localhost:8080](http://localhost:8080)

---

## Notes
- For production, you may want to remove or adjust volumes in `docker-compose.yml` to avoid overwriting built files.
- Update CORS and environment variables as needed for your deployment.
- For cloud deployment, push your images to a registry and deploy to your chosen provider (AWS ECS, Azure, GCP, etc.).

---

## Troubleshooting
- If Docker builds are slow, check `.dockerignore` files to avoid copying unnecessary files.
- If you see import/case errors in the frontend, check that all import paths match the actual file names (case-sensitive in Linux/Docker).

---

For more details, see the code and comments in each directory.
