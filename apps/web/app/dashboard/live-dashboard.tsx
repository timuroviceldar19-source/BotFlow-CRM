"use client";

import { startTransition, useEffect, useEffectEvent, useRef, useState } from "react";

import type { DashboardData, DashboardFilters, LinkBuilderConfig } from "../../lib/dashboard-types";
import { LinkBuilder } from "./link-builder";
import { reviewVerification } from "./actions";

const todo = [
  "Привязать partner webhooks к реальным postback payloads.",
  "Добавить retention и reactivation flows в боте.",
  "Расширить лендинг с SEO-страницами и контентом.",
];

type Props = {
  initialData: DashboardData;
  builderConfig: LinkBuilderConfig;
};

export function LiveDashboard({ initialData, builderConfig }: Props) {
  const [data, setData] = useState(initialData);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>({
    verification_status: "pending",
  });
  const [broadcastText, setBroadcastText] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState("all");
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isReminding, setIsReminding] = useState(false);
  const [reminderResult, setReminderResult] = useState<string | null>(null);

  function buildClientQueryString(nextFilters: DashboardFilters): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(nextFilters)) {
      if (value) {
        params.set(key, value);
      }
    }
    const query = params.toString();
    return query ? `?${query}` : "";
  }

  const filterQueryString = buildClientQueryString(filters);

  const refreshDashboard = useEffectEvent(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/dashboard${filterQueryString}`, { cache: "no-store" });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as DashboardData;
      startTransition(() => {
        setData(payload);
        setLastUpdatedAt(new Date().toLocaleTimeString("ru-RU"));
      });
    } finally {
      setIsRefreshing(false);
    }
  });

  useEffect(() => {
    setLastUpdatedAt(new Date().toLocaleTimeString("ru-RU"));
    void refreshDashboard();
    const timer = window.setInterval(() => {
      void refreshDashboard();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [refreshDashboard, filterQueryString]);

  const sourceOptions = Array.from(
    new Set((data.users ?? []).map((user) => user.source).filter(Boolean))
  ) as string[];

  const partnerOptions = Array.from(
    new Set((data.users ?? []).map((user) => user.partner_slug).filter(Boolean))
  ) as string[];

  const campaignOptions = Array.from(
    new Set((data.users ?? []).map((user) => user.utm_campaign).filter(Boolean))
  ) as string[];

  const funnel = [
    { label: "Users", value: String(data.overview?.total_users ?? 0), note: "Всего стартов бота" },
    { label: "Pending", value: String(data.overview?.pending_users ?? 0), note: "Ждут верификацию" },
    { label: "Verified", value: String(data.overview?.verified_users ?? 0), note: "Подтверждённые пользователи" },
    { label: "Conversions", value: String(data.overview?.conversions ?? 0), note: "Целевые действия от партнёров" },
  ];

  return (
    <main className="dashboard-shell">
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Admin dashboard</p>
          <h1>Контроль воронки и ручной верификации</h1>
        </div>
        <div className="dashboard-actions">
          <span className="refresh-badge">
            {isRefreshing
              ? "Обновляю..."
              : lastUpdatedAt
                ? `Обновлено: ${lastUpdatedAt}`
                : "Ожидание первого автообновления"}
          </span>
          <button className="secondary-btn" onClick={() => void refreshDashboard()} type="button">
            Обновить сейчас
          </button>
          <a className="secondary-btn" href="/dashboard/partner-events">
            Partner events
          </a>
          <a className="secondary-btn" href="/">
            На лендинг
          </a>
        </div>
      </section>

      <section className="section-box dashboard-box">
        <p className="eyebrow">Filters</p>
        <h2>Фильтруй воронку по источнику, кампании и партнёру</h2>
        <div className="filters-grid">
          <label className="filter-field">
            <span>Source</span>
            <select
              value={filters.source ?? ""}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  source: event.target.value || undefined,
                }))
              }
            >
              <option value="">Все</option>
              {sourceOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-field">
            <span>Campaign</span>
            <select
              value={filters.utm_campaign ?? ""}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  utm_campaign: event.target.value || undefined,
                }))
              }
            >
              <option value="">Все</option>
              {campaignOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-field">
            <span>Partner</span>
            <select
              value={filters.partner_slug ?? ""}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  partner_slug: event.target.value || undefined,
                }))
              }
            >
              <option value="">Все</option>
              {partnerOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-field">
            <span>User status</span>
            <select
              value={filters.user_status ?? ""}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  user_status: event.target.value || undefined,
                }))
              }
            >
              <option value="">Все</option>
              <option value="new">new</option>
              <option value="offer_clicked">offer_clicked</option>
              <option value="pending_verification">pending_verification</option>
              <option value="verified">verified</option>
              <option value="rejected">rejected</option>
            </select>
          </label>

          <label className="filter-field">
            <span>Verification status</span>
            <select
              value={filters.verification_status ?? "pending"}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  verification_status: event.target.value || undefined,
                }))
              }
            >
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
            </select>
          </label>

          <button
            className="secondary-btn reset-btn"
            type="button"
            onClick={() =>
              setFilters({
                verification_status: "pending",
              })
            }
          >
            Сбросить фильтры
          </button>
        </div>
      </section>

      <section className="section-grid">
        {funnel.map((item) => (
          <article key={item.label} className="info-card dark-card">
            <span className="small-label">{item.label}</span>
            <strong className="big-number">{item.value}</strong>
            <p>{item.note}</p>
          </article>
        ))}
      </section>

      <LinkBuilder
        config={builderConfig}
        sourceOptions={sourceOptions}
        partnerOptions={partnerOptions}
        campaignOptions={campaignOptions}
      />

      <section className="section-box dashboard-box">
        <p className="eyebrow">Следующий шаг</p>
        <h2>
          {data.overview
            ? "Dashboard обновляется автоматически каждые 5 секунд."
            : "Пока показаны fallback-значения. Добавь API_BASE_URL и ADMIN_API_KEY, чтобы увидеть живые данные."}
        </h2>
        <ul className="todo-list">
          {todo.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="section-box dashboard-box">
        <p className="eyebrow">Users snapshot</p>
        <h2>Последние пользователи из bot funnel</h2>
        {data.users && data.users.length > 0 ? (
          <div className="table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Telegram ID</th>
                  <th>Username</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Campaign</th>
                  <th>Partner</th>
                </tr>
              </thead>
              <tbody>
                {data.users.slice(0, 20).map((user) => (
                  <tr key={user.telegram_user_id}>
                    <td>
                      <a href={`/dashboard/user?id=${user.telegram_user_id}`} className="user-link">
                        {user.telegram_user_id}
                      </a>
                    </td>
                    <td>{user.username ?? "—"}</td>
                    <td>{user.status}</td>
                    <td>{user.source ?? "—"}</td>
                    <td>{user.utm_campaign ?? "—"}</td>
                    <td>{user.partner_slug ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-note">
            Когда backend начнёт получать `/start` и partner events, здесь появится таблица пользователей.
          </p>
        )}
      </section>

      <section className="section-box dashboard-box">
        <p className="eyebrow">Verification queue</p>
        <h2>Очередь ручной проверки скриншотов</h2>
        {data.verifications && data.verifications.length > 0 ? (
          <div className="verification-grid">
            {data.verifications.map((submission) => (
              <article key={submission.id} className="verification-card">
                <img
                  className="verification-image"
                  src={submission.media_url}
                  alt={`Verification ${submission.id}`}
                />
                <div className="verification-meta">
                  <strong>@{submission.username ?? "unknown"}</strong>
                  <span>ID: {submission.telegram_user_id}</span>
                  <span>Source: {submission.source ?? "—"}</span>
                  <span>Campaign: {submission.utm_campaign ?? "—"}</span>
                  <span>Partner: {submission.partner_slug ?? "—"}</span>
                  <span>Status: {submission.status}</span>
                </div>
                <form action={reviewVerification} className="moderation-form">
                  <input type="hidden" name="submissionId" value={submission.id} />
                  <input
                    className="note-input"
                    type="text"
                    name="note"
                    placeholder="Комментарий модератора"
                  />
                  <div className="moderation-actions">
                    <button className="approve-btn" type="submit" name="decision" value="approved">
                      Approve
                    </button>
                    <button className="reject-btn" type="submit" name="decision" value="rejected">
                      Reject
                    </button>
                  </div>
                </form>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-note">
            Как только пользователь отправит изображение в бота, оно появится здесь с кнопками approve / reject.
          </p>
        )}
      </section>

      <section className="section-box dashboard-box">
        <p className="eyebrow">Messaging</p>
        <h2>Рассылка и напоминания</h2>

        <div className="broadcast-controls">
          <div className="broadcast-form">
            <label className="filter-field">
              <span>Аудитория</span>
              <select value={broadcastTarget} onChange={(e) => setBroadcastTarget(e.target.value)}>
                <option value="all">Все пользователи</option>
                <option value="verified">Верифицированные</option>
                <option value="pending">На проверке</option>
                <option value="new">Новые (не начали)</option>
                <option value="not_verified">Не верифицированные</option>
              </select>
            </label>
            <label className="filter-field" style={{ gridColumn: "span 2" }}>
              <span>Текст сообщения</span>
              <textarea
                className="broadcast-textarea"
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                placeholder="Введи текст рассылки..."
                rows={3}
              />
            </label>
          </div>

          <div className="broadcast-actions">
            <button
              className="primary-btn"
              type="button"
              disabled={isBroadcasting || !broadcastText.trim()}
              onClick={async () => {
                setIsBroadcasting(true);
                setBroadcastResult(null);
                try {
                  const response = await fetch("/api/broadcast", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: broadcastText.trim(), target: broadcastTarget }),
                  });
                  const result = await response.json();
                  setBroadcastResult(
                    `Отправлено: ${result.sent}/${result.total}, ошибок: ${result.failed}`
                  );
                  if (result.sent > 0) setBroadcastText("");
                } catch {
                  setBroadcastResult("Ошибка отправки");
                } finally {
                  setIsBroadcasting(false);
                }
              }}
            >
              {isBroadcasting ? "Отправляю..." : "Отправить рассылку"}
            </button>

            <button
              className="secondary-btn"
              type="button"
              disabled={isReminding}
              onClick={async () => {
                setIsReminding(true);
                setReminderResult(null);
                try {
                  const response = await fetch("/api/reminders", { method: "POST" });
                  const result = await response.json();
                  setReminderResult(
                    `Напоминания: ${result.sent}/${result.total}, ошибок: ${result.failed}`
                  );
                } catch {
                  setReminderResult("Ошибка отправки");
                } finally {
                  setIsReminding(false);
                }
              }}
            >
              {isReminding ? "Отправляю..." : "Напомнить незавершённым"}
            </button>
          </div>

          {broadcastResult && <p className="broadcast-result">{broadcastResult}</p>}
          {reminderResult && <p className="broadcast-result">{reminderResult}</p>}
        </div>
      </section>
    </main>
  );
}
