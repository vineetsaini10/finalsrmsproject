"""
Hotspot detection batch job — run hourly via cron or scheduler.

Usage:
    python pipelines/run_hotspot_detection.py
    # Cron: 0 * * * * cd /app && python pipelines/run_hotspot_detection.py
"""
import sys
import logging
from pathlib import Path
from datetime import datetime, timedelta

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
from sklearn.cluster import DBSCAN
from bson import ObjectId

from api.core.database import get_collection
from api.core.config   import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("hotspot_pipeline")


def run_for_all_wards():
    wards_col = get_collection("wards")
    wards     = list(wards_col.find({}, {"name": 1, "_id": 1}))
    logger.info(f"Running hotspot detection for {len(wards)} wards")

    for ward in wards:
        try:
            _process_ward(ward["_id"], ward.get("name", str(ward["_id"])))
        except Exception as e:
            logger.error(f"Error processing ward {ward.get('name')}: {e}")


def _process_ward(ward_id: ObjectId, ward_name: str):
    complaints_col = get_collection("complaints")
    since          = datetime.utcnow() - timedelta(days=7)

    rows_raw = list(complaints_col.find(
        {"wardId": ward_id, "createdAt": {"$gte": since}, "location": {"$exists": True}},
        {"location": 1, "priority": 1, "issueType": 1},
    ))

    rows = []
    for r in rows_raw:
        coords = r.get("location", {}).get("coordinates")
        if coords and len(coords) == 2:
            rows.append({
                "lat":       coords[1],
                "lng":       coords[0],
                "priority":  r.get("priority", 1),
                "issueType": r.get("issueType", "other"),
            })

    if len(rows) < 5:
        return

    coords_rad = np.radians([[r["lat"], r["lng"]] for r in rows])
    db         = DBSCAN(eps=0.3 / 6371, min_samples=5,
                        algorithm="ball_tree", metric="haversine").fit(coords_rad)

    clusters: dict = {}
    for idx, label in enumerate(db.labels_):
        if label != -1:
            clusters.setdefault(label, []).append(rows[idx])

    hotspots_col = get_collection("hotspots")
    inserted = 0

    for _, points in clusters.items():
        lats      = [p["lat"] for p in points]
        lngs      = [p["lng"] for p in points]
        pris      = [p["priority"] for p in points]
        types     = [p["issueType"] for p in points]
        dominant  = max(set(types), key=types.count)

        hotspots_col.insert_one({
            "wardId":         ward_id,
            "centroid":       {"type": "Point", "coordinates": [
                round(sum(lngs) / len(lngs), 6),
                round(sum(lats) / len(lats), 6),
            ]},
            "complaintCount": len(points),
            "severityScore":  round(sum(pris) / len(pris), 2),
            "dominantType":   dominant,
            "periodDays":     7,
            "createdAt":      datetime.utcnow(),
        })
        inserted += 1

    logger.info(f"Ward '{ward_name}': {len(rows)} complaints → {inserted} hotspots")


if __name__ == "__main__":
    run_for_all_wards()
    logger.info("Hotspot detection complete.")
