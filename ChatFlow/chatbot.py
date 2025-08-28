import os
from typing import List, Dict
from langchain.chains import ConversationalRetrievalChain
from langchain.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from vector_store import vector_store
from dotenv import load_dotenv

# === Load credentials from .env file (place it with OPENAI_API_KEY=<your-api-key> in the root folder)===
# Get the path to the .env file in the root directory
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)  # Go up one level to root
env_path = os.path.join(root_dir, '.env')

load_dotenv(dotenv_path=env_path)
OPENAI_TOKEN = os.getenv('OPENAI_API_KEY')

if not OPENAI_TOKEN:
    raise ValueError("OPENAI_API_KEY is not set. Please check your .env file or environment variables.")

# Initialize LLM
llm = ChatOpenAI(
    model="gpt-4o-mini", 
    temperature=0.1,
    api_key=OPENAI_TOKEN
)

# Custom prompt template for formatted responses
CONDENSE_QUESTION_PROMPT = PromptTemplate.from_template("""
Rewrite the user's follow-up into a single, self-contained question for Authenion/IAM retrieval.

Rules:
- Preserve exact technical entities: error codes, endpoints/URLs, config keys, versions, cookie names, and ports (e.g., 8080/8443).
- If the follow-up relies on context, add the minimum missing details from Chat History so it stands alone.
- If the user explicitly asks for a command/script/config snippet/single value, prefix with:
  [MODE: COMMAND_ONLY] | [MODE: SNIPPET_ONLY] | [MODE: VALUE_ONLY]
- If the user asks for a definition/overview/explanation (“what is/are…”, “explain…”, “overview…”, “how does X work…”, “benefits/use cases…”), prefix with:
  [MODE: EXPLAIN]
- If the user asks for a how-to/configure/setup/integrate/install (“how to…”, “how do I configure…”, “set up…”, “integrate…”, “install…”), prefix with:
  [MODE: HOWTO]
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
The question may begin with a mode tag: [MODE: EXPLAIN], [MODE: HOWTO], [MODE: COMMAND_ONLY], [MODE: SNIPPET_ONLY], or [MODE: VALUE_ONLY].
If a tag is present, strictly follow it. If no tag is present:
- If the question is conceptual (“what is/are…”, “explain…”, “overview…”, “how does X work…”, “why X…”, “benefits/use cases”), treat it as [MODE: EXPLAIN].
- If the question is procedural (“how to…”, “configure…”, “set up…”, “integrate…”, “install…”), treat it as [MODE: HOWTO].
- Otherwise use RESOLUTION-FIRST.

ANSWER MODES (pick ONE)
- [MODE: EXPLAIN] → 1–2 short paragraphs (≤180 words). Start with a clear definition grounded in context, then typical applications or high-level “how it works”. No headings, no lists, no code.
- [MODE: HOWTO] → Concise procedural answer:
  **Prerequisites** (1–3 bullets, if needed)  
  **Steps** (numbered, exact keys/paths/values and UI/CLI actions as shown)  
  **Verify** (one quick check and expected result)  
  **Notes** (0–3 brief pitfalls)  
  No “Diagnosis Snapshot”.
- [MODE: COMMAND_ONLY] → ONLY the exact command(s) in one fenced code block; then ≤2 short lines (run dir/env + placeholder note). No extra prose.
- [MODE: SNIPPET_ONLY] → ONLY the precise config snippet in a fenced block; then one short placement line.
- [MODE: VALUE_ONLY] → ONLY the single requested value/key.

If none of the above modes apply:
RESOLUTION-FIRST
**Diagnosis Snapshot:** 1–2 lines grounded in the context.
**Fix Now:** Numbered steps with exact keys/paths/values and UI/CLI steps (quote exactly as shown).
**Verify:** One quick test and expected outcome.
**If Still Failing:** Up to 3 targeted checks/escalations (logs/metrics/commands; exact paths/names).

Partial/tangential context:
- Always extract the closest relevant guidance.
- If the exact command/snippet/value/definition is missing, provide the best supported form and mark placeholders clearly (e.g., <SEIK_HOME>). Ask ONE precise clarifier only if essential.

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