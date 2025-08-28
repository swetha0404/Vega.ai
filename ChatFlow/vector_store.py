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

def delete_from_vector_store(doc_id):
    """Delete all chunks/vectors associated with a document ID from the vector store"""
    try:
        # Get all documents with the specified doc_id
        results = vector_store.similarity_search("", k=10000, filter={"doc_id": doc_id})
        
        if not results:
            print(f"No documents found with doc_id: {doc_id}")
            return False
            
        # Extract the IDs of documents to delete
        # ChromaDB uses internal IDs, we need to get them
        collection = vector_store._collection
        
        # Get all documents and find ones with matching doc_id
        all_docs = collection.get(include=["metadatas"])
        ids_to_delete = []
        
        for i, metadata in enumerate(all_docs["metadatas"]):
            if metadata and metadata.get("doc_id") == doc_id:
                ids_to_delete.append(all_docs["ids"][i])
        
        if ids_to_delete:
            # Delete the documents
            collection.delete(ids=ids_to_delete)
            print(f"Deleted {len(ids_to_delete)} chunks for doc_id: {doc_id}")
            return True
        else:
            print(f"No chunks found to delete for doc_id: {doc_id}")
            return False
            
    except Exception as e:
        print(f"Error deleting from vector store: {str(e)}")
        return False

def get_document_count(doc_id=None):
    """Get count of documents in vector store, optionally filtered by doc_id"""
    try:
        if doc_id:
            results = vector_store.similarity_search("", k=10000, filter={"doc_id": doc_id})
            return len(results)
        else:
            collection = vector_store._collection
            return collection.count()
    except Exception as e:
        print(f"Error getting document count: {str(e)}")
        return 0
