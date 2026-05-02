from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CampaignPreset
from app.schemas import CampaignPresetIn


async def list_campaign_presets(session: AsyncSession) -> list[CampaignPreset]:
    result = await session.execute(
        select(CampaignPreset).order_by(
            CampaignPreset.is_archived.asc(),
            CampaignPreset.is_favorite.desc(),
            CampaignPreset.sort_order.asc(),
            CampaignPreset.updated_at.desc(),
            CampaignPreset.name.asc(),
        )
    )
    return list(result.scalars().all())


async def upsert_campaign_preset(
    session: AsyncSession,
    payload: CampaignPresetIn,
) -> CampaignPreset:
    statement = select(CampaignPreset)
    if payload.id is not None:
        statement = statement.where(CampaignPreset.id == payload.id)
    else:
        statement = statement.where(CampaignPreset.name == payload.name)

    result = await session.execute(statement)
    preset = result.scalar_one_or_none()

    if preset is None:
        preset = CampaignPreset()
        max_sort_order = await session.scalar(select(func.max(CampaignPreset.sort_order)))
        preset.sort_order = (max_sort_order or 0) + 10

    preset.name = payload.name
    preset.source = payload.source
    preset.utm_source = payload.utm_source
    preset.utm_medium = payload.utm_medium
    preset.utm_campaign = payload.utm_campaign
    preset.utm_content = payload.utm_content
    preset.partner_slug = payload.partner_slug
    preset.landing_path = payload.landing_path
    preset.is_favorite = payload.is_favorite
    preset.is_archived = payload.is_archived
    if payload.sort_order is not None:
        preset.sort_order = payload.sort_order

    session.add(preset)
    await session.commit()
    await session.refresh(preset)
    return preset


async def delete_campaign_preset(
    session: AsyncSession,
    preset_id: int,
) -> bool:
    result = await session.execute(
        select(CampaignPreset).where(CampaignPreset.id == preset_id)
    )
    preset = result.scalar_one_or_none()
    if preset is None:
        return False

    await session.delete(preset)
    await session.commit()
    return True
