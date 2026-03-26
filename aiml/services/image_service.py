import torch
from pathlib import Path
from torchvision import transforms
from PIL import Image
import io
from models.waste_classifier.model import get_model
from utils.config_loader import load_config, resolve_from_base
from utils.logger import get_logger

logger = get_logger(__name__)

try:
    config = load_config()
except Exception as e:
    logger.error(f"Failed to load configuration: {e}")
    config = {}

class ImageClassificationService:
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        classifier_config = config.get('classifier', {})
        self.classes = classifier_config.get('classes', ["wet", "dry", "plastic", "hazardous"])
        self.image_size = tuple(classifier_config.get('image_size', [224, 224]))
        self.confidence_threshold = classifier_config.get('confidence_threshold', 0.60)
        
        # Define image transforms
        self.transform = transforms.Compose([
            transforms.Resize(self.image_size),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        
        # Load model lazily
        self.model = None

    def _load_model(self):
        if self.model is None:
            model_path = resolve_from_base(config.get('model_paths', {}).get('waste_classifier'))
            if not model_path or not Path(model_path).exists():
                raise FileNotFoundError(
                    "Waste classifier weights not found. Train the model or place weights at "
                    "aiml/models/waste_classifier/best_model.pth"
                )
            try:
                self.model = get_model(num_classes=len(self.classes), model_path=model_path)
                self.model.to(self.device)
                self.model.eval()
                logger.info("Waste classifier model loaded for inference.")
            except Exception as e:
                logger.error(f"Failed to load model from {model_path}: {e}")
                raise RuntimeError(f"Failed to load waste classifier model: {e}") from e

    def process_image(self, image_bytes: bytes):
        """Preprocesses the image bytes for the model."""
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            return self.transform(image).unsqueeze(0).to(self.device)
        except Exception as e:
            logger.error(f"Error in image preprocessing: {e}")
            raise ValueError("Invalid image format.")

    def predict(self, image_bytes: bytes) -> dict:
        """Runs inference on the provided image bytes."""
        self._load_model()
        
        input_tensor = self.process_image(image_bytes)
        
        with torch.no_grad():
            outputs = self.model(input_tensor)
            probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
            
            top_prob, top_class_idx = torch.max(probabilities, 0)
            
            confidence = top_prob.item()
            predicted_class = self.classes[top_class_idx.item()]
            
            result = {
                "class": predicted_class,
                "confidence": round(confidence, 4),
                "is_confident": confidence >= self.confidence_threshold,
                "probabilities": {cls: round(prob.item(), 4) for cls, prob in zip(self.classes, probabilities)}
            }
            
            logger.info(f"Inference complete: {result['class']} ({result['confidence']*100:.2f}%)")
            return result

# Singleton instance
image_service = ImageClassificationService()
