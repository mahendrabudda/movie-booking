"""
Trains the AI Dynamic Pricing Classifier (RandomForestClassifier) and compares it
against a LogisticRegression baseline on the reproducible synthetic dataset.
Prints accuracy, classification report, and confusion matrix, then saves the
trained pipeline and metadata to model/pricing_classifier.joblib.
"""

import os
import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from data.generate_dataset import CLASSES, SEED, generate_synthetic_dataset

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "data", "synthetic_movie_ratings.csv")
MODEL_PATH = os.path.join(BASE_DIR, "model", "pricing_classifier.joblib")

NUMERIC_FEATURES = [
    "mean_rating",
    "median_rating",
    "std_dev_rating",
    "min_rating",
    "max_rating",
    "count_ratings_gte_8",
    "days_since_release",
]
CATEGORICAL_FEATURES = ["genre", "language"]


def build_preprocessor() -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERIC_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES),
        ]
    )


def train_and_save() -> dict:
    if not os.path.exists(CSV_PATH):
        df = generate_synthetic_dataset(n_samples=2500, seed=SEED)
        os.makedirs(os.path.dirname(CSV_PATH), exist_ok=True)
        df.to_csv(CSV_PATH, index=False)
    else:
        df = pd.read_csv(CSV_PATH)

    X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
    y = df["target_class"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=SEED, stratify=y
    )

    # 1. Baseline Model: Logistic Regression
    baseline_pipe = Pipeline([
        ("preprocessor", build_preprocessor()),
        ("classifier", LogisticRegression(max_iter=1000, random_state=SEED)),
    ])
    baseline_pipe.fit(X_train, y_train)
    y_pred_lr = baseline_pipe.predict(X_test)
    lr_acc = accuracy_score(y_test, y_pred_lr)

    print("=" * 68)
    print("BASELINE MODEL: LogisticRegression (Synthetic Dataset)")
    print(f"Baseline Test Accuracy: {lr_acc:.4f}")
    print("=" * 68)

    # 2. Primary Model: RandomForestClassifier
    rf_pipe = Pipeline([
        ("preprocessor", build_preprocessor()),
        ("classifier", RandomForestClassifier(
            n_estimators=180,
            max_depth=12,
            random_state=SEED,
            n_jobs=-1
        )),
    ])
    rf_pipe.fit(X_train, y_train)
    y_pred_rf = rf_pipe.predict(X_test)
    rf_acc = accuracy_score(y_test, y_pred_rf)

    print("\n" + "=" * 68)
    print("PRIMARY MODEL: RandomForestClassifier (Synthetic Dataset)")
    print("NOTE: Accuracy is on synthetic data and is NOT real-world accuracy.")
    print(f"RandomForest Test Accuracy: {rf_acc:.4f}")
    print("-" * 68)
    print("Classification Report:")
    print(classification_report(y_test, y_pred_rf, labels=CLASSES, digits=3))
    print("-" * 68)
    print("Confusion Matrix (rows=true, cols=predicted):")
    print("Classes:", CLASSES)
    print(confusion_matrix(y_test, y_pred_rf, labels=CLASSES))
    print("=" * 68)

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    artifact = {
        "pipeline": rf_pipe,
        "model_version": "v1.0.0-rf-seed42",
        "classes": list(rf_pipe.classes_),
        "rf_accuracy": float(rf_acc),
        "baseline_lr_accuracy": float(lr_acc),
    }
    joblib.dump(artifact, MODEL_PATH)
    print(f"Saved trained model artifact to: {MODEL_PATH}")
    return artifact


if __name__ == "__main__":
    train_and_save()
