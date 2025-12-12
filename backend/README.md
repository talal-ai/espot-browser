# ESPOT Browser Backend API

Python FastAPI backend for ESPOT Browser - Advanced Spoofing & Untraceable Browsing.

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- pip or poetry
- PostgreSQL (or Supabase)
- Redis (optional, for caching)

### Installation

1. **Navigate to API directory**
   ```bash
   cd apps/api
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -e .
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run the development server**
   ```bash
   python src/main.py
   ```

## 🏗️ Project Structure

```
apps/api/
├── src/
│   ├── main.py              # FastAPI application entry point
│   ├── routes/              # API route handlers
│   │   ├── admin_routes.py  # Admin management endpoints
│   │   ├── proxy_routes.py  # Proxy management endpoints
│   │   ├── auth_routes.py   # Authentication endpoints
│   │   └── spoofing_routes.py # Spoofing configuration endpoints
│   ├── services/            # Business logic
│   │   ├── admin_service.py
│   │   ├── proxy_service.py
│   │   ├── auth_service.py
│   │   └── spoofing_service.py
│   ├── schemas/             # Pydantic models
│   │   ├── admin_schemas.py
│   │   ├── proxy_schemas.py
│   │   ├── auth_schemas.py
│   │   └── spoofing_schemas.py
│   ├── models/              # Database models
│   └── utils/                # Utility functions
├── tests/                   # Test files
├── pyproject.toml          # Project configuration
├── .env.example            # Environment variables template
└── README.md               # This file
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

- **SUPABASE_URL** - Your Supabase project URL
- **SUPABASE_ANON_KEY** - Supabase anonymous key
- **JWT_SECRET_KEY** - Secret key for JWT tokens
- **GOOGLE_CLIENT_ID** - Google OAuth client ID
- **REDIS_URL** - Redis connection URL (optional)

### Database Setup

The API uses Supabase (PostgreSQL) for data storage. Configure your Supabase project:

1. Create a new Supabase project
2. Get your project URL and API keys
3. Update the `.env` file with your credentials

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Admin Management
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create new user
- `PUT /api/admin/users/{id}` - Update user
- `DELETE /api/admin/users/{id}` - Delete user

### Proxy Management
- `GET /api/proxy/proxies` - List all proxies
- `POST /api/proxy/proxies` - Add new proxy
- `PUT /api/proxy/proxies/{id}` - Update proxy
- `DELETE /api/proxy/proxies/{id}` - Delete proxy
- `POST /api/proxy/proxies/{id}/test` - Test proxy connection

### Spoofing Configuration
- `GET /api/spoofing/profiles` - List fingerprint profiles
- `POST /api/spoofing/profiles` - Create new profile
- `PUT /api/spoofing/profiles/{id}` - Update profile
- `DELETE /api/spoofing/profiles/{id}` - Delete profile

## 🧪 Testing

```bash
# Run tests
pytest

# Run tests with coverage
pytest --cov=src

# Run specific test file
pytest tests/test_admin.py
```

## 📊 Development

### Code Quality
```bash
# Format code
black src/

# Sort imports
isort src/

# Lint code
flake8 src/

# Type checking
mypy src/
```

### Database Migrations
```bash
# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

## 🚀 Deployment

### Production Build
```bash
# Install production dependencies
pip install -e .[prod]

# Run with production settings
uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker Deployment
```bash
# Build Docker image
docker build -t espot-browser-api .

# Run container
docker run -p 8000:8000 espot-browser-api
```

## 📞 Support

For support and questions, please contact the development team.

---

**ESPOT Browser Team** - Building the future of anonymous browsing
