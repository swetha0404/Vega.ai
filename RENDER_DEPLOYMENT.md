# 🎨 Render Deployment Guide for VEGA.ai

## 🚀 Quick Deployment Steps

### 1. **Prepare GitHub Repository**
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. **Deploy Backend on Render**
1. Go to https://render.com
2. Sign up/Login with GitHub
3. Click "New" → "Web Service"
4. Connect your GitHub repo: `swetha0404/Vega.ai`
5. Configure:
   ```
   Name: vega-backend
   Environment: Docker
   Dockerfile Path: ./Dockerfile
   ```

### 3. **Add Environment Variables**
In Render dashboard → Environment:
```
OPENAI_API_KEY=your_openai_key_here
HEYGEN_API_KEY=your_heygen_key_here
PYTHONPATH=/app
```

### 4. **Deploy Frontend**
1. Create another Web Service
2. Configure:
   ```
   Name: vega-frontend
   Environment: Docker
   Dockerfile Path: ./frontend/Dockerfile
   ```

### 5. **Update Frontend Environment**
Add environment variable:
```
VITE_API_BASE_URL=https://vega-backend.onrender.com
```
(Replace with your actual backend URL from Render)

### 6. **Configure Custom Domain**
1. In Render dashboard → Settings → Custom Domains
2. Add: `imacc.iamvega.ai`
3. Update your domain DNS:
   ```
   Type: CNAME
   Name: imacc
   Value: vega-frontend.onrender.com
   ```

## 💰 **Render Pricing**
- **Free Tier**: 750 hours/month (enough for testing)
- **Paid**: $7/month per service (only pay when needed)

## 🔧 **Troubleshooting**
- Build logs available in Render dashboard
- Health check: `/health` endpoint
- Auto-deploy on git push

## ✅ **Expected Results**
- Backend: https://vega-backend.onrender.com
- Frontend: https://vega-frontend.onrender.com
- Custom Domain: https://imacc.iamvega.ai
