# Blogify ML Service

Python service for **Blogify-ML**: blog recommendations and **AI category prediction** (trained classifier).

## Features

| Feature | Method | Description |
|---------|--------|-------------|
| Recommendations | `POST /recommend` | TF-IDF + cosine similarity (no offline training) |
| Category prediction | `POST /predict-category` | **Trained** TF-IDF + Logistic Regression on your MongoDB blogs |

## Category model — for your report / viva

### Dataset source

- All blogs are loaded from **your MongoDB** `blogs` collection (same data as the MERN app).
- **Input (X):** `title` + `subTitle` + plain-text `description` (HTML stripped).
- **Target (y):** `category` field.
- Rows with missing/empty category or very short text are skipped.
- Category **`All`** is included when blogs use it (general / mixed topics). The blog form dropdown also lists **All**.

### Model

1. **TF-IDF vectorization** — turns text into numeric features (word importance).
2. **Logistic Regression** — multiclass classifier trained on those features.

This is a real supervised learning pipeline: `.fit()` on training data, evaluation on a hold-out test set, saved artifacts loaded at prediction time.

### Training

**Option A — Jupyter notebook (best for report / viva demo):**

```bash
cd ml-service
.\.venv\Scripts\activate
pip install jupyter
jupyter notebook train_model.ipynb
```

Run all cells. You will see dataset stats, accuracy, precision, recall, F1, and classification report.

**Option B — Script:**

```bash
python train_model.py
```

**Why `.pkl` and `.ipynb`?**

- `.ipynb` = human-readable proof you trained the model (show this in viva).
- `.pkl` = binary files the API loads at runtime (you cannot open them in a text editor; that is normal).

Requires `MONGODB_URI` (and optional `MONGODB_DB_NAME`) in `backend/.env`.

**Outputs in `models/`:**

- `vectorizer.pkl` — fitted TF-IDF
- `model.pkl` — fitted Logistic Regression
- `label_encoder.pkl` — maps class index → category name
- `training_metrics.json` — accuracy, precision, recall, F1, classification report

**Minimum data:** at least **4 blogs** and **2 different categories**.

### Evaluation metrics (printed and saved)

- Accuracy
- Precision (weighted)
- Recall (weighted)
- F1 Score (weighted)
- Full classification report per category

### Prediction API

```http
POST http://localhost:8000/predict-category
Content-Type: application/json

{
  "title": "How AI is changing web development",
  "content": "<p>Machine learning and automation...</p>"
}
```

```json
{
  "predictedCategory": "Technology",
  "confidence": 0.94,
  "topPredictions": [
    { "category": "Technology", "confidence": 0.94 },
    { "category": "Startup", "confidence": 0.04 },
    { "category": "Finance", "confidence": 0.01 }
  ]
}
```

### How it works in the app

1. User types title/content in **Add Blog** or **Submit Blog**.
2. Frontend calls Express `POST /blog/predict-category`.
3. Express forwards to this service.
4. UI shows **AI Suggested Category** (does not change the user's dropdown unless they choose to).

## Run the service

```bash
cd ml-service
.\.venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Or from repo root: `npm run ml:serve`

**Python 3.14:** Use `pydantic>=2.13` (prebuilt wheels). If `pip install` fails on `pydantic-core`, run:
`pip install "pydantic>=2.13" "fastapi>=0.115" --only-binary=:all:` then `pip install -r requirements.txt`.

## Health check

`GET http://localhost:8000/health` → includes `"categoryModelTrained": true/false`.

## Recommendations (unchanged)

Use `GET /recommend/example` for Postman examples.
