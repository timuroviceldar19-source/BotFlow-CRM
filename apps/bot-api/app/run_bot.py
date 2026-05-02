from __future__ import annotations

import asyncio

from app.config import get_settings
from app.bot import create_bot, create_dispatcher
from app.db import init_db
from app.services.notification_service import set_bot_instance


async def main() -> None:
    await init_db()
    settings = get_settings()
    token = settings.bot_token.strip()
    bot_mode = settings.bot_mode.strip().lower()
    if bot_mode in {"disabled", "off", "none"} or token.startswith("CHANGE_ME") or token == "replace-me":
        print("Telegram bot polling skipped. Set BOT_MODE=polling and BOT_TOKEN to enable it.")
        return

    bot = create_bot()
    set_bot_instance(bot)
    dispatcher = create_dispatcher()
    await dispatcher.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
