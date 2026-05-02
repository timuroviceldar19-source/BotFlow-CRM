from __future__ import annotations

from datetime import datetime, timezone
from secrets import token_urlsafe
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.models import (
    EventType,
    FunnelEvent,
    User,
    UserStatus,
    VerificationStatus,
    VerificationSubmission,
)


def parse_start_payload(payload: str | None) -> dict[str, str | None]:
    if not payload:
        return {
            "source": "telegram",
            "utm_source": None,
            "utm_medium": None,
            "utm_campaign": None,
            "utm_content": None,
            "partner_slug": None,
        }

    data: dict[str, str | None] = {
        "source": "telegram",
        "utm_source": None,
        "utm_medium": None,
        "utm_campaign": None,
        "utm_content": None,
        "partner_slug": None,
    }
    for chunk in payload.split("__"):
        if "-" not in chunk:
            data["source"] = chunk
            continue
        key, value = chunk.split("-", 1)
        if key == "src":
            data["source"] = value
        elif key == "utm_source":
            data["utm_source"] = value
        elif key == "utm_medium":
            data["utm_medium"] = value
        elif key == "utm_campaign":
            data["utm_campaign"] = value
        elif key == "utm_content":
            data["utm_content"] = value
        elif key == "partner":
            data["partner_slug"] = value
    return data


def generate_tracking_code(telegram_user_id: int) -> str:
    return f"tg{telegram_user_id}-{token_urlsafe(6)}"


def build_partner_click_url(
    base_url: str,
    tracking_param: str,
    tracking_code: str,
    telegram_user_id: int,
) -> str:
    parts = urlsplit(base_url)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query[tracking_param] = tracking_code
    query["telegram_id"] = str(telegram_user_id)
    return urlunsplit(
        (parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment)
    )


async def upsert_user_from_telegram(
    session: AsyncSession,
    telegram_user_id: int,
    username: str | None,
    first_name: str | None,
    last_name: str | None,
    start_payload: str | None,
    partner_base_url: str,
    tracking_param: str,
) -> User:
    result = await session.execute(
        select(User).where(User.telegram_user_id == telegram_user_id)
    )
    user = result.scalar_one_or_none()
    parsed = parse_start_payload(start_payload)

    if user is None:
        tracking_code = generate_tracking_code(telegram_user_id)
        user = User(
            telegram_user_id=telegram_user_id,
            username=username,
            first_name=first_name,
            last_name=last_name,
            partner_tracking_code=tracking_code,
            partner_click_url=build_partner_click_url(
                partner_base_url,
                tracking_param,
                tracking_code,
                telegram_user_id,
            ),
            **parsed,
        )
        session.add(user)
        try:
            await session.flush()
        except IntegrityError:
            await session.rollback()
            result = await session.execute(
                select(User).where(User.telegram_user_id == telegram_user_id)
            )
            user = result.scalar_one()
    else:
        user.username = username
        user.first_name = first_name
        user.last_name = last_name
        if not user.partner_tracking_code:
            user.partner_tracking_code = generate_tracking_code(telegram_user_id)
        user.partner_click_url = build_partner_click_url(
            partner_base_url,
            tracking_param,
            user.partner_tracking_code,
            telegram_user_id,
        )
        for field, value in parsed.items():
            if value:
                setattr(user, field, value)

    session.add(
        FunnelEvent(
            user_id=user.id,
            event_type=EventType.START.value,
            source=user.source,
            payload=start_payload,
        )
    )
    await session.commit()
    await session.refresh(user)
    return user


async def mark_offer_clicked(session: AsyncSession, user: User) -> User:
    user.status = UserStatus.OFFER_CLICKED.value
    session.add(
        FunnelEvent(
            user_id=user.id,
            event_type=EventType.OFFER_CLICK.value,
            source=user.source,
        )
    )
    await session.commit()
    await session.refresh(user)
    return user


