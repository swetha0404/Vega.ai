"""Main CLI interface using Typer"""

import typer
from typing import Optional, Annotated
from pathlib import Path
from rich.console import Console
from rich.table import Table

from .domain.services import LicenseService
from .tools.scheduler import start_scheduler
from .simulators.pingfed_mock import run_simulator
from .agents.crew import route_intent

app = typer.Typer(
    name="pf-agent",
    help="PingFederate Ops Agent - License Management CLI",
    add_completion=False
)
console = Console()

@app.callback()
def main() -> None:
    """PingFederate Ops Agent - License Management with AI"""
    # Start the scheduler when any command is run
    start_scheduler()


@app.command()
def run(
    query: Annotated[str, typer.Argument(help="Natural language query")],
    instance: Annotated[Optional[str], typer.Option("--instance", help="Target instance ID")] = None,
    no_nl: Annotated[bool, typer.Option("--no-nl", help="Skip natural language processing")] = False
) -> None:
    """Run a natural language command using CrewAI intent routing"""
    try:
        if no_nl:
            # Default to license get if no NL processing
            _show_license_status(instance)
        else:
            console.print(f"🤖 Processing: '{query}'")
            result = route_intent(query, instance)
            console.print(result)
    except Exception as e:
        import traceback
        console.print(f"[red]Natural language processing failed: {type(e).__name__}: {e}[/red]")
        console.print(f"[dim]Debug: {traceback.format_exc()}[/dim]")
        console.print("[yellow]💡 Tip: Try using --no-nl flag or direct commands like 'pf-agent license get'[/yellow]")
        
        # Fallback to direct license command
        try:
            console.print("[blue]Falling back to license status...[/blue]")
            _show_license_status(instance, None)  # No environment filter for fallback
        except Exception as fallback_error:
            console.print(f"[red]Fallback also failed: {fallback_error}[/red]")
            raise typer.Exit(1)


# License management commands
license_app = typer.Typer(name="license", help="License management commands")
app.add_typer(license_app)


@license_app.command()
def get(
    instance: Annotated[Optional[str], typer.Option("--instance", help="Specific instance ID")] = None,
    env: Annotated[Optional[str], typer.Option("--env", help="Filter by environment: dev, stage, prod")] = None
) -> None:
    """Get license information from cache"""
    _show_license_status(instance, env)


