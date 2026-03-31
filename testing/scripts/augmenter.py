import os
import cv2
import numpy as np
import random
from pathlib import Path

class Augmenter:
    def __init__(self, source_dir="testing/datasets/mock_images", output_dir="testing/datasets/edge_cases"):
        self.source_dir = Path(source_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def apply_noise(self, image):
        """Adds Gaussian noise to the image."""
        row, col, ch = image.shape
        mean = 0
        var = 0.1
        sigma = var**0.5
        gauss = np.random.normal(mean, sigma, (row, col, ch))
        gauss = gauss.reshape(row, col, ch)
        noisy = image + gauss
        return np.clip(noisy, 0, 255).astype(np.uint8)

    def apply_blur(self, image):
        """Adds blur to the image."""
        return cv2.blur(image, (5, 5))

    def apply_low_light(self, image):
        """Reduces brightness of the image."""
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        h, s, v = cv2.split(hsv)
        v = cv2.add(v, -50)
        v = np.clip(v, 0, 255)
        final_hsv = cv2.merge((h, s, v))
        return cv2.cvtColor(final_hsv, cv2.COLOR_HSV2BGR)

    def augment_dataset(self):
        """Processes all images in source_dir and applies augmentations."""
        if not self.source_dir.exists():
            print(f"Source directory {self.source_dir} not found.")
            return

        for img_path in self.source_dir.glob("*.jpg"):
            img = cv2.imread(str(img_path))
            if img is None:
                continue

            name = img_path.stem
            
            # Save original
            cv2.imwrite(str(self.output_dir / f"{name}_original.jpg"), img)
            
            # Apply and save augmentations
            cv2.imwrite(str(self.output_dir / f"{name}_noise.jpg"), self.apply_noise(img))
            cv2.imwrite(str(self.output_dir / f"{name}_blur.jpg"), self.apply_blur(img))
            cv2.imwrite(str(self.output_dir / f"{name}_lowlight.jpg"), self.apply_low_light(img))

        print(f"Augmentation complete. Output saved to {self.output_dir}")

if __name__ == "__main__":
    augmenter = Augmenter()
    augmenter.augment_dataset()
