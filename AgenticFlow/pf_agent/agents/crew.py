"""CrewAI agents and task routing"""

import os
from typing import Optional, Dict, Any, List
from crewai import Agent, Task, Crew
from crewai.tools import BaseTool
from pydantic import BaseModel, Field

from ..domain.services import LicenseService
from ..config import config

# Set OpenAI API key for CrewAI
if config.openai_api_key:
    os.environ["OPENAI_API_KEY"] = config.openai_api_key
else:
    print("⚠️  OPENAI_API_KEY not set in .env file - CrewAI may not work properly")


class LicenseDataToolInput(BaseModel):
    """Input schema for license data tool"""
    filter_criteria: Optional[str] = Field(None, description="Natural language filter criteria")


class GetLicenseDataTool(BaseTool):
    """Tool for retrieving raw license data"""
    name: str = "get_license_data"
    description: str = "Get all license data from the database for analysis and filtering"
    args_schema: type[BaseModel] = LicenseDataToolInput
    
    def _run(self, filter_criteria: Optional[str] = None) -> str:
        """Execute license data retrieval"""
        try:
            service = LicenseService()
            records = service.get_all_licenses()
            
            if not records:
                return "No license data found. Run refresh first."
            
            # Return raw data for AI agents to process
            license_data = []
            for record in records:
                license_data.append({
                    'instance_id': record['instance_id'],
                    'status': record['status'],
                    'expiry_date': record['expiry_date'][:10],
                    'days_to_expiry': record['days_to_expiry']
                })
            
            return str(license_data)
                
        except Exception as e:
            return f"Error retrieving license data: {e}"


def create_intent_classifier_agent() -> Agent:
    """Create an agent to classify user intent"""
    return Agent(
        role='Intent Classification Specialist',
        goal='Analyze user queries to understand what they want to know about PingFederate licenses',
        backstory='''You are an expert in understanding user intent for license management queries. 
        You can identify when users want to:
        - Get license information (show, list, display, check, view, status)
        - Apply/update licenses (apply, update, install, upload, change)
        - Filter by environment (dev, staging, prod, uat, dr)
        - Filter by status (problems, issues, attention needed, expired, warning, critical)
        - Get specific instance details
        
        You provide clear analysis of what the user is asking for.''',
        verbose=False,
        allow_delegation=False
    )


def create_data_filter_agent() -> Agent:
    """Create an agent to filter license data based on user requirements"""
    return Agent(
        role='Data Filtering Specialist',
        goal='Filter license data based on user requirements using natural language understanding',
        backstory='''You are an expert in filtering PingFederate license data. You understand:
        - Environment filters: dev, stage, prod, uat, dr (look at instance_id patterns like pf-dev-*, pf-prod-*)
        - Status filters: when users ask for "problems", "attention", "issues" they want WARNING or EXPIRED status only
        - Instance-specific queries: when users mention specific instance names
        
        You analyze the raw license data and apply intelligent filters based on what the user actually wants.
        
        IMPORTANT FILTERING RULES:
        - For environment filtering, extract environment from instance_id (e.g., pf-dev-* = dev environment)
        - For status filtering, when users ask for "problems", "attention", "issues", only show WARNING or EXPIRED
        - When no status filter is specified, show all instances in the environment
        - Present results clearly with instance name, status, and expiry date''',
        tools=[GetLicenseDataTool()],
        verbose=False,
        allow_delegation=False
    )


def create_response_formatter_agent() -> Agent:
    """Create an agent to format responses appropriately"""
    return Agent(
        role='Response Formatting Specialist',
        goal='Present license information in clear, human-readable format optimized for operations teams',
        backstory='''You are an expert in presenting technical information clearly. You:
        - Use numbered lists for multiple items
        - Highlight critical issues (EXPIRED, WARNING)
        - Provide concise, actionable information
        - Use plain text, never JSON
        - Add helpful context like "Needs attention" for problems
        - Provide positive feedback when no issues are found''',
        verbose=False,
        allow_delegation=False
    )


def create_license_applicator_agent() -> Agent:
    """Create an agent to handle license application guidance"""
    return Agent(
        role='License Application Specialist',
        goal='Guide users through PingFederate license application processes safely',
        backstory='''You are an expert in PingFederate license management. You help users apply licenses safely by:
        - Explaining the correct CLI commands
        - Warning about potential risks
        - Guiding through the safety checks
        - Recommending best practices''',
        verbose=False,
        allow_delegation=False
    )


