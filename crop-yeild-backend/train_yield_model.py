"""
CropWise — Yield Prediction Model Training + Validation
=========================================================
Trains a single sklearn Pipeline that handles encoding + prediction.
Saves ONE file: crop_yield_pipeline.pkl

Includes comprehensive validation:
  1. Data leakage check (encoding done inside pipeline, after split)
  2. Train vs Test performance comparison (overfitting check)
  3. Residual analysis (actual vs predicted)
  4. 5-fold cross-validation for stability

Usage:
    python train_yield_model.py
"""

import pandas as pd
import numpy as np
import joblib
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend for saving plots
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OrdinalEncoder
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

# =========================
# Load dataset
# =========================
print("=" * 60)
print("CROPWISE — YIELD PREDICTION MODEL TRAINING")
print("=" * 60)

print("\n[1/5] Loading dataset...")
df = pd.read_csv("crop_yield.csv")

# Create Yield column if missing
if "Yield" not in df.columns:
    df["Yield"] = df["Production"] / df["Area"]

# Drop rows where Yield is NaN or infinite
df = df.replace([np.inf, -np.inf], np.nan)
df = df.dropna(subset=["Yield"])

print(f"  Dataset: {df.shape[0]} rows, {df.shape[1]} columns")
print(f"  Yield range: {df['Yield'].min():.2f} — {df['Yield'].max():.2f}")
print(f"  Yield mean:  {df['Yield'].mean():.2f}")

# =========================
# Define Features & Target
# =========================
CATEGORICAL_FEATURES = ["Crop", "Season", "State"]
NUMERIC_FEATURES = ["Crop_Year", "Area", "Annual_Rainfall", "Fertilizer", "Pesticide"]
ALL_FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES
TARGET = "Yield"

# Clean Categorical Data (strip whitespace and title case)
for col in CATEGORICAL_FEATURES:
    if col in df.columns:
        df[col] = df[col].astype(str).str.strip().str.title()

X = df[ALL_FEATURES]
y = df[TARGET]

# =========================
# Train/Test Split FIRST (before any transformation)
# =========================
print("\n[2/5] Splitting data (80/20)...")
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
print(f"  Train: {len(X_train)} samples")
print(f"  Test:  {len(X_test)} samples")

# =========================
# Data Leakage Check
# =========================
print("\n[✓] DATA LEAKAGE CHECK:")
print("  ✓ OrdinalEncoder is inside the Pipeline")
print("  ✓ Pipeline.fit() only sees training data")
print("  ✓ Encoding is applied AFTER the train/test split")
print("  ✓ No information from test set leaks into training")

# =========================
# Build Pipeline
# =========================
preprocessor = ColumnTransformer(
    transformers=[
        ("cat", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1), CATEGORICAL_FEATURES),
        ("num", "passthrough", NUMERIC_FEATURES),
    ]
)

pipeline = Pipeline([
    ("preprocessor", preprocessor),
    ("model", RandomForestRegressor(
        n_estimators=400,
        max_depth=15,
        random_state=42,
        n_jobs=-1
    ))
])

# =========================
# Train
# =========================
print("\n[3/5] Training RandomForest (400 trees, max_depth=15)...")
pipeline.fit(X_train, y_train)
print("  ✓ Training complete")

# =========================
# Train vs Test Performance (Overfitting Check)
# =========================
print("\n[4/5] PERFORMANCE COMPARISON (Train vs Test):")
print("-" * 45)

train_preds = pipeline.predict(X_train)
test_preds = pipeline.predict(X_test)

train_r2 = r2_score(y_train, train_preds)
test_r2 = r2_score(y_test, test_preds)
train_mae = mean_absolute_error(y_train, train_preds)
test_mae = mean_absolute_error(y_test, test_preds)
train_rmse = np.sqrt(mean_squared_error(y_train, train_preds))
test_rmse = np.sqrt(mean_squared_error(y_test, test_preds))

print(f"  {'Metric':<15} {'Train':>10} {'Test':>10} {'Status':>12}")
print(f"  {'-'*15} {'-'*10} {'-'*10} {'-'*12}")
print(f"  {'R² Score':<15} {train_r2:>10.4f} {test_r2:>10.4f}", end="")

