import { NextResponse } from "next/server";

const apiBaseUrl = (
  process.env.API_BASE_URL ?? "http://127.0.0.1:8000"
).trim().replace("http://localhost", "http://127.0.0.1");
const adminApiKey = (process.env.ADMIN_API_KEY ?? "").trim();

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!adminApiKey) {
    return NextResponse.json({ error: "ADMIN_API_KEY not configured" }, { status: 500 });
  }

  const body = await request.json();
  const response = await fetch(`${apiBaseUrl}/api/admin/broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": adminApiKey,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
