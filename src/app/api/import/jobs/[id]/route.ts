import { NextRequest, NextResponse } from "next/server";
import { isGiveMeMidiAdmin } from "@/lib/givememidi-admin";
import { pbRequest } from "@/lib/pocketbase/shared";
import { getServerAuth } from "@/lib/pocketbase/server";
import type { ImportJob } from "@/lib/pocketbase/types";

async function requireAdminAuth() {
  const auth = await getServerAuth();
  if (!auth?.user) return { error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  if (!isGiveMeMidiAdmin(auth.user.email)) {
    return { error: NextResponse.json({ error: "Not authorized." }, { status: 403 }) };
  }
  return { auth };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminAuth();
  if (guard.error) return guard.error;
  const { auth } = guard;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid import job payload." }, { status: 400 });

  const item = await pbRequest<ImportJob>(`/api/collections/import_jobs/records/${id}`, {
    method: "PATCH",
    token: auth.token,
    body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }),
  });
  return NextResponse.json({ item });
}