#!/usr/bin/env python3
"""Generate enterprise-scale inventory.yaml"""

import sys
sys.path.append('.')
from pf_agent.simulators.seed_data import generate_enterprise_instance_data
import yaml

def main():
    # Generate all instances
    instances_data = generate_enterprise_instance_data()

    # Create inventory structure
    inventory = {'instances': []}

    for pf_key, data in instances_data.items():
        instance_id = data.get('instance_id', pf_key)
        env = data.get('environment', 'unknown')
        server_type = data.get('server_type', 'engine')
        region = data.get('region', 'unknown')
        
        inventory['instances'].append({
            'id': instance_id,
            'name': f'{server_type.title()} Node - {region}',
            'env': env,
            'base_url': f'http://localhost:8080/{pf_key}'
        })

    # Write to inventory.yaml
    with open('pf_agent/inventory.yaml', 'w') as f:
        yaml.dump(inventory, f, default_flow_style=False, sort_keys=False)

    print(f'Generated inventory with {len(inventory["instances"])} instances')
    
    # Show summary by environment
    env_counts = {}
    for instance in inventory['instances']:
        env = instance['env']
        env_counts[env] = env_counts.get(env, 0) + 1
    
    print("\nInstances by environment:")
    for env, count in sorted(env_counts.items()):
        print(f"  {env}: {count} instances")

if __name__ == "__main__":
    main()
