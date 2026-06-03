# Deploy ML service on Render (Vercel frontend + backend)

Vercel runs Node.js well; **Python + scikit-learn** belongs on **Render** (or Railway, Fly.io). Your Express API on Vercel calls Render over HTTP.

```text
Browser → Vercel (React)
              ↓
         Vercel (Express)  ──HTTP──►  Render (FastAPI ml-service)
              ↓
           MongoDB Atlas
```

---

## Before you deploy

### 1. Commit trained model files

Render needs these in Git (they are **not** rebuilt on the server):

- `ml-service/models/model.pkl`
- `ml-service/models/vectorizer.pkl`
- `ml-service/models/label_encoder.pkl`

Train locally if missing:

```bash
cd ml-service
.\.venv\Scripts\activate
python train_model.py
git add models/*.pkl
git commit -m "Add trained category model artifacts for production"
git push
```

### 2. Push code to GitHub

Render deploys from your repo (same repo as Vercel is fine).

---

## Create the Render Web Service

1. Go to [https://dashboard.render.com](https://dashboard.render.com) → **New +** → **Web Service**.
2. Connect your **Blogify-ML** GitHub repo.
3. Settings:

| Field | Value |
|--------|--------|
| **Name** | `blogify-ml` (or any name) |
| **Region** | Same region as MongoDB if possible |
| **Root Directory** | `ml-service` |
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r requirements-prod.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Instance type** | Free works for demos (cold starts ~50s) |

4. **Advanced** → Health Check Path: `/health`
5. Click **Create Web Service**.

When deploy finishes, open:

`https://YOUR-SERVICE-NAME.onrender.com/health`

You should see:

```json
{"status":"ok","recommendations":true,"categoryModelTrained":true}
```

If `categoryModelTrained` is `false`, the `.pkl` files were not deployed — commit them and redeploy.

---

## Connect Vercel backend

In **Vercel** → your **backend** project → **Settings** → **Environment Variables**:

| Key | Value |
|-----|--------|
| `ML_SERVICE_URL` | `https://YOUR-SERVICE-NAME.onrender.com` |

No trailing slash. Apply to **Production** (and Preview if you want).

**Redeploy** the backend on Vercel after saving the variable.

The backend already uses `ML_SERVICE_URL` in:

- `backend/services/recommendationService.js`
- `backend/services/categoryPredictionService.js`

---

## Test production

1. `GET https://YOUR-BACKEND.vercel.app/blog/all` — blogs load.
2. Open a blog page — “You might also like” (recommendations).
3. Add blog — AI category suggestions after typing.

First ML request after idle may be slow on **Render Free** (service wakes up).

---

## Optional: Blueprint deploy

Repo includes `ml-service/render.yaml`. In Render: **New +** → **Blueprint** → select repo (may need `render.yaml` at repo root; if not detected, use manual steps above).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build fails on `scikit-learn` | Use `runtime.txt` (`python-3.12.7`) and `requirements-prod.txt` |
| `categoryModelTrained: false` | Commit `models/*.pkl` and redeploy |
| Vercel recommendations empty | Set `ML_SERVICE_URL` on **backend** project, redeploy |
| 503 from backend | Render URL wrong, or ML service sleeping (retry) |
| CORS errors in browser | Should not happen — only backend calls ML, not the browser |

---

## Why not Vercel for ml-service?

Vercel serverless is built for Node/Python short functions, not long-running APIs with large ML libraries and `.pkl` files in memory. Render runs a persistent Python web process, which fits FastAPI + scikit-learn.
