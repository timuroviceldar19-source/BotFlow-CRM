"use client";

import { useEffect, useState } from "react";

import type {
  CampaignPreset,
  CampaignPresetInput,
  LinkBuilderConfig,
} from "../../lib/dashboard-types";

type Props = {
  config: LinkBuilderConfig;
  sourceOptions: string[];
  partnerOptions: string[];
  campaignOptions: string[];
};

type BuilderState = {
  source: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  partner: string;
  landingPath: string;
};

type LegacySavedPreset = {
  id: string;
  name: string;
  state: BuilderState;
};

const TELEGRAM_PAYLOAD_LIMIT = 64;
const LEGACY_PRESETS_STORAGE_KEY = "botflow-link-builder-presets";

const defaultState: BuilderState = {
  source: "telegram",
  utmSource: "telegram",
  utmMedium: "post",
  utmCampaign: "",
  utmContent: "",
  partner: "",
  landingPath: "/",
};

function normalizeBotUsername(value: string): string {
  return value.trim().replace(/^@+/, "");
}

function slugifyToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
}

function normalizeLandingPath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "/";
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
    } catch {
      return "/";
    }
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function buildStartPayload(state: BuilderState): string {
  const tokens: string[] = [];

  const source = slugifyToken(state.source) || "telegram";
  const utmSource = slugifyToken(state.utmSource);
  const utmMedium = slugifyToken(state.utmMedium);
  const utmCampaign = slugifyToken(state.utmCampaign);
  const utmContent = slugifyToken(state.utmContent);
  const partner = slugifyToken(state.partner);

  if (source) {
    tokens.push(`src-${source}`);
  }
  if (utmSource) {
    tokens.push(`utm_source-${utmSource}`);
  }
  if (utmMedium) {
    tokens.push(`utm_medium-${utmMedium}`);
  }
  if (utmCampaign) {
    tokens.push(`utm_campaign-${utmCampaign}`);
  }
  if (utmContent) {
    tokens.push(`utm_content-${utmContent}`);
  }
  if (partner) {
    tokens.push(`partner-${partner}`);
  }

  return tokens.join("__");
}

function buildTelegramDeepLink(botUsername: string, payload: string): string {
  const normalizedBotUsername = normalizeBotUsername(botUsername) || "botflow_crm_bot";
  const url = new URL(`https://t.me/${normalizedBotUsername}`);
  if (payload) {
    url.searchParams.set("start", payload);
  }
  return url.toString();
}

function buildLandingUrl(baseUrl: string, state: BuilderState): string {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, "") || "http://127.0.0.1:3000";
  const url = new URL(normalizeLandingPath(state.landingPath), `${normalizedBaseUrl}/`);

  if (state.utmSource.trim()) {
    url.searchParams.set("utm_source", state.utmSource.trim());
  }
  if (state.utmMedium.trim()) {
    url.searchParams.set("utm_medium", state.utmMedium.trim());
  }
  if (state.utmCampaign.trim()) {
    url.searchParams.set("utm_campaign", state.utmCampaign.trim());
  }
  if (state.utmContent.trim()) {
    url.searchParams.set("utm_content", state.utmContent.trim());
  }
  if (state.partner.trim()) {
    url.searchParams.set("partner", slugifyToken(state.partner));
  }

  return url.toString();
}

function buildPrefilledTelegramCopy(state: BuilderState): string {
  const parts = [state.source, state.utmCampaign, state.utmContent, state.partner]
    .map((value) => slugifyToken(value))
    .filter(Boolean);

  if (parts.length === 0) {
    return "tg";
  }

  return parts.join("_");
}

function buildPresetLabel(state: BuilderState): string {
  const parts = [state.partner, state.utmCampaign, state.utmContent]
    .map((value) => value.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "Campaign preset";
  }

  return parts.join(" / ");
}

function mapPresetToState(preset: CampaignPreset): BuilderState {
  return {
    source: preset.source,
    utmSource: preset.utm_source,
    utmMedium: preset.utm_medium,
    utmCampaign: preset.utm_campaign ?? "",
    utmContent: preset.utm_content ?? "",
    partner: preset.partner_slug ?? "",
    landingPath: preset.landing_path,
  };
}

