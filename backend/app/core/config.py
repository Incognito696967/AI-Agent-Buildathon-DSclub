from functools import lru_cache
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application configuration using Pydantic Settings."""

    # Supabase Configuration
    SUPABASE_URL: str = ""
    SUPABASE_SECRET_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None

    # Application settings
    PROJECT_NAME: str = "Intelligent Medical Appointment Coordination API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # CORS settings
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    @property
    def resolved_supabase_key(self) -> Optional[str]:
        """Resolves secret/service-role key, supporting modern or legacy env keys."""
        return self.SUPABASE_SECRET_KEY or self.SUPABASE_SERVICE_ROLE_KEY or self.SUPABASE_KEY

    @property
    def is_supabase_configured(self) -> bool:
        """Returns True if minimum Supabase credentials are provided."""
        return bool(self.SUPABASE_URL and self.resolved_supabase_key)

    @property
    def cors_origins_list(self) -> List[str]:
        """Converts comma-separated CORS origins string to a list."""
        if not self.CORS_ORIGINS:
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache()
def get_settings() -> Settings:
    """Returns cached settings instance."""
    return Settings()
