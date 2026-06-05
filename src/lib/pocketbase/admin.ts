import { POCKETBASE_URL } from "@/lib/pocketbase/config";
import type { RawPocketBaseRecord } from "@/lib/pocketbase/types";

let cachedToken: string | null = null;
const ADMIN_BASE_URL = POCKETBASE_URL.replace(/\/+$/, "");

async function adminRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: BodyInit | null;
    token?: string | null;
    headers?: HeadersInit;
  } = {}
) {
  const response = await fetch(`${ADMIN_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
    body: options.body,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Admin request failed (${response.status}) ${text}`);
  }

  if (response.status === 204) return null as T;
  return (await response.json()) as T;
}

export async function getPocketBaseAdminToken() {
  if (cachedToken) return cachedToken;

  const identity = process.env.POCKETBASE_SUPERUSER_EMAIL;
  const password = process.env.POCKETBASE_SUPERUSER_PASSWORD;
  if (!identity || !password) {
    throw new Error("Missing server credentials.");
  }

  const body = JSON.stringify({ identity, password });
  try {
    const auth = await adminRequest<{ token: string }>(
      "/api/collections/_superusers/auth-with-password",
      { method: "POST", body }
    );
    cachedToken = auth.token;
  } catch {
    const auth = await adminRequest<{ token: string }>("/api/admins/auth-with-password", {
      method: "POST",
      body,
    });
    cachedToken = auth.token;
  }

  return cachedToken;
}

export async function adminCreateRecord<T extends RawPocketBaseRecord>(
  collection: string,
  data: Record<string, unknown>
) {
  const token = await getPocketBaseAdminToken();
  return adminRequest<T>(`/api/collections/${collection}/records`, {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });
}

export async function adminUpdateRecord<T extends RawPocketBaseRecord>(
  collection: string,
  id: string,
  data: Record<string, unknown>
) {
  const token = await getPocketBaseAdminToken();
  return adminRequest<T>(`/api/collections/${collection}/records/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(data),
  });
}

export async function adminGetRecord<T extends RawPocketBaseRecord>(
  collection: string,
  id: string
) {
  const token = await getPocketBaseAdminToken();
  return adminRequest<T>(`/api/collections/${collection}/records/${id}`, { token });
}

export async function adminListRecords<T extends RawPocketBaseRecord>(
  collection: string,
  params: URLSearchParams
) {
  const token = await getPocketBaseAdminToken();
  return adminRequest<{
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
    items: T[];
  }>(`/api/collections/${collection}/records?${params.toString()}`, { token });
}