function mapStateToPresetInput(
  name: string,
  state: BuilderState,
  options?: {
    id?: number;
    is_favorite?: boolean;
    is_archived?: boolean;
    sort_order?: number | null;
  }
): CampaignPresetInput {
  return {
    id: options?.id,
    name,
    source: state.source.trim() || "telegram",
    utm_source: state.utmSource.trim() || "telegram",
    utm_medium: state.utmMedium.trim() || "post",
    utm_campaign: state.utmCampaign.trim() || null,
    utm_content: state.utmContent.trim() || null,
    partner_slug: state.partner.trim() || null,
    landing_path: normalizeLandingPath(state.landingPath),
    is_favorite: options?.is_favorite ?? false,
    is_archived: options?.is_archived ?? false,
    sort_order: options?.sort_order ?? undefined,
  };
}

function mapPresetToInput(
  preset: CampaignPreset,
  overrides: Partial<CampaignPresetInput> = {}
): CampaignPresetInput {
  return {
    id: preset.id,
    name: preset.name,
    source: preset.source,
    utm_source: preset.utm_source,
    utm_medium: preset.utm_medium,
    utm_campaign: preset.utm_campaign,
    utm_content: preset.utm_content,
    partner_slug: preset.partner_slug,
    landing_path: preset.landing_path,
    is_favorite: preset.is_favorite,
    is_archived: preset.is_archived,
    sort_order: preset.sort_order,
    ...overrides,
  };
}

function readLegacyPresets(): LegacySavedPreset[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(LEGACY_PRESETS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as LegacySavedPreset[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item) =>
        Boolean(item?.name) &&
        Boolean(item?.state) &&
        typeof item.state.source === "string"
    );
  } catch {
    return [];
  }
}

function clearLegacyPresets() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(LEGACY_PRESETS_STORAGE_KEY);
}

