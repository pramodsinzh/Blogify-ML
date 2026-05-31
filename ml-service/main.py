import json

from flask import Flask, jsonify, request
from flask_cors import CORS

from recommender import _blog_id, recommend_similar

app = Flask(__name__)
CORS(app)

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


def _parse_body():
    raw = request.get_data(cache=True)

    body = request.get_json(force=True, silent=True)
    if body is not None:
        return body, raw

    if raw:
        try:
            return json.loads(raw.decode("utf-8")), raw
        except (json.JSONDecodeError, UnicodeDecodeError):
            pass

    return {}, raw


def _normalize_blogs(body):
    if not isinstance(body, dict):
        return []

    blogs = body.get("blogs") or body.get("Blogs") or []
    if isinstance(blogs, dict):
        return [blogs]
    if isinstance(blogs, list):
        return blogs
    return []


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/recommend/example")
def recommend_example():
    """Copy this JSON into Postman Body (raw -> JSON) for POST /recommend."""
    return jsonify(SAMPLE_BODY)


@app.post("/recommend")
def recommend():
    body, raw = _parse_body()
    blogs = _normalize_blogs(body)
    current_blog_id = ""
    limit = 4

    if isinstance(body, dict):
        current_blog_id = str(body.get("current_blog_id") or body.get("currentBlogId") or "")
        limit = int(body.get("limit", 4))

    limit = max(1, min(limit, 20))
    ids = recommend_similar(blogs, current_blog_id, limit=limit)

    hint = None
    debug = None

    if not ids:
        blog_ids = [_blog_id(b) for b in blogs if isinstance(b, dict)]
        raw_text = raw.decode("utf-8", errors="replace") if raw else ""

        if not blogs:
            debug = {
                "body_bytes": len(raw),
                "body_preview": raw_text[:300] if raw_text else "(empty)",
                "parsed_type": type(body).__name__,
            }
            if raw_text.lstrip().startswith("$body") or "@{" in raw_text[:80]:
                hint = (
                    "You pasted PowerShell into Postman. Postman only accepts JSON, not $body = @{ ... }. "
                    "Copy ml-service/sample-recommend-body.json into Body -> raw -> JSON, "
                    "or GET /recommend/example and paste that response."
                )
            elif len(raw) <= 2 or raw_text.strip() in ("", "{}"):
                hint = (
                    "Postman sent an empty JSON object {}. "
                    "Open GET http://localhost:8000/recommend/example, copy the response, "
                    "paste into POST /recommend -> Body -> raw -> JSON, then Send."
                )
            elif not isinstance(body, dict):
                hint = (
                    f"JSON root must be an object with 'blogs', not {type(body).__name__}. "
                    "See GET /recommend/example."
                )
            else:
                hint = (
                    "Missing or empty 'blogs' in JSON. "
                    f"Keys received: {list(body.keys())}. "
                    "See GET /recommend/example or file sample-recommend-body.json."
                )
        elif not current_blog_id:
            hint = "Send 'current_blog_id' (the blog the user is reading)."
        elif len(blogs) < 2:
            hint = "Need at least 2 blogs in 'blogs' to recommend another one."
        elif current_blog_id not in blog_ids:
            hint = (
                f"current_blog_id '{current_blog_id}' was not found in blogs. "
                f"Ids in request: {blog_ids}"
            )
        else:
            hint = "Blogs had no usable text (title/category/description)."

    response = {"recommended_ids": ids, "hint": hint}
    if debug:
        response["debug"] = debug
    return jsonify(response)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
