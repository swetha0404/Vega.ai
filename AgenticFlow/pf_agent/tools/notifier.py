"""Notification utilities (simulated for MVP)"""

from typing import List, Dict, Any


class SlackNotifier:
    """Simulated Slack notification service"""
    
    def __init__(self, webhook_url: str = "") -> None:
        self.webhook_url = webhook_url
        
    def send_license_warning(self, instance_id: str, days_to_expiry: int, expiry_date: str) -> None:
        """Send license warning notification (simulated)"""
        message = f"[SLACK] PF License WARNING: instance={instance_id} expires in {days_to_expiry}d ({expiry_date})"
        print(message)
        # In real implementation: 
        # requests.post(self.webhook_url, json={"text": message})
    
    def send_license_expired(self, instance_id: str, days_past_expiry: int, expiry_date: str) -> None:
        """Send license expired notification (simulated)"""
        message = f"[SLACK] PF License EXPIRED: instance={instance_id} expired {days_past_expiry}d ago ({expiry_date})"
        print(message)
        # In real implementation:
        # requests.post(self.webhook_url, json={"text": message})
    
    def send_license_updated(self, instance_id: str, new_expiry: str, status: str) -> None:
        """Send license update notification (simulated)"""
        message = f"[SLACK] PF License updated: instance={instance_id} expires {new_expiry} (Status: {status})"
        print(message)
        # In real implementation:
        # requests.post(self.webhook_url, json={"text": message})
    
    def send_daily_summary(self, results: List[Dict[str, Any]]) -> None:
        """Send daily refresh summary (simulated)"""
        warnings = [r for r in results if r['status'] == 'WARNING']
        expired = [r for r in results if r['status'] == 'EXPIRED']
        
        if warnings or expired:
            summary = f"[SLACK] Daily PF License Summary: {len(warnings)} warnings, {len(expired)} expired"
            print(summary)
            
            for w in warnings:
                self.send_license_warning(w['instance_id'], w['days_to_expiry'], w['expiry_date'])
                
            for e in expired:
                self.send_license_expired(e['instance_id'], abs(e['days_to_expiry']), e['expiry_date'])
