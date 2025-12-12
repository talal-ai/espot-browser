"""
Test Supabase database connection and verify tables
"""
from src.config.supabase import test_supabase_connection, get_supabase_client

def main():
    print("🔍 Testing Supabase Connection...")
    print("=" * 50)
    
    # Test connection
    result = test_supabase_connection()
    print(f"✅ Connection Status: {'SUCCESS' if result else 'FAILED'}")
    print()
    
    if result:
        client = get_supabase_client()
        tables = [
            'users', 
            'proxies', 
            'fingerprint_profiles', 
            'user_sessions', 
            'proxy_chains', 
            'behavior_profiles',
            'system_logs',
            'audit_logs'
        ]
        
        print("📊 Checking Tables...")
        print("=" * 50)
        
        for table in tables:
            try:
                response = client.table(table).select("id").limit(1).execute()
                count_response = client.table(table).select("id", count="exact").execute()
                total = count_response.count if hasattr(count_response, 'count') else '?'
                print(f"✅ {table:25} | Exists | Total rows: {total}")
            except Exception as e:
                print(f"❌ {table:25} | Missing or Error: {str(e)[:50]}")
        
        print()
        print("=" * 50)
        print("✅ Supabase Database Check Complete!")

if __name__ == "__main__":
    main()
