from __future__ import annotations

import argparse
import copy
import math
import os
import random
from pathlib import Path
from typing import Dict, List, Tuple

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Subset
from torchvision import datasets, models, transforms


BASE_DIR = Path(__file__).resolve().parents[1]
PROCESSED_DIR = BASE_DIR / "data" / "processed"
MODEL_DIR = BASE_DIR / "models" / "waste_classifier"
MODEL_PATH = MODEL_DIR / "model.pth"
LEGACY_MODEL_PATH = MODEL_DIR / "best_model.pth"
TORCH_CACHE_DIR = BASE_DIR / ".cache" / "torch"
IMAGE_SIZE = (224, 224)
NORM_MEAN = [0.485, 0.456, 0.406]
NORM_STD = [0.229, 0.224, 0.225]
EXPECTED_CLASSES = {"wet", "dry", "plastic", "hazardous"}


def split_indices(n: int, train_ratio: float, seed: int) -> Tuple[List[int], List[int]]:
    idx = list(range(n))
    rng = random.Random(seed)
    rng.shuffle(idx)
    train_count = max(1, int(math.floor(n * train_ratio)))
    train_idx = idx[:train_count]
    val_idx = idx[train_count:]
    if not val_idx:
        val_idx = idx[-1:]
        train_idx = idx[:-1]
    return train_idx, val_idx


def make_dataloaders(batch_size: int, seed: int) -> Tuple[DataLoader, DataLoader, List[str]]:
    if not PROCESSED_DIR.exists():
        raise FileNotFoundError(f"Processed dataset not found at {PROCESSED_DIR}")

    train_tf = transforms.Compose([
        transforms.Resize(IMAGE_SIZE),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize(mean=NORM_MEAN, std=NORM_STD),
    ])
    val_tf = transforms.Compose([
        transforms.Resize(IMAGE_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(mean=NORM_MEAN, std=NORM_STD),
    ])

    base = datasets.ImageFolder(PROCESSED_DIR)
    if len(base) < 2:
        raise RuntimeError("Dataset is too small to split into train/validation.")
    if set(base.classes) != EXPECTED_CLASSES:
        raise RuntimeError(
            f"Unexpected classes in processed dataset: {base.classes}. "
            f"Expected exactly: {sorted(EXPECTED_CLASSES)}"
        )

    train_idx, val_idx = split_indices(len(base), train_ratio=0.8, seed=seed)
    train_ds = Subset(datasets.ImageFolder(PROCESSED_DIR, transform=train_tf), train_idx)
    val_ds = Subset(datasets.ImageFolder(PROCESSED_DIR, transform=val_tf), val_idx)

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=0)
    return train_loader, val_loader, base.classes


def build_model(num_classes: int, freeze_backbone: bool) -> nn.Module:
    TORCH_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault("TORCH_HOME", str(TORCH_CACHE_DIR.resolve()))
    try:
        weights = models.MobileNet_V2_Weights.DEFAULT
        model = models.mobilenet_v2(weights=weights)
    except Exception as exc:
        raise RuntimeError(
            "Failed to load MobileNetV2 pretrained weights for transfer learning. "
            "Check network/cache permissions and rerun."
        ) from exc
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    if freeze_backbone:
        for name, param in model.named_parameters():
            if not name.startswith("classifier.1"):
                param.requires_grad = False
    return model


def run_epoch(model: nn.Module, loader: DataLoader, criterion: nn.Module, optimizer, device: torch.device, train: bool):
    if train:
        model.train()
    else:
        model.eval()

    total_loss = 0.0
    total_correct = 0
    total_count = 0

    for images, labels in loader:
        images = images.to(device)
        labels = labels.to(device)

        if train:
            optimizer.zero_grad()

        with torch.set_grad_enabled(train):
            logits = model(images)
            loss = criterion(logits, labels)
            preds = torch.argmax(logits, dim=1)
            if train:
                loss.backward()
                optimizer.step()

        total_loss += loss.item() * images.size(0)
        total_correct += (preds == labels).sum().item()
        total_count += images.size(0)

    avg_loss = total_loss / max(1, total_count)
    avg_acc = total_correct / max(1, total_count)
    return avg_loss, avg_acc


def train(epochs: int, batch_size: int, lr: float, seed: int, freeze_backbone: bool) -> Dict:
    torch.manual_seed(seed)
    random.seed(seed)

    train_loader, val_loader, class_names = make_dataloaders(batch_size=batch_size, seed=seed)
    print(f"[INFO] dataset.classes={class_names}")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = build_model(num_classes=len(class_names), freeze_backbone=freeze_backbone).to(device)
    criterion = nn.CrossEntropyLoss()
    trainable_params = [p for p in model.parameters() if p.requires_grad]
    optimizer = optim.Adam(trainable_params, lr=lr)

    best_val_acc = -1.0
    best_state = None

    for epoch in range(1, epochs + 1):
        train_loss, train_acc = run_epoch(model, train_loader, criterion, optimizer, device, train=True)
        val_loss, val_acc = run_epoch(model, val_loader, criterion, optimizer, device, train=False)
        print(
            f"[EPOCH {epoch}/{epochs}] "
            f"train_loss={train_loss:.4f} train_acc={train_acc:.4f} "
            f"val_loss={val_loss:.4f} val_acc={val_acc:.4f}"
        )
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_state = copy.deepcopy(model.state_dict())

    if best_state is None:
        raise RuntimeError("Training failed: best model state was not captured.")

    checkpoint = {
        "model_state_dict": best_state,
        "class_names": class_names,
        "image_size": list(IMAGE_SIZE),
        "norm_mean": NORM_MEAN,
        "norm_std": NORM_STD,
        "architecture": "mobilenet_v2",
        "frozen_backbone": freeze_backbone,
        "num_classes": len(class_names),
        "best_val_accuracy": round(float(best_val_acc), 6),
    }
    return checkpoint


def save_checkpoint(checkpoint: Dict) -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    torch.save(checkpoint, MODEL_PATH)
    # Keep compatibility with existing default path.
    torch.save(checkpoint, LEGACY_MODEL_PATH)
    print(f"[DONE] Saved model: {MODEL_PATH}")
    print(f"[DONE] Saved model (compat): {LEGACY_MODEL_PATH}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Train waste classifier model from processed dataset.")
    parser.add_argument("--epochs", type=int, default=8)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=0.001)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--unfreeze-backbone",
        action="store_true",
        help="Train full backbone as well; default keeps transfer-learning backbone frozen for faster training.",
    )
    args = parser.parse_args()

    try:
        checkpoint = train(
            epochs=args.epochs,
            batch_size=args.batch_size,
            lr=args.lr,
            seed=args.seed,
            freeze_backbone=not args.unfreeze_backbone,
        )
        save_checkpoint(checkpoint)
        print(f"[INFO] best_val_accuracy={checkpoint['best_val_accuracy']}")
    except Exception as exc:
        raise RuntimeError(f"Model training failed: {exc}") from exc


if __name__ == "__main__":
    main()
