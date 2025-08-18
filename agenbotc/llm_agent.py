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
                    "content": """You are Vega, an IAM (Authenion) support assistant. You MUST call exactly ONE tool before answering.
                        For all testing and development purposes assume the tomcat server is working and help user resolve the issue presented in the query
                        TOOLS
                         search_knowledge_base(query: string, limit: int = 5) — Use for Authenion docs & IAM topics: features, install/upgrade, config, integrations, APIs/SDKs, troubleshooting guides, SSO/OAuth2/OIDC/SAML, MFA, RBAC/ABAC, SCIM, LDAP/Kerberos, JWT/certs/keys, sessions, error codes.

                        ROUTING
                        
                        - search_knowledge_base(query := rewrite the user request into a clear standalone Authenion/IAM query; limit=5).
                        - When unsure, DEFAULT to search_knowledge_base.

                        SCOPE
                        Treat as in-scope if related to Authenion, SSO/OAuth2/OIDC/SAML, MFA, SCIM, LDAP/Kerberos, RBAC/ABAC, JWT/certs/keys, users/roles/permissions, install/config/upgrade, troubleshooting, or Tomcat runtime for Authenion.

                        IMPORTANT
                        - Analyze the current query; use chat history only as context (do NOT repeat prior answers verbatim).
                        - Make the tool call first. The final user answer will be produced AFTER the tool output is returned in the next step.
                        """
                },
                {
                    "role": "user", 
                    "content": f"Current User Query: {user_query}; Chat History: {chat_history}"
                }
            ]

            Initialresponse = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",# this is used for chat completion.
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

                final_messages = messages + [
                    Initialresponse.choices[0].message,
                    {
                        "role": "tool",
                        "content": str(tool_result),
                        "tool_call_id": tool_call.id
                    }
                ]
                
                final_messages.insert(0, {
                    "role": "system",
                    "content": """You are Vega. Produce a resolution-first answer grounded ONLY in the tool output and/or KB snippets provided in this thread.

                        OUTPUT STYLE (keep it compact and actionable)
                        - **Diagnosis Snapshot (1–2 lines):** What the evidence suggests.
                        - **Most Likely Causes (bulleted):** Pull concrete causes that match the evidence/snippets.
                        - **Fix Now (numbered steps):** Exact configuration names/paths/values and CLI/UI steps. Prefer product-specific details found in the snippets. Include one quick verification step.
                        - **If Still Failing:** 2–3 next checks or escalations (logs/metrics/commands with exact paths/keys), each tied to a possible cause.
                        - **One Clarifying Question** (only if essential to choose between fixes).

                        GROUNDING RULES
                        - Use ONLY facts present in tool output / KB snippets you were given in this conversation. Do not invent features, paths, or values.
                        - If details are partial, still give the most probable, safe next step and ask one precise clarifier.
                        - Prefer exact names: setting keys, profile options, endpoints, HTTP params, cookie names, etc., when they appear in the provided material.

                        FORMAT
                        - Markdown. Bold section headers. Numbered steps for fixes. Inline code for keys/values/endpoints (`like_this`).

                        PRIVACY
                        - Do not output addresses, phone numbers, or client company names; replace with `[REDACTED_*]` if present in inputs."""
                })

                final_response = await self.client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=final_messages
                )


                
                # Get avatar-friendly response
                avatar_messages = [
                    {"role": "system",
                    "content": """You are Vega’s voice. Turn the previous assistant answer into a short, conversational script for text-to-speech.

                    GOAL
                    - Help the user resolve the issue quickly. Speak like a helpful engineer, not a document.

                    STYLE
                    - 50–90 words (3–5 sentences). No lists, no markdown, no code blocks, no URLs.
                    - Use clear, friendly, direct language with short sentences and contractions.
                    - Start with a one-line diagnosis, then 2–3 concrete actions using “First… Next… Finally…”
                    - Include one quick verification (“You should see…”). If a crucial fact is missing, end with one concise question.
                    - Do not say “According to the tool/KB,” “Based on the context,” or meta commentary.

                    CONVERSION RULES
                    - Keep product/protocol names (Authenion, SSO, OIDC, SAML). Avoid unnecessary jargon.
                    - Convert config keys/values to plain speech (say the key, then the value).
                    - Do not invent new steps; only compress what’s already in the prior assistant message."""},

                    {"role": "user",
                    "content": final_response.choices[0].message.content}
                    #  "content": tool_result }
                ]
                
                avatar_response = await self.client.chat.completions.create(
                    model="gpt-3.5-turbo",
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
                    "content": """You are Vega’s voice. Rephrase the previous assistant message for text-to-speech. Do not add, remove, or infer new information; only compress and humanize the existing content.

                    STYLE
                    - 45–80 words, 2–4 sentences. No lists, no markdown, no code, no URLs.
                    - Clear, friendly, confident; use contractions; short sentences; natural rhythm.
                    - Merge headings/bullets into flowing speech. Keep key product/protocol names as given.
                    - If the input already is short and clear, keep it nearly verbatim.

                    CONVERSION RULES
                    - Preserve all facts; do not introduce steps, claims, or apologies that aren’t present.
                    - Convert config keys/values to plain speech but keep the exact terms.
                    - If the input includes a question or request for info, keep exactly one concise question.
                    - Keep placeholders like [REDACTED_*] and speak them as “redacted.” Do not voice phone numbers, addresses, or client names.
                    - Avoid meta talk (“according to,” “based on context,” “the tool says”).

                    """
                },
                {
                    "role": "user",
                    "content": Initialresponse.choices[0].message.content
                }
                ]
                avatar_response = await self.client.chat.completions.create(
                    model="gpt-3.5-turbo",
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