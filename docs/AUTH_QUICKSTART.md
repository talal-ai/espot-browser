# Quick Start - Authentication System

## 🚀 Getting Started

The authentication system is now fully integrated! Here's how to use it:

### 1. Start the Backend

```powershell
cd backend
python run_dev.py
```

The backend should start on `http://localhost:8000`

### 2. Start the Frontend

```powershell
cd frontend
npm run dev
```

The frontend should start on `http://localhost:5173`

### 3. Access the Application

Navigate to `http://localhost:5173` - you'll be automatically redirected to the login page!

## 📝 Creating Your First User

### Option 1: Sign Up (Self-Registration)

1. Go to `http://localhost:5173/auth`
2. Click "Sign up"
3. Fill in:
   - Email: your@email.com
   - Username: your_username
   - Password: (minimum 6 characters)
   - Confirm Password: (same as password)
4. Click "Create Account"
5. You'll be automatically logged in and redirected to the dashboard!

### Option 2: Admin Creates User

If you want an admin to create users:

1. First, create an admin user using Option 1
2. Update the user role in Supabase:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
   ```
3. Login as admin
4. Go to the Users page
5. Click "Add User"
6. Fill in user details and save

## 🔐 Login Options

The authentication page supports:

1. **Email Login** - Enter your email address and password
2. **Username Login** - Enter your username and password
3. **Google OAuth** - (Coming Soon) Click "Continue with Google"

## ✅ Testing the Authentication

### Test Login
1. Navigate to: `http://localhost:5173/auth`
2. Enter your credentials
3. Click "Sign In"
4. You should be redirected to the dashboard

### Test Protected Routes
1. Try accessing: `http://localhost:5173/dashboard`
2. If not logged in, you'll be redirected to `/auth`
3. After logging in, you can access all pages

### Test Logout
1. Click on the user icon in the top right
2. Click "Logout"
3. You'll be redirected to the login page
4. Your token will be cleared

## 🎨 Features Included

✨ **Beautiful UI**
- Gradient backgrounds with animated blobs
- Glassmorphism effects
- Smooth animations
- Dark mode support
- Responsive design

🔒 **Security**
- Password hashing (SHA-256)
- Token-based authentication
- 24-hour token expiration
- Protected routes
- Role-based access control

👤 **User Management**
- Self-registration
- Admin-created users
- Email/username login
- Password visibility toggle
- Form validation

## 📱 API Endpoints

### Authentication

- `POST /auth/login` - Login with email/username and password
- `POST /auth/signup` - Create new account
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout
- `GET /auth/verify` - Verify token

### Admin (Protected)

- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create user
- `GET /api/admin/users/{id}` - Get user
- `PUT /api/admin/users/{id}` - Update user
- `DELETE /api/admin/users/{id}` - Delete user

## 🐛 Troubleshooting

### Backend not starting?
```powershell
# Make sure you're in the backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Run the server
python run_dev.py
```

### Frontend not starting?
```powershell
# Make sure you're in the frontend directory
cd frontend

# Install dependencies
npm install

# Run the dev server
npm run dev
```

### Can't login?
- Check console for errors (F12)
- Verify backend is running on port 8000
- Check if Supabase connection is working
- Make sure user exists in database
- Verify password is correct

### Redirected to login immediately?
- This is normal! All routes except `/auth` require authentication
- Login first to access the dashboard

## 📚 Next Steps

1. **Set up Google OAuth** - Complete Google authentication flow
2. **Add password reset** - Implement forgot password functionality
3. **Email verification** - Add email verification for new signups
4. **Two-factor authentication** - Add 2FA for enhanced security
5. **Session management** - View and manage active sessions

## 💡 Tips

- Use strong passwords (at least 6 characters)
- Admin users can create users from the dashboard
- Tokens expire after 24 hours
- Dark mode works across the entire app
- All API calls are logged in the console

## 🆘 Need Help?

Check the detailed documentation in `AUTHENTICATION_GUIDE.md`

---

**Enjoy your new authentication system! 🎉**
