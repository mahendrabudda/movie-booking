"""
FastAPI Micro-Service for Movie AI Dynamic Pricing Prediction.
Exposes POST /predict and GET /health for the Spring Boot backend.
Automatically trains and saves the joblib artifact on first startup if missing.
"""

import os
from typing import Dict
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from train import MODEL_PATH, train_and_save

app = FastAPI(
    title="Movie Booking AI Dynamic Pricing Service",
    version="1.0.0",
    description="Predicts box-office demand tier from 10 official reviewer ratings.",
)

MODEL_ARTIFACT = None


def get_or_load_model():
    global MODEL_ARTIFACT
    if MODEL_ARTIFACT is None:
        if not os.path.exists(MODEL_PATH):
            MODEL_ARTIFACT = train_and_save()
        else:
            MODEL_ARTIFACT = joblib.load(MODEL_PATH)
    return MODEL_ARTIFACT


class PredictRequest(BaseModel):
    mean_rating: float = Field(..., ge=1.0, le=10.0)
    median_rating: float = Field(..., ge=1.0, le=10.0)
    std_dev_rating: float = Field(..., ge=0.0, le=5.0)
    min_rating: int = Field(..., ge=1, le=10)
    max_rating: int = Field(..., ge=1, le=10)
    count_ratings_gte_8: int = Field(..., ge=0, le=10)
    genre: str
    language: str
    days_since_release: int = Field(..., ge=0)


class PredictResponse(BaseModel):
    predicted_class: str
    confidence: float
    probabilities: Dict[str, float]
    model_version: str


@app.on_event("startup")
def startup_event():
    get_or_load_model()


@app.get("/health")
def health():
    artifact = get_or_load_model()
    return {
        "status": "UP",
        "model_version": artifact["model_version"],
        "synthetic_test_accuracy": round(artifact["rf_accuracy"], 4),
        "baseline_lr_accuracy": round(artifact["baseline_lr_accuracy"], 4),
    }


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    try:
        artifact = get_or_load_model()
        pipeline = artifact["pipeline"]

        input_df = pd.DataFrame([{
            "mean_rating": req.mean_rating,
            "median_rating": req.median_rating,
            "std_dev_rating": req.std_dev_rating,
            "min_rating": req.min_rating,
            "max_rating": req.max_rating,
            "count_ratings_gte_8": req.count_ratings_gte_8,
            "genre": req.genre.upper(),
            "language": req.language,
            "days_since_release": req.days_since_release,
        }])

        probs = pipeline.predict_proba(input_df)[0]
        classes = list(pipeline.classes_)
        prob_map = {cls: round(float(p), 4) for cls, p in zip(classes, probs)}
        best_idx = int(probs.argmax())
        predicted_class = str(classes[best_idx])
        confidence = round(float(probs[best_idx]), 4)

        return PredictResponse(
            predicted_class=predicted_class,
            confidence=confidence,
            probabilities=prob_map,
            model_version=artifact["model_version"],
        )
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(ex)}")
