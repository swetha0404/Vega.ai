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
        print (f"Processing user query: {user_query}")
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

Always use the appropriate tool to get information before responding."""
                },
                {
                    "role": "user", 
                    "content": user_query
                }
            ]

            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",# this is used for chat completion.
                messages=messages,
                tools=self.tools,
                tool_choice="auto"
            )
            print(f"LLM response: {response}")
            # Check if the LLM wants to call the tool or KB.
            if response.choices[0].message.tool_calls:
                #print(f"Tool call detected: {response.choices[0].message.tool_calls}")
                # Extract tool call details
                tool_call = response.choices[0].message.tool_calls[0]
                #print(f"Tool call ID: {tool_call.id}")
                #print(f"Tool call function: {tool_call.function.name}, arguments: {tool_call.function.arguments}")
                function_name = tool_call.function.name
                function_args = json.loads(tool_call.function.arguments)
                
                # Execute the appropriate tool
                if function_name == "check_tomcat_status":
                    print(f"Calling tool: {function_name} with args: {function_args}")
                    tool_result = await self._check_tomcat_status(**function_args)
                elif function_name == "search_knowledge_base":
                    tool_result = await self._search_knowledge_base(**function_args)
                else:
                    tool_result = "Unknown function called"

                # LLm responds with Final Result
                final_messages = messages + [
                    response.choices[0].message,
                    {
                        "role": "tool",
                        "content": str(tool_result),
                        "tool_call_id": tool_call.id
                    }
                ]
                final_messages.insert(0, {
    "role": "system",
    "content": "You are a helpful assistant. Format your final response in Markdown with bullet points, bold headers, and code blocks where helpful."
})
                final_response = await self.client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=final_messages
                )

                return final_response.choices[0].message.content
            else:
                return response.choices[0].message.content

        except Exception as e:
            return f"Error processing query: {str(e)}"

    async def _check_tomcat_status(self, detailed: bool = False) -> Dict[str, Any]:
        """Tool function to check Tomcat status"""
        print(f"Checking Tomcat status with detailed={detailed}")
        return await self.tomcat_monitor.get_status(detailed)

    async def _search_knowledge_base(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Tool function to search knowledge base"""
        #return await self.knowledge_base.search(query, limit)
        print(f"Agent Searching knowledge base with query: {query}, limit: {limit}")
        result= chatbot.get_chatbot_response(query, history=[])
        print(f"Agent Knowledge base search result: {result}")
        return result
    #return await chatbot.get_chatbot_response(query, history=[])
