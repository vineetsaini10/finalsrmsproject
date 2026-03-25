import io
import logging
import httpx
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import torch
from torchvision import transforms
from PIL import Image

from api.core.model_registry import get_classifier
from api.core.config import settings

router = APIRouter()
logger = logging.getLogger("swachhanet.classify")

TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])


def _run_inference(image_bytes: bytes) -> dict:
    model, labels = get_classifier()
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    tensor = TRANSFORM(img).unsqueeze(0)

    with torch.no_grad():
        logits = model(tensor)
        probs = torch.softmax(logits, dim=1)[0]

    top_idx = int(probs.argmax())
    confidence = float(probs[top_idx])
    all_scores = {lbl: round(float(p), 4) for lbl, p in zip(labels, probs)}

    return {
        "label": labels[top_idx],
        "confidence": round(confidence, 4),
        "reliable": confidence >= settings.CONFIDENCE_THRESHOLD,
        "all_scores": all_scores,
        "model_version": settings.MODEL_VERSION,
    }


@router.post("/classify")
async def classify_image(file: UploadFile = File(...)):
    """Classify waste type from an uploaded image file."""
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Only JPEG/PNG/WEBP images supported")

    image_bytes = await file.read()
    if len(image_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 5MB)")

    try:
        result = _run_inference(image_bytes)
        logger.info(f"Classified: {result['label']} ({result['confidence']:.2%})")
        return {"status": "ok", "result": result}
    except Exception as e:
        logger.error(f"Classification error: {e}")
        raise HTTPException(status_code=500, detail="Classification failed")


class URLRequest(BaseModel):
    image_url: str


@router.post("/classify-url")
async def classify_from_url(body: URLRequest):
    """Classify waste type from a remote image URL (used by async queue)."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(body.image_url)
            resp.raise_for_status()
            image_bytes = resp.content

        result = _run_inference(image_bytes)
        logger.info(f"Classified URL {body.image_url}: {result['label']}")
        return {"status": "ok", "result": result}
    except httpx.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch image: {e}")
    except Exception as e:
        logger.error(f"URL classification error: {e}")
        raise HTTPException(status_code=500, detail="Classification failed")
