from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from aiogram import F, Router
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.types import (
    CallbackQuery,
    Document,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    PhotoSize,
)

from app.config import get_settings
from app.db import SessionLocal
from app.models import UserStatus
from app.services.user_service import (
    create_verification_submission,
    get_user_by_telegram_id,
    mark_offer_clicked,
    upsert_user_from_telegram,
)


router = Router()

STATUS_LABELS = {
    UserStatus.NEW.value: "Новый — регистрация ещё не начата",
    UserStatus.OFFER_CLICKED.value: "Нажал «уже зарегистрировался» — ждём скриншот",
    UserStatus.PENDING_VERIFICATION.value: "Скриншот на проверке у модератора",
    UserStatus.VERIFIED.value: "Верифицирован — доступ открыт",
    UserStatus.REJECTED.value: "Отклонён — скриншот не прошёл проверку",
}


def registration_keyboard(url: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Зарегистрироваться", url=url)],
            [InlineKeyboardButton(text="Уже зарегистрировался", callback_data="already_registered")],
            [InlineKeyboardButton(text="Мой статус", callback_data="check_status")],
        ]
    )


def verified_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Мой статус", callback_data="check_status")],
        ]
    )


def _guess_extension(
    original_filename: str | None,
    mime_type: str | None,
    fallback: str = ".jpg",
) -> str:
    suffix = Path(original_filename or "").suffix.lower()
    if suffix:
        return suffix
    if mime_type == "image/png":
        return ".png"
    if mime_type == "image/webp":
        return ".webp"
    if mime_type == "image/jpeg":
        return ".jpg"
    return fallback


async def _store_screenshot(
    message: Message,
    file_id: str,
    original_filename: str | None,
    mime_type: str | None,
) -> str:
    settings = get_settings()
    target_dir = settings.screenshots_dir / str(message.from_user.id)
    target_dir.mkdir(parents=True, exist_ok=True)
    destination = target_dir / f"{uuid4().hex}{_guess_extension(original_filename, mime_type)}"
    telegram_file = await message.bot.get_file(file_id)
    await message.bot.download(telegram_file, destination=destination)
    return str(destination.relative_to(settings.upload_dir))


async def _handle_verification_upload(
    message: Message,
    file_id: str,
    file_unique_id: str,
    original_filename: str | None,
    mime_type: str | None,
) -> None:
    async with SessionLocal() as session:
        user = await get_user_by_telegram_id(session, message.from_user.id)
        if user is None:
            await message.answer(
                "Сначала нажми /start, чтобы начать процесс регистрации."
            )
            return

        if user.status == UserStatus.VERIFIED.value:
            await message.answer(
                "Ты уже верифицирован! Доступ открыт.",
                reply_markup=verified_keyboard(),
            )
            return

        if user.status == UserStatus.PENDING_VERIFICATION.value:
            await message.answer(
                "Твой предыдущий скриншот уже на проверке. Дождись результата — обычно это занимает несколько минут."
            )
            return

        stored_path = await _store_screenshot(
            message=message,
            file_id=file_id,
            original_filename=original_filename,
            mime_type=mime_type,
        )
        await create_verification_submission(
            session=session,
            user=user,
            telegram_file_id=file_id,
            telegram_file_unique_id=file_unique_id,
            stored_path=stored_path,
            original_filename=original_filename,
            mime_type=mime_type,
        )

    await message.answer(
        "Скриншот получен и отправлен на проверку.\n\n"
        "Модератор рассмотрит его в ближайшее время. "
        "После одобрения ты получишь уведомление и полный доступ к сервису."
    )


@router.message(CommandStart(deep_link=True))
@router.message(CommandStart())
async def handle_start(message: Message, command: CommandObject | None = None) -> None:
    settings = get_settings()
    start_payload = command.args if command else None

    async with SessionLocal() as session:
        user = await upsert_user_from_telegram(
            session=session,
            telegram_user_id=message.from_user.id,
            username=message.from_user.username,
            first_name=message.from_user.first_name,
            last_name=message.from_user.last_name,
            start_payload=start_payload,
            partner_base_url=settings.partner_default_url,
            tracking_param=settings.partner_tracking_param,
        )

    name = message.from_user.first_name or "друг"
    partner_url = user.partner_click_url or settings.partner_default_url

    if user.status == UserStatus.VERIFIED.value:
        await message.answer(
            f"С возвращением, {name}! Ты уже верифицирован — доступ открыт.",
            reply_markup=verified_keyboard(),
        )
        return

    if user.status == UserStatus.PENDING_VERIFICATION.value:
        await message.answer(
            f"Привет, {name}! Твой скриншот сейчас на проверке у модератора. "
            "Я напишу тебе, как только будет результат.",
            reply_markup=verified_keyboard(),
        )
        return

    copy = (
        f"Привет, {name}! Добро пожаловать.\n\n"
        "Здесь ты получишь доступ к эксклюзивному контенту "
        "после регистрации у нашего партнёра по ссылке ниже.\n\n"
        "Как это работает:\n"
        "1. Нажми «Зарегистрироваться» — откроется сайт партнёра.\n"
        "2. Пройди регистрацию на сайте.\n"
        "3. Вернись сюда и нажми «Уже зарегистрировался».\n"
        "4. Пришли скриншот подтверждения регистрации.\n"
        "5. После проверки — получишь доступ.\n\n"
        "Нажми кнопку ниже, чтобы начать."
    )
    await message.answer(copy, reply_markup=registration_keyboard(partner_url))


