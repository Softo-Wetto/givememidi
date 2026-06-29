import { NextRequest, NextResponse } from "next/server";
import { isGiveMeMidiAdmin } from "@/lib/givememidi-admin";
import { pbAdminRequest } from "@/lib/pocketbase/admin";
import { getServerAuth } from "@/lib/pocketbase/server";
import type { ImportJob } from "@/lib/pocketbase/types";

async function requireAdmin() {
  const auth = await getServerAuth();
  if (!auth?.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!isGiveMeMidiAdmin(auth.user.email)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  return null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rejected = await requireAdmin();
  if (rejected) return rejected;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid import job payload." }, { status: 400 });

  const item = await pbAdminRequest<ImportJob>(`/api/collections/import_jobs/records/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }),
  });
  return NextResponse.json({ item });
}