async def mark_partner_event(
    session: AsyncSession,
    partner_slug: str,
    event_type: EventType,
    telegram_user_id: int | None = None,
    tracking_code: str | None = None,
    partner_player_id: str | None = None,
    payload: str | None = None,
    source: str | None = None,
) -> User | None:
    statement = select(User)
    if telegram_user_id is not None:
        statement = statement.where(User.telegram_user_id == telegram_user_id)
    elif tracking_code:
        statement = statement.where(User.partner_tracking_code == tracking_code)
    elif partner_player_id:
        statement = statement.where(User.partner_player_id == partner_player_id)
    else:
        return None

    result = await session.execute(statement)
    user = result.scalar_one_or_none()
    if user is None:
        return None

    user.partner_slug = partner_slug
    if partner_player_id:
        user.partner_player_id = partner_player_id
    if event_type == EventType.PARTNER_REGISTERED:
        user.status = UserStatus.PENDING_VERIFICATION.value
    elif event_type == EventType.PARTNER_CONVERTED:
        user.status = UserStatus.VERIFIED.value

    session.add(
        FunnelEvent(
            user_id=user.id,
            event_type=event_type.value,
            source=source or user.source,
            payload=payload,
        )
    )
    await session.commit()
    await session.refresh(user)
    return user


def _apply_user_filters(
    statement,
    source: str | None = None,
    partner_slug: str | None = None,
    utm_campaign: str | None = None,
):
    if source:
        statement = statement.where(User.source == source)
    if partner_slug:
        statement = statement.where(User.partner_slug == partner_slug)
    if utm_campaign:
        statement = statement.where(User.utm_campaign == utm_campaign)
    return statement


async def get_overview_stats(
    session: AsyncSession,
    source: str | None = None,
    partner_slug: str | None = None,
    utm_campaign: str | None = None,
) -> dict[str, int]:
    total_users = await session.scalar(
        _apply_user_filters(select(func.count(User.id)), source, partner_slug, utm_campaign)
    )
    verified_users = await session.scalar(
        _apply_user_filters(
            select(func.count(User.id)).where(User.status == UserStatus.VERIFIED.value),
            source,
            partner_slug,
            utm_campaign,
        )
    )
    pending_users = await session.scalar(
        _apply_user_filters(
            select(func.count(User.id)).where(
                User.status == UserStatus.PENDING_VERIFICATION.value
            ),
            source,
            partner_slug,
            utm_campaign,
        )
    )
    conversion_statement = (
        select(func.count(FunnelEvent.id))
        .select_from(FunnelEvent)
        .join(User, User.id == FunnelEvent.user_id)
        .where(FunnelEvent.event_type.in_([
            EventType.PARTNER_CONVERTED.value,
            "partner_deposited"  # Backward compatibility for legacy data
        ]))
    )
    conversion_statement = _apply_user_filters(
        conversion_statement,
        source,
        partner_slug,
        utm_campaign,
    )
    conversions = await session.scalar(conversion_statement)
    return {
        "total_users": total_users or 0,
        "verified_users": verified_users or 0,
        "conversions": conversions or 0,
        "pending_users": pending_users or 0,
    }


async def get_user_by_telegram_id(
    session: AsyncSession,
    telegram_user_id: int,
) -> User | None:
    result = await session.execute(
        select(User).where(User.telegram_user_id == telegram_user_id)
    )
    return result.scalar_one_or_none()


async def list_users(
    session: AsyncSession,
    source: str | None = None,
    partner_slug: str | None = None,
    status: str | None = None,
    utm_campaign: str | None = None,
) -> list[User]:
    statement = select(User).order_by(User.created_at.desc())
    statement = _apply_user_filters(statement, source, partner_slug, utm_campaign)
    if status:
        statement = statement.where(User.status == status)
    result = await session.execute(statement)
    return list(result.scalars().all())


async def create_verification_submission(
    session: AsyncSession,
    user: User,
    telegram_file_id: str,
    telegram_file_unique_id: str,
    stored_path: str,
    original_filename: str | None,
    mime_type: str | None,
) -> VerificationSubmission:
    user.status = UserStatus.PENDING_VERIFICATION.value
    submission = VerificationSubmission(
        user_id=user.id,
        telegram_file_id=telegram_file_id,
        telegram_file_unique_id=telegram_file_unique_id,
        stored_path=stored_path,
        original_filename=original_filename,
        mime_type=mime_type,
    )
    session.add(submission)
    session.add(
        FunnelEvent(
            user_id=user.id,
            event_type=EventType.SCREENSHOT_SUBMITTED.value,
            source=user.source,
            payload=stored_path,
        )
    )
    await session.commit()
    await session.refresh(submission)
    return submission