@license_app.command()
def apply(
    instance: Annotated[str, typer.Option("--instance", help="Target instance ID")],
    file: Annotated[Path, typer.Option("--file", help="License file path")],
    force: Annotated[bool, typer.Option("--force", help="Skip safety checks and confirmations")] = False
) -> None:
    """Apply a new license to an instance"""
    try:
        if not file.exists():
            console.print(f"[red]License file not found: {file}[/red]")
            raise typer.Exit(1)
            
        service = LicenseService()
        
        # Get current license info for validation
        try:
            current_license = service.get_license(instance)
            console.print(f"[blue]Current license status for {instance}:[/blue]")
            console.print(f"  Status: {current_license['status']}")
            console.print(f"  Expires: {current_license['expiry_date']}")
            console.print(f"  Days remaining: {current_license['days_to_expiry']}")
        except Exception:
            console.print(f"[yellow]Warning: Could not retrieve current license for {instance}[/yellow]")
            current_license = None
        
        # Pre-validate the new license file by reading it
        try:
            with open(file, 'r') as f:
                license_content = f.read()
                
            # Extract expiry date from license file
            import re
            from datetime import datetime
            
            # Look for common expiry patterns in license files
            expiry_patterns = [
                r'EXPIRY=(\d{4}-\d{2}-\d{2})',
                r'ExpirationDate=(\d{4}-\d{2}-\d{2})',
                r'Expires:\s*(\d{4}-\d{2}-\d{2})',
                r'Valid Until:\s*(\d{4}-\d{2}-\d{2})'
            ]
            
            new_expiry_date = None
            for pattern in expiry_patterns:
                match = re.search(pattern, license_content)
                if match:
                    new_expiry_date = match.group(1)
                    break
                    
            if new_expiry_date:
                # Check if new license is already expired
                expiry_dt = datetime.strptime(new_expiry_date, "%Y-%m-%d")
                today = datetime.now()
                days_until_expiry = (expiry_dt - today).days
                
                console.print(f"[blue]New license expiry date: {new_expiry_date} ({days_until_expiry} days from now)[/blue]")
                
                # ERROR CHECK 1: Prevent applying expired licenses
                if days_until_expiry < 0:
                    console.print(f"[red]❌ ERROR: The license file contains an EXPIRED license![/red]")
                    console.print(f"[red]   License expired {abs(days_until_expiry)} days ago ({new_expiry_date})[/red]")
                    console.print(f"[yellow]💡 Please obtain a valid, non-expired license file before applying.[/yellow]")
                    raise typer.Exit(1)
                
                # ERROR CHECK 2: Warn if license expires very soon (within 30 days - reasonable threshold)
                WARNING_THRESHOLD_DAYS = 30
                if days_until_expiry <= WARNING_THRESHOLD_DAYS and not force:
                    console.print(f"[yellow]⚠️  WARNING: The new license expires in only {days_until_expiry} days![/yellow]")
                    console.print(f"[yellow]   This is within the {WARNING_THRESHOLD_DAYS}-day warning threshold.[/yellow]")
                    console.print(f"[yellow]   Consider obtaining a longer-term license for production stability.[/yellow]")
                    
                    if not typer.confirm("Do you want to proceed with this short-term license?"):
                        console.print("[yellow]License application cancelled.[/yellow]")
                        raise typer.Exit(0)
                
                # ERROR CHECK 3: Confirm replacement of still-valid licenses
                if current_license and current_license['days_to_expiry'] > 90 and not force:
                    console.print(f"[yellow]⚠️  WARNING: You are replacing a license that still has {current_license['days_to_expiry']} days remaining![/yellow]")
                    console.print(f"[yellow]   Current license is still in 'OK' status and valid until {current_license['expiry_date']}[/yellow]")
                    
                    if not typer.confirm(f"Are you sure you want to replace the current valid license for {instance}?"):
                        console.print("[yellow]License application cancelled.[/yellow]")
                        raise typer.Exit(0)
                        
            else:
                console.print(f"[yellow]Warning: Could not detect expiry date from license file format[/yellow]")
                if not force and not typer.confirm("Proceed anyway?"):
                    console.print("[yellow]License application cancelled.[/yellow]")
                    raise typer.Exit(0)
                    
        except (FileNotFoundError, PermissionError, UnicodeDecodeError) as e:
            console.print(f"[yellow]Warning: Could not pre-validate license file: {e}[/yellow]")
            if not force and not typer.confirm("Proceed with license application anyway?"):
                console.print("[yellow]License application cancelled.[/yellow]")
                raise typer.Exit(0)
        
        # Apply the license
        console.print(f"[blue]Applying license to {instance}...[/blue]")
        result = service.apply_license(instance, str(file))
        
        console.print("[green]✅ License applied successfully![/green]")
        console.print(f"Instance: {result.instance_id}")
        console.print(f"New expiry: {result.expiry_date}")
        console.print(f"Status: {result.status}")
        
        # Show simulated Slack notification
        if result.status in ['WARNING', 'EXPIRED']:
            days = result.days_to_expiry
            console.print(f"\n[yellow][SLACK] PF License {result.status}: instance={instance} expires in {days}d ({result.expiry_date})[/yellow]")
        else:
            console.print(f"\n[green][SLACK] PF License updated: instance={instance} expires {result.expiry_date} (Status: {result.status})[/green]")
            
    except Exception as e:
        console.print(f"[red]Error applying license: {e}[/red]")
        raise typer.Exit(1)


