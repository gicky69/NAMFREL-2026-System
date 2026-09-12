from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    cors_origins: str = "http://localhost:5173"
    env: str = "development"
    sentiment_model_name: str = "jjjardev/tagasenti_model"
    sentiment_device: str = "auto"
    sentiment_fallback_enabled: bool = True
    sentiment_cache_dir: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
