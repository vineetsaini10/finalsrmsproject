import torch
import torch.nn as nn
from torchvision import models
from utils.logger import get_logger

logger = get_logger(__name__)

class WasteClassifier(nn.Module):
    def __init__(self, num_classes=4, pretrained=True):
        """
        Initializes the WasteClassifier using MobileNetV2 transfer learning.
        """
        super(WasteClassifier, self).__init__()
        
        # Load pre-trained MobileNetV2 model
        if pretrained:
            weights = models.MobileNet_V2_Weights.DEFAULT
            self.model = models.mobilenet_v2(weights=weights)
        else:
            self.model = models.mobilenet_v2(weights=None)
            
        # Freeze all layers except the final classification layer
        for param in self.model.parameters():
            if pretrained:
                param.requires_grad = False
                
        # Replace the final fully connected layer
        num_ftrs = self.model.classifier[1].in_features
        self.model.classifier[1] = nn.Sequential(
            nn.Dropout(p=0.5, inplace=False),
            nn.Linear(num_ftrs, num_classes)
        )
        logger.info(f"Initialized WasteClassifier with {num_classes} classes.")

    def forward(self, x):
        return self.model(x)

def get_model(num_classes=4, model_path=None, pretrained=False):
    """
    Returns an initialized model, optionally loading weights.
    """
    model = WasteClassifier(num_classes=num_classes, pretrained=pretrained)
    
    if model_path and torch.cuda.is_available():
        # Load to GPU if available
        model.load_state_dict(torch.load(model_path))
        logger.info(f"Loaded weights from {model_path} to CUDA.")
    elif model_path:
        # Load to CPU
        model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
        logger.info(f"Loaded weights from {model_path} to CPU.")
        
    return model