@app.command()
def refresh() -> None:
    """Manually trigger license refresh for all instances"""
    try:
        console.print("[blue]Starting manual license refresh...[/blue]")
        service = LicenseService()
        results = service.refresh_all()
        
        # Show summary
        warnings = [r for r in results if r['status'] == 'WARNING']
        expired = [r for r in results if r['status'] == 'EXPIRED']
        
        console.print(f"[green]Refresh completed: {len(results)} instances processed[/green]")
        
        if warnings:
            console.print(f"[yellow]⚠️  {len(warnings)} instances with warnings[/yellow]")
            for w in warnings:
                console.print(f"[yellow][SLACK] PF License WARNING: instance={w['instance_id']} expires in {w['days_to_expiry']}d ({w['expiry_date']})[/yellow]")
                
        if expired:
            console.print(f"[red]🚨 {len(expired)} licenses expired[/red]")
            for e in expired:
                console.print(f"[red][SLACK] PF License EXPIRED: instance={e['instance_id']} expired {abs(e['days_to_expiry'])}d ago ({e['expiry_date']})[/red]")
                
    except Exception as e:
        console.print(f"[red]Error during refresh: {e}[/red]")
        raise typer.Exit(1)


# Simulator commands
simulate_app = typer.Typer(name="simulate", help="PingFederate API simulator")
app.add_typer(simulate_app)


@simulate_app.command()
def up(
    port: Annotated[int, typer.Option("--port", help="Port to run simulator on")] = 8080
) -> None:
    """Start the PingFederate API simulator"""
    from pf_agent.simulators.seed_data import generate_enterprise_instance_data
    
    console.print(f"[blue]Starting PingFederate API simulator on port {port}...[/blue]")
    
    # Get enterprise instance data to show real scale
    instance_data = generate_enterprise_instance_data()
    instance_count = len(instance_data)
    
    console.print(f"[green]🏢 Enterprise Scale: {instance_count} PingFederate instances[/green]")
    console.print("[green]Sample endpoints:[/green]")
    
    # Show first few endpoints as examples
    sample_keys = list(instance_data.keys())[:5]
    for key in sample_keys:
        console.print(f"  - http://localhost:{port}/{key}/license (GET/PUT)")
        console.print(f"  - http://localhost:{port}/{key}/license/agreement (GET/PUT)")
    
    if instance_count > 5:
        console.print(f"  ... and {instance_count - 5} more instances")
    
    console.print(f"\n[blue]💡 Use 'pf-agent refresh' to sync all {instance_count} licenses[/blue]")
    
    run_simulator(port)


def _show_license_status(instance_id: Optional[str] = None, env_filter: Optional[str] = None) -> None:
    """Helper to display license status in a table"""
    try:
        service = LicenseService()
        
        if instance_id:
            records = [service.get_license(instance_id)]
        else:
            records = service.get_all_licenses()
            
        if not records:
            console.print("[yellow]No license data found. Run 'pf-agent refresh' first.[/yellow]")
            return
        
        # Filter by environment if specified
        if env_filter:
            filtered_records = []
            for record in records:
                instance_env = record['instance_id'].split('-')[1] if '-' in record['instance_id'] else 'unknown'
                if instance_env == env_filter:
                    filtered_records.append(record)
            records = filtered_records
            
            if not records:
                console.print(f"[yellow]No license data found for {env_filter} environment.[/yellow]")
                return
            
        # Create rich table
        env_title = f" ({env_filter.upper()} Environment)" if env_filter else ""
        table = Table(title=f"PingFederate License Status{env_title}")
        table.add_column("Instance", style="cyan", no_wrap=True)
        table.add_column("Env", style="magenta")
        table.add_column("Issued To", style="green")
        table.add_column("Product", style="blue")
        table.add_column("Expiry", style="yellow")
        table.add_column("Days", justify="right")
        table.add_column("Status", style="bold")
        table.add_column("Last Synced", style="dim")
        
        for record in records:
            # Color code status
            status_style = {
                'OK': '[green]OK[/green]',
                'WARNING': '[yellow]WARNING[/yellow]', 
                'EXPIRED': '[red]EXPIRED[/red]'
            }.get(record['status'], record['status'])
            
            table.add_row(
                record['instance_id'],
                record['env'],
                record['issued_to'],
                record['product'],
                record['expiry_date'][:10],  # Just date part
                str(record['days_to_expiry']),
                status_style,
                record['last_synced_at'][:16].replace('T', ' ')  # Readable timestamp
            )
            
        console.print(table)
        
    except Exception as e:
        console.print(f"[red]Error retrieving license data: {e}[/red]")
        raise typer.Exit(1)


if __name__ == "__main__":
    app()
