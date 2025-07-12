import os
from typing import List, Dict
from langchain.chains import ConversationalRetrievalChain
from langchain.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from vector_store import vector_store
from dotenv import load_dotenv

# === Load credentials from .env file (place it with OPENAI_API_KEY=<your-api-key> within the agenbotc folder)===
# Get the path to the .env file in the same directory as this script
current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(current_dir, '.env')
print(f"Loading .env from chatbot.py: {env_path}")
print(f"File exists: {os.path.exists(env_path)}")
load_dotenv(dotenv_path=env_path)
OPENAI_TOKEN = os.getenv('OPENAI_API_KEY')

if not OPENAI_TOKEN:
    raise ValueError("OPENAI_API_KEY is not set. Please check your .env file or environment variables.")

# Initialize LLM
llm = ChatOpenAI(
    model_name="gpt-3.5-turbo",
    temperature=0.3,
    api_key=OPENAI_TOKEN
)

# Custom prompt template for formatted responses
CONDENSE_QUESTION_PROMPT = PromptTemplate.from_template("""
Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.

Chat History:
{chat_history}

Follow Up Input: {question}
Standalone question:
""")

QA_PROMPT = PromptTemplate.from_template("""
You are a helpful assistant that answers questions based on provided context. Format your answers nicely with:

1. Proper paragraphs with clear breaks between ideas
2. Bullet points for lists
3. Numbered steps for processes sequentially
4. Bold text for important terms or headings
5. Clear section headers when appropriate
6. Break down complex information into simpler parts
7. Use tables for structured data when necessary
8. Provide sources for the information you present
9. Use markdown formatting for code snippets or technical terms
10. Avoid unnecessary jargon unless it's relevant to the question
11. Use examples to clarify complex concepts
12. If the question is asking for a definition, provide a clear and concise definition
13. If the question is asking for steps or a procedure, prioritize extracting and presenting those steps clearly

Look for markers like "STEP", "HEADING", "BULLET" in the context to identify structure.

Answer the question based ONLY on the following context:
{context}

Question: {question}

Answer in a well-formatted structure:
""")

# Initialize retrieval chain with custom prompts
qa_chain = ConversationalRetrievalChain.from_llm(
    llm=llm,
    retriever=vector_store.as_retriever(search_kwargs={"k": 4}),
    return_source_documents=True,
    condense_question_prompt=CONDENSE_QUESTION_PROMPT,
    combine_docs_chain_kwargs={"prompt": QA_PROMPT},
    verbose=True
)

def format_chat_history(history):
    """Format chat history for LLM consumption"""
    formatted_history = []
    if history:
        for exchange in history:
            if "question" in exchange:
                formatted_history.append((exchange["question"], exchange.get("answer", "")))
    return formatted_history

def get_chatbot_response(question: str, history: List[Dict] = None):
    """Generate a response based on the question and chat history"""
    if history is None:
        history = []
    
    chat_history = format_chat_history(history)
    
    try:
        # Get response from the language model
        result = qa_chain({"question": question, "chat_history": chat_history})
        
        # Format source information
        sources = []
        if "source_documents" in result:
            for doc in result["source_documents"]:
                source = doc.metadata.get("source", "Unknown source")
                if source not in sources:
                    sources.append(source)
        
        # Clean and format the answer
        answer = result["answer"].strip()
        
        # Add sources if available
        if sources:
            answer += f"\n\n**Sources:**\n"
            for i, source in enumerate(sources, 1):
                # Extract just the filename from the full path
                filename = source.split('/')[-1].split('\\')[-1]
                answer += f"{i}. {filename}\n"
        
        # Create avatar-friendly version
        avatar_text = _create_avatar_text(result["answer"].strip())
        
        response = {
            "answer": answer,
            "sources": sources,
            "avatar": avatar_text
        }
        
        print(f"Chatbot response: {response}")
        return response
        
    except Exception as e:
        print(f"Error in chatbot response: {str(e)}")
        return {
            "answer": "I apologize, but I encountered an error while processing your question. Please try rephrasing your question or check if you have uploaded relevant documents to the knowledge base.",
            "sources": [],
            "avatar": "I'm sorry, I encountered an error while processing your question. Please try asking again."
        }

def _create_avatar_text(answer_text: str) -> str:
    """Create a simplified, avatar-friendly version of the answer"""
    # Remove markdown formatting
    import re
    
    # Remove bold markdown
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', answer_text)
    text = re.sub(r'\*(.*?)\*', r'\1', text)
    
    # Remove links
    text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)
    
    # Remove code blocks
    text = re.sub(r'```[\s\S]*?```', 'Please check the detailed response for code examples.', text)
    
    # Convert bullet points to conversational format
    text = re.sub(r'^\s*[-*+]\s+', '', text, flags=re.MULTILINE)
    
    # Remove section headers (markdown)
    text = re.sub(r'^#+\s+', '', text, flags=re.MULTILINE)
    
    # Remove excessive whitespace
    text = re.sub(r'\n\s*\n', '. ', text)
    text = re.sub(r'\s+', ' ', text)
    
    # Limit length for avatar speech
    if len(text) > 400:
        sentences = text.split('. ')
        truncated = '. '.join(sentences[:3])
        if len(truncated) > 400:
            truncated = truncated[:400] + "..."
        text = truncated + ". Please check the detailed response for more information."
    
    return text.strip()
