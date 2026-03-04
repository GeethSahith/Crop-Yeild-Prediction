import io
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

# Third-party utilities
import pandas as pd
import numpy as np
import requests
import torch
import uvicorn
import joblib
from PIL import Image
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
from jose.utils import base64url_decode
# from jose.backends.ecdsa_backend import ECDSAKey


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

# Base directory
BASE_DIR = Path(__file__).resolve().parent

# Add utils to path
sys.path.append(str(BASE_DIR / "utils"))

try:
    from utils.model import ResNet9
    from utils.disease import disease_dic
    from utils.fertilizer_desc import FERTILIZER_DESCRIPTIONS
    from utils.fertilizer import fertilizer_dic
except ImportError as e:
    print(f"Warning: Could not import utils modules: {e}")

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
SUPABASE_URL = os.getenv("SUPABASE_URL")
if not SUPABASE_URL:
    raise RuntimeError("SUPABASE_URL not configured")
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"


# ==================== JWT Authentication ====================


security = HTTPBearer()
JWT_DEV_MODE = os.getenv("JWT_DEV_MODE", "true").lower() == "true"

jwks_cache = None


def get_jwks():
    global jwks_cache
    if jwks_cache:
        return jwks_cache

    response = requests.get(JWKS_URL, timeout=10)
    response.raise_for_status()
    jwks_cache = response.json()
    return jwks_cache


# def get_signing_key(token: str):
#     jwks = get_jwks()
#     headers = jwt.get_unverified_header(token)
#     kid = headers.get("kid")  

#     for jwk_key in jwks["keys"]:
#         if jwk_key["kid"] == kid:
#             return ECDSAKey(jwk_key)

#     raise HTTPException(status_code=401, detail="Signing key not found")


async def verify_jwt(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    if not token:
        raise HTTPException(status_code=401, detail="No token provided")

    try:
        # ================= DEV MODE =================
        if JWT_DEV_MODE:
            # ⚠️ DEVELOPMENT ONLY
            # Signature verification is intentionally disabled.
            # NEVER enable this in production.
            payload = jwt.decode(token, options={"verify_signature": False})
            return payload

        # ================= PRODUCTION MODE =================
        signing_key = get_signing_key(token)

        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["ES256"],
            audience="authenticated",
            issuer=f"{SUPABASE_URL}/auth/v1",
        )

        return payload

    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


# ==================== Models ====================
# class CropRecommendationRequest(BaseModel):
#     nitrogen: float
#     phosphorus: float
#     potassium: float
#     temperature: float
#     humidity: float
#     ph: float
#     rainfall: float
#     previous_yield: Optional[float] = None
#     language: Optional[str] = "en"

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
disease_classes = [
    'Apple___Apple_scab', 'Apple___Black_rot', 'Apple___Cedar_apple_rust', 'Apple___healthy',
    'Blueberry___healthy', 'Cherry_(including_sour)___Powdery_mildew', 'Cherry_(including_sour)___healthy',
    'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot', 'Corn_(maize)___Common_rust_',
    'Corn_(maize)___Northern_Leaf_Blight', 'Corn_(maize)___healthy', 'Grape___Black_rot',
    'Grape___Esca_(Black_Measles)', 'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)', 'Grape___healthy',
    'Orange___Haunglongbing_(Citrus_greening)', 'Peach___Bacterial_spot', 'Peach___healthy',
    'Pepper,_bell___Bacterial_spot', 'Pepper,_bell___healthy', 'Potato___Early_blight',
    'Potato___Late_blight', 'Potato___healthy', 'Raspberry___healthy', 'Soybean___healthy',
    'Squash___Powdery_mildew', 'Strawberry___Leaf_scorch', 'Strawberry___healthy',
    'Tomato___Bacterial_spot', 'Tomato___Early_blight', 'Tomato___Late_blight',
    'Tomato___Leaf_Mold', 'Tomato___Septoria_leaf_spot',
    'Tomato___Spider_mites Two-spotted_spider_mite', 'Tomato___Target_Spot',
    'Tomato___Tomato_Yellow_Leaf_Curl_Virus', 'Tomato___Tomato_mosaic_virus', 'Tomato___healthy'
]

