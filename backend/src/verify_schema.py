import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY environment variables.")
    exit(1)

async def verify_schema():
    print(f"Connecting to Supabase: {SUPABASE_URL}")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("\n1. Checking 'user_sessions' table access...")
    try:
        # Fetch 1 row to see what columns come back with select("*")
        response = supabase.table("user_sessions").select("*").limit(1).execute()
        if not response.data:
            print("Table is accessible but empty. Cannot infer columns from rows.")
        else:
            row = response.data[0]
            print("Successfully fetched a row.")
            keys = row.keys()
            print(f"Available columns: {list(keys)}")
            
            if "device_id" in keys:
                print("✅ 'device_id' column EXISTS.")
            else:
                print("❌ 'device_id' column is MISSING.")
                
            if "device_info" in keys:
                print("✅ 'device_info' column EXISTS.")
            else:
                print("❌ 'device_info' column is MISSING.")
    except Exception as e:
        print(f"❌ Error selecting * from user_sessions: {e}")

    print("\n2. EXPLICITLY selecting 'device_id' column...")
    try:
        supabase.table("user_sessions").select("device_id").limit(1).execute()
        print("✅ Select 'device_id' succeeded (Column exists).")
    except Exception as e:
        print(f"❌ Select 'device_id' FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(verify_schema())