async def list_verification_submissions(
    session: AsyncSession,
    status: str | None = None,
    source: str | None = None,
    partner_slug: str | None = None,
    utm_campaign: str | None = None,
) -> list[VerificationSubmission]:
    statement = (
        select(VerificationSubmission)
        .options(selectinload(VerificationSubmission.user))
        .join(VerificationSubmission.user)
        .order_by(VerificationSubmission.submitted_at.desc())
    )
    if status:
        statement = statement.where(VerificationSubmission.status == status)
    statement = _apply_user_filters(statement, source, partner_slug, utm_campaign)
    result = await session.execute(statement)
    return list(result.scalars().all())


async def review_verification_submission(
    session: AsyncSession,
    submission_id: int,
    decision: str,
    note: str | None = None,
) -> VerificationSubmission | None:
    result = await session.execute(
        select(VerificationSubmission)
        .options(selectinload(VerificationSubmission.user))
        .where(VerificationSubmission.id == submission_id)
    )
    submission = result.scalar_one_or_none()
    if submission is None:
        return None

    if decision == VerificationStatus.APPROVED.value:
        submission.status = VerificationStatus.APPROVED.value
        submission.user.status = UserStatus.VERIFIED.value
        event_type = EventType.VERIFICATION_APPROVED.value
    elif decision == VerificationStatus.REJECTED.value:
        submission.status = VerificationStatus.REJECTED.value
        submission.user.status = UserStatus.REJECTED.value
        event_type = EventType.VERIFICATION_REJECTED.value
    else:
        raise ValueError("Unsupported verification decision")

    submission.admin_note = note
    submission.reviewed_at = datetime.now(timezone.utc)
    session.add(
        FunnelEvent(
            user_id=submission.user_id,
            event_type=event_type,
            source=submission.user.source,
            payload=note,
        )
    )
    await session.commit()
    await session.refresh(submission)
    return submission


async def get_user_detail(
    session: AsyncSession,
    telegram_user_id: int,
) -> User | None:
    result = await session.execute(
        select(User)
        .options(selectinload(User.events))
        .where(User.telegram_user_id == telegram_user_id)
    )
    return result.scalar_one_or_none()


async def list_partner_events(
    session: AsyncSession,
    partner_slug: str | None = None,
    event_type: str | None = None,
    limit: int = 100,
) -> list[tuple[FunnelEvent, User]]:
    partner_types = [
        EventType.PARTNER_REGISTERED.value,
        EventType.PARTNER_CONVERTED.value,
    ]
    statement = (
        select(FunnelEvent, User)
        .join(User, User.id == FunnelEvent.user_id)
        .where(FunnelEvent.event_type.in_(partner_types))
        .order_by(FunnelEvent.created_at.desc())
        .limit(limit)
    )
    if partner_slug:
        statement = statement.where(User.partner_slug == partner_slug)
    if event_type and event_type in partner_types:
        statement = statement.where(FunnelEvent.event_type == event_type)
    result = await session.execute(statement)
    return list(result.tuples().all())


async def list_users_by_statuses(
    session: AsyncSession,
    statuses: list[str] | None = None,
) -> list[User]:
    statement = select(User).order_by(User.created_at.desc())
    if statuses:
        statement = statement.where(User.status.in_(statuses))
    result = await session.execute(statement)
    return list(result.scalars().all())


def to_verification_out(submission: VerificationSubmission):
    settings = get_settings()
    public_path = submission.stored_path.replace("\\", "/")
    return {
        "id": submission.id,
        "telegram_user_id": submission.user.telegram_user_id,
        "username": submission.user.username,
        "source": submission.user.source,
        "partner_slug": submission.user.partner_slug,
        "utm_campaign": submission.user.utm_campaign,
        "status": submission.status,
        "media_url": f"{settings.app_base_url}/uploads/{public_path}",
        "submitted_at": submission.submitted_at,
        "admin_note": submission.admin_note,
    }