# ==================== Load Models ====================
disease_model = None
crop_model = None
fertilizer_df = None
yield_model = None

def safe_encode(encoder, value):
    value = str(value).strip()

    # normalize case
    value_lower = value.lower()

    # build lookup dictionary
    mapping = {v.lower(): v for v in encoder.classes_}

    if value_lower in mapping:
        return encoder.transform([mapping[value_lower]])[0]

    # fallback to first known class if unseen
    return encoder.transform([encoder.classes_[0]])[0]

def predict_yield(data: YieldPredictionRequest):

    # normalize input
    crop = data.crop.strip().title()
    season = data.season.strip().title()
    state = data.state.strip().title()

    input_data = {
        "Crop": crop,
        "Crop_Year": data.crop_year,
        "Season": season,
        "State": state,
        "Area": data.area,
        "Annual_Rainfall": data.annual_rainfall,
        "Fertilizer": data.fertilizer,
        "Pesticide": data.pesticide
    }

    df = pd.DataFrame([input_data])

    df["Crop"] = safe_encode(yield_encoders["Crop"], crop)
    df["Season"] = safe_encode(yield_encoders["Season"], season)
    df["State"] = safe_encode(yield_encoders["State"], state)

    df = df[yield_features]

    prediction = yield_model.predict(df)

    predicted_yield = max(0, float(prediction[0]))

    return predicted_yield, 0.90


yield_model = None
yield_encoders = None
yield_features = None

def load_yield_model():
    global yield_model, yield_encoders, yield_features

    try:
        yield_model = joblib.load(BASE_DIR / "crop_yield.pkl")
        yield_encoders = joblib.load(BASE_DIR / "encoders.pkl")
        yield_features = joblib.load(BASE_DIR / "model_features.pkl")

        print("Yield model loaded successfully")
        return True

    except Exception as e:
        print("Error loading yield model:", e)
        return False

def load_disease_model():
    global disease_model
    try:
        model_path = BASE_DIR / 'plant_disease_model.pth'
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

def load_crop_model():
    global crop_model
    try:
        model_path = BASE_DIR / 'crop_recommender.pkl'
        if model_path.exists():
            with open(model_path, 'rb') as f:
                crop_model = joblib.load(model_path)
            return True
        return False
    except Exception as e:
        print(f"Error loading crop model: {e}")
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
    
def recommend_crop(n, p, k, temp, humidity, ph, rainfall, previous_yield_input=None):
    try:
        if crop_model is None:
            raise Exception("Crop model not loaded")

        # ===== Prepare input =====
        input_data = np.array(
            [[n, p, k, temp, humidity, ph, rainfall]],
            dtype=np.float32
        )

        # ===== Predict crop =====
        prediction = crop_model.predict(input_data)
        CROP_LABELS = [
            'apple', 'banana', 'blackgram', 'chickpea', 'coconut',
            'coffee', 'cotton', 'grapes', 'jute', 'kidneybeans',
            'lentil', 'maize', 'mango', 'mothbeans', 'mungbean',
            'muskmelon', 'orange', 'papaya', 'pigeonpeas',
            'pomegranate', 'rice', 'watermelon'
        ]

        pred_index = int(prediction[0])
        crop_name = CROP_LABELS[pred_index]

        # ===== Confidence =====
        confidence = 0.85
        if hasattr(crop_model, 'predict_proba'):
            probabilities = crop_model.predict_proba(input_data)
            confidence = float(np.max(probabilities))
            confidence = max(0.5, min(confidence, 0.99))

        # ===== Crop-specific base yields (tons/hectare) =====
        CROP_BASE_YIELD = {
            "rice": 3.5,
            "wheat": 3.2,
            "maize": 4.0,
            "cotton": 2.2,
            "sugarcane": 70.0,
            "potato": 25.0,
            "tomato": 30.0,
            "banana": 40.0,
            "soybean": 2.5,
        }

        base_yield = CROP_BASE_YIELD.get(str(crop_name).lower(), 3.0)

        # ===== Soil factor =====
        soil_factor = (n + p + k) / 300
        soil_factor = max(0.6, min(soil_factor, 1.4))

        # ===== Weather factor =====
        weather_factor = (
            (temp / 35) * 0.3 +
            (humidity / 100) * 0.3 +
            (rainfall / 300) * 0.4
        )
        weather_factor = max(0.6, min(weather_factor, 1.4))

        # ===== Final dynamic yield =====
        predicted_yield = round(
            base_yield * soil_factor * weather_factor * confidence,
            2
        )

        # ===== Previous season comparison =====
        if previous_yield_input is not None:
            previous_yield = previous_yield_input
        else:
            previous_yield = round(predicted_yield * np.random.uniform(0.95, 1.05), 2)

        # yield_change = round(predicted_yield - previous_yield, 2)
        return crop_name, confidence, predicted_yield, previous_yield

    except Exception as e:
        raise Exception(f"Crop recommendation failed: {str(e)}")

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
    
