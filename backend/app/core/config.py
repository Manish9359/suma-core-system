from pydantic import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    """System-wide configuration settings."""
    PROJECT_NAME: str = "suma-core-system"
    VERSION: str = "1.0.0"
    
    # Database
    DATABASE_URL: str = "sqlite:///./erp.db"
    
    # Security
    JWT_SECRET: str = "suma_core_v1_secret_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 600
    
    # Tenant
    DEFAULT_TENANT_NAME: str = "SumaBase"
    
    class Config:
        env_file = ".env"

# Instantiate global settings object
settings = Settings()
