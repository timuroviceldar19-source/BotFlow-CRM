import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.models import Base, User, FunnelEvent, EventType, UserStatus
from app.services.user_service import mark_partner_event, get_overview_stats

# Use in-memory SQLite for testing
DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as session:
        yield session
    
    await engine.dispose()

@pytest.mark.asyncio
async def test_mark_partner_event_by_id(db_session):
    # Create a user
    user = User(telegram_user_id=123, status=UserStatus.NEW.value)
    db_session.add(user)
    await db_session.commit()
    
    # Mark event
    updated_user = await mark_partner_event(db_session, "demo-partner", EventType.PARTNER_CONVERTED, telegram_user_id=123)
    
    assert updated_user is not None
    assert updated_user.telegram_user_id == 123
    
    # Check if event was created
    from sqlalchemy import select
    events = await db_session.scalars(select(FunnelEvent).where(FunnelEvent.user_id == user.id))
    event_list = events.all()
    assert len(event_list) == 1
    assert event_list[0].event_type == EventType.PARTNER_CONVERTED.value

@pytest.mark.asyncio
async def test_mark_partner_event_by_tracking_code(db_session):
    user = User(telegram_user_id=456, partner_tracking_code="track_456")
    db_session.add(user)
    await db_session.commit()
    
    updated_user = await mark_partner_event(db_session, "demo-partner", EventType.PARTNER_REGISTERED, tracking_code="track_456")
    assert updated_user is not None
    assert updated_user.telegram_user_id == 456

@pytest.mark.asyncio
async def test_get_overview_stats_with_legacy_data(db_session):
    u1 = User(telegram_user_id=1, status=UserStatus.VERIFIED.value)
    u2 = User(telegram_user_id=2, status=UserStatus.NEW.value)
    db_session.add_all([u1, u2])
    await db_session.flush()
    
    # New event
    e1 = FunnelEvent(user_id=u1.id, event_type=EventType.PARTNER_CONVERTED.value)
    # Legacy event
    e2 = FunnelEvent(user_id=u2.id, event_type="partner_deposited")
    db_session.add_all([e1, e2])
    await db_session.commit()
    
    stats = await get_overview_stats(db_session)
    assert stats["total_users"] == 2
    assert stats["conversions"] == 2 # Both new and legacy counted
    assert stats["verified_users"] == 1