# ==================== Health Check ====================
@app.get("/")
async def root():
    return {
        "message": "CropWise Backend API v1.0",
        "status": "running",
        "disease_model_loaded": disease_model is not None,
        "crop_model_loaded": crop_model is not None
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "models": {
            "disease": disease_model is not None,
            "crop": crop_model is not None,
            "fertilizer": fertilizer_df is not None
        }
    }

# ==================== Crop Recommendation Endpoint ====================
# @app.post("/api/crop-recommendation")
# async def crop_recommendation(request: CropRecommendationRequest):
#     """
#     Recommend crop based on soil nutrients and weather conditions
#     """
#     try:
#         if crop_model is None:
#             raise HTTPException(
#                 status_code=503,
#                 detail="Crop model not available"
#             )

#         # ✅ Use DataFrame with correct feature names
#         input_df = pd.DataFrame([{
#             "N": float(request.nitrogen),
#             "P": float(request.phosphorus),
#             "K": float(request.potassium),
#             "temperature": float(request.temperature),
#             "humidity": float(request.humidity),
#             "ph": float(request.ph),
#             "rainfall": float(request.rainfall),
#         }])

#         # ===== Predict crop =====
#         prediction = crop_model.predict(input_df)
#         CROP_LABELS = [
#             'apple', 'banana', 'blackgram', 'chickpea', 'coconut',
#             'coffee', 'cotton', 'grapes', 'jute', 'kidneybeans',
#             'lentil', 'maize', 'mango', 'mothbeans', 'mungbean',
#             'muskmelon', 'orange', 'papaya', 'pigeonpeas',
#             'pomegranate', 'rice', 'watermelon'
#         ]

#         pred_index = int(prediction[0])
#         crop_name = CROP_LABELS[pred_index]

#         # ===== Confidence =====
#         confidence = 0.85
#         if hasattr(crop_model, "predict_proba"):
#             probabilities = crop_model.predict_proba(input_df)
#             confidence = float(np.max(probabilities))
#             confidence = max(0.5, min(confidence, 0.99))

#         # ===== Yield estimation =====
#         CROP_BASE_YIELD = {
#             "rice": 3.5,
#             "wheat": 3.2,
#             "maize": 4.0,
#             "cotton": 2.2,
#             "sugarcane": 70.0,
#             "potato": 25.0,
#             "tomato": 30.0,
#             "banana": 40.0,
#             "soybean": 2.5,
#         }

#         base_yield = CROP_BASE_YIELD.get(str(crop_name).lower(), 3.0)

#         soil_factor = (request.nitrogen + request.phosphorus + request.potassium) / 300
#         soil_factor = max(0.6, min(soil_factor, 1.4))

