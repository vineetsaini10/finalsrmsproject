"""
Train EfficientNet-B3 waste classifier on TrashNet + custom dataset.

Usage:
    python training/train_classifier.py \
        --data_dir ./data/waste_images \
        --epochs 30 \
        --batch_size 32 \
        --output_dir ./models/weights

Dataset structure expected:
    data/waste_images/
        train/
            wet/       *.jpg
            dry/       *.jpg
            plastic/   *.jpg
            hazardous/ *.jpg
            mixed/     *.jpg
        val/
            wet/  dry/  plastic/  hazardous/  mixed/
"""

import argparse
import os
import json
import logging
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("train_classifier")

LABELS = ["wet", "dry", "plastic", "hazardous", "mixed"]

TRAIN_TRANSFORM = transforms.Compose([
    transforms.RandomResizedCrop(224, scale=(0.7, 1.0)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomVerticalFlip(p=0.2),
    transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2, hue=0.1),
    transforms.RandomRotation(20),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

VAL_TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])


def build_model(num_classes: int, pretrained: bool = True) -> nn.Module:
    weights = models.EfficientNet_B3_Weights.IMAGENET1K_V1 if pretrained else None
    model = models.efficientnet_b3(weights=weights)

    # Freeze early layers, fine-tune last 2 blocks + classifier
    for name, param in model.named_parameters():
        if "features.0" in name or "features.1" in name or "features.2" in name:
            param.requires_grad = False

    model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
    return model


def train_one_epoch(model, loader, criterion, optimizer, device):
    model.train()
    total_loss, correct, total = 0.0, 0, 0
    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        total_loss += loss.item() * images.size(0)
        _, predicted = outputs.max(1)
        correct += predicted.eq(labels).sum().item()
        total += labels.size(0)

    return total_loss / total, 100.0 * correct / total


@torch.no_grad()
def evaluate(model, loader, criterion, device):
    model.eval()
    total_loss, correct, total = 0.0, 0, 0
    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)
        outputs = model(images)
        loss = criterion(outputs, labels)
        total_loss += loss.item() * images.size(0)
        _, predicted = outputs.max(1)
        correct += predicted.eq(labels).sum().item()
        total += labels.size(0)
    return total_loss / total, 100.0 * correct / total


def main(args):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Training on: {device}")

    train_dataset = datasets.ImageFolder(
        os.path.join(args.data_dir, "train"), transform=TRAIN_TRANSFORM
    )
    val_dataset = datasets.ImageFolder(
        os.path.join(args.data_dir, "val"), transform=VAL_TRANSFORM
    )
    logger.info(f"Train: {len(train_dataset)} | Val: {len(val_dataset)}")

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size,
                              shuffle=True, num_workers=4, pin_memory=True)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size,
                            shuffle=False, num_workers=4, pin_memory=True)

    model = build_model(num_classes=len(LABELS), pretrained=True).to(device)

    # Class-weighted loss for imbalanced datasets
    class_counts = [len(list(Path(args.data_dir, "train", lbl).glob("*")))
                    for lbl in LABELS]
    weights = torch.tensor([1.0 / c if c > 0 else 0.0 for c in class_counts]).to(device)
    criterion = nn.CrossEntropyLoss(weight=weights)

    optimizer = AdamW(filter(lambda p: p.requires_grad, model.parameters()),
                      lr=args.lr, weight_decay=1e-4)
    scheduler = CosineAnnealingLR(optimizer, T_max=args.epochs, eta_min=1e-6)

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    best_val_acc = 0.0
    history = []

    for epoch in range(1, args.epochs + 1):
        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc = evaluate(model, val_loader, criterion, device)
        scheduler.step()

        logger.info(
            f"Epoch {epoch:3d}/{args.epochs} | "
            f"Train Loss: {train_loss:.4f} Acc: {train_acc:.1f}% | "
            f"Val Loss: {val_loss:.4f} Acc: {val_acc:.1f}%"
        )
        history.append({"epoch": epoch, "train_loss": train_loss,
                        "train_acc": train_acc, "val_loss": val_loss, "val_acc": val_acc})

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), output_dir / "waste_classifier.pth")
            logger.info(f"  ✓ Saved best model (val_acc={val_acc:.1f}%)")

    # Save training metadata
    meta = {
        "labels": LABELS,
        "best_val_acc": best_val_acc,
        "epochs": args.epochs,
        "model": "efficientnet_b3",
        "history": history,
    }
    with open(output_dir / "classifier_meta.json", "w") as f:
        json.dump(meta, f, indent=2)

    logger.info(f"Training complete. Best val accuracy: {best_val_acc:.1f}%")
    logger.info(f"Weights saved to: {output_dir / 'waste_classifier.pth'}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train waste image classifier")
    parser.add_argument("--data_dir", default="./data/waste_images")
    parser.add_argument("--output_dir", default="./models/weights")
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch_size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-4)
    args = parser.parse_args()
    main(args)
