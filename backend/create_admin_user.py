"""
Admin User Creator Script
Run this to create an admin user or update existing user to admin role
"""

import hashlib
from supabase import create_client, Client
import os
from datetime import datetime

# Supabase credentials (update these with your actual values)
SUPABASE_URL = "YOUR_SUPABASE_URL"  # e.g., https://xxxxx.supabase.co
SUPABASE_KEY = "YOUR_SUPABASE_SERVICE_ROLE_KEY"

def hash_password(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def create_admin_user():
    """Create a new admin user"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Admin user details
    admin_email = "admin@espot.com"
    admin_username = "admin"
    admin_password = "admin123"  # Change this!
    
    # Check if admin already exists
    result = supabase.table("users").select("*").eq("email", admin_email).execute()
    
    if result.data and len(result.data) > 0:
        print(f"Admin user already exists: {admin_email}")
        user_id = result.data[0]['id']
        
        # Update to admin role
        update_result = supabase.table("users").update({
            "role": "admin",
            "status": "active",
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", user_id).execute()
        
        print(f"✅ Updated user to admin role: {admin_email}")
        return
    
    # Create new admin user
    password_hash = hash_password(admin_password)
    
    new_admin = {
        "email": admin_email,
        "username": admin_username,
        "password_hash": password_hash,
        "role": "admin",
        "status": "active",
        "created_at": datetime.utcnow().isoformat()
    }
    
    result = supabase.table("users").insert(new_admin).execute()
    
    if result.data:
        print(f"✅ Admin user created successfully!")
        print(f"   Email: {admin_email}")
        print(f"   Username: {admin_username}")
        print(f"   Password: {admin_password}")
        print(f"\n⚠️  IMPORTANT: Change the default password after first login!")
    else:
        print("❌ Failed to create admin user")

def update_existing_user_to_admin(email: str):
    """Update an existing user to admin role"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Find user
    result = supabase.table("users").select("*").eq("email", email).execute()
    
    if not result.data or len(result.data) == 0:
        print(f"❌ User not found: {email}")
        return
    
    user_id = result.data[0]['id']
    
    # Update to admin
    update_result = supabase.table("users").update({
        "role": "admin",
        "status": "active",
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", user_id).execute()
    
    if update_result.data:
        print(f"✅ User updated to admin: {email}")
        print(f"   Username: {result.data[0]['username']}")
        print(f"   Role: admin")
    else:
        print(f"❌ Failed to update user: {email}")

if __name__ == "__main__":
    print("ESPOT Browser - Admin User Manager")
    print("=" * 50)
    print()
    print("1. Create new admin user (admin@espot.com)")
    print("2. Update existing user to admin")
    print()
    
    choice = input("Enter choice (1 or 2): ").strip()
    
    if choice == "1":
        create_admin_user()
    elif choice == "2":
        email = input("Enter user email to promote to admin: ").strip()
        update_existing_user_to_admin(email)
    else:
        print("Invalid choice")
