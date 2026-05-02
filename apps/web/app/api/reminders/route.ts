import { NextResponse } from "next/server";

const apiBaseUrl = (
  process.env.API_BASE_URL ?? "http://127.0.0.1:8000"
).trim().replace("http://localhost", "http://127.0.0.1");
const adminApiKey = (process.env.ADMIN_API_KEY ?? "").trim();

export const dynamic = "force-dynamic";

export async function POST() {
  if (!adminApiKey) {
    return NextResponse.json({ error: "ADMIN_API_KEY not configured" }, { status: 500 });
  }

  const response = await fetch(`${apiBaseUrl}/api/admin/send-reminders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": adminApiKey,
    },
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
