from fastapi import APIRouter
from datetime import datetime
import torch

router = APIRouter()


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "swachhanet-ai",
        "timestamp": datetime.utcnow().isoformat(),
        "torch_version": torch.__version__,
        "cuda_available": torch.cuda.is_available(),
    }
