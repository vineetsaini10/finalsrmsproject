import os
import json
import time
import requests
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path

class MLValidator:
    def __init__(self, api_url="http://localhost:8000/api/v1/predict-waste", dataset_path="testing/datasets/mock_dataset.json"):
        self.api_url = api_url
        self.dataset_path = Path(dataset_path)
        self.reports_dir = Path("testing/reports")
        self.reports_dir.mkdir(exist_ok=True)

    def load_dataset(self):
        if not self.dataset_path.exists():
            raise FileNotFoundError(f"Dataset not found at {self.dataset_path}")
        with open(self.dataset_path, 'r') as f:
            return json.load(f)

    def run_tests(self):
        dataset = self.load_dataset()
        y_true = []
        y_pred = []
        latencies = []

        print(f"Running validation on {len(dataset)} samples...")

        for item in dataset:
            img_path = item['image_path']
            true_label = item['label']
            y_true.append(true_label)

            start_time = time.time()
            try:
                with open(img_path, 'rb') as f:
                    files = {'file': (os.path.basename(img_path), f, 'image/jpeg')}
                    response = requests.post(self.api_url, files=files, timeout=30)
                    
                if response.status_code == 200:
                    result = response.json()
                    predicted_label = result['waste_type']
                    y_pred.append(predicted_label)
                else:
                    print(f"Error: API returned {response.status_code} for {img_path}")
                    y_pred.append("error")
            except Exception as e:
                print(f"Exception during prediction: {e}")
                y_pred.append("exception")
            
            latencies.append(time.time() - start_time)

        self.generate_report(y_true, y_pred, latencies)

    def generate_report(self, y_true, y_pred, latencies):
        # Filtering out errors and exceptions for metrics
        valid_indices = [i for i, label in enumerate(y_pred) if label not in ["error", "exception"]]
        y_true_valid = [y_true[i] for i in valid_indices]
        y_pred_valid = [y_pred[i] for i in valid_indices]

        report = classification_report(y_true_valid, y_pred_valid, output_dict=True)
        avg_latency = np.mean(latencies)

        summary = {
            "total_samples": len(y_true),
            "valid_samples": len(y_true_valid),
            "errors": len(y_true) - len(y_true_valid),
            "average_latency": round(avg_latency, 4),
            "metrics": report
        }

        with open(self.reports_dir / "ml_validation_summary.json", 'w') as f:
            json.dump(summary, f, indent=2)

        # Generate Confusion Matrix Plot
        labels = sorted(list(set(y_true_valid)))
        cm = confusion_matrix(y_true_valid, y_pred_valid, labels=labels)
        plt.figure(figsize=(10, 8))
        sns.heatmap(cm, annot=True, fmt='d', xticklabels=labels, yticklabels=labels, cmap='Blues')
        plt.xlabel('Predicted')
        plt.ylabel('True')
        plt.title('Confusion Matrix')
        plt.savefig(self.reports_dir / "confusion_matrix.png")
        
        print(f"Validation complete. Report saved to {self.reports_dir}")
        print(f"Average Latency: {avg_latency:.4f}s")
        print(f"Overall Accuracy: {report['accuracy']:.4f}")

if __name__ == "__main__":
    validator = MLValidator()
    try:
        validator.run_tests()
    except Exception as e:
        print(f"Validation failed: {e}")
