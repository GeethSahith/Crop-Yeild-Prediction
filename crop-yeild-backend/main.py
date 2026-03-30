import io
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Any, cast

# Third-party utilities
import pandas as pd
import numpy as np
import requests
import torch
import uvicorn
import joblib
from PIL import Image

# Base directory
BASE_DIR = Path(__file__).resolve().parent
# Add utils to path (MUST be before utils imports)
sys.path.append(str(BASE_DIR / "utils"))

try:
    from utils.model import ResNet9
    from utils.disease import disease_dic
    from utils.fertilizer_desc import FERTILIZER_DESCRIPTIONS
    from utils.fertilizer import fertilizer_dic
except ImportError:
    # We will handle missing models at runtime with load_XYZ functions
    ResNet9 = Any
    disease_dic = {}
    FERTILIZER_DESCRIPTIONS = {}
    fertilizer_dic = {}

from dotenv import load_dotenv
from requests.exceptions import RequestException

# FastAPI and Security
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from fastapi.security.http import HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import jwt
from jose.exceptions import JWTError


# Load environment variables
load_dotenv()

# ==================== Gemini Fallback ====================
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

def gemini_disease_fallback(image_bytes: bytes):
    """
    Fallback disease detection using Gemini Vision.
    Called ONLY if local model fails.
    Returns: (disease_name, confidence)
    """
    try:
        if not GEMINI_API_KEY:
            raise RuntimeError("Gemini API key not configured")

        import base64

        image_b64 = base64.b64encode(image_bytes).decode()

        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            "gemini-2.5-flash:generateContent"
            f"?key={GEMINI_API_KEY}"
        )

        payload = {
            "contents": [{
                "parts": [
                    {
                        "text": (
                            "Identify the plant disease from the PlantVillage dataset classes. "
                            "Return EXACT class name like: Tomato___Early_blight. "
                            "Return only the label."
                        )
                    },
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": image_b64
                        }
                    }
                ]
            }]
        }

        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()

        data = response.json()

        text = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "Unknown disease")
        )

        return text.strip(), 60.0  # fallback confidence

    except Exception as e:
        raise RuntimeError(f"Gemini fallback failed: {str(e)}")

def normalize_gemini_label(text: str) -> str:
    """Map Gemini output to closest known disease key."""
    text_lower = text.lower()

    for key in disease_classes:
        clean_key = key.lower().replace("___", " ").replace("_", " ")
        if clean_key in text_lower:
            return key

    return text.strip()

