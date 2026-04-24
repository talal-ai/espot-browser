"""
One-off script: connect to Supabase and read tables (counts + sample).
Run from backend: python read_supabase.py
"""
import os
import sys
from pathlib import Path

# Ensure backend root is on path and load .env from here
backend_root = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_root))
os.chdir(backend_root)

from dotenv import load_dotenv
load_dotenv(backend_root / ".env")

from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Missing SUPABASE_URL or keys in .env")
    sys.exit(1)

# Tables your app uses (from codebase)
TABLES = [
    "users",
    "user_sessions",
    "user_services",
    "fingerprint_profiles",
    "user_fingerprint_profiles",
    "proxies",
    "proxy_chains",
    "behavior_profiles",
    "system_logs",
    "audit_logs",
    "groups",
    "user_groups",
    "services",
    "credentials",
    "user_proxies",
    "chat_conversations",
    "chat_messages",
    "message_reads",
]

def main():
    print(f"Connecting to Supabase: {SUPABASE_URL}\n")
    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    for table in TABLES:
        try:
            # Get count
            r = client.table(table).select("id", count="exact").limit(1).execute()
            count = r.count if hasattr(r, "count") and r.count is not None else len(r.data) if r.data else 0
            # Get one row to show columns
            sample = client.table(table).select("*").limit(1).execute()
            columns = list(sample.data[0].keys()) if sample.data else []
            print(f"  {table}: {count} row(s) | columns: {columns[:8]}{'...' if len(columns) > 8 else ''}")
        except Exception as e:
            print(f"  {table}: error - {e}")

    print("\nDone.")

if __name__ == "__main__":
    main()
