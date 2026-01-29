import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Canteen API"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "sqlite:///./smart_canteen.db"
    
    # Camera & Model
    CAMERA_INDEX: int = 0
    YOLO_MODEL_PATH: str = r"e:\实习相关\杭州得鹿山\智慧食堂\标准框多菜品识别\runs\detect\train_tray_v1\weights\best.pt"
    
    # Recognition Algo
    CONFIDENCE_THRESHOLD: float = 0.45
    ENABLE_SAM: bool = True
    GAMMA_CORRECTION: float = 1.0

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

# Global settings instance
settings = Settings()
