import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Query, HTTPException
from typing import Optional
import numpy as np
from sklearn.cluster import DBSCAN
from bson import ObjectId

from api.core.database import find_many

router = APIRouter()
logger = logging.getLogger("swachhanet.hotspots")


def detect_clusters(rows: list, eps_km: float = 0.3, min_samples: int = 5) -> list:
    if len(rows) < min_samples:
        return []

    coords = np.radians([[r["lat"], r["lng"]] for r in rows])
    db = DBSCAN(
        eps=eps_km / 6371,
        min_samples=min_samples,
        algorithm="ball_tree",
        metric="haversine",
    ).fit(coords)

    clusters: dict = {}
    for idx, label in enumerate(db.labels_):
        if label == -1:
            continue
        clusters.setdefault(label, []).append(rows[idx])

    hotspots = []
    for _, points in clusters.items():
        lats       = [p["lat"] for p in points]
        lngs       = [p["lng"] for p in points]
        priorities = [p.get("priority", 1) for p in points]
        types      = [p.get("issueType", "other") for p in points]
        dominant   = max(set(types), key=types.count)

        hotspots.append({
            "centroid_lat":    round(sum(lats) / len(lats), 6),
            "centroid_lng":    round(sum(lngs) / len(lngs), 6),
            "complaint_count": len(points),
            "severity_score":  round(sum(priorities) / len(priorities), 2),
            "dominant_type":   dominant,
        })

    return sorted(hotspots, key=lambda x: -x["severity_score"])


@router.get("/detect-hotspots")
async def detect_hotspots(
    ward_id:    Optional[str]   = Query(None),
    days:       int             = Query(7, ge=1, le=90),
    eps_km:     float           = Query(0.3, ge=0.1, le=2.0),
    min_samples: int            = Query(5, ge=2, le=20),
):
    """Run DBSCAN hotspot detection on recent complaints from MongoDB."""
    since = datetime.utcnow() - timedelta(days=days)
    query = {"createdAt": {"$gte": since}}
    if ward_id:
        try:
            query["wardId"] = ObjectId(ward_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid ward_id")

    try:
        complaints = find_many(
            "complaints", query,
            projection={"location": 1, "priority": 1, "issueType": 1},
            limit=5000,
        )
    except Exception as e:
        logger.error(f"DB error in detect_hotspots: {e}")
        raise HTTPException(status_code=500, detail="Database error")

    # Flatten MongoDB GeoJSON point → lat/lng
    rows = []
    for c in complaints:
        coords = c.get("location", {}).get("coordinates")
        if coords and len(coords) == 2:
            rows.append({
                "lat":       coords[1],
                "lng":       coords[0],
                "priority":  c.get("priority", 1),
                "issueType": c.get("issueType", "other"),
            })

    hotspots = detect_clusters(rows, eps_km=eps_km, min_samples=min_samples)

    # Persist detected hotspots back to MongoDB
    if hotspots and ward_id:
        try:
            docs = [
                {
                    "wardId":         ObjectId(ward_id),
                    "centroid":       {"type": "Point", "coordinates": [h["centroid_lng"], h["centroid_lat"]]},
                    "complaintCount": h["complaint_count"],
                    "severityScore":  h["severity_score"],
                    "dominantType":   h["dominant_type"],
                    "periodDays":     days,
                    "createdAt":      datetime.utcnow(),
                }
                for h in hotspots
            ]
            insert_many_hotspots(docs)
        except Exception as e:
            logger.warning(f"Failed to persist hotspots: {e}")

    return {
        "hotspot_count": len(hotspots),
        "input_points":  len(rows),
        "days":          days,
        "hotspots":      hotspots,
    }


def insert_many_hotspots(docs: list):
    from api.core.database import get_collection
    if docs:
        get_collection("hotspots").insert_many(docs)