# Overfitting diagnosis
r2_gap = train_r2 - test_r2
if r2_gap < 0.05:
    print(f"  {'✓ Healthy':>12}")
elif r2_gap < 0.15:
    print(f"  {'⚠ Mild overfit':>14}")
else:
    print(f"  {'✗ Overfitting!':>14}")

print(f"  {'MAE':<15} {train_mae:>10.4f} {test_mae:>10.4f}")
print(f"  {'RMSE':<15} {train_rmse:>10.4f} {test_rmse:>10.4f}")
print(f"\n  R² gap (train - test): {r2_gap:.4f}", end="")
if r2_gap < 0.05:
    print(" → Model generalizes well ✓")
elif r2_gap < 0.15:
    print(" → Slight overfitting, but acceptable")
else:
    print(" → Significant overfitting, consider regularization")

# =========================
# Residual Analysis (Actual vs Predicted)
# =========================
print("\n  Saving residual plots...")

fig, axes = plt.subplots(1, 3, figsize=(18, 5))

# Plot 1: Actual vs Predicted
axes[0].scatter(y_test, test_preds, alpha=0.3, s=10, color='#2196F3')
max_val = max(y_test.max(), max(test_preds))
axes[0].plot([0, max_val], [0, max_val], 'r--', linewidth=1.5, label='Perfect prediction')
axes[0].set_xlabel('Actual Yield')
axes[0].set_ylabel('Predicted Yield')
axes[0].set_title(f'Actual vs Predicted (R²={test_r2:.4f})')
axes[0].legend()

# Plot 2: Residuals distribution
residuals = y_test - test_preds
axes[1].hist(residuals, bins=50, color='#4CAF50', edgecolor='black', alpha=0.7)
axes[1].axvline(x=0, color='red', linestyle='--', linewidth=1.5)
axes[1].set_xlabel('Residual (Actual - Predicted)')
axes[1].set_ylabel('Frequency')
axes[1].set_title(f'Residuals Distribution (mean={residuals.mean():.2f})')

# Plot 3: Residuals vs Predicted (check for patterns)
axes[2].scatter(test_preds, residuals, alpha=0.3, s=10, color='#FF9800')
axes[2].axhline(y=0, color='red', linestyle='--', linewidth=1.5)
axes[2].set_xlabel('Predicted Yield')
axes[2].set_ylabel('Residual')
axes[2].set_title('Residuals vs Predicted')

plt.tight_layout()
plt.savefig('model_validation_plots.png', dpi=150, bbox_inches='tight')
plt.close()
print("  ✓ Saved: model_validation_plots.png")

# =========================
# 5-Fold Cross Validation
# =========================
print("\n[5/5] 5-FOLD CROSS VALIDATION:")
print("-" * 45)
cv_scores = cross_val_score(pipeline, X, y, cv=5, scoring='r2', n_jobs=-1)
print(f"  Fold scores: {', '.join(f'{s:.4f}' for s in cv_scores)}")
print(f"  Mean R²:     {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

if cv_scores.std() < 0.02:
    print("  → Very stable model across folds ✓")
elif cv_scores.std() < 0.05:
    print("  → Reasonably stable model ✓")
else:
    print("  → High variance across folds, model may be unstable ⚠")

# =========================
# Save Pipeline (single file)
# =========================
OUTPUT_FILE = "crop_yield_pipeline.pkl"
joblib.dump(pipeline, OUTPUT_FILE)

print("\n" + "=" * 60)
print("FINAL SUMMARY")
print("=" * 60)
print(f"  Model:       RandomForest (400 trees, max_depth=15)")
print(f"  Train R²:    {train_r2:.4f}")
print(f"  Test R²:     {test_r2:.4f}")
print(f"  CV Mean R²:  {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
print(f"  Test MAE:    {test_mae:.4f}")
print(f"  Test RMSE:   {test_rmse:.4f}")
print(f"  Saved to:    {OUTPUT_FILE}")
print(f"  Plots:       model_validation_plots.png")
print("=" * 60)