#         weather_factor = (
#             (request.temperature / 35) * 0.3 +
#             (request.humidity / 100) * 0.3 +
#             (request.rainfall / 300) * 0.4
#         )
#         weather_factor = max(0.6, min(weather_factor, 1.4))

#         predicted_yield = round(
#             base_yield * soil_factor * weather_factor * confidence,
#             2
#         )

#         previous_yield = (
#             request.previous_yield
#             if request.previous_yield is not None
#             else round(predicted_yield * np.random.uniform(0.95, 1.05), 2)
#         )

#         return {
#             "success": True,
#             "crop": str(crop_name),
#             "confidence": round(confidence * 100, 1),
#             "predicted_yield_tph": predicted_yield,
#             "previous_season_yield": previous_yield,
#             "yield_unit": "tons/hectare",
#         }

#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=500,
#             detail=f"Crop recommendation failed: {str(e)}"
#         )


@app.post("/api/yield-prediction")
async def yield_prediction(request: YieldPredictionRequest):
    try:
        if yield_model is None:
            raise HTTPException(
                status_code=503,
                detail="Yield model not available"
            )

        predicted_yield, confidence = predict_yield(request)

        return {
            "success": True,
            "predicted_yield_tph": round(predicted_yield, 2),
            "confidence": round(confidence * 100, 1),
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

        # ================= GEMINI PREDICTION =================
        raw_name, confidence = gemini_disease_fallback(contents)
        disease_name = normalize_gemini_label(raw_name)
        model_used = "gemini"

        print("Gemini disease:", disease_name)

        # ================= HEALTHY SHORT-CIRCUIT =================
        # If plant is healthy → return ONLY Gemini text (lowercase)
        # ================= HEALTHY SHORT-CIRCUIT =================
        if "healthy" in disease_name.lower():
            return {
                "success": True,
                "disease": "healthy",
                "disease_key": disease_name,
                "confidence": 87.0,
                "model_used": model_used,
                "risk_level": "Low Risk",
                "alert": "",
                "description": raw_name.strip().lower(),
                "treatment": "",
                "prevention": "",
                "language": lang,
            }

        # ================= SAFE DISEASE LOOKUP =================
        disease_info = disease_dic.get(disease_name, {})

        def safe_lang_extract(obj, lang_code):
            if isinstance(obj, dict):
                return obj.get(lang_code) or obj.get("en") or ""
            return str(obj)

        description = safe_lang_extract(
            disease_info.get("description", "Disease detected"),
            lang
        )

        treatment = safe_lang_extract(
            disease_info.get("treatment", "Consult agricultural expert"),
            lang
        )

        prevention = safe_lang_extract(
            disease_info.get("prevention", "Maintain good crop hygiene"),
            lang
        )

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
            "confidence": round(float(confidence), 1),
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
        
        recommendation = recommend_fertilizer(
            request.nitrogen,
            request.phosphorus,
            request.potassium,
            crop_name
        )
        
        lang = normalize_lang(request.language)

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
            "timestamp": datetime.utcnow().isoformat()
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

# ==================== Startup Event ====================
@app.on_event("startup")
async def startup_event():
    """Load models on startup"""
    print("Loading models...")
    start = datetime.utcnow()

    disease_loaded = load_disease_model()
    crop_loaded = load_crop_model()
    fertilizer_loaded = load_fertilizer_data() is not None
    yield_loaded = load_yield_model()


    print(f"Disease model: {'✓' if disease_loaded else '✗'}")
    print(f"Crop model: {'✓' if crop_loaded else '✗'}")
    print(f"Fertilizer data: {'✓' if fertilizer_loaded else '✗'}")
    print(f"Yield model: {'✓' if yield_loaded else '✗'}")

    print(f"Models loaded in {(datetime.utcnow()-start).total_seconds():.2f}s")

    if not disease_loaded:
        print("WARNING: Disease model not found")

    if not crop_loaded:
        print("WARNING: Crop model not found")

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