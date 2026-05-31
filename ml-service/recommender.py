"""
Content-based recommendations using TF-IDF + cosine similarity (pure Python).

No scikit-learn required — easier to install and good for learning the idea.
"""

import math
import re
from collections import Counter
from html import unescape

STOP_WORDS = frozenset(
    "a an the and or but in on at to for of is are was were be been being "
    "it this that with as by from into through during before after above below "
    "i you he she they we my your his her their our".split()
)


def _strip_html(html: str) -> str:
    if not html:
        return ""
    text = unescape(html)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _tokenize(text: str) -> list[str]:
    words = re.findall(r"[a-z0-9]+", text.lower())
    return [w for w in words if w not in STOP_WORDS and len(w) > 1]


def _blog_id(blog: dict) -> str:
    """Support string ids and MongoDB extended JSON `{"$oid": "..."}`."""
    raw = blog.get("_id", blog.get("id", ""))
    if isinstance(raw, dict):
        return str(raw.get("$oid") or raw.get("oid") or "").strip()
    return str(raw).strip()


def _blog_text(blog: dict) -> str:
    parts = [
        blog.get("title") or "",
        blog.get("category") or "",
        blog.get("subTitle") or "",
        _strip_html(blog.get("description") or ""),
    ]
    return " ".join(p for p in parts if p)


def _tfidf_vectors(doc_tokens: list[list[str]]) -> list[dict[str, float]]:
    n_docs = len(doc_tokens)
    df: Counter[str] = Counter()
    for tokens in doc_tokens:
        for term in set(tokens):
            df[term] += 1

    vectors: list[dict[str, float]] = []
    for tokens in doc_tokens:
        tf = Counter(tokens)
        total = len(tokens) or 1
        vec: dict[str, float] = {}
        for term, count in tf.items():
            idf = math.log((1 + n_docs) / (1 + df[term])) + 1
            vec[term] = (count / total) * idf
        vectors.append(vec)
    return vectors


def _cosine(a: dict[str, float], b: dict[str, float]) -> float:
    if not a or not b:
        return 0.0
    common = set(a) & set(b)
    dot = sum(a[t] * b[t] for t in common)
    norm_a = math.sqrt(sum(v * v for v in a.values()))
    norm_b = math.sqrt(sum(v * v for v in b.values()))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def recommend_similar(
    blogs: list[dict],
    current_blog_id: str,
    limit: int = 4,
) -> list[str]:
    current_blog_id = str(current_blog_id).strip()
    if not blogs or not current_blog_id:
        return []

    ids = [_blog_id(b) for b in blogs]
    if current_blog_id not in ids:
        return []

    if len(blogs) == 1:
        return []

    doc_tokens = [_tokenize(_blog_text(b)) for b in blogs]
    if not any(doc_tokens):
        return []

    vectors = _tfidf_vectors(doc_tokens)
    idx = ids.index(current_blog_id)
    current_vec = vectors[idx]

    ranked = sorted(
        (
            (i, _cosine(current_vec, vectors[i]))
            for i in range(len(blogs))
            if i != idx
        ),
        key=lambda x: x[1],
        reverse=True,
    )

    # Prefer positive similarity; if nothing overlaps, still return closest blogs.
    positive = [ids[i] for i, score in ranked if score > 0]
    if positive:
        return positive[:limit]
    return [ids[i] for i, _ in ranked[:limit]]
