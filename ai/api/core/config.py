from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MONGODB_URI: str = "mongodb://localhost:27017/swachhanet"
    REDIS_URL: str = "redis://localhost:6379"
    MODEL_PATH: str = "./models/weights"
    MODEL_VERSION: str = "v1.0"
    CONFIDENCE_THRESHOLD: float = 0.65
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"


settings = Settings()
