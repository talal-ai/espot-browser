# Authentication System Documentation

## Overview

The ESPOT Browser now includes a beautiful, modern authentication system with multiple sign-in options:

- **Email/Username + Password** - Traditional authentication
- **Google OAuth** - Social authentication (implementation in progress)
- **Admin-created Users** - Users can be created by administrators

## Features

### 🎨 Beautiful UI
- Modern gradient design with glassmorphism effects
- Smooth animations using Framer Motion
- Dark mode support
- Responsive design for all screen sizes
- Password visibility toggle
- Real-time form validation

### 🔐 Security
- Password hashing using SHA-256
- Secure token-based authentication
- Token expiration (24 hours)
- Protected routes
- Role-based access control (admin, user, viewer)

### 👤 User Management
- Users can sign up with email and password
- Admin can create users from the dashboard
- Username or email login support
- Account status management (active, inactive, suspended)

## File Structure

```
frontend/
├── src/
│   ├── pages/
│   │   └── Auth.jsx                    # Login/Signup page
│   ├── contexts/
│   │   └── AuthContext.jsx             # Authentication context
│   ├── services/
│   │   └── auth.service.ts             # Authentication API calls
│   └── App.jsx                         # Updated with auth routes

backend/
├── src/
│   └── routes/
│       └── auth_routes.py              # Authentication endpoints
```

## Authentication Flow

### Sign Up
1. User enters email, username, and password
2. Frontend validates form data
3. Password is hashed on the backend
4. User is created in the database
5. JWT token is generated
6. User is redirected to dashboard

### Sign In
1. User enters email/username and password
2. Backend verifies credentials
3. JWT token is generated
4. User data is returned
5. Token is stored in localStorage
6. User is redirected to dashboard

### Protected Routes
All routes except `/auth` require authentication:
- Token is checked on app initialization
- Invalid/expired tokens redirect to login
- User data is loaded from the token

## API Endpoints

### POST /auth/login
Login with email/username and password

**Request:**
```json
{
  "emailOrUsername": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "john_doe",
    "role": "user"
  }
}
```

### POST /auth/signup
Create a new user account

**Request:**
```json
{
  "email": "user@example.com",
  "username": "john_doe",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "john_doe",
    "role": "user"
  }
}
```

### GET /auth/me
Get current authenticated user

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "john_doe",
  "role": "user"
}
```

### POST /auth/logout
Logout and invalidate token

**Headers:**
```
Authorization: Bearer <token>
```

### GET /auth/verify
Verify if token is valid

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "john_doe",
    "role": "user"
  }
}
```

## Usage

### Using the Auth Context in Components

```jsx
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <h1>Welcome, {user.username}!</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Creating Protected Components

```jsx
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

function ProtectedComponent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <div>Protected content</div>;
}
```

## Database Schema

The `users` table includes:

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);
```

## Next Steps

### Planned Features
1. **Google OAuth Integration**
   - Complete OAuth flow
   - Handle OAuth callbacks
   - Link Google accounts

2. **Password Reset**
   - Forgot password flow
   - Email verification
   - Reset token generation

3. **Email Verification**
   - Send verification emails
   - Verify email addresses
   - Resend verification

4. **Two-Factor Authentication (2FA)**
   - TOTP support
   - Backup codes
   - SMS verification

5. **Session Management**
   - View active sessions
   - Revoke sessions
   - Session history

6. **Enhanced Security**
   - Rate limiting
   - Brute force protection
   - IP whitelisting
   - Login notifications

## Testing

### Test User Signup
1. Navigate to http://localhost:5173/auth
2. Click "Sign up"
3. Enter email, username, and password
4. Click "Create Account"
5. You should be redirected to the dashboard

### Test User Login
1. Navigate to http://localhost:5173/auth
2. Enter email/username and password
3. Click "Sign In"
4. You should be redirected to the dashboard

### Test Protected Routes
1. Navigate to http://localhost:5173/dashboard
2. If not logged in, you should be redirected to /auth
3. After logging in, you can access all protected routes

## Troubleshooting

### "Invalid credentials" error
- Check that the username/email and password are correct
- Ensure the user exists in the database
- Verify the user's status is "active"

### "Token expired" error
- The token expires after 24 hours
- User needs to log in again
- Token is automatically refreshed on app reload if still valid

### Cannot access protected routes
- Ensure you're logged in
- Check that the token is stored in localStorage
- Verify the backend is running on port 8000
- Check CORS settings if on different domains

## Security Best Practices

1. **Never store passwords in plain text** - Always hash passwords
2. **Use HTTPS in production** - Protect tokens in transit
3. **Implement rate limiting** - Prevent brute force attacks
4. **Validate all inputs** - Prevent injection attacks
5. **Use secure token storage** - Consider httpOnly cookies for production
6. **Implement token refresh** - Reduce token lifetime exposure
7. **Log authentication events** - Monitor for suspicious activity

## Support

For issues or questions:
- Check the console for error messages
- Verify backend logs for API errors
- Ensure Supabase connection is working
- Check database for user records
