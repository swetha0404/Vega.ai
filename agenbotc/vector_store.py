import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", message=".*LangChain.*deprecated.*")
warnings.filterwarnings("ignore", message=".*HuggingFaceEmbeddings.*deprecated.*")
warnings.filterwarnings("ignore", message=".*Chroma.*deprecated.*")

import os
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings

# Initialize embeddings model
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Initialize or load vector store
VECTOR_DB_PATH = os.path.join(os.path.dirname(__file__), "vectorstore")
os.makedirs(VECTOR_DB_PATH, exist_ok=True)

vector_store = Chroma(
    persist_directory=VECTOR_DB_PATH,
    embedding_function=embeddings
)

def add_to_vector_store(chunks, metadata=None):
    """Add text chunks to the vector store"""
    metadatas = [metadata for _ in chunks] if metadata else None
    vector_store.add_texts(chunks, metadatas=metadatas)
    vector_store.persist()
    return len(chunks)

def check_document_exists(doc_id):
    """Check if a document already exists in the vector store"""
    try:
        results = vector_store.similarity_search("", k=1000, filter={"doc_id": doc_id})
        return len(results) > 0
    except:
        return False

def search_vector_store(query, k=4):
    """Search for relevant documents in the vector store"""
    results = vector_store.similarity_search(query, k=k)
    return results
