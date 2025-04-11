from pydantic import BaseSettings
from typing import List
import secrets
from datetime import timedelta


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "AI Assistant API"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5500", "http://127.0.0.1:5500"]
    
    # Security
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_URL: str = "sqlite:///./app.db"
    
    class Config:
        env_file = ".env"


settings = Settings()
