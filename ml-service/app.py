"""
FastAPI Service for Movie Popularity Prediction & AI Dynamic Ticket Pricing.
Loads the trained scikit-learn RandomForestClassifier pipeline from joblib and serves
POST /predict with input validation, predicted category, confidence score, and class probabilities.
"""

import os
import json
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model", "movie_popularity_model.joblib")
META_PATH = os.path.join(BASE_DIR, "model", "model_metadata.json")

app = FastAPI(
    title="Movie Popularity & Dynamic Pricing ML Service",
    description=(
        "Predicts movie popularity category (FLOP to INDUSTRY_HIT) and confidence scores "
        "using a scikit-learn RandomForestClassifier trained on a reproducible synthetic dataset."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model_pipeline = None
model_metadata = {}


def load_artifacts():
    global model_pipeline, model_metadata
    if not os.path.exists(MODEL_PATH):
        # Automatically train if model file does not exist yet
        from train import train_and_evaluate
        train_and_evaluate()
    model_pipeline = joblib.load(MODEL_PATH)
    if os.path.exists(META_PATH):
        with open(META_PATH, "r", encoding="utf-8") as f:
            model_metadata = json.load(f)


@app.on_event("startup")
def on_startup():
    load_artifacts()


class MoviePredictionInput(BaseModel):
    averageMovieRating: float = Field(..., ge=1.0, le=10.0, description="Average rating between 1.0 and 10.0")
    genre: str = Field(..., min_length=2, max_length=40, description="Movie genre (e.g., ACTION, SCI_FI, DRAMA)")
    language: str = Field(..., min_length=2, max_length=40, description="Primary language (e.g., TELUGU, HINDI, ENGLISH)")
    daysSinceRelease: int = Field(..., ge=0, le=3650, description="Days elapsed since theatrical release")
    movieDuration: int = Field(..., ge=40, le=300, description="Duration of the movie in minutes")
    expectedDemand: float = Field(..., ge=0.0, le=100.0, description="Expected audience demand index (0 to 100)")
    currentOccupancy: float = Field(..., ge=0.0, le=100.0, description="Current seat occupancy percentage (0 to 100)")

    @field_validator("genre", "language")
    @classmethod
    def normalize_upper(cls, v: str) -> str:
        cleaned = v.strip().upper().replace("-", "_").replace(" ", "_")
        if not cleaned:
            raise ValueError("Field cannot be blank")
        return cleaned


class MoviePredictionOutput(BaseModel):
    predictedCategory: str
    confidence: float
    classProbabilities: dict[str, float]
    modelInfo: dict


@app.get("/health")
def health_check():
    if model_pipeline is None:
        load_artifacts()
    return {
        "status": "UP",
        "modelLoaded": model_pipeline is not None,
        "metadata": model_metadata,
    }


@app.post("/predict", response_model=MoviePredictionOutput)
def predict_popularity(payload: MoviePredictionInput):
    if model_pipeline is None:
        load_artifacts()
    if model_pipeline is None:
        raise HTTPException(status_code=503, detail="ML model artifact is not loaded.")

    input_df = pd.DataFrame(
        [
            {
                "averageMovieRating": payload.averageMovieRating,
                "genre": payload.genre,
                "language": payload.language,
                "daysSinceRelease": payload.daysSinceRelease,
                "movieDuration": payload.movieDuration,
                "expectedDemand": payload.expectedDemand,
                "currentOccupancy": payload.currentOccupancy,
            }
        ]
    )

    predicted_class = str(model_pipeline.predict(input_df)[0])
    probabilities = model_pipeline.predict_proba(input_df)[0]
    classes = list(model_pipeline.classes_)

    prob_dict = {
        str(cls_name): round(float(prob), 4)
        for cls_name, prob in zip(classes, probabilities)
    }
    confidence = round(float(max(probabilities)), 4)

    return MoviePredictionOutput(
        predictedCategory=predicted_class,
        confidence=confidence,
        classProbabilities=prob_dict,
        modelInfo={
            "modelType": model_metadata.get("modelType", "RandomForestClassifier"),
            "randomForestAccuracy": model_metadata.get("randomForestAccuracy", 0.0),
            "logisticRegressionBaselineAccuracy": model_metadata.get("logisticRegressionBaselineAccuracy", 0.0),
        },
    )
