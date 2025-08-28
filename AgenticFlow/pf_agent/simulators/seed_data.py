"""Deterministic seed data for simulator - Enterprise Scale (140+ servers)"""

import random
from datetime import datetime, timedelta
from typing import Dict, List


# Seed for deterministic data generation
RANDOM_SEED = 42


def generate_enterprise_instance_data() -> Dict[str, Dict]:
    """Generate large-scale enterprise mock data for PF instances"""
    random.seed(RANDOM_SEED)
    
    # Base date for license expiry calculations
    base_date = datetime.now()
    
    instances = {}
    
    # Enterprise topology: Multiple regions, environments, and server types
    regions = ['us-east', 'us-west', 'eu-west', 'ap-south']
    environments = ['prod', 'stage', 'dev', 'uat', 'dr']  # Added UAT and DR
    server_types = ['admin', 'engine', 'console']
    companies = ['Acme Corporation', 'TechCorp Inc', 'Global Industries']
    
    # License expiry patterns (more realistic enterprise spread)
    expiry_patterns = [
        {'days': 730, 'weight': 20},   # 2 years (new licenses)
        {'days': 365, 'weight': 30},   # 1 year (standard renewals)
        {'days': 180, 'weight': 20},   # 6 months (pilot projects)
        {'days': 90, 'weight': 15},    # 3 months (testing/POC)
        {'days': 30, 'weight': 10},    # 1 month (about to expire)
        {'days': 7, 'weight': 3},      # 1 week (urgent renewal)
        {'days': -15, 'weight': 2},    # Expired (oversight/delayed renewal)
    ]
    
    instance_counter = 1
    
    # Generate instances for each combination
    for region in regions:
        for env in environments:
            # Number of instances per environment (realistic enterprise distribution)
            env_instance_counts = {
                'prod': 8,   # More production instances for HA
                'stage': 4,  # Staging environment
                'dev': 6,    # Development instances
                'uat': 3,    # User acceptance testing
                'dr': 4      # Disaster recovery
            }
            
            instance_count = env_instance_counts.get(env, 3)
            
            for i in range(1, instance_count + 1):
                for server_type in server_types:
                    if env == 'prod' or (env == 'dr' and server_type != 'console') or (env in ['stage', 'uat'] and server_type != 'console') or (env == 'dev'):
                        instance_id = f"pf-{env}-{region}-{server_type}{i:02d}"
                        
                        # Select expiry pattern based on weights
                        expiry_choice = random.choices(
                            expiry_patterns, 
                            weights=[p['weight'] for p in expiry_patterns]
                        )[0]
                        
                        # Add some randomness to the exact expiry date
                        days_variance = random.randint(-7, 7)
                        total_days = expiry_choice['days'] + days_variance
                        
                        instances[f"pf{instance_counter}"] = {
                            "issuedTo": random.choice(companies),
                            "product": "PingFederate",
                            "expiryDate": (base_date + timedelta(days=total_days)).strftime("%Y-%m-%d"),
                            "licenseKeyId": f"LIC-{env.upper()}-{region.upper()}-{instance_counter:04d}",
                            "region": region,
                            "environment": env,
                            "server_type": server_type,
                            "instance_id": instance_id
                        }
                        
                        instance_counter += 1
    
    # Add some special enterprise instances
    special_instances = [
        # Legacy instances with different naming
        {"id": "pf-legacy-01", "env": "prod", "region": "us-east", "type": "admin", "days": 45},
        {"id": "pf-legacy-02", "env": "prod", "region": "us-east", "type": "engine", "days": 45},
        
        # High-availability cluster
        {"id": "pf-ha-cluster-01", "env": "prod", "region": "us-east", "type": "admin", "days": 365},
        {"id": "pf-ha-cluster-02", "env": "prod", "region": "us-east", "type": "engine", "days": 365},
        {"id": "pf-ha-cluster-03", "env": "prod", "region": "us-east", "type": "engine", "days": 365},
        
        # Cloud instances
        {"id": "pf-cloud-aws-01", "env": "prod", "region": "us-west", "type": "admin", "days": 180},
        {"id": "pf-cloud-azure-01", "env": "stage", "region": "eu-west", "type": "admin", "days": 90},
        {"id": "pf-cloud-gcp-01", "env": "dev", "region": "ap-south", "type": "admin", "days": 120},
    ]
    
    for special in special_instances:
        instances[f"pf{instance_counter}"] = {
            "issuedTo": "Enterprise Cloud Division",
            "product": "PingFederate",
            "expiryDate": (base_date + timedelta(days=special['days'])).strftime("%Y-%m-%d"),
            "licenseKeyId": f"LIC-SPECIAL-{instance_counter:04d}",
            "region": special['region'],
            "environment": special['env'],
            "server_type": special['type'],
            "instance_id": special['id']
        }
        instance_counter += 1
    
    print(f"Generated {len(instances)} enterprise PingFederate instances")
    return instances


def generate_enterprise_cluster_status() -> Dict:
    """Generate mock cluster status data for enterprise scale"""
    instances = generate_enterprise_instance_data()
    
    nodes = []
    for pf_key, instance_data in instances.items():
        node_status = "ACTIVE"
        
        # Some realistic failure scenarios
        if random.random() < 0.02:  # 2% chance of being down
            node_status = "DOWN"
        elif random.random() < 0.05:  # 5% chance of maintenance
            node_status = "MAINTENANCE"
        
        # Determine role based on server type
        role_mapping = {
            'admin': 'ADMIN',
            'engine': 'ENGINE', 
            'console': 'CONSOLE'
        }
        
        server_type = instance_data.get('server_type', 'engine')
        role = role_mapping.get(server_type, 'ENGINE')
        
        nodes.append({
            "id": pf_key,
            "instance_id": instance_data.get('instance_id', pf_key),
            "status": node_status,
            "role": role,
            "region": instance_data.get('region', 'unknown'),
            "environment": instance_data.get('environment', 'unknown')
        })
    
    return {
        "nodes": nodes,
        "cluster_state": "ACTIVE",
        "last_config_update": datetime.now().isoformat(),
        "total_nodes": len(nodes),
        "active_nodes": len([n for n in nodes if n['status'] == 'ACTIVE']),
        "regions": len(set(n['region'] for n in nodes)),
        "environments": len(set(n['environment'] for n in nodes))
    }


# Legacy function names for backward compatibility
def generate_instance_data() -> Dict[str, Dict]:
    """Legacy function - redirects to enterprise data"""
    return generate_enterprise_instance_data()


def generate_cluster_status() -> Dict:
    """Legacy function - redirects to enterprise cluster status"""
    return generate_enterprise_cluster_status()
