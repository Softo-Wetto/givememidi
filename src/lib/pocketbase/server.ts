import { cookies } from "next/headers";
import { parseAuthCookie } from "@/lib/pocketbase/auth-cookie";
import {
  escapeFilterValue,
  listRecords,
  normalizeRecord,
  normalizeUser,
  pbRequest,
} from "@/lib/pocketbase/shared";
import type { PocketBaseAuth, RawPocketBaseRecord } from "@/lib/pocketbase/types";

export async function getServerAuth(): Promise<PocketBaseAuth | null> {
  const cookieStore = await cookies();
  return parseAuthCookie(cookieStore.get("givememidi_pb_auth")?.value);
}

export async function getServerUser() {
  const auth = await getServerAuth();
  if (!auth) return null;

  try {
    const user = await pbRequest<RawPocketBaseRecord>(
      `/api/collections/users/records/${auth.user.id}`,
      { token: auth.token }
    );

    return normalizeUser(user);
  } catch {
    return null;
  }
}

export async function getRecords<T extends RawPocketBaseRecord>(
  collection: string,
  options: {
    sort?: string;
    filter?: string;
    fields?: string;
    perPage?: number;
    page?: number;
    expand?: string;
  } = {}
) {
  const auth = await getServerAuth();
  const params = new URLSearchParams({
    page: String(options.page ?? 1),
    perPage: String(options.perPage ?? 200),
  });

  if (options.sort) params.set("sort", options.sort);
  if (options.filter) params.set("filter", options.filter);
  if (options.fields) params.set("fields", options.fields);
  if (options.expand) params.set("expand", options.expand);

  return listRecords<T>(collection, params, auth?.token);
}

export async function getRecord<T extends RawPocketBaseRecord>(
  collection: string,
  id: string,
  expand?: string
) {
  const auth = await getServerAuth();
  const suffix = expand ? `?expand=${encodeURIComponent(expand)}` : "";
  const record = await pbRequest<T>(
    `/api/collections/${collection}/records/${id}${suffix}`,
    { token: auth?.token }
  );

  return normalizeRecord(record);
}

export function equalsFilter(field: string, value: string) {
  return `${field} = "${escapeFilterValue(value)}"`;
}

export function searchFilter(fields: string[], value: string) {
  const escaped = escapeFilterValue(value);
  return fields.map((field) => `${field} ~ "${escaped}"`).join(" || ");
}
