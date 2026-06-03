"""Load trained artifacts and predict blog category from text."""

from __future__ import annotations

from pathlib import Path

import joblib

from text_utils import build_blog_text

ROOT = Path(__file__).resolve().parent
MODELS_DIR = ROOT / "models"

_vectorizer = None
_model = None
_label_encoder = None


class ModelNotTrainedError(Exception):
    """Raised when model.pkl / vectorizer.pkl / label_encoder.pkl are missing."""


def artifacts_exist() -> bool:
    return all(
        (MODELS_DIR / name).is_file()
        for name in ("vectorizer.pkl", "model.pkl", "label_encoder.pkl")
    )


def load_artifacts(force: bool = False) -> None:
    global _vectorizer, _model, _label_encoder

    if not force and _vectorizer is not None and _model is not None and _label_encoder is not None:
        return

    if not artifacts_exist():
        raise ModelNotTrainedError(
            "Category model not trained. Run: cd ml-service && python train_model.py"
        )

    _vectorizer = joblib.load(MODELS_DIR / "vectorizer.pkl")
    _model = joblib.load(MODELS_DIR / "model.pkl")
    _label_encoder = joblib.load(MODELS_DIR / "label_encoder.pkl")


def predict_category(title: str = "", content: str = "", subtitle: str = "", top_k: int = 3) -> dict:
    text = build_blog_text(title, subtitle, content)
    if len(text) < 15:
        raise ValueError("Provide more title or content (at least ~15 characters of text).")

    load_artifacts()
    X = _vectorizer.transform([text])
    proba = _model.predict_proba(X)[0]

    ranked_indices = proba.argsort()[::-1]
    k = max(1, min(top_k, len(ranked_indices)))

    top_predictions = []
    for idx in ranked_indices[:k]:
        top_predictions.append({
            "category": str(_label_encoder.inverse_transform([int(idx)])[0]),
            "confidence": round(float(proba[idx]), 4),
        })

    best = top_predictions[0]
    return {
        "predictedCategory": best["category"],
        "confidence": best["confidence"],
        "topPredictions": top_predictions,
    }
