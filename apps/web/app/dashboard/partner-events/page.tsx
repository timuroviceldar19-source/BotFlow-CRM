"use client";

import { useEffect, useState } from "react";

import type { PartnerEvent } from "../../../lib/dashboard-types";

export default function PartnerEventsPage() {
  const [events, setEvents] = useState<PartnerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPartner, setFilterPartner] = useState("");
  const [filterType, setFilterType] = useState("");

  function loadEvents(partnerSlug?: string, eventType?: string) {
    setLoading(true);
    const params = new URLSearchParams();
    if (partnerSlug) params.set("partner_slug", partnerSlug);
    if (eventType) params.set("event_type", eventType);
    const query = params.toString();

    fetch(`/api/partner-events${query ? `?${query}` : ""}`, { cache: "no-store" })
      .then(async (response) => {
        if (response.ok) {
          setEvents(await response.json());
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadEvents(filterPartner || undefined, filterType || undefined);
  }, [filterPartner, filterType]);

  const partnerOptions = Array.from(new Set(events.map((e) => e.partner_slug).filter(Boolean))) as string[];

  return (
    <main className="dashboard-shell">
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Partner events</p>
          <h1>История партнёрских постбэков</h1>
        </div>
        <a className="secondary-btn" href="/dashboard">
          Назад к дашборду
        </a>
      </section>

      <section className="section-box dashboard-box">
        <div className="filters-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <label className="filter-field">
            <span>Partner</span>
            <select value={filterPartner} onChange={(e) => setFilterPartner(e.target.value)}>
              <option value="">Все</option>
              {partnerOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-field">
            <span>Event type</span>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">Все</option>
              <option value="partner_registered">Registration</option>
              <option value="partner_converted">Conversion</option>
            </select>
          </label>

          <button
            className="secondary-btn reset-btn"
            type="button"
            onClick={() => {
              setFilterPartner("");
              setFilterType("");
            }}
          >
            Сбросить
          </button>
        </div>
      </section>

      <section className="section-box dashboard-box">
        {loading ? (
          <p className="empty-note">Загрузка...</p>
        ) : events.length > 0 ? (
          <div className="table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Telegram ID</th>
                  <th>Username</th>
                  <th>Partner</th>
                  <th>Player ID</th>
                  <th>Source</th>
                  <th>Payload</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td>{event.id}</td>
                    <td>
                      <span
                        className="status-pill"
                        data-status={event.event_type === "partner_converted" ? "verified" : "pending_verification"}
                      >
                        {event.event_type === "partner_converted" ? "Conversion" : "Registration"}
                      </span>
                    </td>
                    <td>
                      <a href={`/dashboard/user?id=${event.telegram_user_id}`} className="user-link">
                        {event.telegram_user_id}
                      </a>
                    </td>
                    <td>{event.username ?? "—"}</td>
                    <td>{event.partner_slug ?? "—"}</td>
                    <td>{event.partner_player_id ?? "—"}</td>
                    <td>{event.source ?? "—"}</td>
                    <td title={event.payload ?? ""}>
                      {event.payload ? (event.payload.length > 30 ? `${event.payload.slice(0, 30)}...` : event.payload) : "—"}
                    </td>
                    <td>{event.created_at ? new Date(event.created_at).toLocaleString("ru-RU") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-note">
            Партнёрских событий пока нет. Они появятся после получения webhook-ов от партнёрских кабинетов.
          </p>
        )}
      </section>
    </main>
  );
}
