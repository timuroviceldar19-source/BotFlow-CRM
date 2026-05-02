"use server";

import { revalidatePath } from "next/cache";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8000";
const adminApiKey = process.env.ADMIN_API_KEY ?? "";

export async function reviewVerification(formData: FormData): Promise<void> {
  const submissionId = formData.get("submissionId");
  const decision = formData.get("decision");

  if (!adminApiKey) {
    throw new Error("ADMIN_API_KEY is missing");
  }

  if (!submissionId || !decision) {
    throw new Error("Missing moderation payload");
  }

  const response = await fetch(
    `${apiBaseUrl}/api/admin/verifications/${submissionId}/review`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": adminApiKey,
      },
      body: JSON.stringify({
        decision,
        note: formData.get("note") || null,
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Moderation request failed with ${response.status}`);
  }

  revalidatePath("/dashboard");
}
