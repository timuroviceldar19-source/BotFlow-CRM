"""baseline schema

Revision ID: 20260331_0001
Revises:
Create Date: 2026-03-31 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260331_0001"
down_revision = None
branch_labels = None
depends_on = None


def _table_names(bind) -> set[str]:
    return set(inspect(bind).get_table_names())


def _column_names(bind, table_name: str) -> set[str]:
    return {column["name"] for column in inspect(bind).get_columns(table_name)}


def _index_names(bind, table_name: str) -> set[str]:
    return {index["name"] for index in inspect(bind).get_indexes(table_name)}


def _create_users_table() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("telegram_user_id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=128), nullable=True),
        sa.Column("first_name", sa.String(length=128), nullable=True),
        sa.Column("last_name", sa.String(length=128), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=True),
        sa.Column("utm_source", sa.String(length=64), nullable=True),
        sa.Column("utm_medium", sa.String(length=64), nullable=True),
        sa.Column("utm_campaign", sa.String(length=128), nullable=True),
        sa.Column("utm_content", sa.String(length=128), nullable=True),
        sa.Column("partner_slug", sa.String(length=32), nullable=True),
        sa.Column("partner_tracking_code", sa.String(length=64), nullable=True),
        sa.Column("partner_player_id", sa.String(length=128), nullable=True),
        sa.Column("partner_click_url", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_telegram_user_id", "users", ["telegram_user_id"], unique=True)
    op.create_index("ix_users_partner_tracking_code", "users", ["partner_tracking_code"], unique=True)
    op.create_index("ix_users_partner_player_id", "users", ["partner_player_id"], unique=False)


def _create_funnel_events_table() -> None:
    op.create_table(
        "funnel_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=True),
        sa.Column("payload", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_funnel_events_user_id", "funnel_events", ["user_id"], unique=False)
    op.create_index("ix_funnel_events_event_type", "funnel_events", ["event_type"], unique=False)


def _create_verification_submissions_table() -> None:
    op.create_table(
        "verification_submissions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("telegram_file_id", sa.String(length=255), nullable=False),
        sa.Column("telegram_file_unique_id", sa.String(length=255), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=True),
        sa.Column("mime_type", sa.String(length=128), nullable=True),
        sa.Column("stored_path", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_verification_submissions_user_id", "verification_submissions", ["user_id"], unique=False)
    op.create_index("ix_verification_submissions_status", "verification_submissions", ["status"], unique=False)


def _create_campaign_presets_table() -> None:
    op.create_table(
        "campaign_presets",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.Column("utm_source", sa.String(length=64), nullable=False),
        sa.Column("utm_medium", sa.String(length=64), nullable=False),
        sa.Column("utm_campaign", sa.String(length=128), nullable=True),
        sa.Column("utm_content", sa.String(length=128), nullable=True),
        sa.Column("partner_slug", sa.String(length=64), nullable=True),
        sa.Column("landing_path", sa.String(length=255), nullable=False),
        sa.Column("is_favorite", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_campaign_presets_name", "campaign_presets", ["name"], unique=True)
    op.create_index("ix_campaign_presets_sort_order", "campaign_presets", ["sort_order"], unique=False)
    op.create_index(
        "ix_campaign_presets_flags",
        "campaign_presets",
        ["is_archived", "is_favorite"],
        unique=False,
    )


def upgrade() -> None:
    bind = op.get_bind()
    table_names = _table_names(bind)

    if "users" not in table_names:
        _create_users_table()
    if "funnel_events" not in table_names:
        _create_funnel_events_table()
    if "verification_submissions" not in table_names:
        _create_verification_submissions_table()
    if "campaign_presets" not in table_names:
        _create_campaign_presets_table()

    user_columns = _column_names(bind, "users")
    if "partner_tracking_code" not in user_columns:
        op.add_column("users", sa.Column("partner_tracking_code", sa.String(length=64), nullable=True))
    if "partner_player_id" not in user_columns:
        op.add_column("users", sa.Column("partner_player_id", sa.String(length=128), nullable=True))

    preset_columns = _column_names(bind, "campaign_presets")
    if "is_favorite" not in preset_columns:
        op.add_column(
            "campaign_presets",
            sa.Column("is_favorite", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        )
    if "is_archived" not in preset_columns:
        op.add_column(
            "campaign_presets",
            sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        )
    if "sort_order" not in preset_columns:
        op.add_column(
            "campaign_presets",
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        )

    user_indexes = _index_names(bind, "users")
    if "ix_users_partner_tracking_code" not in user_indexes:
        op.create_index("ix_users_partner_tracking_code", "users", ["partner_tracking_code"], unique=True)
    if "ix_users_partner_player_id" not in user_indexes:
        op.create_index("ix_users_partner_player_id", "users", ["partner_player_id"], unique=False)

    preset_indexes = _index_names(bind, "campaign_presets")
    if "ix_campaign_presets_sort_order" not in preset_indexes:
        op.create_index("ix_campaign_presets_sort_order", "campaign_presets", ["sort_order"], unique=False)
    if "ix_campaign_presets_flags" not in preset_indexes:
        op.create_index(
            "ix_campaign_presets_flags",
            "campaign_presets",
            ["is_archived", "is_favorite"],
            unique=False,
        )

    op.execute(
        sa.text(
            "UPDATE campaign_presets "
            "SET sort_order = id * 10 "
            "WHERE sort_order IS NULL OR sort_order <= 0"
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    table_names = _table_names(bind)

    if "campaign_presets" in table_names:
        op.drop_index("ix_campaign_presets_flags", table_name="campaign_presets")
        op.drop_index("ix_campaign_presets_sort_order", table_name="campaign_presets")
        op.drop_index("ix_campaign_presets_name", table_name="campaign_presets")
        op.drop_table("campaign_presets")
    if "verification_submissions" in table_names:
        op.drop_index("ix_verification_submissions_status", table_name="verification_submissions")
        op.drop_index("ix_verification_submissions_user_id", table_name="verification_submissions")
        op.drop_table("verification_submissions")
    if "funnel_events" in table_names:
        op.drop_index("ix_funnel_events_event_type", table_name="funnel_events")
        op.drop_index("ix_funnel_events_user_id", table_name="funnel_events")
        op.drop_table("funnel_events")
    if "users" in table_names:
        op.drop_index("ix_users_partner_player_id", table_name="users")
        op.drop_index("ix_users_partner_tracking_code", table_name="users")
        op.drop_index("ix_users_telegram_user_id", table_name="users")
        op.drop_table("users")
