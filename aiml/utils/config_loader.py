from pathlib import Path

import yaml


BASE_DIR = Path(__file__).resolve().parents[1]
CONFIG_PATH = BASE_DIR / "config" / "config.yaml"


def load_config():
    if not CONFIG_PATH.exists():
        return {}

    with CONFIG_PATH.open("r", encoding="utf-8") as file:
        return yaml.safe_load(file) or {}


def resolve_from_base(relative_path: str | None):
    if not relative_path:
        return None

    return str((BASE_DIR / relative_path).resolve())
