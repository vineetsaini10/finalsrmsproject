import os
from pathlib import Path

def ensure_directory_exists(path: str):
    """
    Ensures that a directory exists, creating it if necessary.
    """
    Path(path).mkdir(parents=True, exist_ok=True)

# Create mandatory directories on startup
ensure_directory_exists("aiml/models/waste_classifier")
ensure_directory_exists("aiml/models/hotspot_model")
ensure_directory_exists("aiml/models/prediction_model")
ensure_directory_exists("aiml/data/raw")
ensure_directory_exists("aiml/data/processed")
