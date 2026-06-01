import Blog from "../models/blog.model.js";

const ML_SERVICE_URL = (process.env.ML_SERVICE_URL || "http://localhost:8000").replace(/\/$/, "");

const toMlBlog = (blog) => ({
    _id: blog._id.toString(),
    title: blog.title,
    subTitle: blog.subTitle,
    category: blog.category,
    description: blog.description,
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
    const published = await Blog.find({ isPublished: true }).lean();
    const safeLimit = Math.max(1, Math.min(Number(limit) || 4, 20));

    if (published.length < 2) {
        return categoryFallback(published, currentBlogId, safeLimit);
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

        if (!ids.length) {
            return categoryFallback(published, currentBlogId, safeLimit);
        }

        const byId = new Map(published.map((b) => [b._id.toString(), b]));
        const recommended = ids.map((id) => byId.get(String(id))).filter(Boolean);

        if (recommended.length) {
            return recommended;
        }

        return categoryFallback(published, currentBlogId, safeLimit);
    } catch (error) {
        console.error("Recommendation service unavailable:", error.message);
        return categoryFallback(published, currentBlogId, safeLimit);
    }
};
