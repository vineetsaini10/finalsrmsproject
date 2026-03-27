from __future__ import annotations

import shutil
from pathlib import Path


DATASET_REF = "alistairking/recyclable-and-household-waste-classification"
TARGET_ROOT = Path(__file__).resolve().parents[1] / "data" / "raw"


def has_existing_dataset(root: Path) -> bool:
    if not root.exists():
        return False
    return any(p.is_file() for p in root.rglob("*"))


def copy_tree(src: Path, dst: Path) -> None:
    dst.mkdir(parents=True, exist_ok=True)
    for item in src.iterdir():
        target = dst / item.name
        if item.is_dir():
            if target.exists():
                copy_tree(item, target)
            else:
                shutil.copytree(item, target)
        else:
            shutil.copy2(item, target)


def main() -> None:
    TARGET_ROOT.mkdir(parents=True, exist_ok=True)
    if has_existing_dataset(TARGET_ROOT):
        print(f"[SKIP] Dataset already present at: {TARGET_ROOT}")
        return

    try:
        import kagglehub
    except Exception as exc:
        raise RuntimeError(
            "kagglehub is not installed. Run: pip install -r aiml/requirements.txt"
        ) from exc

    print(f"[INFO] Downloading Kaggle dataset: {DATASET_REF}")
    download_path = Path(kagglehub.dataset_download(DATASET_REF))
    print(f"[INFO] Downloaded to cache: {download_path}")

    print(f"[INFO] Copying dataset to: {TARGET_ROOT}")
    copy_tree(download_path, TARGET_ROOT)
    print("[DONE] Dataset download and copy complete.")


if __name__ == "__main__":
    main()
