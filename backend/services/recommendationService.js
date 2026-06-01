import Blog from "../models/blog.model.js";

const ML_SERVICE_URL = (process.env.ML_SERVICE_URL || "http://localhost:8000").replace(/\/$/, "");

// Simple in-memory cache so repeated views don't hammer the ML service.
// Keyed by `currentBlogId|limit` and expires automatically.
const cache = new Map(); // Map<string, { expiresAt: number, blogs: any[] }>
const _ttl = Number(process.env.RECOMMEND_CACHE_TTL_MS);
const CACHE_TTL_MS = Number.isFinite(_ttl) && _ttl > 0 ? _ttl : 5 * 60 * 1000; // 5 minutes

const toMlBlog = (blog) => ({
    _id: blog._id.toString(),
    title: blog.title,
    subTitle: blog.subTitle,
    category: blog.category,
    // Keep payload smaller so TF-IDF runs faster and requests are less likely to time out.
    description: (blog.description || "").slice(0, 4000),
});

const categoryFallback = (blogs, currentBlogId, limit) => {
    const current = blogs.find((b) => b._id.toString() === currentBlogId);
    const others = blogs.filter((b) => b._id.toString() !== currentBlogId);

    if (current?.category) {
        const sameCategory = others.filter((b) => b.category === current.category);
        if (sameCategory.length) {
            return sameCategory.slice(0, limit);
        }
    }

    return others.slice(0, limit);
};

export const getRecommendedBlogs = async (currentBlogId, limit = 4) => {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 4, 20));
    const cacheKey = `${currentBlogId}|${safeLimit}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.blogs;
    }

    const published = await Blog.find({ isPublished: true }).lean();

    if (published.length < 2) {
        const fallback = categoryFallback(published, currentBlogId, safeLimit);
        cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, blogs: fallback });
        return fallback;
    }

    const payload = {
        current_blog_id: currentBlogId,
        limit: safeLimit,
        blogs: published.map(toMlBlog),
    };

    try {
        const response = await fetch(`${ML_SERVICE_URL}/recommend`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`ML service responded with ${response.status}`);
        }

        const data = await response.json();
        const ids = Array.isArray(data.recommended_ids) ? data.recommended_ids : [];

        const byId = new Map(published.map((b) => [b._id.toString(), b]));
        const recommended = ids.map((id) => byId.get(String(id))).filter(Boolean);

        // Fill the remaining slots with a deterministic category fallback
        // (this helps when ML returns fewer results for short/overlapping text).
        const missing = safeLimit - recommended.length;
        const filled =
            missing > 0
                ? [
                    ...recommended,
                    ...categoryFallback(published, currentBlogId, missing).filter(
                        (b) => !recommended.some((rb) => rb._id.toString() === b._id.toString())
                    ),
                  ]
                : recommended;

        const final = filled.slice(0, safeLimit);

        cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, blogs: final });
        return final;
    } catch (error) {
        console.error("Recommendation service unavailable:", error.message);
        const fallback = categoryFallback(published, currentBlogId, safeLimit);
        cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, blogs: fallback });
        return fallback;
    }
};
