from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional

# --- Classification Models ---

class ClassificationResponse(BaseModel):
    class_name: str = Field(..., alias="class")
    confidence: float
    is_confident: bool
    probabilities: dict

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

# --- Hotspot Models ---

class CoordinateItem(BaseModel):
    lat: float
    long: float

class HotspotRequest(BaseModel):
    coordinates: List[CoordinateItem]

class ClusterData(BaseModel):
    center: CoordinateItem
    points: List[CoordinateItem]
    count: int

class HotspotResponse(BaseModel):
    clusters: List[ClusterData]
    total_clusters: int
    noise_points: List[CoordinateItem]
    total_noise: int

# --- Prediction Models ---

class HistoricalDataItem(BaseModel):
    date: str
    value: float
    location: Optional[str] = "global"

class PredictionRequest(BaseModel):
    historical_data: List[HistoricalDataItem]
    forecast_days: Optional[int] = 30

class PredictionItem(BaseModel):
    date: str
    predicted_value: float
    lower_bound: float
    upper_bound: float

class PredictionResponse(BaseModel):
    forecast: List[PredictionItem]
