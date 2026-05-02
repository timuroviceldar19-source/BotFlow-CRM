from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from app.config import get_settings
from app.db import get_db_session, init_db
from app.models import EventType, User, UserStatus, VerificationStatus
from app.services.notification_service import (
    notify_verification_approved,
    notify_verification_rejected,
    send_message_to_user,
    set_bot_instance,
)
from app.schemas import (
    BroadcastIn,
    BroadcastResult,
    CampaignPresetIn,
    CampaignPresetOut,
    FunnelEventOut,
    HealthResponse,
    OverviewStats,
    PartnerEventIn,
    PartnerEventOut,
    ReminderResult,
    UserDetailOut,
    UserOut,
    VerificationDecisionIn,
    VerificationSubmissionOut,
)
from app.services.campaign_preset_service import (
    delete_campaign_preset,
    list_campaign_presets,
    upsert_campaign_preset,
)
from app.services.user_service import (
    get_overview_stats,
    get_user_detail,
    list_partner_events,
    list_users as list_users_service,
    list_users_by_statuses,
    list_verification_submissions,
    mark_partner_event,
    review_verification_submission,
    to_verification_out,
)


settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db()
    if settings.bot_token and settings.bot_token != "replace-me":
        from aiogram import Bot

        bot = Bot(token=settings.bot_token)
        set_bot_instance(bot)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=Path(settings.upload_dir)), name="uploads")


def to_campaign_preset_out(preset) -> CampaignPresetOut:
    return CampaignPresetOut(
        id=preset.id,
        name=preset.name,
        source=preset.source,
        utm_source=preset.utm_source,
        utm_medium=preset.utm_medium,
        utm_campaign=preset.utm_campaign,
        utm_content=preset.utm_content,
        partner_slug=preset.partner_slug,
        landing_path=preset.landing_path,
        is_favorite=preset.is_favorite,
        is_archived=preset.is_archived,
        sort_order=preset.sort_order,
        created_at=preset.created_at,
        updated_at=preset.updated_at,
    )


async def require_admin_api_key(x_api_key: str = Header(default="")) -> None:
    if x_api_key != settings.admin_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")


async def require_partner_webhook_secret(
    x_partner_secret: str = Header(default=""),
) -> None:
    if not settings.partner_webhook_secret:
        return
    if x_partner_secret != settings.partner_webhook_secret:
        raise HTTPException(status_code=401, detail="Invalid partner webhook secret")


@app.get("/health", response_model=HealthResponse)
async def healthcheck() -> HealthResponse:
    return HealthResponse(status="ok", app=settings.app_name)


@app.get("/api/admin/stats/overview", response_model=OverviewStats, dependencies=[Depends(require_admin_api_key)])
async def admin_overview(
    source: str | None = None,
    partner_slug: str | None = None,
    utm_campaign: str | None = None,
    session: AsyncSession = Depends(get_db_session),
) -> OverviewStats:
    stats = await get_overview_stats(
        session,
        source=source,
        partner_slug=partner_slug,
        utm_campaign=utm_campaign,
    )
    return OverviewStats(**stats)


@app.get("/api/admin/users", response_model=list[UserOut], dependencies=[Depends(require_admin_api_key)])
async def list_users(
    source: str | None = None,
    partner_slug: str | None = None,
    status: str | None = None,
    utm_campaign: str | None = None,
    session: AsyncSession = Depends(get_db_session),
) -> list[UserOut]:
    users = await list_users_service(
        session,
        source=source,
        partner_slug=partner_slug,
        status=status,
        utm_campaign=utm_campaign,
    )
    return [
        UserOut(
            telegram_user_id=user.telegram_user_id,
            username=user.username,
            status=user.status,
            source=user.source,
            partner_slug=user.partner_slug,
            partner_tracking_code=user.partner_tracking_code,
            partner_player_id=user.partner_player_id,
            partner_click_url=user.partner_click_url,
            utm_source=user.utm_source,
            utm_campaign=user.utm_campaign,
            utm_content=user.utm_content,
            created_at=user.created_at,
        )
        for user in users
    ]


@app.get(
    "/api/admin/campaign-presets",
    response_model=list[CampaignPresetOut],
    dependencies=[Depends(require_admin_api_key)],
)
async def admin_campaign_presets(
    session: AsyncSession = Depends(get_db_session),
) -> list[CampaignPresetOut]:
    presets = await list_campaign_presets(session)
    return [to_campaign_preset_out(preset) for preset in presets]


@app.post(
    "/api/admin/campaign-presets",
    response_model=CampaignPresetOut,
    dependencies=[Depends(require_admin_api_key)],
)
async def save_campaign_preset(
    payload: CampaignPresetIn,
    session: AsyncSession = Depends(get_db_session),
) -> CampaignPresetOut:
    preset = await upsert_campaign_preset(session, payload)
    return to_campaign_preset_out(preset)


