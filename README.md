# SwachhaNet â€” Digital Brain for Waste Management

## ðŸš€ Quick Start (Windows)
To run the entire system (AI, Backend, and Frontend):
1. Ensure both **Python 3.10+** and **Node.js 18+** are installed and added to your **System PATH**.
2. Double-click **`run_all.bat`** in the root directory.
3. Three command prompt windows will open. Wait for dependencies to install (this may take a few minutes on first run).
4. Once all three are running, navigate to `http://localhost:3000/ai-dashboard`.

### Troubleshooting Windows Setup
- **Python errors?** Ensure you have the [latest Python](https://www.python.org/downloads/) installed.
- **Node errors?** Make sure you have [Node.js](https://nodejs.org/) installed.
- **Port conflicts?** If a service fails to start, check if port 8000, 5000, or 3000 is occupied.

---

A full-stack AI-powered Waste Management System for Indian Urban Local Bodies (ULBs).

## Project Structure

```
swachhanet/
â”œâ”€â”€ frontend/        # React.js + Next.js (Citizen & Authority Dashboards)
â”œâ”€â”€ backend/         # Node.js + Express + Mongoose (MongoDB ODM)
â””â”€â”€ aiml/            # Python FastAPI + ML Models
```

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB 7.0
- Redis 7+
- Docker & Docker Compose (recommended)

### 1. Start with Docker (Recommended)
```bash
docker-compose up --build
```
Everything starts automatically â€” MongoDB, Redis, Backend, AI, Frontend.

### 2. Manual Setup

**Backend:**
```bash
cd backend
cp .env.example .env        # edit MONGODB_URI if needed
npm install
npm run seed                # seeds demo data into MongoDB
npm run dev
```

**Frontend:**
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

**AI Service:**
```bash
cd aiml
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**MongoDB** (no migration needed â€” Mongoose creates collections automatically):
```bash
# Install MongoDB Community 7.0 from https://www.mongodb.com/try/download/community
# Default connection: mongodb://localhost:27017/swachhanet
```

### 3. Smoke Test (Recommended)
Run the end-to-end smoke test that verifies:
1. AI image prediction
2. Hotspot detection
3. Trend prediction
4. Auth + complaint submission/list flow

From project root:
```bash
powershell -ExecutionPolicy Bypass -File scripts/smoke-test.ps1
```

Or from service folders:
```bash
# backend/
npm run smoke

# frontend/
npm run smoke
```

### 4. Production Deployment (Hardened)
1. Create a root `.env` file with strong secrets:
```bash
JWT_SECRET=replace_with_strong_secret
JWT_REFRESH_SECRET=replace_with_strong_refresh_secret
NEXT_PUBLIC_MAPBOX_TOKEN=replace_with_mapbox_token
```

2. Build and run the hardened production stack:
```bash
docker compose -f docker-compose.prod.yml up -d --build
# or use automated pre-checked deploy
powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1 -RunSmoke
```

3. Verify health:
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

Production hardening included:
- Container `HEALTHCHECK` for `frontend`, `backend`, `aiml`, `mongodb`, `redis`
- `restart: unless-stopped`
- Non-root runtime users in app containers
- Backend production env validation (fails fast on missing/weak JWT secrets)
- Dedicated production compose file without dev bind mounts

## Services & Ports
| Service   | Port  | Description                          |
|-----------|-------|--------------------------------------|
| Frontend  | 3000  | Next.js web app                      |
| Backend   | 5000  | Node.js REST API                     |
| AI        | 8000  | FastAPI ML service                   |
| MongoDB   | 27017 | Primary database (no auth in dev)    |
| Redis     | 6379  | Cache & message queue                |

## Demo Credentials (after running seed)
| Role      | Phone          | Password      |
|-----------|----------------|---------------|
| Citizen   | +919876543210  | citizen123    |
| Authority | +919876543211  | authority123  |

## Tech Stack
- **Frontend:**  Next.js 14, React 18, Tailwind CSS, Mapbox GL, Chart.js, Zustand, React Query
- **Backend:**   Node.js, Express.js, **Mongoose (MongoDB ODM)**, Redis, JWT, Multer, Bull
- **AI:**        FastAPI, PyTorch EfficientNet-B3, Scikit-learn DBSCAN, **PyMongo**, LSTM forecasting
- **Database:**  **MongoDB 7.0** â€” documents, embedded subdocs, geo indexes (2dsphere)
- **Cloud:**     AWS (ECS Fargate, **DocumentDB** or Atlas, ElastiCache, S3), Cloudflare CDN
- **Maps:**      Mapbox GL JS + Google Maps Geocoding API

## MongoDB Collections
| Collection      | Description                                           |
|-----------------|-------------------------------------------------------|
| users           | Citizens, authorities, admins, workers                |
| wards           | ULB ward boundaries with 2dsphere geo index           |
| complaints      | Reports with embedded aiResult + assignments array    |
| workers         | Waste collection workers with live location           |
| hotspots        | AI-detected high-waste clusters                       |
| gamification    | Points, badges, levels per citizen                    |
| trainingmodules | Learning content modules                              |
| quizattempts    | Quiz submission records                               |
| notifications   | In-app notifications with TTL auto-cleanup            |
| refreshtokens   | JWT refresh tokens with TTL index auto-expiry         |

## Key MongoDB Design Decisions
- **Embedded documents:** AI results and assignment history are embedded inside complaints (avoids joins, fast reads)
- **2dsphere indexes:** on `location` field in complaints, wards, workers for geospatial queries
- **TTL indexes:** on `refreshtokens.expiresAt` for automatic token cleanup
- **$addToSet:** used in gamification to prevent duplicate badge awards
- **Aggregation pipelines:** used in reports for grouping, counting, and trend analysis


