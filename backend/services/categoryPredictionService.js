const ML_SERVICE_URL = (process.env.ML_SERVICE_URL || "http://localhost:8000").replace(/\/$/, "");

export const predictBlogCategory = async ({ title = "", content = "" }) => {
    const response = await fetch(`${ML_SERVICE_URL}/predict-category`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
    });

    const data = await response.json().catch(() => ({}));

    const detail = data.detail;
    const detailMessage =
        typeof detail === "string"
            ? detail
            : Array.isArray(detail)
              ? detail.map((d) => d.msg || JSON.stringify(d)).join(", ")
              : data.message;

    if (response.status === 503) {
        const err = new Error(detailMessage || "Category model is not trained yet.");
        err.code = "MODEL_NOT_TRAINED";
        throw err;
    }

    if (response.status === 400) {
        const err = new Error(detailMessage || "Not enough text to predict category.");
        err.code = "BAD_REQUEST";
        throw err;
    }

    if (!response.ok) {
        throw new Error(detailMessage || `ML service error (${response.status})`);
    }

    return {
        predictedCategory: data.predictedCategory,
        confidence: data.confidence,
        topPredictions: Array.isArray(data.topPredictions) ? data.topPredictions : [],
    };
};
