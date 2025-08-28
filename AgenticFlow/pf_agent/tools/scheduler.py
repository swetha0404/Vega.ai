"""APScheduler integration for automated license refresh"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import atexit


# Global scheduler instance
scheduler = BackgroundScheduler()
_scheduler_started = False


def daily_refresh_job() -> None:
    """Job function for daily license refresh"""
    try:
        print(f"[{datetime.now()}] Starting scheduled license refresh...")
        
        # Import here to avoid circular imports
        from ..domain.services import LicenseService
        
        service = LicenseService()
        results = service.refresh_all()
        
        # Log warnings and expired licenses
        warnings = [r for r in results if r['status'] == 'WARNING']
        expired = [r for r in results if r['status'] == 'EXPIRED']
        
        print(f"Refresh completed: {len(results)} instances processed")
        
        if warnings:
            print(f"⚠️  {len(warnings)} instances with warnings")
            for w in warnings:
                print(f"[SLACK] PF License WARNING: instance={w['instance_id']} expires in {w['days_to_expiry']}d ({w['expiry_date']})")
                
        if expired:
            print(f"🚨 {len(expired)} instances expired")
            for e in expired:
                print(f"[SLACK] PF License EXPIRED: instance={e['instance_id']} expired {abs(e['days_to_expiry'])}d ago ({e['expiry_date']})")
                
    except Exception as e:
        print(f"Error in scheduled refresh: {e}")


def start_scheduler() -> None:
    """Start the background scheduler if not already started"""
    global _scheduler_started
    
    if _scheduler_started:
        return
        
    # Schedule daily refresh at 07:00
    scheduler.add_job(
        daily_refresh_job,
        trigger=CronTrigger(hour=7, minute=0),
        id='daily_license_refresh',
        name='Daily License Refresh',
        replace_existing=True
    )
    
    scheduler.start()
    _scheduler_started = True
    
    # Ensure scheduler shuts down cleanly
    atexit.register(lambda: scheduler.shutdown())
    
    print("📅 APScheduler started - daily license refresh at 07:00")


def stop_scheduler() -> None:
    """Stop the background scheduler"""
    global _scheduler_started
    
    if _scheduler_started and scheduler.running:
        scheduler.shutdown()
        _scheduler_started = False
        print("📅 APScheduler stopped")


def trigger_refresh_now() -> None:
    """Trigger an immediate refresh job"""
    daily_refresh_job()
