# Deploying ESPOT Browser Backend to Render

This guide outlines the steps to host your Python backend on [Render](https://render.com/).

## 1. Preparation

### **Fix File Encoding (Critical)**

Your `requirements.txt` is currently encoded in **UTF-16LE**, which may cause build failures on Render's Linux environment.
**Action**: Open `requirements.txt` in VS Code, click the encoding at the bottom right (UTF-16 LE), select **Save with Encoding**, and choose **UTF-8**.

### **Directory Structure**

Your project likely has this structure:

```
/ (Root)
├── backend/
│   ├── src/
│   │   └── main.py
│   ├── requirements.txt
│   └── ...
├── frontend/
└── ...
```

## 2. Create Render Service

1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository.

## 3. Configuration

Fill in the service details as follows:

| Setting | Value |
| :--- | :--- |
| **Name** | `espot-backend` (or your choice) |
| **Region** | Choose the one closest to you (e.g., Oregon, Frankfurt) |
| **Branch** | `main` (or your working branch) |
| **Root Directory** | `backend` (Important!) |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn src.main:app --host 0.0.0.0 --port $PORT` |

## 4. Environment Variables

Go to the **Environment** tab in your new service and add the following variables. Copy the values from your local `backend/.env` file.

| Key | Value |
| :--- | :--- |
| `PYTHON_VERSION` | `3.11.0` (Recommended to ensure compatibility) |
| `SUPABASE_URL` | *[Your Value]* |
| `SUPABASE_ANON_KEY` | *[Your Value]* |
| `SUPABASE_SERVICE_ROLE_KEY` | *[Your Value]* |
| `DATABASE_URL` | *[Your Value]* |
| `JWT_SECRET_KEY` | *[Your Value]* |
| `SECRET_KEY` | *[Your Value]* |
| `ALLOWED_ORIGINS` | `https://your-frontend-domain.onrender.com,http://localhost:3000` |
| `ENVIRONMENT` | `production` |

> **Note**: For `ALLOWED_ORIGINS`, once you deploy your frontend, make sure to add its URL here so CORS works.

## 5. Deployment

1. Click **Create Web Service**.
2. Render will start building your app. Watch the logs for any errors.
3. Once "Live", your backend will be accessible at `https://espot-backend.onrender.com` (example URL).

## 6. Troubleshooting

- **Build Failed**: Check the logs. If it says "invalid start byte" or encoding error, you didn't convert `requirements.txt` to UTF-8.
- **Module not found**: Ensure your `Root Directory` is set to `backend`.
- **Port Error**: Render automatically sets `$PORT`. Do **not** hardcode the port in the Start Command (use `$PORT`).
