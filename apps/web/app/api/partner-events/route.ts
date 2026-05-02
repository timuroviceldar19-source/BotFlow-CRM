import { NextResponse } from "next/server";

import { getPartnerEvents } from "../../../lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const events = await getPartnerEvents(
    searchParams.get("partner_slug") ?? undefined,
    searchParams.get("event_type") ?? undefined,
    searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
  );
  return NextResponse.json(events);
}
