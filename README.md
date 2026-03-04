# CropWise (AI Crop Assistant)

Short setup guide to run this project locally.

## Tech Stack
- Frontend: React (`crop-yeild-ui`)
- Backend: FastAPI + ML models (`crop-yeild-backend`)
- Auth/DB: Supabase

## Prerequisites
- Node.js 18+
- Python 3.10+
- npm + pip

## 1) Backend Setup
```bash
cd crop-yeild-backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt
```

Create `crop-yeild-backend/.env`:
```env
SUPABASE_URL=your_supabase_project_url
OPENWEATHER_API_KEY=your_openweather_api_key
GEMINI_API_KEY=your_gemini_key_optional
JWT_DEV_MODE=true
```

Run backend:
```bash
uvicorn main:app --reload
```
Backend URL: `http://localhost:8000`

## 2) Frontend Setup
```bash
cd crop-yeild-ui
npm install
```

Create `crop-yeild-ui/.env`:
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_key
```

Run frontend:
```bash
npm start
```
Frontend URL: `http://localhost:3000`

## 3) Run Flow
1. Start backend first
2. Start frontend
3. Open `http://localhost:3000`
4. Sign up -> confirm email -> login -> use features

## Main Features
- Crop yield prediction
- Plant disease detection (image upload)
- Fertilizer recommendation
- Weather insights