# Initialize FastAPI app
app = FastAPI(
    title="CropWise Backend API",
    description="AI-powered farming assistant with crop recommendations, disease detection, and fertilizer guidance",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== JWT Authentication ====================
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
if not SUPABASE_URL:
    print("WARNING: SUPABASE_URL not configured — JWT auth will not work")


security = HTTPBearer()
JWT_DEV_MODE = os.getenv("JWT_DEV_MODE", "true").lower() == "true"


async def verify_jwt(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    if not token:
        raise HTTPException(status_code=401, detail="No token provided")

    try:
        # ================= DEV MODE =================
        if JWT_DEV_MODE:
            payload = jwt.decode(token, options={"verify_signature": False})
            return payload

        # ================= PRODUCTION MODE =================
        jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
        if not jwt_secret:
            raise HTTPException(status_code=500, detail="JWT secret not configured")

        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )

        return payload

    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


# ==================== Pydantic Models ====================

class YieldPredictionRequest(BaseModel):
    crop: str
    crop_year: int
    season: str
    state: str
    area: float
    annual_rainfall: float
    fertilizer: float
    pesticide: float
    language: Optional[str] = "en"

class FertilizerRequest(BaseModel):
    nitrogen: float
    phosphorus: float
    potassium: float
    crop_name: str
    language: Optional[str] = "en"

class DiseaseResponse(BaseModel):
    success: bool
    disease: str
    disease_key: str
    confidence: float
    model_used: str
    risk_level: str
    alert: str
    description: str
    treatment: str
    prevention: str
    language: str
    
class WeatherRequest(BaseModel):
    city: str
    country_code: Optional[str] = "IN"
    language: Optional[str] = "en"

# ==================== Language Support ====================
SUPPORTED_LANGUAGES = ["en", "te"]

TRANSLATIONS = {
    "en": {
        "healthy": "Healthy",
        "low_risk": "Low Risk",
        "medium_risk": "Medium Risk",
        "high_risk": "High Risk",
        "early_warning": "Early warning: monitor your crop regularly.",
    },
    "te": {
        "healthy": "ఆరోగ్యంగా ఉంది",
        "low_risk": "తక్కువ ప్రమాదం",
        "medium_risk": "మధ్యస్థ ప్రమాదం",
        "high_risk": "అధిక ప్రమాదం",
        "early_warning": "ముందస్తు హెచ్చరిక: పంటను తరచుగా పరిశీలించండి.",
    },
}

def normalize_lang(lang: Optional[str]) -> str:
    if not lang:
        return "en"
    lang = lang.lower()
    return lang if lang in SUPPORTED_LANGUAGES else "en"

def get_text(key: str, lang: str):
    """Fetch translated text"""
    lang = lang if lang in SUPPORTED_LANGUAGES else "en"
    return TRANSLATIONS.get(lang, {}).get(key, key)

# ==================== Disease Classes ====================
# These must match the sorted folder names in PlantVillage/ (ImageFolder order)
disease_classes = [
    'Pepper__bell___Bacterial_spot',
    'Pepper__bell___healthy',
    'Potato___Early_blight',
    'Potato___Late_blight',
    'Potato___healthy',
    'Tomato_Bacterial_spot',
    'Tomato_Early_blight',
    'Tomato_Late_blight',
    'Tomato_Leaf_Mold',
    'Tomato_Septoria_leaf_spot',
    'Tomato_Spider_mites_Two_spotted_spider_mite',
    'Tomato__Target_Spot',
    'Tomato__Tomato_YellowLeaf__Curl_Virus',
    'Tomato__Tomato_mosaic_virus',
    'Tomato_healthy',
]

disease_model: Any = None
fertilizer_df: Optional[pd.DataFrame] = None
yield_pipeline: Any = None

def predict_yield(data: YieldPredictionRequest):
    """Predict yield using the sklearn Pipeline (handles encoding internally)."""
    input_data = {
        "Crop": data.crop.strip().title(),
        "Crop_Year": data.crop_year,
        "Season": data.season.strip().title(),
        "State": data.state.strip().title(),
        "Area": data.area,
        "Annual_Rainfall": data.annual_rainfall,
        "Fertilizer": data.fertilizer,
        "Pesticide": data.pesticide
    }

    df = pd.DataFrame([input_data])

    if yield_pipeline is None:
        raise RuntimeError("Yield pipeline not loaded")

    # Pipeline handles encoding + prediction in one step
    prediction = yield_pipeline.predict(df)
    predicted_yield = max(0.0, float(prediction[0]))

    # Use tree variance for confidence
    try:
        # Pylance/Pyright may flag .named_steps access on an 'Any' object
        # Using a more robust access pattern
        pipeline_any = cast(Any, yield_pipeline)
        steps = pipeline_any.named_steps
        rf_model = steps["model"]
        preprocessor = steps["preprocessor"]

        # Transform input through the preprocessor only
        X_transformed = preprocessor.transform(df)
        tree_preds = np.array([tree.predict(X_transformed)[0] for tree in rf_model.estimators_])
        std_dev = float(np.std(tree_preds))
        mean_pred = float(np.mean(tree_preds))
        confidence = max(0.5, min(0.99, 1.0 - (std_dev / (abs(mean_pred) + 1e-6))))
    except Exception:
        confidence = 0.85

    return predicted_yield, float(confidence)


def load_yield_model():
    global yield_pipeline

    try:
        pipeline_path = BASE_DIR / "crop_yield_pipeline.pkl"
        if pipeline_path.exists():
            yield_pipeline = joblib.load(pipeline_path)
            print("Yield pipeline loaded successfully (single file)")
            return True
        else:
            print(f"Yield pipeline not found at: {pipeline_path}")
            return False

    except Exception as e:
        print("Error loading yield pipeline:", e)
        return False

def load_disease_model():
    global disease_model
    try:
        model_path = BASE_DIR / 'best_plant_disease_model.pth'
        if model_path.exists():
            model = ResNet9(3, len(disease_classes))
            model.load_state_dict(torch.load(str(model_path), map_location=torch.device('cpu')))
            model.eval()
            for param in model.parameters():
                param.requires_grad = False
            disease_model = model
            return True
        return False
    except Exception as e:
        print(f"Error loading disease model: {e}")
        return False

def load_fertilizer_data():
    global fertilizer_df
    try:
        data_path = BASE_DIR / 'Fertilizer_recommendation.csv'
        if data_path.exists():
            fertilizer_df = pd.read_csv(data_path)
            return fertilizer_df
        return None
    except Exception as e:
        print(f"Error loading fertilizer data: {e}")
        return None

# ==================== Prediction Functions ====================
def predict_disease(image_bytes):
    """
    Predict disease using local model.
    If model fails, caller can trigger Gemini fallback.
    """
    try:
        if disease_model is None:
            raise RuntimeError("Disease model not loaded")

        from torchvision import transforms
        import torch.nn.functional as F

        transform = transforms.Compose([
            transforms.Resize((256, 256)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])

        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        img_t = transform(image)
        img_u = torch.unsqueeze(img_t, 0)

        with torch.no_grad():
            outputs = disease_model(img_u)
            probs = F.softmax(outputs, dim=1)
            confidence, preds = torch.max(probs, dim=1)

        class_index = preds[0].item()
        prediction = disease_classes[class_index]
        confidence_score = float(confidence[0].item()) * 100

        # clamp confidence
        confidence_score = max(0.1, min(confidence_score, 99.9))

        return prediction, confidence_score

    except Exception as e:
        raise RuntimeError(f"Disease prediction failed: {str(e)}")

def recommend_fertilizer(n, p, k, crop_name, lang="en"):
    try:
        if fertilizer_df is None:
            load_fertilizer_data()
        if fertilizer_df is None:
            raise Exception("Fertilizer data not loaded")

        # ================= NPK ANALYSIS =================
        npk_advice = []

        def get_lang_text(obj, lang):
            """Safely extract language text"""
            if isinstance(obj, dict):
                return obj.get(lang) or obj.get("en") or ""
            return str(obj)

        # -------- Nitrogen check --------
        if n < 50:
            msg = fertilizer_dic.get("Nlow", {})
            npk_advice.append(get_lang_text(msg, lang))
        elif n > 150:
            msg = fertilizer_dic.get("NHigh", {})
            npk_advice.append(get_lang_text(msg, lang))

        # -------- Phosphorus check --------
        if p < 30:
            msg = fertilizer_dic.get("Plow", {})
            npk_advice.append(get_lang_text(msg, lang))
        elif p > 80:
            msg = fertilizer_dic.get("PHigh", {})
            npk_advice.append(get_lang_text(msg, lang))

        # -------- Potassium check --------
        if k < 40:
            msg = fertilizer_dic.get("Klow", {})
            npk_advice.append(get_lang_text(msg, lang))
        elif k > 120:
            msg = fertilizer_dic.get("KHigh", {})
            npk_advice.append(get_lang_text(msg, lang))

        # ================= FIND BEST FERTILIZER =================
        temp_df = fertilizer_df.copy()

        temp_df["distance"] = np.sqrt(
            (temp_df["Nitrogen"] - n) ** 2
            + (temp_df["Phosphorous"] - p) ** 2
            + (temp_df["Potassium"] - k) ** 2
        )

        closest = temp_df.loc[temp_df["distance"].idxmin()]
        fertilizer_name = closest["Fertilizer Name"]

        # ================= DESCRIPTION FIX =================
        desc_obj = FERTILIZER_DESCRIPTIONS.get(
            fertilizer_name,
            {"en": "High-quality fertilizer for optimal crop growth"},
        )

        description_text = (
            desc_obj.get(lang)
            or desc_obj.get("en")
            or "High-quality fertilizer for optimal crop growth"
        )

        # ================= DEFAULT MESSAGE =================
        if not npk_advice:
            default_msg = {
                "en": "Your soil NPK levels are within optimal range",
                "te": "మీ నేల NPK స్థాయులు సరైన పరిధిలో ఉన్నాయి",
            }
            npk_advice.append(default_msg.get(lang, default_msg["en"]))

        # ================= FINAL RESPONSE =================
        recommendation = {
            "fertilizer": fertilizer_name,
            "description": description_text,
            "dosage": "50-100 kg per hectare",
            "application_timing": "Apply during early vegetative stage",
            "application_method": "Broadcast evenly and irrigate lightly",
            "crop": crop_name,
            "npk_analysis": npk_advice,
        }

        return recommendation

    except Exception as e:
        raise Exception(f"Fertilizer recommendation failed: {str(e)}")
    
@app.get("/")
async def root():
    return {
        "message": "CropWise Backend API v1.0",
        "status": "running",
        "disease_model_loaded": disease_model is not None,
        "yield_pipeline_loaded": yield_pipeline is not None,
        "fertilizer_data_loaded": fertilizer_df is not None
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "models": {
            "disease": disease_model is not None,
            "yield_pipeline": yield_pipeline is not None,
            "fertilizer": fertilizer_df is not None
        }
    }


@app.post("/api/yield-prediction")
async def yield_prediction(request: YieldPredictionRequest):
    try:
        if yield_pipeline is None:
            raise HTTPException(
                status_code=503,
                detail="Yield model not available"
            )

        predicted_yield, confidence = predict_yield(request)

        # Using f-string formatting to avoid stubborn round() type errors in VS Code
        return {
            "success": True,
            "predicted_yield_tph": float(f"{predicted_yield:.2f}"),
            "confidence": float(f"{confidence * 100:.1f}"),
            "yield_unit": "tons/hectare"
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Yield prediction failed: {str(e)}"
        )
    
    
# ==================== Disease Detection Endpoint ====================
@app.post("/api/plant-disease", response_model=DiseaseResponse)
async def detect_disease(
    file: UploadFile = File(...),
    lang: Optional[str] = Header(default="en", alias="lang")
):
    """
    Gemini-powered disease detection (primary)
    """
    try:
        lang = normalize_lang(lang)

        # ================= FILE VALIDATION =================
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")

        contents = await file.read()

        MAX_SIZE = 10 * 1024 * 1024

        if not contents:
            raise HTTPException(status_code=400, detail="Empty image file")

        if len(contents) > MAX_SIZE:
            raise HTTPException(
                status_code=400,
                detail="Image size must be under 10MB"
            )

        # ================= PREDICTION (Local Model → Gemini Fallback) =================
        try:
            raw_name, confidence = predict_disease(contents)
            disease_name = raw_name
            model_used = "local"
            print("Local model disease:", disease_name, f"({confidence:.1f}%)")
        except Exception as local_err:
            print(f"Local model failed: {local_err}, falling back to Gemini")
            raw_name, confidence = gemini_disease_fallback(contents)
            disease_name = normalize_gemini_label(raw_name)
            model_used = "gemini"
            print("Gemini disease:", disease_name)

        # ================= HEALTHY SHORT-CIRCUIT =================
        if "healthy" in disease_name.lower():
            healthy_text = get_text("healthy", lang)
            return {
                "success": True,
                "disease": healthy_text,
                "disease_key": disease_name,
                "confidence": float(f"{confidence:.1f}"),
                "model_used": model_used,
                "risk_level": get_text("low_risk", lang),
                "alert": "",
                "description": healthy_text,
                "treatment": "",
                "prevention": "",
                "language": lang,
            }

        # ================= DISEASE LOOKUP (fixed for nested en/te structure) =================
        disease_data = disease_dic.get(disease_name, {})
        # disease_data structure: {"en": {"description": ..., "treatment": ..., "prevention": ...}, "te": {...}, "risk": ...}
        lang_data = disease_data.get(lang, disease_data.get("en", {}))

        if isinstance(lang_data, dict):
            description = lang_data.get("description", "Disease detected")
            treatment = lang_data.get("treatment", "Consult agricultural expert")
            prevention = lang_data.get("prevention", "Maintain good crop hygiene")
        else:
            description = "Disease detected"
            treatment = "Consult agricultural expert"
            prevention = "Maintain good crop hygiene"

        # ================= DISPLAY NAME =================
        display_name = disease_name.replace("___", " - ").replace("_", " ")

        # ================= RISK LOGIC =================
        if confidence >= 85:
            risk_level = get_text("high_risk", lang)
        elif confidence >= 60:
            risk_level = get_text("medium_risk", lang)
        else:
            risk_level = get_text("low_risk", lang)

        alert_message = get_text("early_warning", lang)

        return {
            "success": True,
            "disease": display_name,
            "disease_key": disease_name,
            "confidence": float(f"{confidence:.1f}"),
            "model_used": model_used,
            "risk_level": risk_level,
            "alert": alert_message,
            "description": description,
            "treatment": treatment,
            "prevention": prevention,
            "language": lang,
        }

    except Exception as e:
        print("Disease endpoint crash:", e)
        raise HTTPException(
            status_code=500,
            detail=f"Disease detection failed: {str(e)}"
        )

# ==================== Fertilizer Recommendation Endpoint ====================
@app.post("/api/fertilizer-recommendation")
async def fertilizer_recommendation(request: FertilizerRequest):
    """
    Recommend fertilizer based on NPK values and crop type
    Authentication is optional
    """
    try:
        crop_name = request.crop_name.strip().title()

        supported_crops = [
            'Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane',
            'Potato', 'Tomato', 'Onion', 'Banana', 'Mango',
            'Grapes', 'Apple', 'Orange', 'Coconut', 'Coffee',
            'Tea', 'Soybean', 'Groundnut', 'Chickpea', 'Lentil'
        ]

        if crop_name not in supported_crops:
            raise HTTPException(
                status_code=400,
                detail=f"Crop '{request.crop_name}' not supported"
            )
        
        lang = normalize_lang(request.language)

        recommendation = recommend_fertilizer(
            request.nitrogen,
            request.phosphorus,
            request.potassium,
            crop_name,
            lang
        )

        return {
            "success": True,
            "fertilizer": recommendation["fertilizer"],
            "description": recommendation["description"],
            "dosage": recommendation["dosage"],
            "application_timing": recommendation["application_timing"],
            "application_method": recommendation["application_method"],
            "npk_analysis": recommendation["npk_analysis"],
            "crop": crop_name,
            "language": lang,
            "npk_input": {
                "nitrogen": request.nitrogen,
                "phosphorus": request.phosphorus,
                "potassium": request.potassium
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fertilizer recommendation failed: {str(e)}"
        )

# ==================== Weather Endpoint ====================
@app.post("/api/weather")
async def get_weather(request: WeatherRequest):
    """
    Get real-time weather data from OpenWeatherMap
    """
    try:
        lang = normalize_lang(request.language)

        api_key = os.getenv("OPENWEATHER_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=500,
                detail="Weather API key not configured"
            )

        url = (
            f"https://api.openweathermap.org/data/2.5/weather"
            f"?q={request.city},{request.country_code}"
            f"&appid={api_key}&units=metric"
        )

        response = requests.get(url, timeout=(5, 10))
        response.raise_for_status()

        data = response.json()

        if str(data.get("cod")) != "200":
            raise HTTPException(
                status_code=404,
                detail=data.get("message", "City not found")
            )

        return {
            "success": True,
            "city": data["name"],
            "country_code": data["sys"]["country"],
            "temperature": data["main"]["temp"],
            "humidity": data["main"]["humidity"],
            "description": data["weather"][0]["description"],
            "windSpeed": data["wind"]["speed"],
            "pressure": data["main"]["pressure"],
            "language": lang,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    except HTTPException:
        raise
    except RequestException:
        raise HTTPException(
            status_code=503,
            detail="Weather service unavailable"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Weather fetch failed: {str(e)}"
        )

# ==================== Name Translation (Bytez) ====================
class TranslateNameRequest(BaseModel):
    name: str
    target_language: str = "te"

@app.post("/api/translate-name")
async def translate_name(request: TranslateNameRequest):
    """Translate a user's name to the target language using Bytez GPT-4o"""
    try:
        from bytez import Bytez

        api_key = os.getenv("BYTEZ_API_KEY")
        if not api_key:
            raise RuntimeError("BYTEZ_API_KEY not configured in environment")

        sdk = Bytez(api_key)
        model = sdk.model("openai/gpt-4o")

        lang_map = {"te": "Telugu"}
        lang_name = lang_map.get(request.target_language, "Telugu")

        results = model.run([
            {
                "role": "user",
                "content": (
                    f"Transliterate the following English name into {lang_name} script perfectly. "
                    f"Return ONLY the {lang_name} transliteration, nothing else.\n\n"
                    f"Name: {request.name}"
                )
            }
        ])

        if results.error:
            raise RuntimeError(f"Bytez error: {results.error}")

        output = results.output
        # Bytez returns {'role': 'assistant', 'content': '...'} — extract content
        if isinstance(output, dict) and 'content' in output:
            translated = output['content'].strip()
        else:
            translated = str(output).strip().strip('"').strip("'")

        return {
            "success": True,
            "original": request.name,
            "translated": translated,
            "language": request.target_language
        }

    except Exception as e:
        print(f"Translation failed: {e}")
        return {
            "success": False,
            "original": request.name,
            "translated": request.name,
            "language": request.target_language
        }


@app.on_event("startup")
async def startup_event():
    """Load models on startup"""
    print("Loading models...")
    start = datetime.now(timezone.utc)

    disease_loaded = load_disease_model()
    fertilizer_loaded = load_fertilizer_data() is not None
    yield_loaded = load_yield_model()

    print(f"Disease model:    {'✓' if disease_loaded else '✗'}")
    print(f"Fertilizer data:  {'✓' if fertilizer_loaded else '✗'}")
    print(f"Yield pipeline:   {'✓' if yield_loaded else '✗'}")

    print(f"Models loaded in {(datetime.now(timezone.utc)-start).total_seconds():.2f}s")

    if not disease_loaded:
        print("WARNING: Disease model not found")
    if not fertilizer_loaded:
        print("WARNING: Fertilizer dataset not found")


# ==================== Run Server ====================
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )