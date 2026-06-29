import { POCKETBASE_URL } from "@/lib/pocketbase/config";
import type { PocketBaseList, RawPocketBaseRecord } from "@/lib/pocketbase/types";

const ADMIN_EMAIL = process.env.POCKETBASE_SUPERUSER_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_SUPERUSER_PASSWORD;
const BASE_URL = POCKETBASE_URL.replace(/\/+$/, "");

let cachedToken: { token: string; expiresAt: number } | null = null;

type AdminRequestOptions = RequestInit & {
  token?: string | null;
};

async function request<T>(path: string, { token, headers, ...init }: AdminRequestOptions = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let message = `PocketBase admin request failed (${response.status})`;
    try {
      const body = JSON.parse(text) as { message?: string; data?: unknown };
      message = [body.message || message, body.data ? JSON.stringify(body.data) : ""]
        .filter(Boolean)
        .join(" ");
    } catch {
      if (text) message = `${message} ${text}`;
    }
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function getPocketBaseAdminToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("PocketBase admin credentials are not configured for server imports.");
  }

  const body = JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  let auth: { token: string };
  try {
    auth = await request<{ token: string }>("/api/collections/_superusers/auth-with-password", {
      method: "POST",
      body,
    });
  } catch {
    auth = await request<{ token: string }>("/api/admins/auth-with-password", {
      method: "POST",
      body,
    });
  }

  cachedToken = { token: auth.token, expiresAt: Date.now() + 10 * 60 * 1000 };
  return auth.token;
}

export async function pbAdminRequest<T>(path: string, init: RequestInit = {}) {
  const token = await getPocketBaseAdminToken();
  return request<T>(path, { ...init, token });
}
export async function adminListRecords<T extends RawPocketBaseRecord>(
  collection: string,
  params: URLSearchParams
) {
  return pbAdminRequest<PocketBaseList<T>>(
    `/api/collections/${collection}/records?${params.toString()}`
  );
}

export async function adminGetRecord<T extends RawPocketBaseRecord>(
  collection: string,
  id: string,
  expand?: string
) {
  const suffix = expand ? `?expand=${encodeURIComponent(expand)}` : "";
  return pbAdminRequest<T>(`/api/collections/${collection}/records/${id}${suffix}`);
}

export async function adminCreateRecord<T extends RawPocketBaseRecord>(
  collection: string,
  data: Record<string, unknown> | FormData
) {
  return pbAdminRequest<T>(`/api/collections/${collection}/records`, {
    method: "POST",
    body: data instanceof FormData ? data : JSON.stringify(data),
  });
}

export async function adminUpdateRecord<T extends RawPocketBaseRecord>(
  collection: string,
  id: string,
  data: Record<string, unknown> | FormData
) {
  return pbAdminRequest<T>(`/api/collections/${collection}/records/${id}`, {
    method: "PATCH",
    body: data instanceof FormData ? data : JSON.stringify(data),
  });
}