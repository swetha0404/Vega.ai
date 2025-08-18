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
Rewrite the user's follow-up into a single, self-contained question for Authenion/IAM retrieval.

Rules:
- Preserve exact technical entities: error codes, endpoints/URLs, config keys, versions, cookie names, and ports (e.g., 8080/8443).
- If the follow-up relies on context, add the minimum missing details from Chat History so it stands alone.
- If the user explicitly asks for a command/script/config snippet/single value, prefix the rewritten question with a mode tag:
  [MODE: COMMAND_ONLY] | [MODE: SNIPPET_ONLY] | [MODE: VALUE_ONLY]
- Otherwise omit a mode tag.
- Do NOT answer; return only the rewritten question (with mode tag if any).
- If already standalone, return it unchanged.

Chat History:
{chat_history}

Follow-up:
{question}

Standalone question:
""")


QA_PROMPT = PromptTemplate.from_template("""
You are Vega, an assistant for Authenion and IAM. Answer ONLY from the provided context; do not invent features, paths, flags, or values.
The question may begin with a mode tag: [MODE: COMMAND_ONLY], [MODE: SNIPPET_ONLY], or [MODE: VALUE_ONLY]. If present, strictly follow it.

ANSWER MODES (pick ONE)
- [MODE: COMMAND_ONLY] → Output ONLY the exact command(s) in a single fenced code block (bash/sql/xml/json as appropriate). After the block, add at most two short lines: one prerequisite (e.g., run directory/env) and one placeholder note (e.g., replace <EIKUSER>). No headings, lists, or extra prose.
- [MODE: SNIPPET_ONLY] → Output ONLY the precise config snippet in a fenced block; then a single short line indicating where it goes.
- [MODE: VALUE_ONLY] → Output ONLY the single value/key requested, nothing else.
- If no mode tag → Use RESOLUTION-FIRST (compact):

RESOLUTION-FIRST (when no mode tag)
**Diagnosis Snapshot:** 1–2 lines grounded in the context.
**Fix Now:** Numbered steps with exact keys/paths/values and UI/CLI steps (quote them exactly as shown).
**Verify:** One quick test and expected outcome.
**If Still Failing:** Up to 3 targeted checks/escalations (logs/metrics/commands; exact paths/names).

Partial or tangential context:
- Always extract the closest relevant guidance from the context.
- If the exact command/snippet/value is missing, provide the best-available closest form and mark placeholders clearly (e.g., <SEIK_HOME>). Add ONE precise clarifier if essential.

Privacy:
- Never output addresses, phone numbers, or client names; keep [REDACTED_*] or <VALUE> placeholders if present.

Context:
{context}

Question:
{question}

Answer:
""")

qa_chain = ConversationalRetrievalChain.from_llm(
    llm=llm,
    retriever=vector_store.as_retriever(
        search_type="mmr", 
        search_kwargs={"k": 8, "fetch_k": 24, "lambda_mult": 0.5}
    ),
    return_source_documents=True,
    condense_question_prompt=CONDENSE_QUESTION_PROMPT,
    combine_docs_chain_kwargs={"prompt": QA_PROMPT},
    verbose=True
)


def format_chat_history(history):
    """Format chat history dict for LLM consumption"""
    formatted_history = []
    if history and isinstance(history, dict):
        # Convert dict format {"User_message_1": "...", "AI_message_1": "..."} to tuple format
        # Group messages by number and create conversation pairs
        messages = {}
        for key, value in history.items():
            if key.startswith('User_message_'):
                msg_num = key.replace('User_message_', '')
                if msg_num not in messages:
                    messages[msg_num] = {}
                messages[msg_num]['question'] = value
            elif key.startswith('AI_message_'):
                msg_num = key.replace('AI_message_', '')
                if msg_num not in messages:
                    messages[msg_num] = {}
                messages[msg_num]['answer'] = value
        
        # Convert to the format expected by ConversationalRetrievalChain
        for msg_num in sorted(messages.keys(), key=int):
            if 'question' in messages[msg_num] and 'answer' in messages[msg_num]:
                formatted_history.append((messages[msg_num]['question'], messages[msg_num]['answer']))
        
        print(f"\n\n$$$$$$$$$$$$$$Formatted chat history: {formatted_history}")
    return formatted_history

def get_chatbot_response(question: str, history: dict = None):
    """Generate a response based on the question and chat history"""
    if history is None:
        history = {}
    
    chat_history = format_chat_history(history)
    
    try:
        # Get response from the language model
        result = qa_chain({"question": question, "chat_history": chat_history})
        
        # Clean and format the answer
        answer = result["answer"].strip()
        
        response = {
            "answer": answer
        }
        
        return response
        
    except Exception as e:
        print(f"\n$$$$$$$$$$$$$$$Error in chatbot response: {str(e)}")
        return {
            "answer": "I apologize, but I encountered an error while processing your question. Please try rephrasing your question or check if you have uploaded relevant documents to the knowledge base.",
            "avatar": "I'm sorry, I encountered an error while processing your question. Please try asking again."
        }