@app.delete(
    "/api/admin/campaign-presets/{preset_id}",
    dependencies=[Depends(require_admin_api_key)],
)
async def remove_campaign_preset(
    preset_id: int,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, bool]:
    deleted = await delete_campaign_preset(session, preset_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Campaign preset not found")
    return {"ok": True}


async def _handle_partner_webhook(
    payload: PartnerEventIn,
    event_type: EventType,
    session: AsyncSession,
) -> UserOut:
    logger.info(
        "Partner webhook %s: slug=%s tg_id=%s tracking=%s player=%s",
        event_type.value,
        payload.partner_slug,
        payload.telegram_user_id,
        payload.tracking_code,
        payload.partner_player_id,
    )
    user = await mark_partner_event(
        session=session,
        partner_slug=payload.partner_slug,
        event_type=event_type,
        telegram_user_id=payload.telegram_user_id,
        tracking_code=payload.tracking_code,
        partner_player_id=payload.partner_player_id,
        payload=payload.payload,
        source=payload.source,
    )
    if user is None:
        logger.warning(
            "Partner webhook %s: user not found for slug=%s tg_id=%s tracking=%s player=%s",
            event_type.value,
            payload.partner_slug,
            payload.telegram_user_id,
            payload.tracking_code,
            payload.partner_player_id,
        )
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut(
        telegram_user_id=user.telegram_user_id,
        username=user.username,
        status=user.status,
        source=user.source,
        partner_slug=user.partner_slug,
        partner_tracking_code=user.partner_tracking_code,
        partner_player_id=user.partner_player_id,
        partner_click_url=user.partner_click_url,
        utm_source=user.utm_source,
        utm_campaign=user.utm_campaign,
        utm_content=user.utm_content,
        created_at=user.created_at,
    )


@app.post("/api/webhooks/partner/registered", response_model=UserOut)
async def partner_registered(
    payload: PartnerEventIn,
    session: AsyncSession = Depends(get_db_session),
    _: None = Depends(require_partner_webhook_secret),
) -> UserOut:
    return await _handle_partner_webhook(payload, EventType.PARTNER_REGISTERED, session)


@app.post("/api/webhooks/partner/converted", response_model=UserOut)
async def partner_converted(
    payload: PartnerEventIn,
    session: AsyncSession = Depends(get_db_session),
    _: None = Depends(require_partner_webhook_secret),
) -> UserOut:
    return await _handle_partner_webhook(payload, EventType.PARTNER_CONVERTED, session)


@app.post(
    "/api/webhooks/partner/deposited",
    response_model=UserOut,
    deprecated=True,
    description="Legacy alias for /api/webhooks/partner/converted. Map your webhooks to /converted if possible.",
)
async def partner_deposited_legacy(
    payload: PartnerEventIn,
    session: AsyncSession = Depends(get_db_session),
    _: None = Depends(require_partner_webhook_secret),
) -> UserOut:
    """
    Deprecated alias for partner conversion events. 
    Kept for backward compatibility with older partner integrations.
    Creates EventType.PARTNER_CONVERTED.
    """
    return await _handle_partner_webhook(payload, EventType.PARTNER_CONVERTED, session)


@app.get(
    "/api/admin/users/{telegram_user_id}",
    response_model=UserDetailOut,
    dependencies=[Depends(require_admin_api_key)],
)
async def admin_user_detail(
    telegram_user_id: int,
    session: AsyncSession = Depends(get_db_session),
) -> UserDetailOut:
    user = await get_user_detail(session, telegram_user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    events_sorted = sorted(user.events, key=lambda e: e.created_at, reverse=True)
    return UserDetailOut(
        telegram_user_id=user.telegram_user_id,
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name,
        status=user.status,
        source=user.source,
        partner_slug=user.partner_slug,
        partner_tracking_code=user.partner_tracking_code,
        partner_player_id=user.partner_player_id,
        partner_click_url=user.partner_click_url,
        utm_source=user.utm_source,
        utm_medium=user.utm_medium,
        utm_campaign=user.utm_campaign,
        utm_content=user.utm_content,
        notes=user.notes,
        created_at=user.created_at,
        updated_at=user.updated_at,
        events=[
            FunnelEventOut(
                id=e.id,
                event_type=e.event_type,
                source=e.source,
                payload=e.payload,
                created_at=e.created_at,
            )
            for e in events_sorted
        ],
    )


@app.get(
    "/api/admin/partner-events",
    response_model=list[PartnerEventOut],
    dependencies=[Depends(require_admin_api_key)],
)
async def admin_partner_events(
    partner_slug: str | None = None,
    event_type: str | None = None,
    limit: int = 100,
    session: AsyncSession = Depends(get_db_session),
) -> list[PartnerEventOut]:
    rows = await list_partner_events(
        session,
        partner_slug=partner_slug,
        event_type=event_type,
        limit=limit,
    )
    return [
        PartnerEventOut(
            id=event.id,
            telegram_user_id=user.telegram_user_id,
            username=user.username,
            event_type=event.event_type,
            partner_slug=user.partner_slug,
            partner_player_id=user.partner_player_id,
            source=event.source,
            payload=event.payload,
            created_at=event.created_at,
        )
        for event, user in rows
    ]


@app.get(
    "/api/admin/verifications",
    response_model=list[VerificationSubmissionOut],
    dependencies=[Depends(require_admin_api_key)],
)
async def admin_verifications(
    status: str = VerificationStatus.PENDING.value,
    source: str | None = None,
    partner_slug: str | None = None,
    utm_campaign: str | None = None,
    session: AsyncSession = Depends(get_db_session),
) -> list[VerificationSubmissionOut]:
    submissions = await list_verification_submissions(
        session,
        status=status,
        source=source,
        partner_slug=partner_slug,
        utm_campaign=utm_campaign,
    )
    return [VerificationSubmissionOut(**to_verification_out(item)) for item in submissions]


@app.post(
    "/api/admin/verifications/{submission_id}/review",
    response_model=VerificationSubmissionOut,
    dependencies=[Depends(require_admin_api_key)],
)
async def review_verification(
    submission_id: int,
    payload: VerificationDecisionIn,
    session: AsyncSession = Depends(get_db_session),
) -> VerificationSubmissionOut:
    try:
        submission = await review_verification_submission(
            session=session,
            submission_id=submission_id,
            decision=payload.decision,
            note=payload.note,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if submission is None:
        raise HTTPException(status_code=404, detail="Verification submission not found")

    telegram_user_id = submission.user.telegram_user_id
    if payload.decision == VerificationStatus.APPROVED.value:
        await notify_verification_approved(telegram_user_id, note=payload.note)
    elif payload.decision == VerificationStatus.REJECTED.value:
        await notify_verification_rejected(telegram_user_id, note=payload.note)

    return VerificationSubmissionOut(**to_verification_out(submission))


TARGET_STATUS_MAP = {
    "all": None,
    "verified": [UserStatus.VERIFIED.value],
    "pending": [UserStatus.PENDING_VERIFICATION.value],
    "new": [UserStatus.NEW.value],
    "not_verified": [
        UserStatus.NEW.value,
        UserStatus.OFFER_CLICKED.value,
    ],
}


@app.post(
    "/api/admin/broadcast",
    response_model=BroadcastResult,
    dependencies=[Depends(require_admin_api_key)],
)
async def admin_broadcast(
    payload: BroadcastIn,
    session: AsyncSession = Depends(get_db_session),
) -> BroadcastResult:
    statuses = TARGET_STATUS_MAP.get(payload.target)
    users = await list_users_by_statuses(session, statuses=statuses)
    sent = 0
    failed = 0
    for user in users:
        ok = await send_message_to_user(user.telegram_user_id, payload.text)
        if ok:
            sent += 1
        else:
            failed += 1
    return BroadcastResult(total=len(users), sent=sent, failed=failed)


@app.post(
    "/api/admin/send-reminders",
    response_model=ReminderResult,
    dependencies=[Depends(require_admin_api_key)],
)
async def admin_send_reminders(
    session: AsyncSession = Depends(get_db_session),
) -> ReminderResult:
    stalled_statuses = [
        UserStatus.NEW.value,
        UserStatus.OFFER_CLICKED.value,
    ]
    users = await list_users_by_statuses(session, statuses=stalled_statuses)
    sent = 0
    failed = 0
    for user in users:
        if user.status == UserStatus.NEW.value:
            text = (
                "Привет! Ты начал регистрацию, но ещё не завершил её.\n\n"
                "Нажми /start, чтобы получить ссылку для регистрации у нашего партнёра. "
                "После регистрации и верификации тебе откроется доступ к сервису."
            )
        else:
            text = (
                "Привет! Ты нажал, что уже зарегистрировался, но не прислал скриншот.\n\n"
                "Отправь скриншот подтверждения регистрации в этот чат, "
                "чтобы мы могли завершить верификацию."
            )
        ok = await send_message_to_user(user.telegram_user_id, text)
        if ok:
            sent += 1
        else:
            failed += 1
    return ReminderResult(total=len(users), sent=sent, failed=failed)
