import { NextResponse } from "next/server";

import { getDashboardData } from "../../../lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = await getDashboardData({
    source: searchParams.get("source") ?? undefined,
    partner_slug: searchParams.get("partner_slug") ?? undefined,
    utm_campaign: searchParams.get("utm_campaign") ?? undefined,
    user_status: searchParams.get("user_status") ?? undefined,
    verification_status: searchParams.get("verification_status") ?? undefined,
  });
  return NextResponse.json(data);
}
