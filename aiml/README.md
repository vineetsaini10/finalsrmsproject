# EcoIntellect AI/ML Backend

This is the fully modular, production-ready AI backend for the Waste Management System.

## Features
- **Waste Image Classification**: Uses MobileNetV2 for classifying waste (wet, dry, plastic, hazardous).
- **Geo-Spatial Hotspot Detection**: Uses DBSCAN clustering to find waste hot-spots from complaints.
- **Predictive Analytics**: Uses Facebook Prophet for time-series forecasting of waste generation trends.

## Setup Instructions

### Running Locally

1. Create a virtual environment and activate it:
```bash
python -m venv venv
source venv/bin/activate
# Or on Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Ensure trained waste-classifier weights exist at:
```bash
aiml/models/waste_classifier/model.pth
```
The API now fails fast if this model file is missing to avoid dummy predictions.

4. Run the FastAPI server:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Running via Docker
1. Build the image:
```bash
docker build -t ecointellect-ai-backend .
```

2. Run the container:
```bash
docker run -p 8000:8000 ecointellect-ai-backend
```

## API Documentation
Once running, you can access the interactive Swagger documentation at: `http://localhost:8000/docs`.

### Example Requests & Responses

#### 1. POST `/api/v1/predict-waste`
- **Request**: Multipart Form-Data with a `file` field containing the image.
- **Example Response**:
```json
{
  "waste_type": "plastic",
  "class": "plastic",
  "confidence": 0.9452,
  "is_confident": true,
  "probabilities": {
    "wet": 0.012,
    "dry": 0.030,
    "plastic": 0.9452,
    "hazardous": 0.0128
  }
}
```

#### 2. POST `/api/v1/detect-hotspot`
- **Request JSON**:
```json
{
  "coordinates": [
    {"lat": 12.9716, "long": 77.5946},
    {"lat": 12.9718, "long": 77.5948},
    {"lat": 12.9720, "long": 77.5950},
    {"lat": 12.9715, "long": 77.5945},
    {"lat": 12.9719, "long": 77.5949},
    {"lat": 28.7041, "long": 77.1025}
  ]
}
```
- **Example Response**:
```json
{
  "clusters": [
    {
      "center": {"lat": 12.97176, "long": 77.59476},
      "points": [
        {"lat": 12.9716, "long": 77.5946},
        {"lat": 12.9718, "long": 77.5948},
        {"lat": 12.9720, "long": 77.5950},
        {"lat": 12.9715, "long": 77.5945},
        {"lat": 12.9719, "long": 77.5949}
      ],
      "count": 5
    }
  ],
  "total_clusters": 1,
  "noise_points": [
    {"lat": 28.7041, "long": 77.1025}
  ],
  "total_noise": 1
}
```

#### 3. POST `/api/v1/predict-trend`
- **Request JSON**:
```json
{
  "historical_data": [
    {"date": "2023-10-01", "value": 150.5, "location": "zone-a"},
    {"date": "2023-10-02", "value": 160.2, "location": "zone-a"},
    {"date": "2023-10-03", "value": 155.0, "location": "zone-a"}
  ],
  "forecast_days": 7
}
```
- **Example Response**:
```json
{
  "forecast": [
    {
      "date": "2023-10-04",
      "predicted_value": 156.45,
      "lower_bound": 145.2,
      "upper_bound": 167.8
    },
    {
      "date": "2023-10-05",
      "predicted_value": 158.12,
      "lower_bound": 146.5,
      "upper_bound": 169.3
    }
  ]
}
```

