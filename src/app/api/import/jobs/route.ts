import { NextRequest, NextResponse } from "next/server";
import { isGiveMeMidiAdmin } from "@/lib/givememidi-admin";
import { validateImportJobIds } from "@/lib/import-queue";
import { serializeAuthCookie } from "@/lib/pocketbase/auth-cookie";
import { pbRequest, normalizeUser } from "@/lib/pocketbase/shared";
import { getServerAuth } from "@/lib/pocketbase/server";
import type { ImportJob, PocketBaseAuth, PocketBaseList, RawPocketBaseRecord } from "@/lib/pocketbase/types";

function escapeFilterValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function apiError(error: unknown, fallback = "Import request failed.") {
  const status = error instanceof Error && "status" in error && typeof (error as { status?: unknown }).status === "number"
    ? (error as { status: number }).status
    : 500;
  const message = error instanceof Error ? error.message : fallback;
  console.error("Import jobs API error:", error);
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

function normalizeJobPayload(body: Record<string, unknown>) {
  const now = new Date().toISOString();
  return {
    source_url: String(body.source_url || "").trim(),
    source_type: String(body.source_type || "score_url"),
    title: String(body.title || "Imported MIDI"),
    composer: String(body.composer || ""),
    genre: String(body.genre || ""),
    description: String(body.description || ""),
    license: String(body.license || "Needs review"),
    permission_note: String(body.permission_note || "Review license/permission before importing."),
    status: String(body.status || "pending"),
    dedupe_key: String(body.dedupe_key || body.source_url || crypto.randomUUID()).trim().toLowerCase().replace(/\/$/, ""),
    bpm: body.bpm === null || body.bpm === "" || typeof body.bpm === "undefined" ? null : Number(body.bpm),
    midi_path: String(body.midi_path || ""),
    pdf_path: String(body.pdf_path || ""),
    created_at: String(body.created_at || now),
    updated_at: String(body.updated_at || now),
  };
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdminAuth();
    if ("error" in guard) return guard.error;
    const { auth, cookie } = guard;

    const params = new URL(request.url).searchParams;
    const query = new URLSearchParams({
      page: params.get("page") || "1",
      perPage: params.get("perPage") || "200",
      sort: params.get("sort") || "-created_at",
    });
    const filter = params.get("filter");
    if (filter) query.set("filter", filter);

    const list = await pbRequest<PocketBaseList<ImportJob>>(
      `/api/collections/import_jobs/records?${query.toString()}`,
      { token: auth.token }
    );
    return withAuthCookie(NextResponse.json(list), cookie);
  } catch (error) {
    return apiError(error, "Unable to load import jobs.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireAdminAuth();
    if ("error" in guard) return guard.error;
    const { auth, cookie } = guard;

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return withAuthCookie(NextResponse.json({ error: "Invalid import job payload." }, { status: 400 }), cookie);

    const payload = normalizeJobPayload(body);
    if (!payload.dedupe_key) {
      return withAuthCookie(NextResponse.json({ error: "A source URL or dedupe key is required." }, { status: 400 }), cookie);
    }

    const existing = await pbRequest<PocketBaseList<ImportJob>>(
      `/api/collections/import_jobs/records?page=1&perPage=1&filter=${encodeURIComponent(`dedupe_key = "${escapeFilterValue(payload.dedupe_key)}"`)}`,
      { token: auth.token }
    );
    if (existing.items[0]) {
      return withAuthCookie(NextResponse.json({ item: existing.items[0], duplicate: true }), cookie);
    }

    const item = await pbRequest<ImportJob>("/api/collections/import_jobs/records", {
      method: "POST",
      token: auth.token,
      body: JSON.stringify(payload),
    });
    return withAuthCookie(NextResponse.json({ item, duplicate: false }), cookie);
  } catch (error) {
    return apiError(error, "Unable to create import job.");
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const guard = await requireAdminAuth();
    if ("error" in guard) return guard.error;
    const { auth, cookie } = guard;

    const body = await request.json().catch(() => null);
    const validation = validateImportJobIds(body, 200);
    if ("error" in validation) {
      return withAuthCookie(
        NextResponse.json({ error: validation.error }, { status: 400 }),
        cookie
      );
    }

    const results = await Promise.allSettled(
      validation.ids.map(async (id) => {
        await pbRequest<void>(`/api/collections/import_jobs/records/${id}`, {
          method: "DELETE",
          token: auth.token,
        });
        return id;
      })
    );

    const deletedIds: string[] = [];
    const failures: Array<{ id: string; error: string }> = [];

    results.forEach((result, index) => {
      const id = validation.ids[index];
      if (result.status === "fulfilled") {
        deletedIds.push(id);
        return;
      }

      failures.push({
        id,
        error:
          result.reason instanceof Error
            ? result.reason.message
            : "Unable to delete this import job.",
      });
    });

    if (deletedIds.length === 0) {
      console.error("Bulk import job deletion failed:", failures);
      return withAuthCookie(
        NextResponse.json(
          {
            error: "Unable to delete the selected import jobs.",
            deletedIds,
            failures,
          },
          { status: 502 }
        ),
        cookie
      );
    }

    return withAuthCookie(NextResponse.json({ deletedIds, failures }), cookie);
  } catch (error) {
    return apiError(error, "Unable to delete import jobs.");
  }
}