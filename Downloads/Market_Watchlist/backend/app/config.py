from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    DATA_PROVIDER: str = "mock"
    POLL_INTERVAL_SECONDS: int = 60
    PRICE_MOVE_HIGH_THRESHOLD: float = 3.0
    PRICE_MOVE_MEDIUM_THRESHOLD: float = 1.5
    RELATIVE_MOVE_HIGH_THRESHOLD: float = 2.0
    RELATIVE_MOVE_MEDIUM_THRESHOLD: float = 1.0

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
