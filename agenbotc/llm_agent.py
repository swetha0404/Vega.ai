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
            {
                "type": "function",
                "function": {
                    "name": "check_tomcat_status",
                    "description": "Check the status of Tomcat server including health, memory usage, and running processes",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "detailed": {
                                "type": "boolean",
                                "description": "Whether to return detailed status information",
                                "default": False
                            }
                        }
                    }
                }
            },
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

    async def process_query(self, user_query: str) -> str:
        """Process user query and route to appropriate tool"""
        print (f"###############################Processing user query: {user_query}")
        try:
            #  LLM decides which tool to use
            messages = [
                {
                    "role": "system",
                    "content": """You are an intelligent assistant that helps users with:
                        1. Tomcat server status monitoring (use check_tomcat_status tool)
                        2. General knowledge questions (use search_knowledge_base tool)

                        Analyze the user's query and decide which tool to use:
                        - If the query is about Tomcat server status, health, monitoring, or performance, use check_tomcat_status
                        - For all other questions, use search_knowledge_base

                        Additionally, if the user uses profanity or toxic language, respond that you cannot assist with such language and ask them to rephrase their question politely if it is related to IAM. Otherwise, just say that you cannot assist with that.
                        Always use the appropriate tool to get information before responding."""
                },
                {
                    "role": "user", 
                    "content": user_query
                }
            ]

            Initialresponse = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",# this is used for chat completion.
                messages=messages,
                tools=self.tools,
                tool_choice="auto"
            )
            print(f"######################LLM response: {Initialresponse}")
            # Check if the LLM wants to call the tool or KB.
            if Initialresponse.choices[0].message.tool_calls:
                #print(f"Tool call detected: {Initialresponse.choices[0].message.tool_calls}")
                # Extract tool call details
                tool_call = Initialresponse.choices[0].message.tool_calls[0]
                #print(f"Tool call ID: {tool_call.id}")
                #print(f"Tool call function: {tool_call.function.name}, arguments: {tool_call.function.arguments}")
                function_name = tool_call.function.name
                function_args = json.loads(tool_call.function.arguments)
                
                # Execute the appropriate tool
                if function_name == "check_tomcat_status":
                    print(f"\n#################Calling tool: {function_name} with args: {function_args}")
                    tool_result = await self._check_tomcat_status(**function_args)
                elif function_name == "search_knowledge_base":
                    tool_result = await self._search_knowledge_base(**function_args)
                    print(f"\n#################Calling Knowledge Base: {function_name} with args: {function_args}")
                else:
                    tool_result = "Unknown function called"
                    print("\n#####################Unknown function called:")

                # LLm responds with Final Result
                final_messages = messages + [
                    Initialresponse.choices[0].message,
                    {
                        "role": "tool",
                        "content": str(tool_result),
                        "tool_call_id": tool_call.id
                    }
                ]
                
                # # Get verbose response
                # final_messages.insert(0, {
                #     "role": "system",
                #     "content": "You are a helpful assistant. Format your final response in Markdown with bullet points, bold headers, and code blocks where helpful."
                # })
                
                # verbose_response = await self.client.chat.completions.create(
                #     model="gpt-3.5-turbo",
                #     messages=final_messages
                # )
                
                # Get avatar-friendly response
                avatar_messages = final_messages.copy()
                print("\n#################Avatar messages(final_messages.copy():", avatar_messages)
                avatar_messages[0] = {
                    "role": "system",
                    "content": """You are a helpful assistant. Rephrase the following answer to be clear, concise, and conversational, suitable for text-to-speech.

                    Guidelines for avatar speech:
                    - If the content from user is already short and clear, just repeat it.
                    - Use natural, conversational language
                    - Keep sentences short and easy to understand
                    - Avoid complex markdown formatting, code blocks, or bullet points
                    - Focus on the key information the user needs
                    - Make it sound human and friendly
                    - If there are multiple steps, mention them conversationally (e.g., "First, you'll need to..." instead of bullet points)
                    - Keep the response under 3-4 sentences when possible
                    - If the information is complex, summarize the main points clearly
                    - Do not respond to the content from user with 'Sure' or 'Got it' as you are rephrasing the text, not responding to it.
                    - You do not have to be sweet all the time, be assertive if the user content seems to use reprimanding language
                    """
                }
                
                avatar_response = await self.client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=avatar_messages
                )

                return {
                    "verbose": tool_result,
                    "avatar": avatar_response.choices[0].message.content
                }
            else: #if there is no tool call, this is the else block which is entered
                avatar_messages = [
                {
                    "role": "system",
                    "content": """You are a helpful assistant. Rephrase the following answer to be clear, concise, and conversational, suitable for text-to-speech.

                    Guidelines for avatar speech:
                    - If the content from user is already short and clear, just repeat it.
                    - Use natural, conversational language
                    - Keep sentences short and easy to understand
                    - Avoid complex markdown formatting, code blocks, or bullet points
                    - Focus on the key information the user needs
                    - Make it sound human and friendly
                    - If there are multiple steps, mention them conversationally (e.g., "First, you'll need to..." instead of bullet points)
                    - Keep the response under 3-4 sentences when possible
                    - If the information is complex, summarize the main points clearly
                    - Do not respond to the content from user with 'Sure' or 'Got it' as you are rephrasing the text, not responding to it.
                    - You do not have to be sweet all the time, be assertive if the user content seems to use reprimanding language
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

    async def _check_tomcat_status(self, detailed: bool = False) -> Dict[str, Any]:
        """Tool function to check Tomcat status"""
        print(f"\n########################Checking Tomcat status with detailed={detailed}")
        return await self.tomcat_monitor.get_status(detailed)

    async def _search_knowledge_base(self, query: str, limit: int = 5) -> Dict[str, Any]:
        """Tool function to search knowledge base"""
        print(f"\n#########################Agent Searching knowledge base with query: {query}, limit: {limit}")
        result = chatbot.get_chatbot_response(query, history=[])
        # print(f"\n#########################Agent Knowledge base search result: {result}")

        # Extract the answer from the result
        if isinstance(result, dict) and "answer" in result:
            return result["answer"]
        return str(result)