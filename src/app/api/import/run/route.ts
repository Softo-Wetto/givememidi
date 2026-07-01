import { NextRequest, NextResponse } from "next/server";
import { isGiveMeMidiAdmin } from "@/lib/givememidi-admin";
import { getServerAuth } from "@/lib/pocketbase/server";

type WorkerMethod = "GET" | "POST";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function requireAdmin() {
  const auth = await getServerAuth();
  if (!auth?.user) return { error: jsonError("Please sign in again.", 401) };
  if (!isGiveMeMidiAdmin(auth.user.email)) return { error: jsonError("Not authorized.", 403) };
  return { auth };
}

function workerConfig() {
  const url = process.env.IMPORT_WORKER_URL?.replace(/\/+$/, "") || "";
  const key = process.env.IMPORT_WORKER_KEY || "";
  if (!url || !key) return null;
  return { url, key };
}

async function callWorker(path: string, method: WorkerMethod, body?: unknown) {
  const config = workerConfig();
  if (!config) {
    return jsonError("Import worker is not configured. Set IMPORT_WORKER_URL and IMPORT_WORKER_KEY.", 503);
  }

  let response: Response;
  try {
    response = await fetch(`${config.url}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
      },
      body: typeof body === "undefined" ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Import worker fetch failed:", error);
    return jsonError("Import worker is unreachable from the web app.", 502);
  }

  const payload = await response.json().catch(() => null);
  return NextResponse.json(payload ?? { error: "Import worker returned an invalid response." }, {
    status: response.status,
  });
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  return callWorker("/status", "GET");
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const body = (await request.json().catch(() => null)) as {
    limit?: number;
    status?: string;
    types?: string;
    import?: boolean;
  } | null;

  return callWorker("/run", "POST", {
    limit: Math.min(Math.max(Number(body?.limit || 25), 1), 200),
    status: body?.status || "pending",
    types: body?.types || "midi,pdf",
    import: body?.import !== false,
  });
}