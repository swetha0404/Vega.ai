import os
from fastapi import FastAPI, UploadFile, File, Form, Request, Depends, Response, status
from starlette.middleware.sessions import SessionMiddleware
from fastapi.responses import HTMLResponse,RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
import uvicorn
import secrets
from typing import List, Optional
from ingestion import process_pdf, process_website, process_docx , process_ppt
from chatbot import get_chatbot_response
from llm_agent import LLMAgent
from tomcat_monitor import TomcatMonitor

# Initialize the LLM agent and Tomcat monitor
llm_agent = LLMAgent()
tomcat_monitor = TomcatMonitor()    # Initialize the Tomcat monitor
app = FastAPI(title="Knowledge Base Chatbot")
security = HTTPBasic()
app.add_middleware(SessionMiddleware, secret_key="super-secret-key")
#### Login for Admin Module 
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "password123"

# Displays the login form page for admin authentication
@app.get("/login", response_class=HTMLResponse)
def login_form(request: Request):
    return templates.TemplateResponse("login.html", {"request": request, "message": ""})

# Processes login credentials and redirects to admin page on successful authentication
@app.post("/login")
def login(request: Request, username: str = Form(...), password: str = Form(...)):
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        request.session["user"] = username
        return RedirectResponse(url="/Admin", status_code=status.HTTP_303_SEE_OTHER)
    return templates.TemplateResponse("login.html", {"request": request, "message": "Invalid credentials"})

# Clears user session and redirects to login page for logout functionality
@app.get("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)

####### Login handling ends##########
# Mount static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")
######ChatRequest Data Model that can be used to send and recive Data from Frontends.

class ChatRequest(BaseModel):
    question: str
    history: Optional[List[dict]] = []

#######
# Displays the admin dashboard page - requires user authentication via session
@app.get("/Admin", response_class=HTMLResponse)
### If Login User id/ password is Needs to be skipped for Admin page Remove comments in next two lines and add comments for def admin_dashboard
#async def read_root(request: Request):
#    return templates.TemplateResponse("index.html", {"request": request})
#######Below Module calls the login page if User info is None , Login Page gets the user validate and on Success move to Admin page .
def admin_dashboard(request: Request):
    user = request.session.get("user")
    print(user)
    if not user:
        return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)
    return templates.TemplateResponse("Admin.html", {"request": request, "user": user})

# Displays the main Vega chatbot interface page
@app.get("/Vega", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("ChatBot.html", {"request": request})

# Displays the AgentBot interface page for advanced AI agent interactions
@app.get("/Agentbot", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("AgentBot.html", {"request": request})


# Handles PDF file uploads, saves them to uploads directory, and processes them for knowledge base
@app.post("/upload/pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """Endpoint to upload and process PDF files"""
    file_location = f"uploads/{file.filename}"
    os.makedirs("uploads", exist_ok=True)
    
    with open(file_location, "wb") as f:
        f.write(await file.read())
    
    # Process the uploaded PDF
    try:
        doc_id = process_pdf(file_location)
        return {"status": "success", "message": f"PDF processed successfully", "doc_id": doc_id}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Handles DOCX file uploads, saves them to uploads directory, and processes them for knowledge base
@app.post("/upload/docx")
async def upload_docx(file: UploadFile = File(...)):
    """Endpoint to upload and process DOCX files"""
    print("Inside upload docx")
    file_location = f"uploads/{file.filename}"
    os.makedirs("uploads", exist_ok=True)
    print(file_location)
    with open(file_location, "wb") as f:
        f.write(await file.read())

    # Process the uploaded DOCX
    try:
        doc_id = process_docx(file_location)
        return {"status": "success", "message": f"DOCX processed successfully", "doc_id": doc_id}
    except Exception as e:
        doc_id = process_docx(file_location)
        return {"status": "success", "message": f"DOCX processed successfully", "doc_id": doc_id}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# Processes website content by URL and adds it to the knowledge base
@app.post("/process/website")
async def process_web(url: str = Form(...)):
    """Endpoint to process website content"""
    try:
        doc_id = process_website(url)
        return {"status": "success", "message": f"Website processed successfully", "doc_id": doc_id}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Handles PowerPoint file uploads, saves them to uploads directory, and processes them for knowledge base
@app.post("/upload/ppt")
async def upload_ppt(file: UploadFile = File(...)):
    """Endpoint to upload and process PPT files"""
    file_location = f"uploads/{file.filename}"
    os.makedirs("uploads", exist_ok=True)

    with open(file_location, "wb") as f:
        f.write(await file.read())

    # Process the uploaded PPT
    try:
        doc_id = process_ppt(file_location)
        return {"status": "success", "message": f"PPT processed successfully", "doc_id": doc_id}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# Handles basic chat interactions using the standard chatbot functionality
@app.post("/chat")
async def chat(request: ChatRequest):
    """Endpoint to handle chat interactions"""
    response = get_chatbot_response(request.question, request.history)
    return {"response": response}
 
# Handles advanced chat interactions using the LLM agent for more sophisticated query processing
@app.post("/Agentchat")
async def Agentchat(request: ChatRequest):
    """Main chat endpoint that routes queries through LLM agent"""
    print("Processing query through LLM agent" + str(request))
    #try:
    response = await llm_agent.process_query(request.question)
    print(f"LLM Agent response: {response}")
    if not isinstance(response, (str, dict)):
        response = str(response)
    return {"response": response}
    # except Exception as e:
    #    return {"response": f"Error processing query: {str(e)}", "status": "error"}


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