def route_intent(query: str, instance_hint: Optional[str] = None) -> str:
    """Route user query to appropriate CrewAI agents for intelligent processing"""
    
    # Check if OpenAI API key is available
    if not config.openai_api_key:
        print("⚠️  No OpenAI API key found. AI agents cannot function without OpenAI API key.")
        return "Error: OpenAI API key required for natural language processing. Please set OPENAI_API_KEY in your .env file."
    
    try:
        # Create agents
        intent_agent = create_intent_classifier_agent()
        filter_agent = create_data_filter_agent()
        formatter_agent = create_response_formatter_agent()
        applicator_agent = create_license_applicator_agent()
        
        # Step 1: Classify intent
        intent_task = Task(
            description=f'''Analyze this user query and determine the intent: "{query}"
            
            Determine if the user wants to:
            1. VIEW license information (keywords: show, display, list, check, view, status, get, what, which)
            2. APPLY/UPDATE licenses (keywords: apply, update, install, upload, change, set, put)
            
            Also identify any filters they want:
            - Environment filters: dev, development, staging, stage, test, prod, production, live, uat, dr, disaster recovery
            - Status filters: problems, issues, attention, expired, warning, critical, trouble, alerts
            - Specific instances: any mention of specific instance names
            
            Provide a clear analysis of what the user wants.''',
            expected_output="Clear intent classification: VIEW or APPLY, and any filters identified",
            agent=intent_agent
        )
        
        # Execute intent classification
        intent_crew = Crew(agents=[intent_agent], tasks=[intent_task], verbose=False)
        intent_result = str(intent_crew.kickoff()).lower()
        
        # Determine which path to take based on intent
        if 'apply' in intent_result or 'update' in intent_result or 'install' in intent_result:
            # License application path
            app_task = Task(
                description=f'''The user wants to apply or update a license. Original query: "{query}"
                
                Provide guidance on how to use the license application command properly.
                Mention the correct syntax: pf-agent license apply --instance <instance_id> --file <license_file>
                
                If they mentioned a specific instance, include it in your guidance.
                Remind them about safety features like expiry warnings and --force option.''',
                expected_output="Clear guidance on license application process",
                agent=applicator_agent
            )
            
            app_crew = Crew(agents=[applicator_agent], tasks=[app_task], verbose=False)
            return str(app_crew.kickoff())
            
        else:
            # Data viewing path - use AI agents for intelligent filtering and formatting
            filter_task = Task(
                description=f'''Get license data and filter it based on this user query: "{query}"
                
                Use the get_license_data tool to retrieve all license information.
                Then intelligently filter the results based on what the user is asking for:
                
                - If they mention environments like "dev", "prod", "staging", filter by instance_id patterns
                - If they ask for "problems", "attention", "issues", only show WARNING or EXPIRED status
                - If they mention specific instances, focus on those
                - If no filters are specified, show appropriate summary
                
                Return the filtered data with clear indication of what filters were applied.''',
                expected_output="Filtered license data based on user requirements",
                agent=filter_agent
            )
            
            format_task = Task(
                description=f'''Take the filtered license data and format it for the user.
                Original query was: "{query}"
                
                Format the response as:
                - Numbered list for multiple items
                - Highlight critical status (EXPIRED, WARNING) 
                - Add "- Needs attention" for problematic instances
                - Use clear, human-readable format
                - Provide positive feedback if no issues found
                - Include environment context if filtered
                
                Make it clear and actionable for operations teams.''',
                expected_output="Well-formatted, human-readable license status report",
                agent=formatter_agent
            )
            
            # Execute data filtering and formatting
            data_crew = Crew(
                agents=[filter_agent, formatter_agent], 
                tasks=[filter_task, format_task], 
                verbose=False
            )
            return str(data_crew.kickoff())
            
    except Exception as e:
        print(f"⚠️  AI Agent Error: {type(e).__name__}: {e}")
        print("💡 Falling back to direct service call...")
        
        # Simple fallback
        try:
            service = LicenseService()
            records = service.get_all_licenses()
            if not records:
                return "No license data found. Run 'pf-agent refresh' first."
            
            summary = []
            for record in records[:10]:  # Limit to first 10 for fallback
                summary.append(f"{record['instance_id']}: {record['status']} (expires {record['expiry_date'][:10]})")
            
            return "License Summary (first 10 instances):\n" + "\n".join(summary)
        except Exception as service_error:
            return f"Error: {service_error}"
