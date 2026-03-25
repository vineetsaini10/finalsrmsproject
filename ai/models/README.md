# AI Model Weights

Place trained model weights here:

```
models/weights/
  waste_classifier.pth      ← EfficientNet-B3 fine-tuned on waste dataset
  classifier_meta.json      ← Training metadata (labels, accuracy, history)
```

## Training the classifier

1. Download the TrashNet dataset:
   ```bash
   # TrashNet has 6 classes: cardboard, glass, metal, paper, plastic, trash
   # Remap to our 5 labels: wet, dry, plastic, hazardous, mixed
   ```

2. Prepare your dataset structure:
   ```
   data/waste_images/
       train/
           wet/       (food scraps, vegetable peels)
           dry/       (paper, cardboard, glass, metal)
           plastic/   (bottles, bags, wrappers)
           hazardous/ (batteries, chemicals, medical waste)
           mixed/     (mixed/unclear waste)
       val/
           wet/ dry/ plastic/ hazardous/ mixed/
   ```

3. Run training:
   ```bash
   cd ai
   python training/train_classifier.py \
     --data_dir ./data/waste_images \
     --epochs 30 \
     --batch_size 32 \
     --output_dir ./models/weights
   ```

## Without training (demo mode)

The AI service will start even without weights — it will return random predictions
with low confidence. Set `CONFIDENCE_THRESHOLD=0.1` in `.env` to see all results.

## Pre-trained options

- **TrashNet** (Stanford): https://github.com/garythung/trashnet
- **WasteNet** (Kaggle): Search for "waste classification dataset" on Kaggle
- **TACO**: http://tacodataset.org (more granular categories)

Minimum recommended dataset size: 500 images per class for acceptable accuracy.
Target accuracy: >85% on validation set.
