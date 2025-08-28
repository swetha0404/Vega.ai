import psutil
import requests
import asyncio
from typing import Dict, Any, List
import subprocess
import json

class TomcatMonitor:
    def __init__(self, tomcat_port: int = 8080, tomcat_host: str = "localhost"):
        self.tomcat_port = tomcat_port
        self.tomcat_host = tomcat_host
        self.tomcat_url = f"http://{tomcat_host}:{tomcat_port}"

    async def get_status(self, detailed: bool = False) -> str:
        """Get comprehensive Tomcat server status as formatted string"""
        status = await self._get_status_dict(detailed)
        return self._format_status_string(status)

    async def _get_status_dict(self, detailed: bool = False) -> Dict[str, Any]:
        """Get comprehensive Tomcat server status as dictionary (internal use)"""
        status = {
            "timestamp": asyncio.get_event_loop().time(),
            "server_running": False,
            "port_accessible": False,
            "processes": [],
            "system_resources": {}
        }

        try:
            # Check if Tomcat processes are running
            status["processes"] = await self._get_tomcat_processes()
            status["server_running"] = len(status["processes"]) > 0

            # Check if Tomcat port is accessible
            status["port_accessible"] = await self._check_port_accessibility()

            # Get system resource usage
            status["system_resources"] = await self._get_system_resources()

            if detailed:
                # Add detailed information
                status["detailed_info"] = {
                    "memory_usage": await self._get_memory_usage(),
                    "thread_count": await self._get_thread_count(),
                    "uptime": await self._get_uptime()
                }

            status["overall_health"] = self._calculate_health_score(status)

        except Exception as e:
            status["error"] = str(e)

        return status

    def _format_status_string(self, status: Dict[str, Any]) -> str:
        """Format status dictionary into a readable string"""
        if "error" in status:
            return f"Tomcat Server Status Error: {status['error']}"
        
        # Basic status information with double newlines and markdown formatting
        status_str = "**Tomcat Server Status Report:-**\n\n"
        status_str += f"• **Server Running:** {status.get('server_running', 'Unknown')}\n\n"
        status_str += f"• **Port Accessible:** {status.get('port_accessible', 'Unknown')}\n\n"
        status_str += f"• **Overall Health:** {status.get('overall_health', 'Unknown')}\n\n"
        status_str += f"• **Active Processes:** {len(status.get('processes', []))}\n\n"
        
        # System resources
        sys_resources = status.get('system_resources', {})
        if sys_resources:
            status_str += f"• **System CPU:** {sys_resources.get('cpu_percent', 'Unknown')}%\n\n"
            memory_info = sys_resources.get('memory', {})
            if memory_info:
                status_str += f"• **Memory Usage:** {memory_info.get('percent', 'Unknown')}%\n\n"
            disk_info = sys_resources.get('disk', {})
            if disk_info:
                status_str += f"• **Disk Usage:** {disk_info.get('percent', 'Unknown')}%"
        
        return status_str

    async def _get_tomcat_processes(self) -> List[Dict[str, Any]]:
        """Find all Tomcat-related processes"""
        processes = []
        try:
            for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'memory_percent', 'cpu_percent']):
                try:
                    if proc.info['cmdline'] and any('tomcat' in cmd.lower() or 'catalina' in cmd.lower() 
                                                   for cmd in proc.info['cmdline']):
                        processes.append({
                            'pid': proc.info['pid'],
                            'name': proc.info['name'],
                            'memory_percent': proc.info['memory_percent'],
                            'cpu_percent': proc.info['cpu_percent']
                        })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        except Exception as e:
            print(f"Error getting Tomcat processes: {e}")
        
        return processes

    async def _check_port_accessibility(self) -> bool:
        """Check if Tomcat port is accessible"""
        try:
            response = requests.get(f"{self.tomcat_url}/", timeout=5)
            return response.status_code in [200, 404, 401, 403]  # These indicate server is running
        except Exception:
            return False

    async def _get_system_resources(self) -> Dict[str, Any]:
        """Get system resource information"""
        return {
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory": {
                "total": psutil.virtual_memory().total,
                "available": psutil.virtual_memory().available,
                "percent": psutil.virtual_memory().percent
            },
            "disk": {
                "total": psutil.disk_usage('/').total,
                "free": psutil.disk_usage('/').free,
                "percent": psutil.disk_usage('/').percent
            }
        }

    async def _get_memory_usage(self) -> Dict[str, Any]:
        """Get detailed memory usage for Tomcat processes"""
        memory_info = {"total_memory": 0, "process_count": 0}
        
        for proc in await self._get_tomcat_processes():
            try:
                process = psutil.Process(proc['pid'])
                memory_info["total_memory"] += process.memory_info().rss
                memory_info["process_count"] += 1
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
                
        return memory_info

    async def _get_thread_count(self) -> int:
        """Get total thread count for Tomcat processes"""
        total_threads = 0
        for proc in await self._get_tomcat_processes():
            try:
                process = psutil.Process(proc['pid'])
                total_threads += process.num_threads()
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        return total_threads

    async def _get_uptime(self) -> Dict[str, Any]:
        """Get uptime for Tomcat processes"""
        uptimes = []
        for proc in await self._get_tomcat_processes():
            try:
                process = psutil.Process(proc['pid'])
                create_time = process.create_time()
                uptime = asyncio.get_event_loop().time() - create_time
                uptimes.append({
                    "pid": proc['pid'],
                    "uptime_seconds": uptime,
                    "uptime_hours": uptime / 3600
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        return uptimes

    def _calculate_health_score(self, status: Dict[str, Any]) -> str:
        """Calculate overall health score"""
        if not status["server_running"]:
            return "CRITICAL - Server not running"
        
        if not status["port_accessible"]:
            return "WARNING - Server running but not accessible"
        
        memory_percent = status["system_resources"]["memory"]["percent"]
        cpu_percent = status["system_resources"]["cpu_percent"]
        
        if memory_percent > 90 or cpu_percent > 90:
            return "WARNING - High resource usage"
        elif memory_percent > 70 or cpu_percent > 70:
            return "CAUTION - Moderate resource usage"
        else:
            return "HEALTHY - All systems normal"

