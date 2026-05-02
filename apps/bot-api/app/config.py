from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


APP_DIR = Path(__file__).resolve().parents[1]
WORKSPACE_DIR = APP_DIR.parents[1] if len(APP_DIR.parents) > 1 else APP_DIR


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(WORKSPACE_DIR / ".env", APP_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "BotFlow CRM Bot API"
    app_env: str = "development"
    bot_token: str = Field(default="replace-me", alias="BOT_TOKEN")
    bot_username: str = Field(default="botflow_crm_bot", alias="BOT_USERNAME")
    app_base_url: str = Field(default="http://localhost:8000", alias="APP_BASE_URL")
    web_base_url: str = Field(default="http://localhost:3000", alias="WEB_BASE_URL")
    database_url: str = Field(
        default="sqlite+aiosqlite:///./botflow_crm.sqlite3",
        alias="DATABASE_URL",
    )
    bot_mode: str = Field(default="polling", alias="BOT_MODE")
    partner_default_url: str = Field(
        default="https://example.com/register?promo=YOURCODE",
        alias="PARTNER_DEFAULT_URL",
    )
    partner_tracking_param: str = Field(
        default="click_id",
        alias="PARTNER_TRACKING_PARAM",
    )
    partner_webhook_secret: str = Field(
        default="",
        alias="PARTNER_WEBHOOK_SECRET",
    )
    admin_api_key: str = Field(default="change-me", alias="ADMIN_API_KEY")
    upload_dir: Path = Field(
        default=APP_DIR / "storage" / "uploads",
        alias="UPLOAD_DIR",
    )

    @property
    def screenshots_dir(self) -> Path:
        return self.upload_dir / "screenshots"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
