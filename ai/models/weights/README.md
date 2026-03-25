# Model Weights

Place trained model weight files here.

## Expected files

| File | Description |
|------|-------------|
| `waste_classifier.pth` | EfficientNet-B3 trained on waste images |
| `classifier_meta.json` | Training metadata (labels, accuracy, history) |

## Training

Run the training script to generate `waste_classifier.pth`:

```bash
cd ai/
python training/train_classifier.py \
  --data_dir ./data/waste_images \
  --output_dir ./models/weights \
  --epochs 30
```

## Dataset

Download TrashNet from: https://github.com/garythung/trashnet
Then organize into:
```
data/waste_images/
  train/wet/ dry/ plastic/ hazardous/ mixed/
  val/wet/ dry/ plastic/ hazardous/ mixed/
```

## Pre-trained weights

For hackathon demo, you can use a randomly initialized model (predictions will be random).
The API will still work — results just won't be accurate until trained.
