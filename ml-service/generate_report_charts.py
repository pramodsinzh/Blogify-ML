"""
Generate report charts for the Blogify ML service.

Usage (script):
  cd ml-service
  .\\.venv\\Scripts\\python.exe generate_report_charts.py

Usage (notebook):
  %matplotlib inline
  from generate_report_charts import generate_all_charts
  generate_all_charts(show=True, save=True)
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import joblib

# Avoid blocking GUI windows when run as a script (notebook uses %matplotlib inline).
if "ipykernel" not in sys.modules:
    import matplotlib

    matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
from pymongo import MongoClient
from sklearn.metrics import confusion_matrix
from sklearn.model_selection import train_test_split

from recommender import _blog_id, _blog_text, _cosine, _tfidf_vectors, _tokenize
from train_model import build_mongo_uri, fetch_labeled_blogs

ROOT = Path(__file__).resolve().parent
MODELS_DIR = ROOT / "models"
FIGURES_DIR = MODELS_DIR / "figures"
METRICS_PATH = MODELS_DIR / "training_metrics.json"

CHART_STYLE = {
    "figure.figsize": (9, 5.5),
    "axes.titlesize": 13,
    "axes.labelsize": 11,
    "xtick.labelsize": 10,
    "ytick.labelsize": 10,
}


def load_training_metrics(path: Path = METRICS_PATH) -> dict:
    if not path.is_file():
        raise FileNotFoundError(
            f"Missing {path}. Run training first: python train_model.py"
        )
    return json.loads(path.read_text(encoding="utf-8"))


def reproduce_test_predictions() -> tuple[np.ndarray, np.ndarray, list[str]]:
    """Reload saved model and reproduce hold-out test predictions (same split as training)."""
    texts, labels = fetch_labeled_blogs()
    n_samples = len(texts)
    n_classes = len(set(labels))

    if n_samples < 4 or n_classes < 2:
        raise ValueError("Not enough labeled blogs to evaluate.")

    test_size = 0.25 if n_samples >= 8 else 0.2
    stratify = labels if n_samples >= n_classes * 2 else None

    _, X_test, _, y_test = train_test_split(
        texts,
        labels,
        test_size=test_size,
        random_state=42,
        stratify=stratify,
    )

    vectorizer = joblib.load(MODELS_DIR / "vectorizer.pkl")
    model = joblib.load(MODELS_DIR / "model.pkl")
    label_encoder = joblib.load(MODELS_DIR / "label_encoder.pkl")

    X_test_vec = vectorizer.transform(X_test)
    y_test_enc = label_encoder.transform(y_test)
    y_pred_enc = model.predict(X_test_vec)
    class_names = [str(c) for c in label_encoder.classes_]

    return y_test_enc, y_pred_enc, class_names


def parse_classification_report(report_text: str) -> list[dict]:
    """Parse sklearn classification_report text into per-class rows."""
    rows: list[dict] = []
    line_re = re.compile(
        r"^\s{2}(\S+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(\d+)\s*$"
    )
    for line in report_text.splitlines():
        match = line_re.match(line)
        if not match:
            continue
        category, precision, recall, f1, support = match.groups()
        if category in {"accuracy", "macro", "weighted"}:
            continue
        rows.append(
            {
                "category": category,
                "precision": float(precision),
                "recall": float(recall),
                "f1": float(f1),
                "support": int(support),
            }
        )
    return rows


def fetch_blogs_for_recommender(limit: int = 30) -> list[dict]:
    uri = build_mongo_uri()
    client = MongoClient(uri, serverSelectionTimeoutMS=10000)
    db_name = uri.rsplit("/", 1)[-1].split("?")[0]
    db = client[db_name]
    docs = list(
        db["blogs"].find(
            {"description": {"$exists": True, "$ne": ""}},
            {"title": 1, "subTitle": 1, "description": 1, "category": 1},
        ).limit(limit)
    )
    client.close()
    return docs


def plot_overall_metrics(metrics: dict, *, ax: plt.Axes | None = None, show: bool = True) -> plt.Figure:
    values = {
        "Accuracy": metrics["accuracy"],
        "Precision": metrics["precision"],
        "Recall": metrics["recall"],
        "F1 Score": metrics["f1"],
    }
    created_fig = ax is None
    fig = ax.figure if ax else plt.figure(figsize=(8, 5))
    if ax is None:
        ax = fig.add_subplot(111)

    names = list(values.keys())
    scores = list(values.values())
    colors = sns.color_palette("viridis", len(names))
    bars = ax.bar(names, scores, color=colors, edgecolor="white", linewidth=0.8)
    ax.set_ylim(0, 1.05)
    ax.set_ylabel("Score")
    ax.set_title("Category Classifier — Overall Test Metrics")
    ax.axhline(0.5, color="#cccccc", linestyle="--", linewidth=1)
    for bar, score in zip(bars, scores):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + 0.02,
            f"{score:.2%}",
            ha="center",
            va="bottom",
            fontsize=10,
        )

    fig.tight_layout()
    if show and created_fig:
        plt.show()
    return fig


def plot_per_category_metrics(
    metrics: dict,
    *,
    ax: plt.Axes | None = None,
    show: bool = True,
) -> plt.Figure:
    rows = parse_classification_report(metrics["classification_report"])
    if not rows:
        raise ValueError("Could not parse classification report.")

    categories = [r["category"] for r in rows]
    precision = [r["precision"] for r in rows]
    recall = [r["recall"] for r in rows]
    f1 = [r["f1"] for r in rows]

    x = np.arange(len(categories))
    width = 0.25
    created_fig = ax is None
    fig = ax.figure if ax else plt.figure(figsize=(10, 5.5))
    if ax is None:
        ax = fig.add_subplot(111)

    ax.bar(x - width, precision, width, label="Precision", color="#4C78A8")
    ax.bar(x, recall, width, label="Recall", color="#F58518")
    ax.bar(x + width, f1, width, label="F1 Score", color="#54A24B")
    ax.set_xticks(x)
    ax.set_xticklabels(categories, rotation=20, ha="right")
    ax.set_ylim(0, 1.15)
    ax.set_ylabel("Score")
    ax.set_title("Per-Category Precision, Recall, and F1 (Test Set)")
    ax.legend(loc="upper right")
    fig.tight_layout()
    if show and created_fig:
        plt.show()
    return fig


def plot_confusion_matrix_chart(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    class_names: list[str],
    *,
    ax: plt.Axes | None = None,
    show: bool = True,
) -> plt.Figure:
    cm = confusion_matrix(y_true, y_pred, labels=np.arange(len(class_names)))
    created_fig = ax is None
    fig = ax.figure if ax else plt.figure(figsize=(8, 6))
    if ax is None:
        ax = fig.add_subplot(111)

    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=class_names,
        yticklabels=class_names,
        ax=ax,
        cbar_kws={"label": "Count"},
    )
    ax.set_xlabel("Predicted category")
    ax.set_ylabel("True category")
    ax.set_title("Confusion Matrix (Hold-out Test Set)")
    fig.tight_layout()
    if show and created_fig:
        plt.show()
    return fig


def plot_dataset_distribution(
    labels: list[str],
    *,
    ax: plt.Axes | None = None,
    show: bool = True,
) -> plt.Figure:
    unique, counts = np.unique(labels, return_counts=True)
    order = np.argsort(unique)
    unique = unique[order]
    counts = counts[order]

    created_fig = ax is None
    fig = ax.figure if ax else plt.figure(figsize=(8, 5))
    if ax is None:
        ax = fig.add_subplot(111)

    palette = sns.color_palette("Set2", len(unique))
    bars = ax.bar(unique, counts, color=palette, edgecolor="white")
    ax.set_xlabel("Category")
    ax.set_ylabel("Number of blogs")
    ax.set_title(f"Training Dataset Distribution ({len(labels)} labeled blogs)")
    for bar, count in zip(bars, counts):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + 0.2,
            str(count),
            ha="center",
            va="bottom",
        )
    fig.tight_layout()
    if show and created_fig:
        plt.show()
    return fig


def plot_top_features(
    top_n: int = 8,
    *,
    ax: plt.Axes | None = None,
    show: bool = True,
) -> plt.Figure | None:
    vectorizer = joblib.load(MODELS_DIR / "vectorizer.pkl")
    model = joblib.load(MODELS_DIR / "model.pkl")
    label_encoder = joblib.load(MODELS_DIR / "label_encoder.pkl")
    feature_names = vectorizer.get_feature_names_out()

    n_classes = len(label_encoder.classes_)
    created_fig = ax is None
    fig = ax.figure if ax else plt.figure(figsize=(12, 3.2 * n_classes))
    if ax is not None:
        axes = [ax]
    else:
        axes = [fig.add_subplot(n_classes, 1, i + 1) for i in range(n_classes)]

    for i, (ax_i, class_name) in enumerate(zip(axes, label_encoder.classes_)):
        coef = model.coef_[i]
        top_idx = coef.argsort()[-top_n:][::-1]
        words = [feature_names[j] for j in top_idx]
        weights = coef[top_idx]
        colors = ["#2E86AB" if w >= 0 else "#C0392B" for w in weights]
        ax_i.barh(words[::-1], weights[::-1], color=colors[::-1])
        ax_i.set_title(f"Top TF-IDF features — {class_name}")
        ax_i.set_xlabel("Logistic Regression coefficient")

    fig.tight_layout()
    if show and created_fig:
        plt.show()
    return fig


def plot_recommender_similarity(
    blogs: list[dict] | None = None,
    *,
    limit: int = 6,
    ax: plt.Axes | None = None,
    show: bool = True,
) -> plt.Figure | None:
    if blogs is None:
        blogs = fetch_blogs_for_recommender(limit=30)
    if len(blogs) < 2:
        print("Skipping recommender chart: need at least 2 blogs in MongoDB.")
        return None

    ids = [_blog_id(b) for b in blogs]
    doc_tokens = [_tokenize(_blog_text(b)) for b in blogs]
    if not any(doc_tokens):
        print("Skipping recommender chart: no usable text tokens.")
        return None

    vectors = _tfidf_vectors(doc_tokens)
    current_idx = 0
    current_vec = vectors[current_idx]
    current_title = (blogs[current_idx].get("title") or "Untitled")[:50]

    ranked = sorted(
        ((i, _cosine(current_vec, vectors[i])) for i in range(len(blogs)) if i != current_idx),
        key=lambda x: x[1],
        reverse=True,
    )[:limit]

    labels = []
    scores = []
    for i, score in ranked:
        title = (blogs[i].get("title") or "Untitled")[:35]
        labels.append(title)
        scores.append(score)

    created_fig = ax is None
    fig = ax.figure if ax else plt.figure(figsize=(10, max(4, 0.55 * len(labels))))
    if ax is None:
        ax = fig.add_subplot(111)

    y_pos = np.arange(len(labels))
    ax.barh(y_pos, scores, color=sns.color_palette("mako", len(labels)))
    ax.set_yticks(y_pos)
    ax.set_yticklabels(labels)
    ax.invert_yaxis()
    ax.set_xlim(0, max(scores) * 1.15 if scores else 1)
    ax.set_xlabel("Cosine similarity score")
    ax.set_title(f"Content-Based Recommendations\n(query: \"{current_title}\")")
    for y, score in zip(y_pos, scores):
        ax.text(score + 0.01, y, f"{score:.3f}", va="center", fontsize=9)

    fig.tight_layout()
    if show and created_fig:
        plt.show()
    return fig


def generate_all_charts(
    *,
    show: bool = True,
    save: bool = True,
    figures_dir: Path = FIGURES_DIR,
) -> dict:
    """
    Build all report figures. Set show=True for notebook display, save=True for PNG export.
    Returns paths to saved figures.
    """
    plt.style.use("seaborn-v0_8-whitegrid")
    plt.rcParams.update(CHART_STYLE)

    metrics = load_training_metrics()
    y_true, y_pred, class_names = reproduce_test_predictions()
    _, labels = fetch_labeled_blogs()

    saved: dict[str, str] = {}
    figures_dir.mkdir(parents=True, exist_ok=True)

    chart_jobs = [
        ("fig1_overall_metrics.png", lambda: plot_overall_metrics(metrics, show=show)),
        ("fig2_per_category_metrics.png", lambda: plot_per_category_metrics(metrics, show=show)),
        (
            "fig3_confusion_matrix.png",
            lambda: plot_confusion_matrix_chart(y_true, y_pred, class_names, show=show),
        ),
        ("fig4_dataset_distribution.png", lambda: plot_dataset_distribution(labels, show=show)),
        ("fig5_top_features.png", lambda: plot_top_features(show=show)),
        ("fig6_recommender_similarity.png", lambda: plot_recommender_similarity(show=show)),
    ]

    for filename, plot_fn in chart_jobs:
        fig = plot_fn()
        if fig is None:
            continue
        if save:
            out = figures_dir / filename
            fig.savefig(out, dpi=300, bbox_inches="tight")
            saved[filename] = str(out)
        if not show:
            plt.close(fig)

    print("\n--- Report charts ---")
    print(f"Metrics: accuracy={metrics['accuracy']:.2%}, f1={metrics['f1']:.2%}")
    print(f"Classes: {', '.join(metrics['classes'])}")
    if saved:
        print(f"Saved {len(saved)} figures to {figures_dir}/")
        for name, path in saved.items():
            print(f"  - {name}")

    return saved


def main() -> None:
    # CLI: save PNGs only (use the notebook to view charts inline).
    generate_all_charts(show=False, save=True)


if __name__ == "__main__":
    main()
