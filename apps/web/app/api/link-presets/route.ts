import { NextResponse } from "next/server";

import {
  deleteCampaignPreset,
  getCampaignPresets,
  saveCampaignPreset,
} from "../../../lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const presets = await getCampaignPresets();
  return NextResponse.json(presets);
}

export async function POST(request: Request) {
  const payload = await request.json();
  const preset = await saveCampaignPreset(payload);
  return NextResponse.json(preset);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const presetId = Number(searchParams.get("id"));
  if (!Number.isFinite(presetId)) {
    return NextResponse.json({ detail: "Preset id is required" }, { status: 400 });
  }

  await deleteCampaignPreset(presetId);
  return NextResponse.json({ ok: true });
}
