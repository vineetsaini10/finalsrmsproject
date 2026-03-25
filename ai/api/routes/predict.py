import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Path, Query, HTTPException
import numpy as np
import pandas as pd
from bson import ObjectId

from api.core.database import aggregate, find_many

router = APIRouter()
logger = logging.getLogger("swachhanet.predict")


def _simple_forecast(daily_counts: list, forecast_days: int = 7) -> list:
    """Weighted moving average with linear trend — lightweight LSTM substitute."""
    if not daily_counts or len(daily_counts) < 3:
        avg = sum(daily_counts) / max(len(daily_counts), 1)
        return [round(avg, 1)] * forecast_days

    arr     = np.array(daily_counts, dtype=float)
    weights = np.exp(np.linspace(0, 1, len(arr)))
    weights /= weights.sum()
    base    = float(np.dot(arr, weights))
    recent  = arr[-min(7, len(arr)):]
    trend   = float(np.polyfit(range(len(recent)), recent, 1)[0])

    return [round(max(0, base + trend * d * 0.5), 1) for d in range(1, forecast_days + 1)]


def _suggest_bin_placement(rows: list) -> list:
    if not rows:
        return []
    try:
        from sklearn.cluster import KMeans
        coords     = np.array([[r["lat"], r["lng"]] for r in rows])
        n_clusters = min(max(3, len(rows) // 20), 10)
        km         = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        km.fit(coords)

        suggestions = []
        for i, center in enumerate(km.cluster_centers_):
            mask    = km.labels_ == i
            points  = [rows[j] for j in range(len(rows)) if mask[j]]
            types   = [p.get("issueType", "other") for p in points]
            dominant = max(set(types), key=types.count)
            suggestions.append({
                "lat":            round(float(center[0]), 6),
                "lng":            round(float(center[1]), 6),
                "cluster_size":   int(mask.sum()),
                "dominant_type":  dominant,
                "priority":       "high" if mask.sum() > len(rows) / n_clusters else "medium",
            })
        return sorted(suggestions, key=lambda x: -x["cluster_size"])
    except Exception as e:
        logger.warning(f"KMeans failed: {e}")
        return []


@router.get("/predict/ward/{ward_id}")
async def predict_ward(
    ward_id:      str = Path(...),
    forecast_days: int = Query(7, ge=1, le=30),
):
    """Predict complaint volumes and suggest bin placements for a ward."""
    try:
        oid = ObjectId(ward_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ward_id")

    try:
        since_90 = datetime.utcnow() - timedelta(days=90)

        # 90-day daily aggregate from MongoDB
        pipeline = [
            {"$match": {"wardId": oid, "createdAt": {"$gte": since_90}}},
            {"$group": {
                "_id":   {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}},
                "count": {"$sum": 1},
            }},
            {"$sort": {"_id": 1}},
        ]
        rows = aggregate("complaints", pipeline)

        if rows:
            count_map    = {r["_id"]: r["count"] for r in rows}
            all_days     = pd.date_range(
                start=min(count_map.keys()),
                end=datetime.utcnow().strftime("%Y-%m-%d"),
                freq="D",
            )
            daily_counts = [count_map.get(d.strftime("%Y-%m-%d"), 0) for d in all_days]
        else:
            daily_counts = []

        forecast       = _simple_forecast(daily_counts, forecast_days)
        forecast_dates = [
            (datetime.utcnow() + timedelta(days=i + 1)).strftime("%Y-%m-%d")
            for i in range(forecast_days)
        ]

        # Recent complaints for bin placement
        since_30 = datetime.utcnow() - timedelta(days=30)
        recent   = find_many(
            "complaints",
            {"wardId": oid, "createdAt": {"$gte": since_30}, "location": {"$exists": True}},
            projection={"location": 1, "issueType": 1},
            limit=500,
        )

        flat_recent = []
        for c in recent:
            coords = c.get("location", {}).get("coordinates")
            if coords and len(coords) == 2:
                flat_recent.append({"lat": coords[1], "lng": coords[0], "issueType": c.get("issueType", "other")})

        bin_suggestions = _suggest_bin_placement(flat_recent)

        high_risk = [
            {"date": d, "predicted": v, "risk": "high" if forecast and v > np.mean(forecast) * 1.3 else "normal"}
            for d, v in zip(forecast_dates, forecast)
        ]

        return {
            "ward_id":       ward_id,
            "forecast_days": forecast_days,
            "forecast":      [{"date": d, "predicted_complaints": v} for d, v in zip(forecast_dates, forecast)],
            "high_risk_days": [d for d in high_risk if d["risk"] == "high"],
            "bin_placement_suggestions": bin_suggestions,
            "historical_avg": round(float(np.mean(daily_counts)) if daily_counts else 0, 1),
            "trend": "increasing" if (
                len(daily_counts) >= 14 and
                np.mean(daily_counts[-7:]) > np.mean(daily_counts[:7])
            ) else "stable",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction error for ward {ward_id}: {e}")
        raise HTTPException(status_code=500, detail="Prediction failed")
