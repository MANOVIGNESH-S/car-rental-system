import asyncio
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from src.control.agents.vehicle_doc_agent import run_vehicle_doc_agent

# Replace with a real vehicle_id that has null expiry dates
VEHICLE_ID = "c47a1b52-e431-42be-9dd7-58c5fa06c6aa"

if __name__ == "__main__":
    print(f"Testing vehicle doc agent for: {VEHICLE_ID}")
    result = run_vehicle_doc_agent(vehicle_id=VEHICLE_ID)
    print("\n=== RESULT ===")
    print(f"Success       : {result.get('success')}")
    print(f"Insurance exp : {result.get('insurance_expiry_date')}")
    print(f"RC exp        : {result.get('rc_expiry_date')}")
    print(f"PUC exp       : {result.get('puc_expiry_date')}")
    print(f"Error         : {result.get('error')}")