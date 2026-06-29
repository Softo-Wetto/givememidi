import { NextRequest, NextResponse } from "next/server";
import { isGiveMeMidiAdmin } from "@/lib/givememidi-admin";
import { pbAdminRequest } from "@/lib/pocketbase/admin";
import { getServerAuth } from "@/lib/pocketbase/server";
import type { ImportJob, PocketBaseList } from "@/lib/pocketbase/types";

function escapeFilterValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function requireAdmin() {
  const auth = await getServerAuth();
  if (!auth?.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!isGiveMeMidiAdmin(auth.user.email)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  return null;
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
  const rejected = await requireAdmin();
  if (rejected) return rejected;

  const params = new URL(request.url).searchParams;
  const query = new URLSearchParams({
    page: params.get("page") || "1",
    perPage: params.get("perPage") || "200",
    sort: params.get("sort") || "-created_at",
  });
  const filter = params.get("filter");
  if (filter) query.set("filter", filter);

  const list = await pbAdminRequest<PocketBaseList<ImportJob>>(
    `/api/collections/import_jobs/records?${query.toString()}`
  );
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  const rejected = await requireAdmin();
  if (rejected) return rejected;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid import job payload." }, { status: 400 });

  const payload = normalizeJobPayload(body);
  if (!payload.dedupe_key) {
    return NextResponse.json({ error: "A source URL or dedupe key is required." }, { status: 400 });
  }

  const existing = await pbAdminRequest<PocketBaseList<ImportJob>>(
    `/api/collections/import_jobs/records?page=1&perPage=1&filter=${encodeURIComponent(`dedupe_key = "${escapeFilterValue(payload.dedupe_key)}"`)}`
  );
  if (existing.items[0]) {
    return NextResponse.json({ item: existing.items[0], duplicate: true });
  }

  const item = await pbAdminRequest<ImportJob>("/api/collections/import_jobs/records", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return NextResponse.json({ item, duplicate: false });
}