@router.callback_query(F.data == "already_registered")
async def handle_already_registered(callback_query: CallbackQuery) -> None:
    settings = get_settings()

    async with SessionLocal() as session:
        user = await upsert_user_from_telegram(
            session=session,
            telegram_user_id=callback_query.from_user.id,
            username=callback_query.from_user.username,
            first_name=callback_query.from_user.first_name,
            last_name=callback_query.from_user.last_name,
            start_payload=None,
            partner_base_url=settings.partner_default_url,
            tracking_param=settings.partner_tracking_param,
        )

        if user.status == UserStatus.VERIFIED.value:
            await callback_query.message.answer(
                "Ты уже верифицирован! Доступ открыт.",
                reply_markup=verified_keyboard(),
            )
            await callback_query.answer()
            return

        if user.status == UserStatus.PENDING_VERIFICATION.value:
            await callback_query.message.answer(
                "Твой скриншот уже на проверке. Дождись результата."
            )
            await callback_query.answer()
            return

        await mark_offer_clicked(session, user)

    await callback_query.message.answer(
        "Отлично! Теперь пришли скриншот подтверждения регистрации.\n\n"
        "Что подойдёт:\n"
        "— скриншот экрана «регистрация завершена»\n"
        "— скриншот личного кабинета с логином\n"
        "— скриншот письма-подтверждения\n\n"
        "Просто отправь изображение в этот чат."
    )
    await callback_query.answer()


@router.callback_query(F.data == "check_status")
async def handle_check_status(callback_query: CallbackQuery) -> None:
    async with SessionLocal() as session:
        user = await get_user_by_telegram_id(session, callback_query.from_user.id)

    if user is None:
        await callback_query.message.answer("Нажми /start, чтобы начать.")
        await callback_query.answer()
        return

    label = STATUS_LABELS.get(user.status, user.status)
    await callback_query.message.answer(f"Твой текущий статус: {label}")
    await callback_query.answer()


@router.message(Command("status"))
async def handle_status_command(message: Message) -> None:
    async with SessionLocal() as session:
        user = await get_user_by_telegram_id(session, message.from_user.id)

    if user is None:
        await message.answer("Нажми /start, чтобы начать.")
        return

    label = STATUS_LABELS.get(user.status, user.status)
    text = (
        f"Статус: {label}\n"
        f"Источник: {user.source or '—'}\n"
        f"Партнёр: {user.partner_slug or '—'}\n"
        f"Tracking: {user.partner_tracking_code or '—'}"
    )
    await message.answer(text)


@router.message(Command("help"))
async def handle_help_command(message: Message) -> None:
    await message.answer(
        "Доступные команды:\n\n"
        "/start — начать или перезапустить бота\n"
        "/status — проверить свой текущий статус\n"
        "/help — показать эту справку\n\n"
        "Чтобы пройти верификацию, отправь скриншот регистрации как изображение."
    )


@router.message(F.photo)
async def handle_verification_photo(message: Message) -> None:
    photo: PhotoSize = message.photo[-1]
    await _handle_verification_upload(
        message=message,
        file_id=photo.file_id,
        file_unique_id=photo.file_unique_id,
        original_filename="telegram_photo.jpg",
        mime_type="image/jpeg",
    )


@router.message(F.document)
async def handle_verification_document(message: Message) -> None:
    document: Document = message.document
    if not document.mime_type or not document.mime_type.startswith("image/"):
        await message.answer(
            "Для верификации пришли изображение: скриншот в формате JPG, PNG или WebP."
        )
        return

    await _handle_verification_upload(
        message=message,
        file_id=document.file_id,
        file_unique_id=document.file_unique_id,
        original_filename=document.file_name,
        mime_type=document.mime_type,
    )


@router.message()
async def handle_unknown_message(message: Message) -> None:
    await message.answer(
        "Не понимаю это сообщение. Используй /help для списка команд.\n"
        "Если хочешь пройти верификацию — отправь скриншот как изображение."
    )
