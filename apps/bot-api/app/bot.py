from __future__ import annotations

from aiogram import Bot, Dispatcher

from app.config import get_settings
from app.handlers.start import router as start_router


def create_dispatcher() -> Dispatcher:
    dispatcher = Dispatcher()
    dispatcher.include_router(start_router)
    return dispatcher


def create_bot() -> Bot:
    settings = get_settings()
    return Bot(token=settings.bot_token)

