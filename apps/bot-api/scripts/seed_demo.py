import asyncio
import logging
import os
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, create_mock_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.config import get_settings
from app.models import (
    Base,
    CampaignPreset,
    EventType,
    FunnelEvent,
    User,
    UserStatus,
    VerificationStatus,
    VerificationSubmission,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_demo")

DEMO_MEDIA = {
    "demo_pending.svg": {
        "title": "Pending verification",
        "subtitle": "Demo proof submission",
        "accent": "#6ee7c8",
    },
    "demo_rejected.svg": {
        "title": "Rejected verification",
        "subtitle": "Demo proof submission",
        "accent": "#ff7a66",
    },
}


def ensure_demo_media() -> None:
    settings = get_settings()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)

    for filename, meta in DEMO_MEDIA.items():
        target = settings.upload_dir / filename
        if target.exists():
            continue
        target.write_text(
            f"""<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#101820"/>
      <stop offset="100%" stop-color="#1f2933"/>
    </linearGradient>
  </defs>
  <rect width="960" height="540" fill="url(#bg)"/>
  <rect x="56" y="56" width="848" height="428" rx="28" fill="#141f28" stroke="{meta['accent']}" stroke-width="3"/>
  <circle cx="122" cy="126" r="28" fill="{meta['accent']}"/>
  <text x="172" y="136" fill="#ffffff" font-family="Arial, sans-serif" font-size="34" font-weight="700">{meta['title']}</text>
  <text x="96" y="232" fill="#c9d4df" font-family="Arial, sans-serif" font-size="28">{meta['subtitle']}</text>
  <text x="96" y="306" fill="#8da3b8" font-family="Arial, sans-serif" font-size="22">Generated locally by BotFlow CRM demo seed</text>
  <rect x="96" y="360" width="360" height="48" rx="24" fill="{meta['accent']}" opacity="0.18"/>
  <text x="126" y="392" fill="{meta['accent']}" font-family="Arial, sans-serif" font-size="20" font-weight="700">botflow-crm-demo</text>
</svg>
""",
            encoding="utf-8",
        )

async def get_engine():
    settings = get_settings()
    db_url = settings.database_url
    
    # Heuristic: if we are on host and db_url points to 'postgres' host (docker),
    # but localhost:5432 is not open, or if we just want a fallback for demo.
    # dev-start.ps1 uses runtime.sqlite3 as fallback.
    
    candidate_urls = [db_url]
    if "postgres" in db_url and "localhost" not in db_url and "127.0.0.1" not in db_url:
        # Likely a docker internal URL, add a localhost variant and sqlite fallback
        candidate_urls.append(db_url.replace("@postgres", "@localhost"))
        candidate_urls.append("sqlite+aiosqlite:///./runtime.sqlite3")
        candidate_urls.append("sqlite+aiosqlite:///./botflow_crm.sqlite3")

    for url in candidate_urls:
        try:
            engine = create_async_engine(url)
            async with engine.connect() as conn:
                await conn.execute(select(1))
            logger.info(f"Connected to database using {url}")
            return engine
        except Exception:
            continue
    
    return None

