# SwachhaNet — Digital Brain for Waste Management

A full-stack AI-powered Waste Management System for Indian Urban Local Bodies (ULBs).
**Database: MongoDB** (Mongoose ODM on backend, PyMongo on AI service)

## Project Structure

```
swachhanet/
├── frontend/        # React.js + Next.js (Citizen & Authority Dashboards)
├── backend/         # Node.js + Express + Mongoose (MongoDB ODM)
└── ai/              # Python FastAPI + PyMongo + ML Models
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
Everything starts automatically — MongoDB, Redis, Backend, AI, Frontend.

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
cd ai
cp .env.example .env
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8001
```

**MongoDB** (no migration needed — Mongoose creates collections automatically):
```bash
# Install MongoDB Community 7.0 from https://www.mongodb.com/try/download/community
# Default connection: mongodb://localhost:27017/swachhanet
```

## Services & Ports
| Service   | Port  | Description                          |
|-----------|-------|--------------------------------------|
| Frontend  | 3000  | Next.js web app                      |
| Backend   | 5000  | Node.js REST API                     |
| AI        | 8001  | FastAPI ML service                   |
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
- **Database:**  **MongoDB 7.0** — documents, embedded subdocs, geo indexes (2dsphere)
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
