from __future__ import annotations

import logging

from aiogram import Bot

from app.config import get_settings

logger = logging.getLogger(__name__)

_bot_instance: Bot | None = None


def set_bot_instance(bot: Bot) -> None:
    global _bot_instance
    _bot_instance = bot


def get_bot_instance() -> Bot | None:
    return _bot_instance


async def notify_verification_approved(telegram_user_id: int, note: str | None = None) -> bool:
    bot = get_bot_instance()
    if bot is None:
        logger.warning("Bot instance not set, cannot send notification")
        return False

    text = (
        "Твой скриншот одобрен! Верификация пройдена.\n\n"
        "Теперь тебе открыт полный доступ к нашему сервису. "
        "Следи за обновлениями в этом чате."
    )
    if note:
        text += f"\n\nКомментарий модератора: {note}"

    try:
        await bot.send_message(telegram_user_id, text)
        return True
    except Exception:
        logger.exception("Failed to send approval notification to %s", telegram_user_id)
        return False


async def notify_verification_rejected(telegram_user_id: int, note: str | None = None) -> bool:
    bot = get_bot_instance()
    if bot is None:
        logger.warning("Bot instance not set, cannot send notification")
        return False

    text = (
        "К сожалению, твой скриншот не прошёл проверку.\n\n"
        "Убедись, что на скриншоте видно подтверждение регистрации, "
        "и отправь новый скриншот."
    )
    if note:
        text += f"\n\nПричина: {note}"

    try:
        await bot.send_message(telegram_user_id, text)
        return True
    except Exception:
        logger.exception("Failed to send rejection notification to %s", telegram_user_id)
        return False


async def send_message_to_user(telegram_user_id: int, text: str) -> bool:
    bot = get_bot_instance()
    if bot is None:
        logger.warning("Bot instance not set, cannot send message")
        return False

    try:
        await bot.send_message(telegram_user_id, text)
        return True
    except Exception:
        logger.exception("Failed to send message to %s", telegram_user_id)
        return False
