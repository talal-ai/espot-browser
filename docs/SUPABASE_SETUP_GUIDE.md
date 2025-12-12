# 🚀 ESPOT Browser - Supabase Integration Setup Guide

## 📋 **Complete Production-Ready Setup**

This guide will help you set up Supabase integration for your ESPOT Browser project with production-ready configuration.

---

## **Step 1: Create Supabase Project**

### **1.1 Sign Up for Supabase**
1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub, Google, or email

### **1.2 Create New Project**
1. Click "New Project"
2. **Organization**: Select your organization
3. **Name**: `espot-browser`
4. **Database Password**: Generate a strong password (save it!)
5. **Region**: Choose closest to your users
6. Click "Create new project"

### **1.3 Get API Credentials**
1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project-id.supabase.co`)
   - **anon public** key
   - **service_role** key (keep this secret!)

---

## **Step 2: Set Up Database Schema**

### **2.1 Run Database Schema**
1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `apps/api/database/schema.sql`
3. Paste and run the SQL script
4. This will create all necessary tables, indexes, and security policies

### **2.2 Verify Tables Created**
Check that these tables exist:
- ✅ `users`
- ✅ `proxies`
- ✅ `fingerprint_profiles`
- ✅ `user_sessions`
- ✅ `proxy_chains`
- ✅ `behavior_profiles`
- ✅ `system_logs`
- ✅ `audit_logs`

---

## **Step 3: Configure Environment Variables**

### **3.1 Backend Configuration**
1. Copy `apps/api/.env.example` to `apps/api/.env`
2. Fill in your Supabase credentials:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Database Configuration
DATABASE_URL=postgresql://postgres:your_password@db.your-project-id.supabase.co:5432/postgres

# Security
JWT_SECRET_KEY=your_super_secret_jwt_key_here_minimum_32_characters
SECRET_KEY=your_super_secret_key_here_minimum_32_characters
```

### **3.2 Frontend Configuration**
1. Copy `apps/desktop-electron/renderer/.env.example` to `apps/desktop-electron/renderer/.env`
2. Fill in your Supabase credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# API Configuration
VITE_API_URL=http://localhost:8000
```

---

## **Step 4: Test the Integration**

### **4.1 Test Backend Connection**
```bash
# Navigate to API directory
cd apps/api

# Activate virtual environment
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate

# Start the backend
python run_dev.py
```

**Expected Output:**
```
🚀 Starting ESPOT Browser API Development Server...
📍 API will be available at: http://localhost:8000
📚 API Documentation: http://localhost:8000/docs
✅ Supabase connection successful
🚀 ESPOT Browser API started successfully
```

### **4.2 Test Frontend Connection**
```bash
# Navigate to renderer directory
cd apps/desktop-electron/renderer

# Start the frontend
npm run dev
```

**Expected Output:**
```
✅ Supabase connection successful
```

### **4.3 Test API Endpoints**
1. Go to http://localhost:8000/docs
2. Test the health endpoint: http://localhost:8000/health
3. Test admin endpoints (you'll need authentication)

---

## **Step 5: Verify Database Data**

### **5.1 Check Default Data**
1. Go to **Table Editor** in Supabase dashboard
2. Check the `users` table - you should see a default admin user
3. Check the `fingerprint_profiles` table - you should see default profiles
4. Check the `behavior_profiles` table - you should see default profiles

### **5.2 Test Row Level Security**
1. Go to **Authentication** → **Users** in Supabase dashboard
2. Create a test user
3. Verify that RLS policies are working correctly

---

## **Step 6: Production Configuration**

### **6.1 Security Settings**
1. Go to **Authentication** → **Settings**
2. Configure:
   - **Site URL**: Your production domain
   - **Redirect URLs**: Your allowed redirect URLs
   - **JWT Settings**: Configure JWT expiration

### **6.2 Database Settings**
1. Go to **Settings** → **Database**
2. Configure:
   - **Connection pooling**: Enable for production
   - **Backup settings**: Configure automated backups
   - **Performance monitoring**: Enable

### **6.3 API Settings**
1. Go to **Settings** → **API**
2. Configure:
   - **Rate limiting**: Set appropriate limits
   - **CORS settings**: Configure for your domains
   - **API keys**: Rotate keys regularly

---

## **Step 7: Monitoring and Maintenance**

### **7.1 Set Up Monitoring**
1. Go to **Logs** in Supabase dashboard
2. Monitor:
   - Database performance
   - API usage
   - Authentication events
   - Error logs

### **7.2 Regular Maintenance**
- **Weekly**: Check database performance
- **Monthly**: Review security logs
- **Quarterly**: Rotate API keys
- **As needed**: Update dependencies

---

## **🔧 Troubleshooting**

### **Common Issues**

#### **1. Connection Failed**
```
❌ Supabase connection failed
```
**Solution:**
- Check your `.env` files
- Verify Supabase URL and keys
- Check network connectivity

#### **2. Authentication Errors**
```
Error: Invalid API key
```
**Solution:**
- Verify your API keys are correct
- Check if keys are properly set in environment variables

#### **3. Database Errors**
```
Error: relation "users" does not exist
```
**Solution:**
- Run the database schema script
- Check if all tables were created
- Verify RLS policies are enabled

#### **4. CORS Errors**
```
CORS error: Access to fetch blocked
```
**Solution:**
- Check CORS settings in Supabase
- Verify your domain is allowed
- Check API configuration

### **Debug Commands**

#### **Test Supabase Connection**
```bash
# Backend
cd apps/api
python -c "from src.config.supabase import test_supabase_connection; print(test_supabase_connection())"

# Frontend
cd apps/desktop-electron/renderer
npm run dev
# Check browser console for connection status
```

#### **Check Environment Variables**
```bash
# Backend
cd apps/api
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print('SUPABASE_URL:', os.getenv('SUPABASE_URL'))"

# Frontend
cd apps/desktop-electron/renderer
echo $VITE_SUPABASE_URL
```

---

## **✅ Success Checklist**

- [ ] Supabase project created
- [ ] Database schema deployed
- [ ] Environment variables configured
- [ ] Backend API running (http://localhost:8000)
- [ ] Frontend running (http://localhost:3000)
- [ ] Health check passing
- [ ] Default data inserted
- [ ] Authentication working
- [ ] RLS policies active
- [ ] Monitoring configured

---

## **🚀 Next Steps**

Once Supabase integration is complete:

1. **Authentication Setup** - Implement Google Sign-in
2. **User Management** - Build admin user interface
3. **Proxy Management** - Build proxy configuration interface
4. **Fingerprint Management** - Build spoofing profile interface
5. **System Monitoring** - Build analytics dashboard

---

**ESPOT Browser Team** - Production-ready Supabase integration! 🎉
