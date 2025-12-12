"""
Activate Proxy - Quick Test Script
Activates the proxy globally for all backend traffic
"""

import asyncio
import httpx
import sys

# Proxy ID from database
PROXY_ID = "471b6817-7f1c-441d-851b-7ddb0dd16adc"
API_BASE = "http://localhost:8000"

async def activate_proxy():
    """Activate the proxy globally"""
    
    print("=" * 80)
    print("🔌 ACTIVATING PROXY GLOBALLY")
    print("=" * 80)
    print()
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Step 1: Test the proxy first
            print("📍 Step 1: Testing proxy connection...")
            print(f"   Proxy ID: {PROXY_ID}")
            print()
            
            test_response = await client.post(
                f"{API_BASE}/api/admin/proxies/{PROXY_ID}/test"
            )
            
            if test_response.status_code != 200:
                print(f"❌ Proxy test failed: {test_response.status_code}")
                print(f"   Response: {test_response.text}")
                return False
            
            test_data = test_response.json()
            print(f"✅ Proxy test successful!")
            print(f"   Proxy IP: {test_data.get('ip_address') or 'N/A'}")
            print(f"   Country: {test_data.get('country') or 'N/A'}")
            response_time = test_data.get('response_time')
            if response_time:
                print(f"   Response Time: {response_time:.2f}s")
            print()
            
            # Step 2: Activate globally
            print("🌐 Step 2: Activating proxy globally...")
            print()
            
            activate_response = await client.post(
                f"{API_BASE}/api/admin/proxies/{PROXY_ID}/activate-global"
            )
            
            if activate_response.status_code != 200:
                print(f"❌ Activation failed: {activate_response.status_code}")
                print(f"   Response: {activate_response.text}")
                return False
            
            activate_data = activate_response.json()
            print(f"✅ Proxy activated globally!")
            print(f"   Proxy Host: {activate_data.get('proxy_host')}")
            print(f"   Proxy Port: {activate_data.get('proxy_port')}")
            print(f"   Proxy IP: {activate_data.get('proxy_ip')}")
            print(f"   Country: {activate_data.get('country')}")
            print()
            
            # Step 3: Verify status
            print("🔍 Step 3: Verifying global proxy status...")
            print()
            
            status_response = await client.get(
                f"{API_BASE}/api/admin/proxies/global-status"
            )
            
            if status_response.status_code == 200:
                status_data = status_response.json()
                print(f"✅ Global Proxy Status:")
                print(f"   Active: {status_data.get('is_active')}")
                print(f"   Proxy ID: {status_data.get('proxy_id')}")
                print()
            
            print("=" * 80)
            print("🎉 SUCCESS - PROXY IS NOW ACTIVE!")
            print("=" * 80)
            print()
            print("✅ All backend HTTP requests will now route through the proxy")
            print(f"✅ Your real IP is hidden, traffic goes through: {activate_data.get('proxy_ip')}")
            print()
            
            return True
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

async def deactivate_proxy():
    """Deactivate the global proxy"""
    
    print("=" * 80)
    print("🔌 DEACTIVATING GLOBAL PROXY")
    print("=" * 80)
    print()
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{API_BASE}/api/admin/proxies/deactivate-global"
            )
            
            if response.status_code == 200:
                print("✅ Global proxy deactivated")
                print("✅ Backend now uses direct connection (no proxy)")
                print()
                return True
            else:
                print(f"❌ Deactivation failed: {response.status_code}")
                return False
                
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


if __name__ == "__main__":
    print()
    
    if len(sys.argv) > 1 and sys.argv[1] == "deactivate":
        # Deactivate mode
        result = asyncio.run(deactivate_proxy())
    else:
        # Activate mode (default)
        result = asyncio.run(activate_proxy())
    
    print()
    
    if result:
        print("✅ Operation completed successfully!")
        sys.exit(0)
    else:
        print("❌ Operation failed")
        sys.exit(1)
