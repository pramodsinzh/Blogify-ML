"""Shared text helpers for recommendation and category classification."""

import re
from html import unescape


def strip_html(html: str) -> str:
    if not html:
        return ""
    text = unescape(html)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def build_blog_text(title: str = "", subtitle: str = "", content: str = "") -> str:
    parts = [title or "", subtitle or "", strip_html(content or "")]
    return " ".join(p for p in parts if p).strip()
