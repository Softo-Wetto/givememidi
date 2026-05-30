"use client";

import {
  clearBrowserAuth,
  getBrowserAuth,
  saveBrowserAuth,
} from "@/lib/pocketbase/auth-cookie";
import {
  listRecords,
  normalizeRecord,
  normalizeUser,
  pbRequest as basePbRequest,
} from "@/lib/pocketbase/shared";
import type { PocketBaseAuth, RawPocketBaseRecord } from "@/lib/pocketbase/types";

async function pbRequest<T>(
  path: string,
  options: Parameters<typeof basePbRequest<T>>[1] = {}
) {
  try {
    return await basePbRequest<T>(path, options);
  } catch (error) {
    const status = error instanceof Error && "status" in error
      ? (error as { status?: number }).status
      : undefined;

    if (status === 401 || status === 403) clearBrowserAuth();
    throw error;
  }
}

export async function signInWithPassword(email: string, password: string) {
  const response = await pbRequest<{ token: string; record: RawPocketBaseRecord }>(
    "/api/collections/users/auth-with-password",
    {
      method: "POST",
      body: JSON.stringify({ identity: email, password }),
    }
  );

  const auth: PocketBaseAuth = {
    token: response.token,
    user: normalizeUser(response.record),
  };

  saveBrowserAuth(auth);
  return auth;
}

export async function signUpWithPassword(email: string, password: string) {
  const username = email.split("@")[0]?.replace(/[^a-zA-Z0-9_-]/g, "_") || "user";
  const record = await pbRequest<RawPocketBaseRecord>(
    "/api/collections/users/records",
    {
      method: "POST",
      body: JSON.stringify({
        email,
        username,
        password,
        passwordConfirm: password,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    }
  );

  const auth = await signInWithPassword(email, password);

  try {
    await createRecord("profiles", {
      id: auth.user.id,
      user_id: auth.user.id,
      username,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Profile may already exist if signup was retried.
  }

  return normalizeUser(record);
}

export function signOut() {
  clearBrowserAuth();
}

export function getCurrentAuth() {
  return getBrowserAuth();
}

export async function createRecord<T extends RawPocketBaseRecord>(
  collection: string,
  data: Record<string, unknown> | FormData
) {
  const auth = getBrowserAuth();
  const record = await pbRequest<T>(`/api/collections/${collection}/records`, {
    method: "POST",
    token: auth?.token,
    body: data instanceof FormData ? data : JSON.stringify(data),
  });

  return normalizeRecord(record);
}

export async function updateRecord<T extends RawPocketBaseRecord>(
  collection: string,
  id: string,
  data: Record<string, unknown> | FormData
) {
  const auth = getBrowserAuth();
  const record = await pbRequest<T>(`/api/collections/${collection}/records/${id}`, {
    method: "PATCH",
    token: auth?.token,
    body: data instanceof FormData ? data : JSON.stringify(data),
  });

  return normalizeRecord(record);
}

export async function deleteRecord(collection: string, id: string) {
  const auth = getBrowserAuth();
  await pbRequest(`/api/collections/${collection}/records/${id}`, {
    method: "DELETE",
    token: auth?.token,
  });
}

export async function getClientRecords<T extends RawPocketBaseRecord>(
  collection: string,
  params: URLSearchParams
) {
  const auth = getBrowserAuth();
  return listRecords<T>(collection, params, auth?.token);
}

export async function getClientRecord<T extends RawPocketBaseRecord>(
  collection: string,
  id: string,
  expand?: string
) {
  const auth = getBrowserAuth();
  const suffix = expand ? `?expand=${encodeURIComponent(expand)}` : "";
  const record = await pbRequest<T>(
    `/api/collections/${collection}/records/${id}${suffix}`,
    { token: auth?.token }
  );

  return normalizeRecord(record);
}
