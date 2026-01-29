import asyncio
import os
import json
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables.")
    exit(1)

async def check_latest_session():
    print(f"Connecting to Supabase...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("\nFetching LATEST session from 'user_sessions'...")
    try:
        # Fetch latest session ordered by started_at desc
        response = supabase.table("user_sessions").select("*").order("started_at", desc=True).limit(1).execute()
        
        if not response.data:
            print("No sessions found in database.")
        else:
            row = response.data[0]
            print(f"\n--- LATEST SESSION ({row.get('started_at')}) ---")
            print(f"ID: {row.get('id')}")
            print(f"User ID: {row.get('user_id')}")
            print(f"Device ID (Column): {row.get('device_id')}")
            
            device_info = row.get('device_info')
            print(f"Device Info (Column): {type(device_info)}")
            if isinstance(device_info, dict):
                print(f"Backup ID inside Info: {device_info.get('_backup_device_id')}")
                print(f"Full Info Keys: {list(device_info.keys())}")
            else:
                print(f"Device Info Raw: {device_info}")

            if not row.get('device_id') and (not isinstance(device_info, dict) or not device_info.get('_backup_device_id')):
                print("\n❌ DATA MISSING: Both column and backup are empty/null.")
            else:
                print("\n✅ DATA FOUND in DB.")

    except Exception as e:
        print(f"❌ Error fetching session: {e}")

if __name__ == "__main__":
    asyncio.run(check_latest_session())
