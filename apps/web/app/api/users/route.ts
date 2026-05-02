import { NextResponse } from "next/server";

import { getUserDetail } from "../../../lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const telegramUserId = searchParams.get("telegram_user_id");
  if (!telegramUserId) {
    return NextResponse.json({ error: "telegram_user_id is required" }, { status: 400 });
  }
  const user = await getUserDetail(Number(telegramUserId));
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json(user);
}
