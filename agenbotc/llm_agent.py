import openai
import json
from typing import Dict, Any, List
import asyncio
import chatbot
from tomcat_monitor import TomcatMonitor
# from knowledge_base import KnowledgeBase
from vector_store import vector_store
from fastapi import FastAPI, UploadFile, File

class LLMAgent:
    def __init__(self, api_key: str = None):
        # Initialize OpenAI client (Change here if we need to use some other System like Claude etc.)
        self.client = openai.AsyncOpenAI(
           # this may not work and Open AI expect a key. In that case Export from outside. 
            api_key=api_key 
        )
        self.tomcat_monitor = TomcatMonitor() # Initialize Tomcat monitor class file. To add more Modules of operation we can Initilize here. Like Ping Directory Monitoring...
        self.vector_store = vector_store
        

        # Define available tools For now only Tomcat monitor and move to Our Knowledge base to Check. 
        self.tools = [
            # {
            #     "type": "function",
            #     "function": {
            #         "name": "check_tomcat_status",
            #         "description": "Check the status of Tomcat server including health, memory usage, and running processes",
            #         "parameters": {
            #             "type": "object",
            #             "properties": {
            #                 "detailed": {
            #                     "type": "boolean",
            #                     "description": "Whether to return detailed status information",
            #                     "default": False
            #                 }
            #             }
            #         }
            #     }
            # },
            {
                "type": "function",
                "function": {
                    "name": "search_knowledge_base",
                    "description": "Search the knowledge base for information on topics other than Tomcat server status",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The search query for the knowledge base"
                            },
                            "limit": {
                                "type": "integer",
                                "description": "Maximum number of results to return",
                                "default": 5
                            }
                        },
                        "required": ["query"]
                    }
                }
            }
        ]

    async def process_query(self, user_query: str, chat_history: dict = None) -> str:
        """Process user query and route to appropriate tool"""
        if chat_history is None:
            chat_history = {}
        
        # Store chat_history for use in tool functions
        self.current_chat_history = chat_history
        try:
            #  LLM decides which tool to use
            messages = [
                {
                    "role": "system",
                    "content": """You are Vega, an IAM (Authenion) support assistant. In this turn you MUST call exactly ONE tool and nothing else.

                    TESTING ASSUMPTION
                    - Assume the Tomcat server is healthy and reachable. Do not attempt status checks.

                    AVAILABLE TOOL
                    - search_knowledge_base(query: string, limit: int = 5) — Authenion docs & IAM topics: features, install/upgrade, config, integrations, APIs/SDKs, troubleshooting, SSO/OAuth2/OIDC/SAML, MFA, RBAC/ABAC, SCIM, LDAP/Kerberos, JWT/certs/keys, sessions, error codes, commands and config snippets.

                    BEFORE CALLING THE TOOL
                    - Rewrite the user request into a single, self-contained Authenion/IAM question with minimum missing context added from chat history.
                    - If the user explicitly asks for an exact **command**, **config snippet**, or **single value**, prefix the rewritten question with a mode tag:
                    [MODE: COMMAND_ONLY] | [MODE: SNIPPET_ONLY] | [MODE: VALUE_ONLY]
                    - Otherwise omit the mode tag.
                    - Privacy: do not include addresses, phone numbers, or client names; keep or introduce placeholders like [REDACTED_*] or <VALUE> if needed.

                    OUTPUT FOR THIS TURN
                    - Your reply MUST be a single function call to search_knowledge_base with arguments: { "query": "<rewritten question (with optional mode tag)>", "limit": 5 }.
                    - Do not include any free-form text.
                        """
                },
                {
                    "role": "user", 
                    "content": f"Current User Query: {user_query}; Chat History: {chat_history}"
                }
            ]

            Initialresponse = await self.client.chat.completions.create(
                model="gpt-4o-mini",# this is used for chat completion.
                temperature=0.2,
                messages=messages,
                tools=self.tools,
                tool_choice="auto"
            )
            print(f"\n\n######################LLM Initial response: {Initialresponse}")
            # Check if the LLM wants to call the tool or KB.
            if Initialresponse.choices[0].message.tool_calls:
                # Extract tool call details
                tool_call = Initialresponse.choices[0].message.tool_calls[0]
                function_name = tool_call.function.name
                function_args = json.loads(tool_call.function.arguments)
                
                # Execute the appropriate tool
                if function_name == "check_tomcat_status":
                    print(f"\n#################Calling tool: {function_name} with args: {function_args}")
                    tool_result = await self._check_tomcat_status(**function_args)
                    print(f"\n#################Tomcat server check Tool result with type: {type(tool_result)} - {tool_result}")
                elif function_name == "search_knowledge_base":
                    print(f"\n#################Calling Knowledge Base: {function_name} with args: {function_args}")
                    tool_result = await self._search_knowledge_base(**function_args)
                    print(f"\n#################Knowledge Base search tool_result with type: {type(tool_result)} - {tool_result}")

                else:
                    tool_result = "Unknown function called"
                    print("\n#####################Unknown function called")

                final_messages = [
                        {"role": "system", "content": """You are Vega. Produce the final answer grounded ONLY in the tool/KB snippets provided in this thread.

                    INTENT → OUTPUT MODE
                    - If the latest user request explicitly asks for a command/script/config snippet/single value (phrases like “command”, “CLI”, “jar”, “curl”, “sqlplus”, “snippet”, “exact value”), choose a minimal mode:
                    • COMMAND_ONLY → One fenced code block with the exact command(s); then ≤2 very short lines (run dir/prereq and placeholder note). Nothing else.
                    • SNIPPET_ONLY → One fenced config block; then ≤1 short placement line.
                    • VALUE_ONLY → The single value only.
                    - Otherwise use RESOLUTION-FIRST (compact):
                    **Diagnosis Snapshot** (1–2 lines) → **Fix Now** (numbered, product-specific; exact keys/paths/values; include one quick verification) → **If Still Failing** (2–3 targeted checks) → optional ONE clarifying question if essential.

                    GROUNDING
                    - Use ONLY facts present in this conversation’s tool/KB content. No speculation. Mark placeholders like <…> clearly.

                    FORMAT
                    - Markdown. Use fenced code blocks for commands/snippets. Keep it concise.

                    PRIVACY
                    - Never output addresses, phone numbers, or client names; replace with “[REDACTED_*]”.
                    """
                    },
                        # Pass the tool call the router made:
                        {
                            "role": "assistant",
                            "content": None,
                            "tool_calls": Initialresponse.choices[0].message.tool_calls
                        },
                        # Provide the tool result WITH ITS NAME so the model grounds on it:
                        {
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "name": function_name,                 # <-- critical patch
                            "content": str(tool_result)
                        }
                    ]

                print(f"\n\n#################Final messages to model: {final_messages}")

                final_response = await self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    temperature=0.1,
                    messages=final_messages
                )

                print(f"\n\n#################Final response from model: {final_response}")


                # Get avatar-friendly response
                avatar_messages = [
                    {"role": "system",
                    "content": """

                    You are Vega’s voice. Rephrase the prior assistant message for text-to-speech. Do not add or remove information; only compress and humanize.

                    STYLE
                    - 50–90 words (3–5 sentences). No lists, markdown, code, or URLs.
                    - Clear, friendly, direct; short sentences; natural rhythm.

                    RULES
                    - If the text contains a code/config block, do NOT read it verbatim. Say that the exact command/snippet is shown above, then give 1–2 cues (where to run it, what to replace, and how to verify success).
                    - Keep product/protocol names (Authenion, SSO, OIDC, SAML) as written.
                    - Preserve placeholders like [REDACTED_*] by saying “redacted.” Never voice phone numbers, addresses, or client names.
                    - Avoid meta talk (“according to…”, “the KB says…”).
                    
                    """},

                    {"role": "user",
                    "content": final_response.choices[0].message.content}
                    #  "content": tool_result }
                ]
                
                avatar_response = await self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    temperature=0.4,
                    messages=avatar_messages
                )

                return {
                    "verbose": final_response.choices[0].message.content,
                    # "verbose": tool_result,
                    "avatar": avatar_response.choices[0].message.content
                }
            

            else: #if there is no tool call, this is the else block which is entered
                print(f"\n#################No tool call found")
                avatar_messages = [
                {
                    "role": "system",
                    "content": """
                    
                    You are Vega’s voice. Rephrase the previous assistant message for text-to-speech. Do not add, remove, or infer new information; only compress and humanize.

                    STYLE
                    - 45–80 words, 2–4 sentences. No lists, markdown, code, or URLs.
                    - Clear, friendly, confident; short sentences; use contractions; natural rhythm.

                    RULES
                    - Merge headings/bullets into flowing speech.
                    - Keep key product/protocol names as written.
                    - If the message contains a question, keep exactly one concise question.
                    - Say “redacted” for any [REDACTED_*] items; never voice numbers/addresses/client names.
                    - No meta commentary.


                    """
                },
                {
                    "role": "user",
                    "content": Initialresponse.choices[0].message.content
                }
                ]
                avatar_response = await self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    temperature=0.4,
                    messages=avatar_messages
                )

                return {
                    "verbose": Initialresponse.choices[0].message.content,
                    "avatar": avatar_response.choices[0].message.content
                }
        except Exception as e:
            error_message = f"Error processing query: {str(e)}"
            return {
                "verbose": error_message,
                "avatar": "I encountered an error while processing your question. Please try again."
            }

    async def _check_tomcat_status(self, detailed: bool = False) -> str:
        """Tool function to check Tomcat status"""
        print(f"\n########################Checking Tomcat status with detailed={detailed}")
        return await self.tomcat_monitor.get_status(detailed)

    async def _search_knowledge_base(self, query: str, limit: int = 5) -> Dict[str, Any]:
        """Tool function to search knowledge base"""
        
        # Use the stored chat history
        history = getattr(self, 'current_chat_history', {})
        print(f"\n#########################Agent Searching knowledge base with query: {query}, \nhistory: {history}")
        result = chatbot.get_chatbot_response(query, history=history)

        # Extract the answer from the result
        if isinstance(result, dict) and "answer" in result:
            return result["answer"]
        return str(result)