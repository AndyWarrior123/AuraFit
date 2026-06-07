from functools import lru_cache
from pydantic import AnyHttpUrl, EmailStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ________ Application ___________________
    APP_NAME: str = "AuraFit API"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = False
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    API_V1_PREFIX: str = "/api/v1"

    # ________ SERVER ________________________
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 1

    # ________ DATABASE ______________________
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    DATABASE_POOL_RECYCLE: int = 3600

    # ________ JWT ___________________________
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_EXPIRE_DAYS: int = 30

    # _______ Google OAuth ___________________
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: AnyHttpUrl
    GOOGLE_TOKEN_INFO_URL: str = "https://oauth2.googleapis.com/tokeninfo"

    # _______ GEMINI _________________________
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.0-flash"
    GEMINI_MAX_OUTPUT_TOKENS: int = 512
    GEMINI_TEMPERATURE: float = 0.0

    # _______ CORS ___________________________
    CORS_ORIGINS: list[AnyHttpUrl] = []
    CORS_ALLOW_CREDENTIIALS: bool = True

    # _______ RATE LIMITING __________________
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    # _______ VALIDATORS _____________________
    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def jwt_secret_must_be_strong(cls, v:str) -> str:
        if len(v) < 32:
            raise ValueError("JWT_SECRET_KEY must be atleast 32 characters long")
        return v
    
    @field_validator("GEMINI_TEMPERATURE")
    @classmethod
    def temperature_must_be_deterministic(cls, v: float) -> float:
        if not (0.0 <= v <= 1.0):
            raise ValueError("GEMINI_TEMPERATURE must be between 0.0 and 1.0")
        return v

    @field_validator("DATABASE_POOL_SIZE")
    @classmethod
    def pool_size_must_be_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("DATABASE_POOL_SIZE must be at least 1")
        return v

    @model_validator(mode="after")
    def production_guards(self) -> "Settings":
        if self.ENVIRONMENT == "production":
            if self.DEBUG:
                raise ValueError("DEBUG must be false in production")
            if self.JWT_SECRET_KEY.startswith("REPLACE"):
                raise ValueError("JWT_SECRET_KEY is still the placeholder value")
        return self
    
    # ── Computed helpers (read-only properties) ───────────────────────────────

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def jwt_access_expire_seconds(self) -> int:
        return self.JWT_ACCESS_EXPIRE_MINUTES * 60

    @property
    def jwt_refresh_expire_seconds(self) -> int:
        return self.JWT_REFRESH_EXPIRE_DAYS * 24 * 60 * 60

    @property
    def database_url_safe(self) -> str:
        """Password-redacted URL safe to print in logs."""
        if "@" in self.DATABASE_URL:
            scheme, rest = self.DATABASE_URL.split("://", 1)
            credentials, host_part = rest.split("@", 1)
            user = credentials.split(":")[0]
            return f"{scheme}://{user}:***@{host_part}"
        return self.DATABASE_URL

    @property
    def cors_origins_str(self) -> list[str]:
        return [str(origin) for origin in self.CORS_ORIGINS]


@lru_cache
def get_settings() -> Settings:
    return Settings()