async def seed_data():
    logger.info("Starting demo seed...")
    ensure_demo_media()
    
    engine = await get_engine()
    if not engine:
        logger.error("Could not connect to any database. Please ensure PostgreSQL is running or 'runtime.sqlite3' exists.")
        logger.error("Try running 'npm run dev:start' first.")
        return

    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            # Check if tables exist
            await session.execute(select(User).limit(1))
        except Exception:
            logger.error("Database tables are missing or schema is outdated.")
            logger.error("Please run 'npm run db:migrate' or 'npm run dev:start' to initialize the database.")
            return

        # 2. Create Users
        users_data = [
            {"id": 1001, "username": "active_lead", "status": UserStatus.VERIFIED},
            {"id": 1002, "username": "pending_check", "status": UserStatus.PENDING_VERIFICATION},
            {"id": 1003, "username": "just_started", "status": UserStatus.NEW},
            {"id": 1004, "username": "clicked_offer", "status": UserStatus.OFFER_CLICKED},
            {"id": 1005, "username": "rejected_lead", "status": UserStatus.REJECTED},
            {"id": 1006, "username": "legacy_user", "status": UserStatus.VERIFIED},
        ]
        
        created_users = []
        for u_dict in users_data:
            stmt = select(User).where(User.telegram_user_id == u_dict["id"])
            user = await session.scalar(stmt)
            if not user:
                user = User(
                    telegram_user_id=u_dict["id"],
                    username=u_dict["username"],
                    first_name=u_dict["username"].capitalize(),
                    status=u_dict["status"].value,
                    partner_tracking_code=f"track_{u_dict['id']}",
                    source="direct",
                    utm_source="portfolio",
                    utm_campaign="demo-seed",
                )
                session.add(user)
                await session.flush()
                logger.info(f"Created user {u_dict['username']}")
            created_users.append(user)
        
        # 3. Add Funnel Events
        now = datetime.now(timezone.utc)
        events_to_add = [
            (created_users[0], EventType.START.value, now - timedelta(days=2)),
            (created_users[0], EventType.OFFER_CLICK.value, now - timedelta(days=2, hours=1)),
            (created_users[0], EventType.PARTNER_REGISTERED.value, now - timedelta(days=2, hours=2)),
            (created_users[0], EventType.PARTNER_CONVERTED.value, now - timedelta(days=1)),
            
            (created_users[1], EventType.START.value, now - timedelta(hours=5)),
            (created_users[1], EventType.SCREENSHOT_SUBMITTED.value, now - timedelta(hours=4)),
            
            (created_users[5], "partner_deposited", now - timedelta(days=5)),
        ]
        
        for user, e_type, created_at in events_to_add:
            stmt = select(FunnelEvent).where(
                FunnelEvent.user_id == user.id,
                FunnelEvent.event_type == e_type
            )
            existing = await session.scalar(stmt)
            if not existing:
                session.add(FunnelEvent(
                    user_id=user.id,
                    event_type=e_type,
                    created_at=created_at,
                    source=user.source
                ))
                logger.info(f"Added event {e_type} for user {user.username}")
        
        # 4. Add Verification Submissions
        submissions_data = [
            {
                "user": created_users[1],
                "file_id": "demo_file_pending",
                "unique_id": "pending_uid",
                "path": "demo_pending.svg",
                "status": VerificationStatus.PENDING,
                "at": now - timedelta(hours=4)
            },
            {
                "user": created_users[4],
                "file_id": "demo_file_rejected",
                "unique_id": "rejected_uid",
                "path": "demo_rejected.svg",
                "status": VerificationStatus.REJECTED,
                "at": now - timedelta(days=1),
                "note": "Image is blurry"
            },
        ]
        
        for sub in submissions_data:
            stmt = select(VerificationSubmission).where(
                VerificationSubmission.telegram_file_id == sub["file_id"]
            )
            existing = await session.scalar(stmt)
            if not existing:
                session.add(VerificationSubmission(
                    user_id=sub["user"].id,
                    telegram_file_id=sub["file_id"],
                    telegram_file_unique_id=sub["unique_id"],
                    stored_path=sub["path"],
                    status=sub["status"].value,
                    submitted_at=sub["at"],
                    admin_note=sub.get("note")
                ))
                logger.info(f"Added submission for user {sub['user'].username}")
            else:
                existing.stored_path = sub["path"]
                existing.status = sub["status"].value
                existing.admin_note = sub.get("note")
        
        # 5. Add Campaign Presets
        presets_data = [
            CampaignPreset(
                name="Google Ads / Search / April",
                source="google",
                utm_source="google",
                utm_medium="search",
                utm_campaign="april_promo",
                partner_slug="saas-platform",
                landing_path="/register",
                is_favorite=True,
                sort_order=1,
            ),
            CampaignPreset(
                name="Facebook / Reels / Video-01",
                source="facebook",
                utm_source="fb",
                utm_medium="reels",
                utm_campaign="spring_deals",
                utm_content="video_01",
                partner_slug="market-service",
                landing_path="/",
                is_favorite=False,
                sort_order=2,
            ),
        ]
        
        for p in presets_data:
            existing = await session.scalar(select(CampaignPreset).where(CampaignPreset.name == p.name))
            if not existing:
                session.add(p)
                logger.info(f"Created preset {p.name}")

        await session.commit()
        logger.info("Demo data seeded successfully!")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed_data())
