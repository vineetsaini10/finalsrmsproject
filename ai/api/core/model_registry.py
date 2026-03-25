import os
import logging
import torch
from torchvision import models

logger = logging.getLogger("swachhanet.models")

WASTE_LABELS = ["wet", "dry", "plastic", "hazardous", "mixed"]
_models: dict = {}


def load_models():
    """Load all ML models into memory at startup."""
    _load_classifier()


def _load_classifier():
    """Load EfficientNet-B3 waste classifier."""
    from api.core.config import settings

    model = models.efficientnet_b3(weights=None)
    model.classifier[1] = torch.nn.Linear(
        model.classifier[1].in_features, len(WASTE_LABELS)
    )

    weight_path = os.path.join(settings.MODEL_PATH, "waste_classifier.pth")
    if os.path.exists(weight_path):
        model.load_state_dict(torch.load(weight_path, map_location="cpu"))
        logger.info(f"Loaded classifier weights from {weight_path}")
    else:
        logger.warning(
            f"No weights found at {weight_path}. Using untrained model. "
            "Run training/train_classifier.py to train."
        )

    model.eval()
    _models["classifier"] = model
    _models["labels"] = WASTE_LABELS
    logger.info("Waste classifier ready.")


def get_classifier():
    if "classifier" not in _models:
        raise RuntimeError("Classifier not loaded. Call load_models() first.")
    return _models["classifier"], _models["labels"]
