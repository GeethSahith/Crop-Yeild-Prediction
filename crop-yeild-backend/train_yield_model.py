import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score

# =========================
# Load dataset
# =========================

df = pd.read_csv("crop_yield.csv")

# Create Yield column if missing
if "Yield" not in df.columns:
    df["Yield"] = df["Production"] / df["Area"]

# =========================
# Select Features
# =========================

features = [
    "Crop",
    "Crop_Year",
    "Season",
    "State",
    "Area",
    "Annual_Rainfall",
    "Fertilizer",
    "Pesticide"
]

target = "Yield"

X = df[features]
y = df[target]

# =========================
# Encode categorical columns
# =========================

categorical_cols = ["Crop", "Season", "State"]

encoders = {}

for col in categorical_cols:
    le = LabelEncoder()
    X[col] = le.fit_transform(X[col])
    encoders[col] = le

# =========================
# Train Test Split
# =========================

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42
)

# =========================
# Train Model
# =========================

model = RandomForestRegressor(
    n_estimators=400,
    max_depth=15,
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)

# =========================
# Evaluate
# =========================

preds = model.predict(X_test)

print("R2 Score:", r2_score(y_test, preds))

# =========================
# Save Model
# =========================

joblib.dump(model, "crop_yield.pkl")
joblib.dump(encoders, "encoders.pkl")
joblib.dump(features, "model_features.pkl")

print("Model saved successfully!")