from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from api.routes import classify, predict, hotspots, health
from api.core.config import settings
from api.core.model_registry import load_models

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("swachhanet.ai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading ML models...")
    load_models()
    logger.info("Models loaded. AI service ready.")
    yield
    logger.info("Shutting down AI service.")


app = FastAPI(
    title="SwachhaNet AI Service",
    description="Waste classification, hotspot detection & predictive analytics",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router,    prefix="/api/v1", tags=["Health"])
app.include_router(classify.router,  prefix="/api/v1", tags=["Classification"])
app.include_router(hotspots.router,  prefix="/api/v1", tags=["Hotspots"])
app.include_router(predict.router,   prefix="/api/v1", tags=["Predictions"])
