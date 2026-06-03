"""
Train a category classifier on blogs stored in MongoDB.

Usage (from ml-service/ with venv activated):
  python train_model.py

Or open train_model.ipynb in Jupyter for a visible training notebook (for reports/viva).

.pkl files are the production artifacts the API loads; the notebook proves training step-by-step.
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import joblib

from text_utils import build_blog_text

ROOT = Path(__file__).resolve().parent
MODELS_DIR = ROOT / "models"
load_dotenv(ROOT.parent / "backend" / ".env")
load_dotenv(ROOT / ".env")

# Only skip empty categories. "All" is a valid label (mixed/general topics).
INVALID_CATEGORIES = {"", None}


def build_mongo_uri() -> str:
    db_name = os.getenv("MONGODB_DB_NAME") or os.getenv("APP_NAME") or "blogify-ml"
    uri = (os.getenv("MONGODB_URI") or "mongodb://127.0.0.1:27017").strip()
    if _uri_has_db_path(uri):
        return uri
    return f"{uri.rstrip('/')}/{db_name}"


def _uri_has_db_path(uri: str) -> bool:
    return bool(re.search(r"\.mongodb\.net/[^/?]+", uri) or re.search(r":\d+/[^/?]+", uri))


def fetch_labeled_blogs():
    uri = build_mongo_uri()
    client = MongoClient(uri, serverSelectionTimeoutMS=10000)
    db_name = uri.rsplit("/", 1)[-1].split("?")[0]
    db = client[db_name]
    collection = db["blogs"]

    query = {
        "category": {"$exists": True, "$nin": list(INVALID_CATEGORIES)},
        "description": {"$exists": True, "$ne": ""},
    }
    docs = list(collection.find(query, {"title": 1, "subTitle": 1, "description": 1, "category": 1}))

    texts = []
    labels = []
    for doc in docs:
        category = (doc.get("category") or "").strip()
        if not category or category in INVALID_CATEGORIES:
            continue
        text = build_blog_text(
            doc.get("title", ""),
            doc.get("subTitle", ""),
            doc.get("description", ""),
        )
        if len(text) < 20:
            continue
        texts.append(text)
        labels.append(category)

    client.close()
    return texts, labels


def run_training_pipeline(verbose: bool = True) -> dict:
    """Train, evaluate, save .pkl artifacts. Returns metrics dict."""
    if verbose:
        print("Loading blog dataset from MongoDB...")
    texts, labels = fetch_labeled_blogs()
    n_samples = len(texts)
    n_classes = len(set(labels))

    if verbose:
        print(f"Samples: {n_samples} | Categories: {n_classes} ({', '.join(sorted(set(labels)))})")

    if n_samples < 4 or n_classes < 2:
        raise ValueError(
            "Not enough data to train. Need at least 4 blogs and 2 different categories."
        )

    test_size = 0.25 if n_samples >= 8 else 0.2
    stratify = labels if n_samples >= n_classes * 2 else None

    X_train, X_test, y_train, y_test = train_test_split(
        texts,
        labels,
        test_size=test_size,
        random_state=42,
        stratify=stratify,
    )

    label_encoder = LabelEncoder()
    y_train_enc = label_encoder.fit_transform(y_train)
    y_test_enc = label_encoder.transform(y_test)

    vectorizer = TfidfVectorizer(
        stop_words="english",
        max_features=8000,
        ngram_range=(1, 2),
        min_df=1,
    )
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    model = LogisticRegression(max_iter=2000, random_state=42)
    model.fit(X_train_vec, y_train_enc)

    y_pred = model.predict(X_test_vec)

    accuracy = accuracy_score(y_test_enc, y_pred)
    precision = precision_score(y_test_enc, y_pred, average="weighted", zero_division=0)
    recall = recall_score(y_test_enc, y_pred, average="weighted", zero_division=0)
    f1 = f1_score(y_test_enc, y_pred, average="weighted", zero_division=0)
    report = classification_report(y_test_enc, y_pred, target_names=label_encoder.classes_)

    if verbose:
        print("\n--- Evaluation (hold-out test set) ---")
        print(f"Accuracy:  {accuracy:.4f}")
        print(f"Precision: {precision:.4f}")
        print(f"Recall:    {recall:.4f}")
        print(f"F1 Score:  {f1:.4f}")
        print("\nClassification Report:\n")
        print(report)

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(vectorizer, MODELS_DIR / "vectorizer.pkl")
    joblib.dump(model, MODELS_DIR / "model.pkl")
    joblib.dump(label_encoder, MODELS_DIR / "label_encoder.pkl")

    metrics = {
        "samples": n_samples,
        "classes": list(label_encoder.classes_),
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "classification_report": report,
    }
    (MODELS_DIR / "training_metrics.json").write_text(
        json.dumps(metrics, indent=2), encoding="utf-8"
    )

    if verbose:
        print(f"\nSaved artifacts to {MODELS_DIR}/")
        print("  - vectorizer.pkl, model.pkl, label_encoder.pkl")
        print("  - training_metrics.json")

    return metrics


def main():
    try:
        run_training_pipeline(verbose=True)
    except ValueError as e:
        print(f"\n{e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
