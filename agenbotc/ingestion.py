import uuid
import PyPDF2
import docx
from logging import Logger
import os
import hashlib
import json
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional
import requests
from bs4 import BeautifulSoup
from langchain_text_splitters import RecursiveCharacterTextSplitter
from vector_store import add_to_vector_store, check_document_exists
from pptx import Presentation

# File to store processed documents metadata
PROCESSED_DOCS_FILE = os.path.join(os.path.dirname(__file__), "processed_documents.json")

def load_processed_docs():
    """Load the list of processed documents"""
    if os.path.exists(PROCESSED_DOCS_FILE):
        with open(PROCESSED_DOCS_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_processed_docs(processed_docs):
    """Save the list of processed documents"""
    with open(PROCESSED_DOCS_FILE, 'w') as f:
        json.dump(processed_docs, f, indent=2)

def calculate_file_hash(file_path):
    """Calculate MD5 hash of a file"""
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

def calculate_content_hash(content):
    """Calculate MD5 hash of content string"""
    return hashlib.md5(content.encode('utf-8')).hexdigest()

def is_duplicate_file(file_path, file_type):
    """Check if a file has already been processed"""
    processed_docs = load_processed_docs()
    file_hash = calculate_file_hash(file_path)
    filename = os.path.basename(file_path)
    
    # Check by hash first (most reliable)
    for doc_id, doc_info in processed_docs.items():
        if doc_info.get('file_hash') == file_hash:
            return True, doc_id, "File already processed (identical content)"
    
    # Check by filename for same type
    for doc_id, doc_info in processed_docs.items():
        if (doc_info.get('filename') == filename and 
            doc_info.get('type') == file_type):
            return True, doc_id, "File with same name already processed"
    
    return False, None, None

def is_duplicate_url(url):
    """Check if a URL has already been processed"""
    processed_docs = load_processed_docs()
    
    for doc_id, doc_info in processed_docs.items():
        if doc_info.get('source') == url and doc_info.get('type') == 'website':
            return True, doc_id, "URL already processed"
    
    return False, None, None

def register_processed_document(doc_id, source, doc_type, file_hash=None, content_hash=None):
    """Register a processed document"""
    processed_docs = load_processed_docs()
    
    doc_info = {
        'source': source,
        'type': doc_type,
        'processed_at': str(uuid.uuid4()),  # Using UUID as timestamp placeholder
        'filename': os.path.basename(source) if doc_type != 'website' else None
    }
    
    if file_hash:
        doc_info['file_hash'] = file_hash
    if content_hash:
        doc_info['content_hash'] = content_hash
        
    processed_docs[doc_id] = doc_info
    save_processed_docs(processed_docs)


def extract_text_from_pdf(pdf_path):
    """Extract text content from a PDF file"""
    text = ""
    with open(pdf_path, "rb") as file:
        pdf_reader = PyPDF2.PdfReader(file)
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
    return text


def extract_text_from_docx(file_path):
    """Extract text content from a Word file"""
    text = ""
    try:
        doc = docx.Document(file_path)
        for para in doc.paragraphs:
            text += para.text + "\n"
    except Exception as e:
        print(f"Error extracting text from DOCX {file_path}: {e}")
    return text


def extract_text_from_website(url):
    """Extract text content from a website"""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.content, "html.parser")
    
    # Remove script and style elements
    for script in soup(["script", "style"]):
        script.extract()
    
    # Get text content
    text = soup.get_text(separator="\n", strip=True)
    return text

def extract_text_from_ppt(ppt_path):
    """Extract text content from a PPT file"""
    text = ""
    try:
        presentation = Presentation(ppt_path)
        for slide in presentation.slides:
            for shape in slide.shapes:
                if hasattr(shape, "text"):
                    text += shape.text + "\n"
    except Exception as e:
        print(f"Error processing PPT {ppt_path}: {e}")
    return text

def chunk_text(text):
    """Split text into manageable chunks for processing"""
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
    )
    chunks = text_splitter.split_text(text)
    return chunks

def process_pdf(pdf_path):
    """Process a PDF file and add its content to the vector store with duplicate check"""
    # Check for duplicates first
    is_duplicate, existing_doc_id, reason = is_duplicate_file(pdf_path, "pdf")
    if is_duplicate:
        return {"doc_id": existing_doc_id, "message": f"Duplicate detected: {reason}", "is_duplicate": True}
    
    doc_id = str(uuid.uuid4())
    text = extract_text_from_pdf(pdf_path)
    
    # Check content hash
    content_hash = calculate_content_hash(text)
    file_hash = calculate_file_hash(pdf_path)
    
    # Check if same content already exists
    processed_docs = load_processed_docs()
    for existing_doc_id, doc_info in processed_docs.items():
        if doc_info.get('content_hash') == content_hash:
            return {"doc_id": existing_doc_id, "message": "Duplicate detected: Same content already exists", "is_duplicate": True}
    
    chunks = chunk_text(text)
    
    # Add chunks to vector store with metadata
    metadata = {
        "source": pdf_path,
        "type": "pdf",
        "doc_id": doc_id
    }
    add_to_vector_store(chunks, metadata)
    
    # Register the processed document
    register_processed_document(doc_id, pdf_path, "pdf", file_hash, content_hash)
    
    return {"doc_id": doc_id, "message": "PDF processed successfully", "is_duplicate": False}

