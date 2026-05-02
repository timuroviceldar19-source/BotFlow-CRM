"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import type { UserDetail } from "../../../lib/dashboard-types";

const eventLabels: Record<string, string> = {
  start: "Bot /start",
  offer_click: "Offer clicked",
  screenshot_submitted: "Screenshot submitted",
  partner_registered: "Partner registration",
  partner_converted: "Partner conversion",
  verification_approved: "Verified (approved)",
  verification_rejected: "Verified (rejected)",
};

function UserDetailContent() {
  const searchParams = useSearchParams();
  const telegramUserId = searchParams.get("id");
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!telegramUserId) {
      setError("Telegram ID не указан");
      setLoading(false);
      return;
    }

    fetch(`/api/users?telegram_user_id=${telegramUserId}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          setError("Пользователь не найден");
          return;
        }
        setUser(await response.json());
      })
      .catch(() => setError("Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [telegramUserId]);

  if (loading) {
    return (
      <main className="dashboard-shell">
        <p className="empty-note">Загрузка...</p>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="dashboard-shell">
        <section className="dashboard-header">
          <div>
            <p className="eyebrow">User profile</p>
            <h1>{error ?? "Пользователь не найден"}</h1>
          </div>
          <a className="secondary-btn" href="/dashboard">
            Назад
          </a>
        </section>
      </main>
    );
  }

  const fields = [
    { label: "Telegram ID", value: user.telegram_user_id },
    { label: "Username", value: user.username ? `@${user.username}` : "—" },
    { label: "Name", value: [user.first_name, user.last_name].filter(Boolean).join(" ") || "—" },
    { label: "Status", value: user.status },
    { label: "Source", value: user.source ?? "—" },
    { label: "UTM Source", value: user.utm_source ?? "—" },
    { label: "UTM Medium", value: user.utm_medium ?? "—" },
    { label: "UTM Campaign", value: user.utm_campaign ?? "—" },
    { label: "UTM Content", value: user.utm_content ?? "—" },
    { label: "Partner", value: user.partner_slug ?? "—" },
    { label: "Tracking Code", value: user.partner_tracking_code ?? "—" },
    { label: "Player ID", value: user.partner_player_id ?? "—" },
    { label: "Created", value: user.created_at ? new Date(user.created_at).toLocaleString("ru-RU") : "—" },
    { label: "Updated", value: user.updated_at ? new Date(user.updated_at).toLocaleString("ru-RU") : "—" },
  ];

  return (
    <main className="dashboard-shell">
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">User profile</p>
          <h1>
            {user.username ? `@${user.username}` : `ID ${user.telegram_user_id}`}
            <span className="status-pill" data-status={user.status}>
              {user.status}
            </span>
          </h1>
        </div>
        <a className="secondary-btn" href="/dashboard">
          Назад к дашборду
        </a>
      </section>

      <section className="section-box dashboard-box">
        <p className="eyebrow">Info</p>
        <h2>Профиль пользователя</h2>
        <div className="user-fields-grid">
          {fields.map((field) => (
            <div key={field.label} className="user-field">
              <span className="small-label">{field.label}</span>
              <span className="user-field-value">{String(field.value)}</span>
            </div>
          ))}
        </div>
        {user.partner_click_url && (
          <div className="user-field" style={{ marginTop: "1rem" }}>
            <span className="small-label">Partner Click URL</span>
            <code className="user-field-value" style={{ wordBreak: "break-all", fontSize: "0.85rem" }}>
              {user.partner_click_url}
            </code>
          </div>
        )}
        {user.notes && (
          <div className="user-field" style={{ marginTop: "1rem" }}>
            <span className="small-label">Notes</span>
            <p className="user-field-value">{user.notes}</p>
          </div>
        )}
      </section>

      <section className="section-box dashboard-box">
        <p className="eyebrow">Event timeline</p>
        <h2>История событий</h2>
        {user.events.length > 0 ? (
          <div className="event-timeline">
            {user.events.map((event) => (
              <div key={event.id} className="event-row">
                <span className="event-type-badge" data-event={event.event_type}>
                  {eventLabels[event.event_type] ?? event.event_type}
                </span>
                <span className="event-source">{event.source ?? "—"}</span>
                {event.payload && (
                  <span className="event-payload" title={event.payload}>
                    {event.payload.length > 60 ? `${event.payload.slice(0, 60)}...` : event.payload}
                  </span>
                )}
                <span className="event-time">
                  {event.created_at ? new Date(event.created_at).toLocaleString("ru-RU") : "—"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-note">Нет событий для этого пользователя.</p>
        )}
      </section>
    </main>
  );
}

export default function UserDetailPage() {
  return (
    <Suspense fallback={<main className="dashboard-shell"><p className="empty-note">Загрузка...</p></main>}>
      <UserDetailContent />
    </Suspense>
  );
}
