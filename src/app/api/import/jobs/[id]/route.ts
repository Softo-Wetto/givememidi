import { NextRequest, NextResponse } from "next/server";
import { isGiveMeMidiAdmin } from "@/lib/givememidi-admin";
import { serializeAuthCookie } from "@/lib/pocketbase/auth-cookie";
import { pbRequest, normalizeUser } from "@/lib/pocketbase/shared";
import { getServerAuth } from "@/lib/pocketbase/server";
import type { ImportJob, PocketBaseAuth, RawPocketBaseRecord } from "@/lib/pocketbase/types";

function apiError(error: unknown, fallback = "Import request failed.") {
  const status = error instanceof Error && "status" in error && typeof (error as { status?: unknown }).status === "number"
    ? (error as { status: number }).status
    : 500;
  const message = error instanceof Error ? error.message : fallback;
  console.error("Import job update API error:", error);
  return NextResponse.json({ error: message || fallback }, { status: status >= 400 && status < 500 ? status : 502 });
}

function withAuthCookie(response: NextResponse, cookie?: string) {
  if (cookie) response.headers.append("Set-Cookie", cookie);
  return response;
}

async function refreshAuth(auth: PocketBaseAuth) {
  const refreshed = await pbRequest<{ token: string; record: RawPocketBaseRecord }>(
    "/api/collections/users/auth-refresh",
    { method: "POST", token: auth.token }
  );

  const nextAuth: PocketBaseAuth = {
    token: refreshed.token,
    user: normalizeUser(refreshed.record),
  };

  return {
    auth: nextAuth,
    cookie: serializeAuthCookie(nextAuth),
  };
}

async function requireAdminAuth() {
  const current = await getServerAuth();
  if (!current?.user) return { error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };

  let refreshed: Awaited<ReturnType<typeof refreshAuth>>;
  try {
    refreshed = await refreshAuth(current);
  } catch {
    return { error: NextResponse.json({ error: "Your session expired. Please sign in again." }, { status: 401 }) };
  }

  if (!isGiveMeMidiAdmin(refreshed.auth.user.email)) {
    return { error: withAuthCookie(NextResponse.json({ error: "Not authorized." }, { status: 403 }), refreshed.cookie) };
  }

  return refreshed;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireAdminAuth();
    if ("error" in guard) return guard.error;
    const { auth, cookie } = guard;

    const { id } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return withAuthCookie(NextResponse.json({ error: "Invalid import job payload." }, { status: 400 }), cookie);

    const item = await pbRequest<ImportJob>(`/api/collections/import_jobs/records/${id}`, {
      method: "PATCH",
      token: auth.token,
      body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }),
    });
    return withAuthCookie(NextResponse.json({ item }), cookie);
  } catch (error) {
    return apiError(error, "Unable to update import job.");
  }
}