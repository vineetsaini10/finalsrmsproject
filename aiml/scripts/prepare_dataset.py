from __future__ import annotations

import argparse
import shutil
from pathlib import Path
from typing import Dict, List, Tuple

from PIL import Image, UnidentifiedImageError


RAW_ROOT = Path(__file__).resolve().parents[1] / "data" / "raw"
PROCESSED_ROOT = Path(__file__).resolve().parents[1] / "data" / "processed"

CLASS_MAPPING: Dict[str, str] = {
    "cardboard": "dry",
    "paper": "dry",
    "plastic": "plastic",
    "glass": "hazardous",
    "metal": "hazardous",
    "trash": "wet",
}
TARGET_CLASSES = ["wet", "dry", "plastic", "hazardous"]
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def reset_processed_dir(root: Path) -> None:
    if root.exists():
        shutil.rmtree(root)
    for cls in TARGET_CLASSES:
        (root / cls).mkdir(parents=True, exist_ok=True)


def infer_source_class(file_path: Path) -> str | None:
    for part in reversed(file_path.parts):
        key = part.strip().lower()
        # Direct class names from the expected mapping.
        for mapped_key in CLASS_MAPPING:
            if key == mapped_key:
                return mapped_key

        # Kaggle dataset has granular class folders; map by keyword.
        if "cardboard" in key or "paper" in key or "newspaper" in key or "magazine" in key:
            return "cardboard"  # -> dry
        if "plastic" in key or "styrofoam" in key:
            return "plastic"
        if "glass" in key:
            return "glass"
        if "metal" in key or "aluminum" in key or "steel" in key or "aerosol" in key:
            return "metal"
        if "trash" in key or "waste" in key or "coffee" in key or "egg" in key or "tea" in key:
            return "trash"
    return None


def is_valid_image(path: Path) -> bool:
    try:
        with Image.open(path) as img:
            img.verify()
        with Image.open(path) as img:
            img.convert("RGB")
        return True
    except (UnidentifiedImageError, OSError, ValueError):
        return False


def prepare(delete_corrupted: bool) -> Tuple[Dict[str, int], int, List[Path]]:
    if not RAW_ROOT.exists():
        raise FileNotFoundError(f"Raw dataset not found at {RAW_ROOT}")

    reset_processed_dir(PROCESSED_ROOT)

    copied = {k: 0 for k in TARGET_CLASSES}
    skipped = 0
    corrupted: List[Path] = []

    for src in RAW_ROOT.rglob("*"):
        if not src.is_file() or src.suffix.lower() not in IMAGE_EXTENSIONS:
            continue

        source_class = infer_source_class(src)
        if source_class is None:
            skipped += 1
            continue

        target_class = CLASS_MAPPING[source_class]
        if not is_valid_image(src):
            corrupted.append(src)
            if delete_corrupted:
                try:
                    src.unlink(missing_ok=True)
                except Exception:
                    pass
            continue

        copied[target_class] += 1
        out_name = f"{source_class}_{copied[target_class]:06d}{src.suffix.lower()}"
        dst = PROCESSED_ROOT / target_class / out_name
        try:
            shutil.copy2(src, dst)
        except Exception:
            # If a file cannot be copied (locked/permission/path issue), skip it
            # instead of aborting the whole preprocessing job.
            copied[target_class] -= 1
            skipped += 1

    return copied, skipped, corrupted


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare waste dataset into mapped classes.")
    parser.add_argument("--keep-corrupted", action="store_true", help="Do not delete corrupted images from raw data.")
    args = parser.parse_args()

    copied, skipped, corrupted = prepare(delete_corrupted=not args.keep_corrupted)

    print(f"[INFO] Raw: {RAW_ROOT}")
    print(f"[INFO] Processed: {PROCESSED_ROOT}")
    print("[INFO] Class distribution:")
    for cls, count in copied.items():
        print(f"  - {cls}: {count}")
    print(f"[INFO] Skipped (unmapped files): {skipped}")
    print(f"[INFO] Corrupted images: {len(corrupted)}")

    if sum(copied.values()) == 0:
        raise RuntimeError("No images were prepared. Check dataset layout and class mapping.")

    expected = sorted(TARGET_CLASSES)
    actual = sorted([p.name for p in PROCESSED_ROOT.iterdir() if p.is_dir()])
    if expected != actual:
        raise RuntimeError(f"Processed class folders invalid. expected={expected}, actual={actual}")

    print("[DONE] Dataset preparation complete.")


if __name__ == "__main__":
    main()
