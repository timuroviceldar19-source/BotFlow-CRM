export type OverviewStats = {
  total_users: number;
  verified_users: number;
  conversions: number;
  pending_users: number;
};

export type UserRow = {
  telegram_user_id: number;
  username: string | null;
  status: string;
  source: string | null;
  partner_slug: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  created_at: string | null;
};

export type VerificationRow = {
  id: number;
  telegram_user_id: number;
  username: string | null;
  source: string | null;
  partner_slug: string | null;
  utm_campaign: string | null;
  status: string;
  media_url: string;
  submitted_at: string | null;
  admin_note: string | null;
};

export type DashboardFilters = {
  source?: string;
  partner_slug?: string;
  utm_campaign?: string;
  user_status?: string;
  verification_status?: string;
};

export type LinkBuilderConfig = {
  bot_username: string;
  web_base_url: string;
};

export type CampaignPreset = {
  id: number;
  name: string;
  source: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string | null;
  utm_content: string | null;
  partner_slug: string | null;
  landing_path: string;
  is_favorite: boolean;
  is_archived: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
};

export type CampaignPresetInput = {
  id?: number;
  name: string;
  source: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign?: string | null;
  utm_content?: string | null;
  partner_slug?: string | null;
  landing_path: string;
  is_favorite?: boolean;
  is_archived?: boolean;
  sort_order?: number | null;
};

export type FunnelEvent = {
  id: number;
  event_type: string;
  source: string | null;
  payload: string | null;
  created_at: string | null;
};

export type UserDetail = {
  telegram_user_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  status: string;
  source: string | null;
  partner_slug: string | null;
  partner_tracking_code: string | null;
  partner_player_id: string | null;
  partner_click_url: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  events: FunnelEvent[];
};

export type PartnerEvent = {
  id: number;
  telegram_user_id: number;
  username: string | null;
  event_type: string;
  partner_slug: string | null;
  partner_player_id: string | null;
  source: string | null;
  payload: string | null;
  created_at: string | null;
};

export type DashboardData = {
  overview: OverviewStats | null;
  users: UserRow[] | null;
  verifications: VerificationRow[] | null;
};
