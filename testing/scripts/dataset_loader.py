import os
import json
import csv
import requests
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np
import random

class DatasetLoader:
    def __init__(self, base_dir="testing/datasets"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def load_from_json(self, file_path):
        """Loads data from a JSON file."""
        with open(file_path, 'r') as f:
            return json.load(f)

    def load_from_csv(self, file_path):
        """Loads data from a CSV file."""
        data = []
        with open(file_path, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                data.append(row)
        return data

    def download_image(self, url, folder="images"):
        """Downloads an image from a URL."""
        save_path = self.base_dir / folder
        save_path.mkdir(exist_ok=True)
        filename = url.split("/")[-1]
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                with open(save_path / filename, 'wb') as f:
                    f.write(response.content)
                return str(save_path / filename)
        except Exception as e:
            print(f"Error downloading image {url}: {e}")
        return None

    def generate_synthetic_image(self, label, save_path):
        """Generates a synthetic waste image with a specific label."""
        width, height = 224, 224
        img = Image.new('RGB', (width, height), color=(random.randint(0,255), random.randint(0,255), random.randint(0,255)))
        draw = ImageDraw.Draw(img)
        
        # Draw some random shapes to simulate "waste"
        for _ in range(5):
            x1, y1 = random.randint(0, width), random.randint(0, height)
            x2, y2 = random.randint(0, width), random.randint(0, height)
            color = (random.randint(0,255), random.randint(0,255), random.randint(0,255))
            draw.rectangle([x1, y1, x2, y2], fill=color, outline="black")
            
        draw.text((10, 10), label, fill=(255, 255, 255))
        img.save(save_path)
        return str(save_path)

    def create_mock_dataset(self, num_samples=10, labels=["wet", "dry", "plastic", "hazardous"]):
        """Creates a mock dataset for testing."""
        dataset = []
        img_folder = self.base_dir / "mock_images"
        img_folder.mkdir(exist_ok=True)
        
        for i in range(num_samples):
            label = random.choice(labels)
            img_path = img_folder / f"sample_{i}.jpg"
            self.generate_synthetic_image(label, img_path)
            dataset.append({
                "image_path": str(img_path),
                "label": label
            })
            
        with open(self.base_dir / "mock_dataset.json", 'w') as f:
            json.dump(dataset, f, indent=2)
            
        return dataset

if __name__ == "__main__":
    loader = DatasetLoader()
    print("Generating mock dataset...")
    loader.create_mock_dataset()
    print("Mock dataset created in testing/datasets/")
