# Blogify-ML

A full-stack blogging platform with **machine learning** built in: public reading, Clerk-authenticated authors, an admin dashboard, comments, newsletter signup, and contact. The stack is **React** + **Vite** on the frontend, **Express** + **MongoDB** on the backend, and a **Python FastAPI** service for recommendations and trained category prediction.

## Features

- **Public site** — Home, blog listing and detail pages, About, FAQs, and a contact form.
- **Authors (Clerk)** — Sign in to submit posts (`/add-blog`), manage “My Blogs,” and comment on posts.
- **Admin dashboard** — `/admin` for managing posts, comments, and newsletter subscribers. Access requires a signed-in Clerk user whose email matches `ADMIN_EMAIL` in the backend env (legacy JWT admin login is also supported).
- **Rich editing** — Quill editor, Markdown rendering, image uploads via ImageKit.
- **AI-assisted writing** — Optional Google Gemini integration for content generation.
- **ML recommendations** — Content-based “You might also like” suggestions (TF-IDF + cosine similarity).
- **Trained category classifier** — Logistic Regression model trained on your MongoDB blogs; suggests category while writing (see [ml-service/README.md](ml-service/README.md)).
- **Email & automation** — Nodemailer for transactional mail; **Inngest** for workflows (Clerk user sync, blog notifications) when configured.

## Architecture

```text
Browser (React / Vite)
       │
       ▼
Express API (MongoDB, Clerk, Inngest)
       │
       └── HTTP ──► FastAPI ml-service (recommendations + category model)
```

| Layer | Technologies |
|--------|----------------|
| **Frontend** | React 19, Vite 7, React Router 7, Tailwind CSS 4, Axios, Clerk, Quill, Motion |
| **Backend** | Express 5, Mongoose (MongoDB), Clerk, Multer, JWT, Inngest, Nodemailer, ImageKit, Gemini |
| **ML service** | Python, FastAPI, scikit-learn, TF-IDF, Logistic Regression |
| **Monorepo** | Root `package.json` with `concurrently` to run frontend + backend together |

## Prerequisites

- **Node.js** (LTS recommended) and **npm**
- **MongoDB** — local or [MongoDB Atlas](https://www.mongodb.com/atlas)
- **Python 3.12+** — only if you run or train the ML service locally
- **Clerk** account — create a **new** Clerk application for Blogify-ML (do not reuse an old Blogify app)

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/pramodsinzh/Blogify.git
cd Blogify-ML
npm run setup
```

`npm run setup` installs root, frontend, and backend dependencies. You can also install manually:

```bash
npm install
npm install --prefix frontend
npm install --prefix backend
```

### 2. Environment variables

**Backend** — copy the example and fill in your values:

```bash
cp backend/.env.example backend/.env
```

Key variables in `backend/.env`:

| Variable | Purpose |
|----------|---------|
| `PORT` | API port (default `3001`) |
| `MONGODB_URI` | MongoDB connection string (without db name) |
| `MONGODB_DB_NAME` | Database name (default `blogify-ml`) |
| `CLERK_SECRET_KEY` / `CLERK_PUBLISHABLE_KEY` | Clerk backend auth |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin identity and legacy JWT login |
| `JWT_SECRET` | Signs legacy admin JWT tokens |
| `ML_SERVICE_URL` | FastAPI base URL (e.g. `http://localhost:8000`) |
| `GEMINI_API_KEY` | Optional — AI content generation |
| `IMAGEKIT_*` | Optional — image uploads |
| `SMTP_*` / `SENDER_EMAIL` | Optional — transactional email |
| `INNGEST_*` | Optional — background jobs |
| `FRONTEND_URL` | Used in emails and Inngest links |

**Frontend** — create `frontend/.env`:

```bash
cp frontend/.env.example frontend/.env
```

| Variable | Purpose |
|----------|---------|
| `VITE_BASE_URL` | Backend API URL (e.g. `http://localhost:3001`) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key for the React app |

### 3. Run the app

From the **project root**:

| Command | Description |
|---------|-------------|
| `npm run project` | Frontend + backend together (recommended for local dev) |
| `npm run dev:frontend` | Vite dev server only (`http://localhost:5173`) |
| `npm run server:backend` | Express API with nodemon (`http://localhost:3001`) |
| `npm run start:frontend` | Production build preview |
| `npm run start:backend` | Run backend without nodemon |

### 4. ML service (optional but recommended)

Train the category model on your MongoDB blogs, then start the API:

```bash
cd ml-service
python -m venv .venv

# Windows
.\.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
python train_model.py
```

From the repo root you can also use:

| Command | Description |
|---------|-------------|
| `npm run ml:train` | Train category model (Windows venv path) |
| `npm run ml:serve` | Start FastAPI on port 8000 with reload |

Or run directly:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Set `ML_SERVICE_URL=http://localhost:8000` in `backend/.env`. Health check: `GET http://localhost:8000/health`.

Full ML docs: [ml-service/README.md](ml-service/README.md).

## Project structure

```text
Blogify-ML/
├── frontend/       # Vite + React app (public pages, admin UI)
├── backend/        # Express API, models, routes, Inngest functions
├── ml-service/     # Python FastAPI — recommendations + category classifier
├── package.json    # Root scripts (concurrently, ML helpers)
└── README.md
```

## API overview

| Route | Description |
|-------|-------------|
| `GET /blog/all` | List published blogs |
| `GET /blog/:id` | Single blog |
| `GET /blog/:blogId/recommendations` | ML “You might also like” |
| `POST /blog/predict-category` | AI category suggestion |
| `POST /blog/add-user` | Create blog (Clerk auth) |
| `GET /blog/my-blogs` | Author’s blogs (Clerk auth) |
| `POST /blog/add-comment` | Add comment (Clerk auth) |
| `POST /admin/login` | Legacy admin JWT login |
| `GET /admin/is-admin` | Check if Clerk user is admin |
| `POST /subscription` | Newsletter signup |
| `POST /contact` | Contact form |

Admin routes under `/admin/*` (except `/login`) require auth via Clerk (email = `ADMIN_EMAIL`) or a valid legacy JWT.

## Deployment

Typical production layout:

```text
Browser → Vercel (React frontend)
              ↓
         Vercel (Express backend)  ──HTTP──►  Render (FastAPI ml-service)
              ↓
           MongoDB Atlas
```

| Component | Platform | Notes |
|-----------|----------|-------|
| Frontend | [Vercel](https://vercel.com) | `frontend/vercel.json` — SPA rewrites |
| Backend | [Vercel](https://vercel.com) | `backend/vercel.json` — Node serverless |
| ML service | [Render](https://render.com) | Python + scikit-learn; commit trained `.pkl` files |

Set `ML_SERVICE_URL` on the **backend** Vercel project to your Render service URL. Step-by-step: [ml-service/DEPLOY_RENDER.md](ml-service/DEPLOY_RENDER.md).

## Contributing

1. Fork the repository.
2. Create a branch for your feature or fix.
3. Commit and push your changes.
4. Open a pull request with a clear description of what changed and why.

## License

This project is licensed under the **ISC** license (see `package.json`).