def process_docx(docx_path):
    """Process a DOCX file and add its content to the vector store with duplicate check"""
    # Check for duplicates first
    is_duplicate, existing_doc_id, reason = is_duplicate_file(docx_path, "docx")
    if is_duplicate:
        return {"doc_id": existing_doc_id, "message": f"Duplicate detected: {reason}", "is_duplicate": True}
    
    doc_id = str(uuid.uuid4())
    text = extract_text_from_docx(docx_path)
    
    # Check content hash
    content_hash = calculate_content_hash(text)
    file_hash = calculate_file_hash(docx_path)
    
    # Check if same content already exists
    processed_docs = load_processed_docs()
    for existing_doc_id, doc_info in processed_docs.items():
        if doc_info.get('content_hash') == content_hash:
            return {"doc_id": existing_doc_id, "message": "Duplicate detected: Same content already exists", "is_duplicate": True}
    
    chunks = chunk_text(text)
    
    # Add chunks to vector store with metadata
    metadata = {
        "source": docx_path,
        "type": "docx",
        "doc_id": doc_id
    }
    add_to_vector_store(chunks, metadata)
    
    # Register the processed document
    register_processed_document(doc_id, docx_path, "docx", file_hash, content_hash)
    
    print(f"Processed DOCX file: {docx_path}")
    return {"doc_id": doc_id, "message": "DOCX processed successfully", "is_duplicate": False}

def process_website(url):
    """Process a website and add its content to the vector store with duplicate check"""
    # Check for duplicate URL first
    is_duplicate, existing_doc_id, reason = is_duplicate_url(url)
    if is_duplicate:
        return {"doc_id": existing_doc_id, "message": f"Duplicate detected: {reason}", "is_duplicate": True}
    
    doc_id = str(uuid.uuid4())
    text = extract_text_from_website(url)
    
    # Check content hash
    content_hash = calculate_content_hash(text)
    
    # Check if same content already exists
    processed_docs = load_processed_docs()
    for existing_doc_id, doc_info in processed_docs.items():
        if doc_info.get('content_hash') == content_hash:
            return {"doc_id": existing_doc_id, "message": "Duplicate detected: Same content already exists", "is_duplicate": True}
    
    chunks = chunk_text(text)
    
    # Add chunks to vector store with metadata
    metadata = {
        "source": url,
        "type": "website",
        "doc_id": doc_id
    }
    add_to_vector_store(chunks, metadata)
    
    # Register the processed document
    register_processed_document(doc_id, url, "website", content_hash=content_hash)
    
    return {"doc_id": doc_id, "message": "Website processed successfully", "is_duplicate": False}

def process_ppt(ppt_path):
    """Process a PPT file and add its content to the vector store with duplicate check"""
    # Check for duplicates first
    is_duplicate, existing_doc_id, reason = is_duplicate_file(ppt_path, "ppt")
    if is_duplicate:
        return {"doc_id": existing_doc_id, "message": f"Duplicate detected: {reason}", "is_duplicate": True}
    
    doc_id = str(uuid.uuid4())
    text = ""
    
    try:
        presentation = Presentation(ppt_path)
        for slide in presentation.slides:
            for shape in slide.shapes:
                if hasattr(shape, "text"):
                    text += shape.text + "\n"
    except Exception as e:
        print(f"Error processing PPT {ppt_path}: {e}")
    
    # Check content hash
    content_hash = calculate_content_hash(text)
    file_hash = calculate_file_hash(ppt_path)
    
    # Check if same content already exists
    processed_docs = load_processed_docs()
    for existing_doc_id, doc_info in processed_docs.items():
        if doc_info.get('content_hash') == content_hash:
            return {"doc_id": existing_doc_id, "message": "Duplicate detected: Same content already exists", "is_duplicate": True}
    
    chunks = chunk_text(text)
    
    # Add chunks to vector store with metadata
    metadata = {
        "source": ppt_path,
        "type": "ppt",
        "doc_id": doc_id
    }
    add_to_vector_store(chunks, metadata)
    
    # Register the processed document
    register_processed_document(doc_id, ppt_path, "ppt", file_hash, content_hash)
    
    return {"doc_id": doc_id, "message": "PPT processed successfully", "is_duplicate": False}