export function LinkBuilder({ config, sourceOptions, partnerOptions, campaignOptions }: Props) {
  const [state, setState] = useState<BuilderState>(defaultState);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [presetName, setPresetName] = useState("");
  const [savedPresets, setSavedPresets] = useState<CampaignPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<number | null>(null);
  const [presetFeedback, setPresetFeedback] = useState<string | null>(null);
  const [isPresetLoading, setIsPresetLoading] = useState(true);
  const [isPresetSaving, setIsPresetSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [presetSearch, setPresetSearch] = useState("");
  const [presetView, setPresetView] = useState<"all" | "favorites" | "archived">("all");

  const payload = buildStartPayload(state);
  const telegramLink = buildTelegramDeepLink(config.bot_username, payload);
  const landingLink = buildLandingUrl(config.web_base_url, state);
  const payloadLength = payload.length;
  const payloadTooLong = payloadLength > TELEGRAM_PAYLOAD_LIMIT;
  const hasSanitizedValueLoss =
    (Boolean(state.utmCampaign.trim()) && !slugifyToken(state.utmCampaign)) ||
    (Boolean(state.utmContent.trim()) && !slugifyToken(state.utmContent)) ||
    (Boolean(state.partner.trim()) && !slugifyToken(state.partner));
  const activePresets = savedPresets.filter((p) => !p.is_archived);
  const archivedPresets = savedPresets.filter((p) => p.is_archived);

  function setFeedback(message: string) {
    setPresetFeedback(message);
    window.setTimeout(() => {
      setPresetFeedback((current) => (current === message ? null : current));
    }, 1800);
  }

  function findPresetById(presetId: number): CampaignPreset | undefined {
    return savedPresets.find((preset) => preset.id === presetId);
  }

  async function requestPreset(
    method: "POST" | "DELETE",
    options: {
      body?: CampaignPresetInput;
      presetId?: number;
    } = {}
  ): Promise<CampaignPreset | null> {
    const url =
      method === "DELETE"
        ? `/api/link-presets?id=${options.presetId}`
        : "/api/link-presets";
    const response = await fetch(url, {
      method,
      headers:
        method === "POST"
          ? {
              "Content-Type": "application/json",
            }
          : undefined,
      body: method === "POST" ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Failed request: ${method}`);
    }

    if (method === "DELETE") {
      return null;
    }

    return (await response.json()) as CampaignPreset;
  }

  async function loadPresets() {
    setIsPresetLoading(true);
    try {
      const response = await fetch("/api/link-presets", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load presets");
      }

      let presets = (await response.json()) as CampaignPreset[];
      if (presets.length === 0) {
        const legacyPresets = readLegacyPresets();
        for (const legacyPreset of legacyPresets) {
          await requestPreset("POST", {
            body: mapStateToPresetInput(legacyPreset.name, legacyPreset.state),
          });
        }

        if (legacyPresets.length > 0) {
          clearLegacyPresets();
          const refetchResponse = await fetch("/api/link-presets", { cache: "no-store" });
          presets = refetchResponse.ok ? ((await refetchResponse.json()) as CampaignPreset[]) : [];
          setFeedback("Local presets migrated");
        }
      }

      setSavedPresets(presets);
    } catch {
      setFeedback("Failed to load presets");
    } finally {
      setIsPresetLoading(false);
    }
  }

  useEffect(() => {
    void loadPresets();
  }, []);

  async function copyValue(target: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(target);
      window.setTimeout(() => {
        setCopiedField((current) => (current === target ? null : current));
      }, 1600);
    } catch {
      setCopiedField(null);
    }
  }

  function updateField<Key extends keyof BuilderState>(key: Key, value: BuilderState[Key]) {
    setState((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function savePreset() {
    const normalizedName = presetName.trim() || buildPresetLabel(state);
    const currentPreset = activePresetId ? findPresetById(activePresetId) : undefined;
    setIsPresetSaving(true);

    try {
      const preset = await requestPreset("POST", {
        body: mapStateToPresetInput(normalizedName, state, {
          id: currentPreset?.id,
          is_favorite: currentPreset?.is_favorite ?? false,
          is_archived: currentPreset?.is_archived ?? false,
          sort_order: currentPreset?.sort_order,
        }),
      });

      if (!preset) {
        throw new Error("Preset not returned");
      }

      setActivePresetId(preset.id);
      setPresetName(preset.name);
      setState(mapPresetToState(preset));
      await loadPresets();
      setFeedback(currentPreset ? "Preset updated" : "Preset saved");
    } catch {
      setFeedback("Failed to save preset");
    } finally {
      setIsPresetSaving(false);
    }
  }

  function applyPreset(preset: CampaignPreset) {
    setState(mapPresetToState(preset));
    setPresetName(preset.name);
    setActivePresetId(preset.id);
    setFeedback("Preset loaded");
  }

  async function removePreset(presetId: number) {
    try {
      await requestPreset("DELETE", { presetId });
      if (activePresetId === presetId) {
        setActivePresetId(null);
        setPresetName("");
      }
      await loadPresets();
      setFeedback("Preset deleted");
    } catch {
      setFeedback("Failed to delete preset");
    }
  }

  async function toggleFavorite(preset: CampaignPreset) {
    try {
      await requestPreset("POST", {
        body: mapPresetToInput(preset, { is_favorite: !preset.is_favorite }),
      });
      await loadPresets();
      setFeedback(preset.is_favorite ? "Removed from favorites" : "Marked as favorite");
    } catch {
      setFeedback("Failed to update preset");
    }
  }

  async function toggleArchived(preset: CampaignPreset) {
    try {
      await requestPreset("POST", {
        body: mapPresetToInput(preset, { is_archived: !preset.is_archived }),
      });
      if (!preset.is_archived) {
        setShowArchived(true);
      }
      await loadPresets();
      setFeedback(preset.is_archived ? "Preset restored" : "Preset archived");
    } catch {
      setFeedback("Failed to update preset");
    }
  }

  async function movePreset(presetId: number, direction: "up" | "down") {
    const preset = findPresetById(presetId);
    if (!preset) {
      return;
    }

    const group = savedPresets.filter((item) => item.is_archived === preset.is_archived);
    const currentIndex = group.findIndex((item) => item.id === preset.id);
    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const swapWith = group[swapIndex];
    if (currentIndex < 0 || !swapWith) {
      return;
    }

    try {
      await requestPreset("POST", {
        body: mapPresetToInput(preset, { sort_order: swapWith.sort_order }),
      });
      await requestPreset("POST", {
        body: mapPresetToInput(swapWith, { sort_order: preset.sort_order }),
      });
      await loadPresets();
      setFeedback(direction === "up" ? "Preset moved up" : "Preset moved down");
    } catch {
      setFeedback("Failed to reorder presets");
    }
  }

  function resetBuilder() {
    setState(defaultState);
    setPresetName("");
    setActivePresetId(null);
  }

  return (
    <section className="section-box dashboard-box">
      <p className="eyebrow">Link builder</p>
      <h2>Generate Telegram deep links and landing campaign URLs</h2>
      <p>
        Use short latin slugs for Telegram campaigns. Telegram start payloads are limited to 64
        characters, so this block shows the exact payload length before you ship the link.
      </p>

      <div className="builder-presets-header">
        <label className="filter-field builder-preset-name">
          <span>Preset name</span>
          <input
            value={presetName}
            onChange={(event) => setPresetName(event.target.value)}
            placeholder="SaaS / reels / march"
          />
        </label>
        <div className="builder-preset-actions">
          <button className="secondary-btn" type="button" onClick={() => void savePreset()}>
            {isPresetSaving ? "Saving..." : activePresetId ? "Update preset" : "Save preset"}
          </button>
          <button className="secondary-btn" type="button" onClick={resetBuilder}>
            New preset
          </button>
        </div>
      </div>

      {presetFeedback ? <p className="builder-note">{presetFeedback}</p> : null}

      {isPresetLoading ? (
        <p className="builder-note">Loading shared presets...</p>
      ) : savedPresets.length > 0 ? (
        <>
          <div className="preset-search-row">
            <input
              className="preset-search-input"
              type="text"
              value={presetSearch}
              onChange={(event) => setPresetSearch(event.target.value)}
              placeholder="Search presets by name, partner, campaign..."
            />
            <button
              className="preset-filter-btn"
              type="button"
              data-active={presetView === "all"}
              onClick={() => setPresetView("all")}
            >
              All ({activePresets.length})
            </button>
            <button
              className="preset-filter-btn"
              type="button"
              data-active={presetView === "favorites"}
              onClick={() => setPresetView("favorites")}
            >
              Favorites ({activePresets.filter((p) => p.is_favorite).length})
            </button>
            <button
              className="preset-filter-btn"
              type="button"
              data-active={presetView === "archived"}
              onClick={() => setPresetView("archived")}
            >
              Archived ({archivedPresets.length})
            </button>
          </div>

          {(() => {
            const searchLower = presetSearch.toLowerCase();
            const matchesSearch = (preset: CampaignPreset) =>
              !searchLower ||
              preset.name.toLowerCase().includes(searchLower) ||
              (preset.partner_slug ?? "").toLowerCase().includes(searchLower) ||
              (preset.utm_campaign ?? "").toLowerCase().includes(searchLower) ||
              (preset.utm_content ?? "").toLowerCase().includes(searchLower) ||
              preset.source.toLowerCase().includes(searchLower);

            let visiblePresets: CampaignPreset[];
            if (presetView === "favorites") {
              visiblePresets = activePresets.filter((p) => p.is_favorite && matchesSearch(p));
            } else if (presetView === "archived") {
              visiblePresets = archivedPresets.filter(matchesSearch);
            } else {
              visiblePresets = activePresets.filter(matchesSearch);
            }

            if (visiblePresets.length === 0) {
              return (
                <p className="builder-note">
                  {presetSearch
                    ? "No presets match your search."
                    : presetView === "favorites"
                      ? "No favorite presets yet."
                      : presetView === "archived"
                        ? "No archived presets."
                        : "No active presets."}
                </p>
              );
            }

            return (
              <div className="preset-grid">
                {visiblePresets.map((preset, index) => (
                  <article
                    key={preset.id}
                    className={`preset-card${preset.id === activePresetId ? " preset-card-active" : ""}${preset.is_favorite ? " preset-card-favorite" : ""}${preset.is_archived ? " preset-card-archived" : ""}`}
                  >
                    <div className="preset-card-topline">
                      <span className={`preset-badge${preset.is_archived ? " preset-badge-muted" : ""}`}>
                        {preset.is_archived ? "Archived" : preset.is_favorite ? "Favorite" : "Preset"}
                      </span>
                      <div className="preset-card-order">
                        <button
                          className="icon-btn"
                          type="button"
                          onClick={() => void movePreset(preset.id, "up")}
                          disabled={index === 0}
                        >
                          Up
                        </button>
                        <button
                          className="icon-btn"
                          type="button"
                          onClick={() => void movePreset(preset.id, "down")}
                          disabled={index === visiblePresets.length - 1}
                        >
                          Down
                        </button>
                      </div>
                    </div>
                    <div className="preset-card-copy">
                      <strong>{preset.name}</strong>
                      <span>
                        {preset.partner_slug || "partner-free"} - {preset.utm_campaign || "no-campaign"}
                      </span>
                      <span>{preset.landing_path || "/"}</span>
                    </div>
                    <div className="preset-card-actions">
                      <button className="secondary-btn" type="button" onClick={() => applyPreset(preset)}>
                        Load
                      </button>
                      <button
                        className="secondary-btn"
                        type="button"
                        onClick={() => void toggleFavorite(preset)}
                      >
                        {preset.is_favorite ? "Unfavorite" : "Favorite"}
                      </button>
                      <button
                        className="secondary-btn"
                        type="button"
                        onClick={() => void toggleArchived(preset)}
                      >
                        {preset.is_archived ? "Restore" : "Archive"}
                      </button>
                      <button
                        className="secondary-btn"
                        type="button"
                        onClick={() => void removePreset(preset.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            );
          })()}
        </>
      ) : (
        <p className="builder-note">
          Saved presets now live in the backend, so they stay available across devices and browser
          resets.
        </p>
      )}

      <div className="builder-grid">
        <label className="filter-field">
          <span>Source</span>
          <input
            list="source-options"
            value={state.source}
            onChange={(event) => updateField("source", event.target.value)}
            placeholder="telegram"
          />
          <datalist id="source-options">
            {sourceOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </label>

        <label className="filter-field">
          <span>UTM source</span>
          <input
            value={state.utmSource}
            onChange={(event) => updateField("utmSource", event.target.value)}
            placeholder="telegram"
          />
        </label>

        <label className="filter-field">
          <span>UTM medium</span>
          <input
            value={state.utmMedium}
            onChange={(event) => updateField("utmMedium", event.target.value)}
            placeholder="post"
          />
        </label>

        <label className="filter-field">
          <span>Campaign</span>
          <input
            list="campaign-options"
            value={state.utmCampaign}
            onChange={(event) => updateField("utmCampaign", event.target.value)}
            placeholder="promo-april-2026"
          />
          <datalist id="campaign-options">
            {campaignOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </label>

        <label className="filter-field">
          <span>Content</span>
          <input
            value={state.utmContent}
            onChange={(event) => updateField("utmContent", event.target.value)}
            placeholder="channel-post-1"
          />
        </label>

        <label className="filter-field">
          <span>Partner</span>
          <input
            list="partner-options"
            value={state.partner}
            onChange={(event) => updateField("partner", event.target.value)}
            placeholder="saas-partner"
          />
          <datalist id="partner-options">
            {partnerOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </label>

        <label className="filter-field builder-path-field">
          <span>Landing path</span>
          <input
            value={state.landingPath}
            onChange={(event) => updateField("landingPath", event.target.value)}
            placeholder="/register-offer"
          />
        </label>
      </div>

      <div className="builder-status-row">
        <span className={`status-pill${payloadTooLong ? " status-pill-warn" : ""}`}>
          Start payload: {payloadLength}/{TELEGRAM_PAYLOAD_LIMIT}
        </span>
        <span className={`status-pill${hasSanitizedValueLoss ? " status-pill-warn" : ""}`}>
          Telegram tag: {buildPrefilledTelegramCopy(state)}
        </span>
      </div>

      {payloadTooLong ? (
        <p className="builder-warning">
          Telegram deep link is too long. Shorten source, campaign, content, or partner slugs until
          the payload is at most 64 characters.
        </p>
      ) : null}

      {hasSanitizedValueLoss ? (
        <p className="builder-warning">
          Some values lose characters after slug cleanup. For Telegram payloads, prefer short latin
          slugs like <code>saas-partner</code> or <code>reels-01</code>.
        </p>
      ) : null}

      <div className="builder-output-grid">
        <article className="builder-output-card">
          <span className="small-label">Telegram Start Payload</span>
          <textarea className="builder-output" readOnly value={payload} rows={3} />
          <div className="builder-output-actions">
            <button
              className="secondary-btn"
              type="button"
              onClick={() => void copyValue("payload", payload)}
            >
              {copiedField === "payload" ? "Copied" : "Copy payload"}
            </button>
          </div>
        </article>

        <article className="builder-output-card">
          <span className="small-label">Telegram Deep Link</span>
          <textarea className="builder-output" readOnly value={telegramLink} rows={4} />
          <div className="builder-output-actions">
            <button
              className="secondary-btn"
              type="button"
              onClick={() => void copyValue("telegram", telegramLink)}
            >
              {copiedField === "telegram" ? "Copied" : "Copy Telegram link"}
            </button>
            <a className="secondary-btn" href={telegramLink} target="_blank" rel="noreferrer">
              Open
            </a>
          </div>
        </article>

        <article className="builder-output-card">
          <span className="small-label">Landing Campaign URL</span>
          <textarea className="builder-output" readOnly value={landingLink} rows={4} />
          <div className="builder-output-actions">
            <button
              className="secondary-btn"
              type="button"
              onClick={() => void copyValue("landing", landingLink)}
            >
              {copiedField === "landing" ? "Copied" : "Copy landing URL"}
            </button>
            <a className="secondary-btn" href={landingLink} target="_blank" rel="noreferrer">
              Open
            </a>
          </div>
        </article>
      </div>
    </section>
  );
}
