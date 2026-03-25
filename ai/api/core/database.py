"""
MongoDB connection for AI service using PyMongo (sync) and Motor (async).
"""
import logging
from pymongo import MongoClient
from pymongo.collection import Collection
from api.core.config import settings

logger = logging.getLogger("swachhanet.db")

_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=5000)
        logger.info("PyMongo client created")
    return _client


def get_db():
    return get_client().get_default_database()


def get_collection(name: str) -> Collection:
    return get_db()[name]


# ── Convenience query helpers ────────────────────────────────────────────────

def find_many(collection: str, query: dict, projection: dict = None,
              sort: list = None, limit: int = 0) -> list[dict]:
    col = get_collection(collection)
    cursor = col.find(query, projection or {})
    if sort:
        cursor = cursor.sort(sort)
    if limit:
        cursor = cursor.limit(limit)
    return list(cursor)


def insert_one(collection: str, document: dict) -> str:
    result = get_collection(collection).insert_one(document)
    return str(result.inserted_id)


def insert_many(collection: str, documents: list[dict]) -> list[str]:
    result = get_collection(collection).insert_many(documents)
    return [str(i) for i in result.inserted_ids]


def aggregate(collection: str, pipeline: list) -> list[dict]:
    return list(get_collection(collection).aggregate(pipeline))
