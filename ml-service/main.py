"""
Blogify-Smart Blogging Platform ML service (FastAPI)

Endpoints:
  GET  /health
  POST /recommend              — content-based blog recommendations (existing)
  POST /predict-category       — trained Logistic Regression category classifier
"""

import json
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from predict import ModelNotTrainedError, artifacts_exist, predict_category
from recommender import _blog_id, recommend_similar

app = FastAPI(title="Blogify ML Service", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SAMPLE_BODY = {
    "current_blog_id": "6a193070351546eda7b7133a",
    "limit": 4,
    "blogs": [
        {
            "_id": "6a193070351546eda7b7133a",
            "title": "How AI is Changing Content Creation in 2026",
            "category": "Technology",
            "description": "<p>AI agents and content workflows in 2026.</p>",
        },
        {
            "_id": "698b02c24c965a546bb6708f",
            "title": "Understanding PowerShell Execution Policies",
            "category": "Technology",
            "description": "<p>PowerShell execution policy and running scripts on Windows.</p>",
        },
    ],
}


class RecommendRequest(BaseModel):
    blogs: list[dict[str, Any]] = Field(default_factory=list)
    current_blog_id: str = ""
    limit: int = Field(default=4, ge=1, le=20)


class RecommendResponse(BaseModel):
    recommended_ids: list[str]
    hint: str | None = None


class PredictCategoryRequest(BaseModel):
    title: str = ""
    content: str = ""


class CategoryPredictionItem(BaseModel):
    category: str
    confidence: float


class PredictCategoryResponse(BaseModel):
    predictedCategory: str
    confidence: float
    topPredictions: list[CategoryPredictionItem]


@app.get("/health")
def health():
    return {
        "status": "ok",
        "recommendations": True,
        "categoryModelTrained": artifacts_exist(),
    }


@app.get("/recommend/example")
def recommend_example():
    return SAMPLE_BODY


@app.post("/recommend", response_model=RecommendResponse)
def recommend(body: RecommendRequest):
    blogs = body.blogs or []
    current_blog_id = str(body.current_blog_id or "").strip()
    limit = body.limit

    ids = recommend_similar(blogs, current_blog_id, limit=limit)
    hint = None

    if not ids:
        blog_ids = [_blog_id(b) for b in blogs if isinstance(b, dict)]
        if not blogs:
            hint = "Send a non-empty 'blogs' array in JSON body."
        elif not current_blog_id:
            hint = "Send 'current_blog_id'."
        elif len(blogs) < 2:
            hint = "Need at least 2 blogs."
        elif current_blog_id not in blog_ids:
            hint = f"current_blog_id '{current_blog_id}' not found in blogs. Ids: {blog_ids}"

    return RecommendResponse(recommended_ids=ids, hint=hint)


@app.post("/predict-category", response_model=PredictCategoryResponse)
def predict_category_endpoint(body: PredictCategoryRequest):
    title = (body.title or "").strip()
    content = (body.content or "").strip()

    if not title and not content:
        raise HTTPException(
            status_code=400,
            detail="Provide at least a title or content to predict category.",
        )

    try:
        result = predict_category(title=title, content=content)
        return PredictCategoryResponse(**result)
    except ModelNotTrainedError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}") from e


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
