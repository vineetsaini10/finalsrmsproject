import os
import sys
from pathlib import Path
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms
from torch.utils.data import DataLoader

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from models.waste_classifier.model import get_model
from utils.config_loader import load_config, resolve_from_base
from utils.logger import get_logger

logger = get_logger(__name__)

def train_model(data_dir: str, epochs: int = 10, batch_size: int = 32, lr: float = 0.001):
    """
    Trains the WasteClassifier on a provided dataset directory.
    Assumes standard ImageFolder structure (data/train/class_name/...)
    """
    try:
        config = load_config()
    except Exception as e:
        logger.warning(f"Failed to load config, using defaults: {e}")
        config = {'classifier': {'classes': ['wet', 'dry', 'plastic', 'hazardous'], 'image_size': [224, 224]}}

    classifier_cfg = config.get('classifier', {})
    classes = classifier_cfg.get('classes', ['wet', 'dry', 'plastic', 'hazardous'])
    image_size = tuple(classifier_cfg.get('image_size', [224, 224]))
    norm_mean = classifier_cfg.get('norm_mean', [0.485, 0.456, 0.406])
    norm_std = classifier_cfg.get('norm_std', [0.229, 0.224, 0.225])
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Using device: {device}")
    
    # 1. Prepare Data
    train_dir = os.path.join(data_dir, 'train')
    val_dir = os.path.join(data_dir, 'val')
    
    if not os.path.exists(train_dir) or not os.path.exists(val_dir):
        logger.error(f"Training dataset not found at {data_dir}. Expected data/train and data/val folders.")
        return
        
    transform_train = transforms.Compose([
        transforms.Resize(image_size),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ToTensor(),
        transforms.Normalize(mean=norm_mean, std=norm_std),
    ])
    
    transform_val = transforms.Compose([
        transforms.Resize(image_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=norm_mean, std=norm_std),
    ])
    
    train_dataset = datasets.ImageFolder(train_dir, transform=transform_train)
    val_dataset = datasets.ImageFolder(val_dir, transform=transform_val)

    if len(train_dataset) == 0 or len(val_dataset) == 0:
        logger.error("Train/val datasets are empty after loading ImageFolder.")
        return

    # Keep model class count aligned with actual dataset folders.
    classes = train_dataset.classes
    if classes != val_dataset.classes:
        logger.error("Train and val class folders do not match.")
        return

    num_workers = 0 if os.name == "nt" else min(4, os.cpu_count() or 1)
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=num_workers)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=num_workers)
    
    # 2. Initialize Model
    model = get_model(num_classes=len(classes), pretrained=True)
    model.to(device)
    
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)
    
    best_acc = 0.0
    model_save_path = resolve_from_base(
        config.get('model_paths', {}).get('waste_classifier', 'models/waste_classifier/model.pth')
    )
    
    # 3. Training Loop
    logger.info(f"Starting training for {epochs} epochs...")
    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        corrects = 0
        
        for inputs, labels in train_loader:
            inputs, labels = inputs.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            
            _, preds = torch.max(outputs, 1)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * inputs.size(0)
            corrects += torch.sum(preds == labels.data)
            
        epoch_loss = running_loss / len(train_dataset)
        epoch_acc = corrects.double() / len(train_dataset)
        
        # Validation
        model.eval()
        val_loss, val_corrects = 0.0, 0
        with torch.no_grad():
            for inputs, labels in val_loader:
                inputs, labels = inputs.to(device), labels.to(device)
                outputs = model(inputs)
                loss = criterion(outputs, labels)
                
                _, preds = torch.max(outputs, 1)
                val_loss += loss.item() * inputs.size(0)
                val_corrects += torch.sum(preds == labels.data)
                
        val_loss = val_loss / len(val_dataset)
        val_acc = val_corrects.double() / len(val_dataset)
        
        logger.info(f"Epoch {epoch+1}/{epochs} - Train Loss: {epoch_loss:.4f} Acc: {epoch_acc:.4f} "
                    f"- Val Loss: {val_loss:.4f} Acc: {val_acc:.4f}")
        
        # Save best model
        if val_acc > best_acc:
            best_acc = val_acc
            
            # Ensure folder exists
            os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
            checkpoint = {
                "model_state_dict": model.state_dict(),
                "class_names": classes,
                "image_size": list(image_size),
                "norm_mean": list(norm_mean),
                "norm_std": list(norm_std),
            }
            torch.save(checkpoint, model_save_path)
            logger.info(f"Model saved to {model_save_path} with Acc: {best_acc:.4f}")
            
    logger.info("Training complete.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--data",
        type=str,
        default=str(BASE_DIR / "data" / "processed"),
        help="Path to data directory (default: aiml/data/processed)",
    )
    parser.add_argument("--epochs", type=int, default=10, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    parser.add_argument("--lr", type=float, default=0.001, help="Learning rate")
    args = parser.parse_args()
    
    train_model(data_dir=args.data, epochs=args.epochs, batch_size=args.batch_size, lr=args.lr)
