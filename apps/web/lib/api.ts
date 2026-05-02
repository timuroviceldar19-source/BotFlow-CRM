import "server-only";

import type {
  CampaignPreset,
  CampaignPresetInput,
  DashboardData,
  DashboardFilters,
  LinkBuilderConfig,
  OverviewStats,
  PartnerEvent,
  UserDetail,
  UserRow,
  VerificationRow,
} from "./dashboard-types";

function normalizeApiBaseUrl(value: string): string {
  return value.trim().replace("http://localhost", "http://127.0.0.1");
}

function normalizeWebBaseUrl(value: string): string {
  return value.trim().replace("http://localhost", "http://127.0.0.1").replace(/\/+$/, "");
}

function normalizeBotUsername(value: string): string {
  return value.trim().replace(/^@+/, "");
}

const apiBaseUrl = normalizeApiBaseUrl(
  process.env.API_BASE_URL ?? "http://127.0.0.1:8000"
);
const adminApiKey = (process.env.ADMIN_API_KEY ?? "").trim();

function buildQueryString(filters: DashboardFilters, keys: Array<keyof DashboardFilters>): string {
  const params = new URLSearchParams();
  for (const key of keys) {
    const value = filters[key];
    if (value) {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

async function fetchJson<T>(path: string): Promise<T | null> {
  if (!adminApiKey) {
    return null;
  }

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      headers: {
        "X-API-Key": adminApiKey,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("[dashboard-fetch] non-ok response", path, response.status);
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error("[dashboard-fetch] request failed", path, error);
    return null;
  }
}

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  if (!adminApiKey) {
    throw new Error("ADMIN_API_KEY is not configured");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": adminApiKey,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Request failed: ${response.status} ${detail}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export async function getDashboardData(filters: DashboardFilters = {}): Promise<DashboardData> {
  const [overview, users, verifications] = await Promise.all([
    fetchJson<OverviewStats>(
      `/api/admin/stats/overview${buildQueryString(filters, ["source", "partner_slug", "utm_campaign"])}`
    ),
    fetchJson<UserRow[]>(
      `/api/admin/users${buildQueryString(filters, [
        "source",
        "partner_slug",
        "utm_campaign",
        "user_status",
      ]).replace("user_status=", "status=")}`
    ),
    fetchJson<VerificationRow[]>(
      `/api/admin/verifications${buildQueryString(
        {
          source: filters.source,
          partner_slug: filters.partner_slug,
          utm_campaign: filters.utm_campaign,
          verification_status: filters.verification_status ?? "pending",
        },
        ["source", "partner_slug", "utm_campaign", "verification_status"]
      ).replace("verification_status=", "status=")}`
    ),
  ]);

  return { overview, users, verifications };
}

export function getLinkBuilderConfig(): LinkBuilderConfig {
  return {
    bot_username: normalizeBotUsername(
      process.env.BOT_USERNAME ?? "botflow_crm_bot"
    ),
    web_base_url: normalizeWebBaseUrl(
      process.env.WEB_BASE_URL ?? "http://127.0.0.1:3000"
    ),
  };
}

export async function getCampaignPresets(): Promise<CampaignPreset[]> {
  return (await fetchJson<CampaignPreset[]>("/api/admin/campaign-presets")) ?? [];
}

export async function saveCampaignPreset(
  payload: CampaignPresetInput
): Promise<CampaignPreset> {
  return await requestJson<CampaignPreset>("/api/admin/campaign-presets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteCampaignPreset(presetId: number): Promise<void> {
  await requestJson<null>(`/api/admin/campaign-presets/${presetId}`, {
    method: "DELETE",
  });
}

export async function getUserDetail(telegramUserId: number): Promise<UserDetail | null> {
  return fetchJson<UserDetail>(`/api/admin/users/${telegramUserId}`);
}

export async function getPartnerEvents(
  partnerSlug?: string,
  eventType?: string,
  limit?: number,
): Promise<PartnerEvent[]> {
  const params = new URLSearchParams();
  if (partnerSlug) params.set("partner_slug", partnerSlug);
  if (eventType) params.set("event_type", eventType);
  if (limit) params.set("limit", String(limit));
  const query = params.toString();
  return (await fetchJson<PartnerEvent[]>(`/api/admin/partner-events${query ? `?${query}` : ""}`)) ?? [];
}
