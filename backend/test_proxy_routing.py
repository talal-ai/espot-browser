"""
Professional Proxy Testing Script
Tests the proxy routing system with real proxy credentials
"""

import asyncio
import httpx
import sys
from datetime import datetime

# Proxy Configuration
PROXY_CONFIG = {
    "host": "2.59.59.36",
    "port": 12323,
    "protocol": "http",
    "username": "14a42f5171790",
    "password": "59fd8bbad2"
}

API_BASE = "http://localhost:8000"

async def test_proxy_routing():
    """
    Comprehensive proxy testing workflow:
    1. Get current IP (without proxy)
    2. Test proxy connection
    3. Verify IP changes
    4. Test geolocation
    """
    
    print("=" * 80)
    print("🔬 PROFESSIONAL PROXY ROUTING TEST")
    print("=" * 80)
    print(f"📅 Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Import our proxy manager
    sys.path.append('src')
    from services.proxy_manager import proxy_manager
    
    # ========================================
    # STEP 1: Get Current IP (Without Proxy)
    # ========================================
    print("📍 STEP 1: Getting your current IP (direct connection)...")
    print("-" * 80)
    
    try:
        current_ip = await proxy_manager.get_current_ip()
        print(f"✅ Your Current IP: {current_ip}")
        print(f"   Connection: Direct (No Proxy)")
        print()
    except Exception as e:
        print(f"❌ Failed to get current IP: {e}")
        current_ip = None
    
    # ========================================
    # STEP 2: Test Proxy Connection
    # ========================================
    print("🔌 STEP 2: Testing proxy connection...")
    print("-" * 80)
    print(f"   Host: {PROXY_CONFIG['host']}")
    print(f"   Port: {PROXY_CONFIG['port']}")
    print(f"   Protocol: {PROXY_CONFIG['protocol'].upper()}")
    print(f"   Username: {PROXY_CONFIG['username']}")
    print(f"   Password: {'*' * len(PROXY_CONFIG['password'])}")
    print()
    
    try:
        result = await proxy_manager.test_proxy(
            protocol=PROXY_CONFIG['protocol'],
            host=PROXY_CONFIG['host'],
            port=PROXY_CONFIG['port'],
            username=PROXY_CONFIG['username'],
            password=PROXY_CONFIG['password']
        )
        
        if result.success:
            print(f"✅ Proxy Connection: SUCCESSFUL")
            print(f"   Proxy IP: {result.ip_address}")
            print(f"   Country: {result.country or 'Unknown'}")
            print(f"   Response Time: {result.response_time:.3f}s")
            print()
            
            proxy_ip = result.ip_address
        else:
            print(f"❌ Proxy Connection: FAILED")
            print(f"   Error: {result.error}")
            print()
            return False
    except Exception as e:
        print(f"❌ Proxy Test Error: {e}")
        print()
        return False
    
    # ========================================
    # STEP 3: Verify IP Changed
    # ========================================
    print("🔄 STEP 3: Verifying IP change...")
    print("-" * 80)
    
    if current_ip and proxy_ip:
        if current_ip != proxy_ip:
            print(f"✅ IP CHANGED SUCCESSFULLY!")
            print(f"   Before: {current_ip} (Direct)")
            print(f"   After:  {proxy_ip} (Proxy)")
            print(f"   Change: ✓ Confirmed")
            print()
            ip_changed = True
        else:
            print(f"⚠️  IP DID NOT CHANGE")
            print(f"   IP: {current_ip}")
            print(f"   Note: Proxy might be transparent or configuration issue")
            print()
            ip_changed = False
    else:
        print(f"⚠️  Cannot verify IP change (missing data)")
        print()
        ip_changed = False
    
    # ========================================
    # STEP 4: Test Traffic Routing
    # ========================================
    print("🌐 STEP 4: Testing traffic routing through proxy...")
    print("-" * 80)
    
    # Build proxy URL
    proxy_url = f"{PROXY_CONFIG['protocol']}://{PROXY_CONFIG['username']}:{PROXY_CONFIG['password']}@{PROXY_CONFIG['host']}:{PROXY_CONFIG['port']}"
    
    test_urls = [
        "https://api.ipify.org?format=json",
        "https://httpbin.org/ip",
        "https://ifconfig.me/all.json"
    ]
    
    success_count = 0
    
    for idx, url in enumerate(test_urls, 1):
        try:
            print(f"   Test {idx}/3: {url}")
            
            async with httpx.AsyncClient(
                proxy=proxy_url,
                timeout=15.0
            ) as client:
                response = await client.get(url)
                
                if response.status_code == 200:
                    data = response.json()
                    ip = data.get('origin') or data.get('ip') or data.get('ip_addr')
                    print(f"   ✅ Success! IP via proxy: {ip}")
                    success_count += 1
                else:
                    print(f"   ❌ Failed! Status: {response.status_code}")
        except Exception as e:
            print(f"   ❌ Error: {str(e)[:50]}...")
    
    print()
    print(f"   Traffic Routing: {success_count}/3 tests passed")
    print()
    
    # ========================================
    # STEP 5: Get Detailed Geolocation
    # ========================================
    print("📍 STEP 5: Getting detailed geolocation data...")
    print("-" * 80)
    
    try:
        geo = await proxy_manager.get_proxy_geolocation(
            protocol=PROXY_CONFIG['protocol'],
            host=PROXY_CONFIG['host'],
            port=PROXY_CONFIG['port'],
            username=PROXY_CONFIG['username'],
            password=PROXY_CONFIG['password']
        )
        
        if geo:
            print(f"✅ Geolocation Data:")
            print(f"   IP: {geo.get('ip')}")
            print(f"   Country: {geo.get('country_name')} ({geo.get('country')})")
            print(f"   City: {geo.get('city')}")
            print(f"   Region: {geo.get('region')}")
            print(f"   Timezone: {geo.get('timezone')}")
            print(f"   ISP/Org: {geo.get('org')}")
            print(f"   Coordinates: {geo.get('latitude')}, {geo.get('longitude')}")
            print()
        else:
            print(f"⚠️  Could not retrieve geolocation data")
            print()
    except Exception as e:
        print(f"⚠️  Geolocation Error: {e}")
        print()
    
    # ========================================
    # FINAL RESULTS
    # ========================================
    print("=" * 80)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 80)
    
    print(f"✅ Proxy Connection: {'WORKING' if result.success else 'FAILED'}")
    print(f"✅ IP Verification: {'CHANGED' if ip_changed else 'NOT CHANGED'}")
    print(f"✅ Traffic Routing: {success_count}/3 endpoints working")
    
    if result.success and ip_changed and success_count >= 2:
        print()
        print("🎉 OVERALL STATUS: FULLY FUNCTIONAL ✓")
        print()
        print("✅ Your proxy is working perfectly!")
        print(f"✅ All traffic will route through: {proxy_ip}")
        print(f"✅ Your real IP ({current_ip}) is hidden")
        print()
    elif result.success:
        print()
        print("⚠️  OVERALL STATUS: PARTIALLY WORKING")
        print()
        print("✅ Proxy connection works")
        print(f"⚠️  IP change verification: {'Not confirmed' if not ip_changed else 'Issues detected'}")
        print()
    else:
        print()
        print("❌ OVERALL STATUS: NOT WORKING")
        print()
        print("❌ Proxy connection failed")
        print("   Please check credentials and proxy availability")
        print()
    
    print("=" * 80)
    print("📝 RECOMMENDATIONS")
    print("=" * 80)
    
    if result.success and ip_changed:
        print("✅ Proxy is ready for production use!")
        print("✅ You can activate it from the frontend")
        print("✅ All your traffic will be routed through this proxy")
    else:
        print("🔧 Troubleshooting Steps:")
        print("   1. Verify proxy credentials are correct")
        print("   2. Check if proxy server is online")
        print("   3. Try different protocol (http vs https)")
        print("   4. Contact proxy provider for support")
    
    print()
    print("=" * 80)
    
    return result.success and ip_changed


if __name__ == "__main__":
    print()
    result = asyncio.run(test_proxy_routing())
    print()
    
    if result:
        print("✅ Test completed successfully!")
        sys.exit(0)
    else:
        print("❌ Test completed with issues")
        sys.exit(1)
