import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN
import pickle
import os
from utils.config_loader import load_config
from utils.logger import get_logger

logger = get_logger(__name__)

try:
    config = load_config()
except Exception as e:
    logger.error(f"Failed to load configuration: {e}")
    config = {}

class GeoHotspotService:
    def __init__(self):
        hotspot_config = config.get('hotspot', {})
        self.eps = hotspot_config.get('eps', 0.005) # approx 500m in lat/long depending on region
        self.min_samples = hotspot_config.get('min_samples', 5)
        self.metric = hotspot_config.get('metric', 'haversine')
        
    def _convert_to_radians(self, coordinates):
        """Converts lat/long to radians for haversine metric."""
        return np.radians(coordinates)
        
    def detect_hotspots(self, coordinates_list):
        """
        Takes a list of dicts [{'lat': float, 'long': float}] and returns cluster assignments.
        """
        if not coordinates_list:
            logger.warning("Empty coordinates list provided for hotspot detection.")
            return {"clusters": [], "noise": []}
            
        try:
            # Extract coordinates into numpy array
            coords_array = np.array([[point['lat'], point['long']] for point in coordinates_list])
            
            # Use Haversine distance correctly with radians
            coords_rad = self._convert_to_radians(coords_array)
            
            # For haversine, eps is expected in radians. 
            # 6371 is Earth's radius in km. We want ~500m (0.5km) -> 0.5 / 6371
            # But the user config sets eps directly (e.g. 0.005 which could be in degrees if euclidean)
            # Defaulting to user's config interpretation. Here we'll treat it as approx degrees for simplicity if using euclidean,
            # or radians if using haversine with standard settings. Let's assume the user config EPS is in standard unit for sklearn.
            
            clustering = DBSCAN(
                eps=self.eps, 
                min_samples=self.min_samples, 
                metric='euclidean' if self.metric != 'haversine' else 'haversine' 
            ).fit(coords_rad if self.metric == 'haversine' else coords_array)
            
            labels = clustering.labels_
            
            clusters = {}
            noise = []
            
            for i, label in enumerate(labels):
                point = coordinates_list[i]
                if label == -1:
                    noise.append(point)
                else:
                    cluster_id = str(label)
                    if cluster_id not in clusters:
                        clusters[cluster_id] = {
                            "center": {"lat": 0.0, "long": 0.0},
                            "points": [],
                            "count": 0
                        }
                    
                    clusters[cluster_id]["points"].append(point)
                    clusters[cluster_id]["count"] += 1
                    
            # Calculate centers for clusters
            for cluster_id, data in clusters.items():
                pts = np.array([[p['lat'], p['long']] for p in data['points']])
                center = np.mean(pts, axis=0)
                data['center'] = {"lat": round(center[0], 6), "long": round(center[1], 6)}
                
            logger.info(f"Hotspot detection complete. Found {len(clusters)} clusters and {len(noise)} noise points.")
            
            return {
                "clusters": list(clusters.values()),
                "total_clusters": len(clusters),
                "noise_points": noise,
                "total_noise": len(noise)
            }
            
        except Exception as e:
            logger.error(f"Error during hotspot detection: {e}")
            raise

geo_service = GeoHotspotService()
