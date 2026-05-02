from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, model_validator


class HealthResponse(BaseModel):
    status: str
    app: str


class OverviewStats(BaseModel):
    total_users: int
    verified_users: int
    conversions: int
    pending_users: int


class PartnerEventIn(BaseModel):
    telegram_user_id: int | None = None
    tracking_code: str | None = None
    partner_player_id: str | None = None
    partner_slug: str
    source: str | None = None
    payload: str | None = None
    # Common partner field aliases
    click_id: str | None = None
    sub_id: str | None = None
    player_id: str | None = None
    amount: float | None = None
    currency: str | None = None

    @model_validator(mode="after")
    def normalize_identifiers(self) -> "PartnerEventIn":
        # Map common partner field aliases
        if not self.tracking_code and self.click_id:
            self.tracking_code = self.click_id
        if not self.tracking_code and self.sub_id:
            self.tracking_code = self.sub_id
        if not self.partner_player_id and self.player_id:
            self.partner_player_id = self.player_id
        # Build payload from amount/currency if present
        if self.amount is not None and not self.payload:
            parts = [f"amount={self.amount}"]
            if self.currency:
                parts.append(f"currency={self.currency}")
            self.payload = "&".join(parts)
        if self.telegram_user_id or self.tracking_code or self.partner_player_id:
            return self
        raise ValueError("Provide telegram_user_id, tracking_code, partner_player_id, click_id, sub_id, or player_id")


class UserOut(BaseModel):
    telegram_user_id: int
    username: str | None
    status: str
    source: str | None
    partner_slug: str | None
    partner_tracking_code: str | None = None
    partner_player_id: str | None = None
    partner_click_url: str | None = None
    utm_source: str | None = None
    utm_campaign: str | None = None
    utm_content: str | None = None
    created_at: datetime | None = None


class CampaignPresetIn(BaseModel):
    id: int | None = None
    name: str
    source: str = "telegram"
    utm_source: str = "telegram"
    utm_medium: str = "post"
    utm_campaign: str | None = None
    utm_content: str | None = None
    partner_slug: str | None = None
    landing_path: str = "/"
    is_favorite: bool = False
    is_archived: bool = False
    sort_order: int | None = None


class CampaignPresetOut(BaseModel):
    id: int
    name: str
    source: str
    utm_source: str
    utm_medium: str
    utm_campaign: str | None = None
    utm_content: str | None = None
    partner_slug: str | None = None
    landing_path: str
    is_favorite: bool
    is_archived: bool
    sort_order: int
    created_at: datetime | None = None
    updated_at: datetime | None = None


class VerificationSubmissionOut(BaseModel):
    id: int
    telegram_user_id: int
    username: str | None
    source: str | None
    partner_slug: str | None = None
    utm_campaign: str | None = None
    status: str
    media_url: str
    submitted_at: datetime | None = None
    admin_note: str | None = None


class FunnelEventOut(BaseModel):
    id: int
    event_type: str
    source: str | None = None
    payload: str | None = None
    created_at: datetime | None = None


class UserDetailOut(BaseModel):
    telegram_user_id: int
    username: str | None
    first_name: str | None = None
    last_name: str | None = None
    status: str
    source: str | None
    partner_slug: str | None
    partner_tracking_code: str | None = None
    partner_player_id: str | None = None
    partner_click_url: str | None = None
    utm_source: str | None = None
    utm_medium: str | None = None
    utm_campaign: str | None = None
    utm_content: str | None = None
    notes: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    events: list[FunnelEventOut] = []


class PartnerEventOut(BaseModel):
    id: int
    telegram_user_id: int
    username: str | None = None
    event_type: str
    partner_slug: str | None = None
    partner_player_id: str | None = None
    source: str | None = None
    payload: str | None = None
    created_at: datetime | None = None


class BroadcastIn(BaseModel):
    text: str
    target: str = "all"  # "all", "verified", "pending", "new"


class BroadcastResult(BaseModel):
    total: int
    sent: int
    failed: int


class ReminderResult(BaseModel):
    total: int
    sent: int
    failed: int


class VerificationDecisionIn(BaseModel):
    decision: str
    note: str | None = None
