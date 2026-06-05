import { POCKETBASE_URL } from "@/lib/pocketbase/config";
import {
  clearBrowserAuth,
  getBrowserAuth,
  saveBrowserAuth,
} from "@/lib/pocketbase/auth-cookie";
import {
  listRecords,
  normalizeRecord,
  normalizeUser,
  pbRequest,
} from "@/lib/pocketbase/shared";
import type { RawPocketBaseRecord } from "@/lib/pocketbase/types";

type QueryResult<T = unknown> = {
  data: T | null;
  error: Error | null;
  count?: number | null;
};

type Filter = {
  field: string;
  op: "eq" | "neq" | "not_null" | "in";
  value: unknown;
};

const LEGACY_ID_COLLECTIONS = new Set([
  "profiles",
  "music_files",
  "midi_ratings",
  "midi_comments",
  "follows",
  "bookmarks",
  "contact_messages",
]);

const UPDATED_AT_COLLECTIONS = new Set([
  "users",
  "profiles",
  "music_files",
  "midi_ratings",
]);

function withCreateDefaults(collection: string, data: Record<string, unknown>) {
  const now = new Date().toISOString();
  return {
    ...data,
    ...(LEGACY_ID_COLLECTIONS.has(collection) && !data.legacy_id
      ? { legacy_id: crypto.randomUUID() }
      : {}),
    created_at: data.created_at ?? now,
    ...(UPDATED_AT_COLLECTIONS.has(collection) ? { updated_at: data.updated_at ?? now } : {}),
  };
}

async function createPbRecord<T extends RawPocketBaseRecord>(
  collection: string,
  data: Record<string, unknown> | FormData
) {
  const auth = getBrowserAuth();
  const body = data instanceof FormData ? data : withCreateDefaults(collection, data);
  const record = await pbRequest<T>(`/api/collections/${collection}/records`, {
    method: "POST",
    token: auth?.token,
    body: data instanceof FormData ? data : JSON.stringify(body),
  });

  return normalizeRecord(record);
}

async function updatePbRecord<T extends RawPocketBaseRecord>(
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

async function deletePbRecord(collection: string, id: string) {
  const auth = getBrowserAuth();
  await pbRequest(`/api/collections/${collection}/records/${id}`, {
    method: "DELETE",
    token: auth?.token,
  });
}

async function signInPb(email: string, password: string) {
  const response = await pbRequest<{ token: string; record: RawPocketBaseRecord }>(
    "/api/collections/users/auth-with-password",
    {
      method: "POST",
      body: JSON.stringify({ identity: email, password }),
    }
  );

  const auth = {
    token: response.token,
    user: normalizeUser(response.record),
  };
  saveBrowserAuth(auth);
  return auth;
}

async function signUpPb(email: string, password: string, requestedUsername?: string) {
  const fallback = email.split("@")[0]?.replace(/[^a-zA-Z0-9_-]/g, "_") || "user";
  const username = requestedUsername?.replace(/[^a-zA-Z0-9_-]/g, "_") || fallback;
  const record = await createPbRecord<RawPocketBaseRecord>("users", {
    email,
    username,
    password,
    passwordConfirm: password,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  const auth = await signInPb(email, password);

  try {
    await createPbRecord("profiles", {
      id: auth.user.id,
      user_id: auth.user.id,
      username,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Profile may already exist.
  }

  return normalizeUser(record);
}

function escapeFilterValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function pbFilter(filters: Filter[]) {
  return filters
    .map((filter) => {
      if (filter.op === "eq") {
        return `${filter.field} = "${escapeFilterValue(String(filter.value))}"`;
      }
      if (filter.op === "neq") {
        return `${filter.field} != "${escapeFilterValue(String(filter.value))}"`;
      }
      if (filter.op === "not_null") {
        return `${filter.field} != "" && ${filter.field} != null`;
      }
      const values = Array.isArray(filter.value) ? filter.value : [];
      return values
        .map((value) => `${filter.field} = "${escapeFilterValue(String(value))}"`)
        .join(" || ");
    })
    .filter(Boolean)
    .map((part) => (part.includes(" || ") ? `(${part})` : part))
    .join(" && ");
}

function fieldsFromSelect(select?: string) {
  if (!select || select === "*" || select.includes("(")) return undefined;
  return select
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean)
    .join(",");
}

async function fetchProfile(id?: string | null) {
  if (!id) return null;
  try {
    const params = new URLSearchParams({
      page: "1",
      perPage: "1",
      filter: `id = "${escapeFilterValue(id)}"`,
    });
    const response = await listRecords<RawPocketBaseRecord>("profiles", params);
    return response.items[0] ?? null;
  } catch {
    return null;
  }
}

async function fetchRecord(collection: string, id?: string | null) {
  if (!id) return null;
  try {
    const params = new URLSearchParams({
      page: "1",
      perPage: "1",
      filter: `id = "${escapeFilterValue(id)}"`,
    });
    const response = await listRecords<RawPocketBaseRecord>(collection, params);
    return response.items[0] ?? null;
  } catch {
    return null;
  }
}

async function expandRows(collection: string, select: string | undefined, rows: RawPocketBaseRecord[]) {
  if (collection === "music_files" && select?.includes("uploader:profiles")) {
    const profileIds = Array.from(
      new Set(rows.map((row) => row.uploaded_by).filter(Boolean).map(String))
    );
    const profiles = new Map<string, RawPocketBaseRecord>();

    await Promise.all(
      profileIds.map(async (id) => {
        const profile = await fetchProfile(id);
        if (profile) profiles.set(id, profile);
      })
    );

    return rows.map((row) => ({
      ...row,
      uploader: row.uploaded_by ? profiles.get(String(row.uploaded_by)) ?? null : null,
    }));
  }

  if (collection === "bookmarks" && select?.includes("music_files")) {
    const midiIds = Array.from(new Set(rows.map((row) => row.midi_id).filter(Boolean).map(String)));
    const midis = new Map<string, RawPocketBaseRecord>();
    await Promise.all(
      midiIds.map(async (id) => {
        const midi = await fetchRecord("music_files", id);
        if (midi) midis.set(id, midi);
      })
    );

    return rows.map((row) => ({
      ...row,
      music_files: row.midi_id ? midis.get(String(row.midi_id)) ?? null : null,
    }));
  }

  if (collection === "follows" && select?.includes("profiles:")) {
    const field = select.includes("profiles:following_id") ? "following_id" : "follower_id";
    const profileIds = Array.from(new Set(rows.map((row) => row[field]).filter(Boolean).map(String)));
    const profiles = new Map<string, RawPocketBaseRecord>();
    await Promise.all(
      profileIds.map(async (id) => {
        const profile = await fetchRecord("profiles", id);
        if (profile) profiles.set(id, profile);
      })
    );

    return rows.map((row) => ({
      ...row,
      profiles: row[field] ? profiles.get(String(row[field])) ?? null : null,
    }));
  }

  return rows;
}

class QueryBuilder<T = unknown> implements PromiseLike<QueryResult<T>> {
  private filters: Filter[] = [];
  private selected?: string;
  private sort?: string;
  private perPage = 200;
  private page = 1;
  private orParts: string[] = [];
  private mode: "select" | "update" | "delete" = "select";
  private payload: Record<string, unknown> | null = null;
  private singleMode: "single" | "maybe" | null = null;
  private head = false;

  constructor(private collection: string) {}

  select<R = RawPocketBaseRecord>(select = "*", options?: { count?: "exact"; head?: boolean }) {
    this.selected = select;
    this.head = Boolean(options?.head);
    return this as unknown as QueryBuilder<R[]>;
  }

  eq(field: string, value: unknown) {
    this.filters.push({ field, op: "eq", value });
    return this;
  }

  neq(field: string, value: unknown) {
    this.filters.push({ field, op: "neq", value });
    return this;
  }

  not(field: string, operator: string, value: unknown) {
    if (operator === "is" && value === null) {
      this.filters.push({ field, op: "not_null", value });
    } else if (operator === "eq") {
      this.filters.push({ field, op: "neq", value });
    }
    return this;
  }

  in(field: string, values: unknown[]) {
    this.filters.push({ field, op: "in", value: values });
    return this;
  }

  ilike(field: string, value: string) {
    this.orParts.push(`${field} ~ "${escapeFilterValue(value.replace(/%/g, ""))}"`);
    return this;
  }

  or(expression: string) {
    this.orParts.push(
      ...expression
        .split(",")
        .map((part) => {
          const match = part.match(/^([^.]+)\.ilike\.%?(.*?)%?$/);
          if (!match) return "";
          return `${match[1]} ~ "${escapeFilterValue(match[2])}"`;
        })
        .filter(Boolean)
    );
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.sort = `${options?.ascending === false ? "-" : ""}${field}`;
    return this;
  }

  limit(value: number) {
    this.perPage = value;
    return this;
  }

  range(from: number, to: number) {
    this.perPage = Math.max(1, to - from + 1);
    this.page = Math.floor(from / this.perPage) + 1;
    return this;
  }

  single<R = T>() {
    this.singleMode = "single";
    return this as unknown as PromiseLike<QueryResult<R>>;
  }

  maybeSingle<R = T>() {
    this.singleMode = "maybe";
    return this as unknown as PromiseLike<QueryResult<R | null>>;
  }

  update(payload: Record<string, unknown>) {
    this.mode = "update";
    this.payload = payload;
    return this;
  }

  delete() {
    this.mode = "delete";
    return this;
  }

  async insert(payload: Record<string, unknown> | Array<Record<string, unknown>>) {
    try {
      const rows = Array.isArray(payload) ? payload : [payload];
      const created = [];

      for (const row of rows) {
        created.push(await createPbRecord(this.collection, row));
      }

      return {
        data: (Array.isArray(payload) ? created : created[0]) as T,
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async upsert(payload: Record<string, unknown>, _options?: unknown) {
    try {
      if (this.collection === "midi_ratings") {
        const params = new URLSearchParams({
          page: "1",
          perPage: "1",
          filter: [
            `midi_id = "${escapeFilterValue(String(payload.midi_id))}"`,
            `user_id = "${escapeFilterValue(String(payload.user_id))}"`,
          ].join(" && "),
        });
        const auth = getBrowserAuth();
        const existing = await listRecords<RawPocketBaseRecord>(
          this.collection,
          params,
          auth?.token
        );
        const saved = existing.items[0]
          ? await updatePbRecord(this.collection, existing.items[0].id, {
              ...payload,
              updated_at: new Date().toISOString(),
            })
          : await createPbRecord(this.collection, {
              ...payload,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

        return { data: saved as T, error: null };
      }

      const saved = await createPbRecord(this.collection, payload);
      return { data: saved as T, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<QueryResult<T>> {
    try {
      if (this.mode === "update" || this.mode === "delete") {
        const found = await this.fetchRows();
        const rows = found.items;

        for (const row of rows) {
          if (this.mode === "delete") {
            await deletePbRecord(this.collection, row.id);
          } else if (this.payload) {
            await updatePbRecord(this.collection, row.id, this.payload);
          }
        }

        return { data: rows as T, error: null, count: rows.length };
      }

      const found = await this.fetchRows();
      const rows = await expandRows(this.collection, this.selected, found.items);

      if (this.head) {
        return { data: null, error: null, count: found.totalItems };
      }

      if (this.singleMode) {
        const first = rows[0] ?? null;
        if (!first && this.singleMode === "single") {
          return { data: null, error: new Error("Record not found") };
        }

        return { data: first as T, error: null };
      }

      return { data: rows as T, error: null, count: found.totalItems };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  private fetchRows() {
    const params = new URLSearchParams({
      page: "1",
      perPage: String(this.perPage),
    });
    const filter = pbFilter(this.filters);
    const orFilter = this.orParts.length > 0 ? `(${this.orParts.join(" || ")})` : "";
    const combinedFilter = [filter, orFilter].filter(Boolean).join(" && ");
    const fields = fieldsFromSelect(this.selected);

    params.set("page", String(this.page));
    if (combinedFilter) params.set("filter", combinedFilter);
    if (fields) params.set("fields", fields);
    if (this.sort) params.set("sort", this.sort);

    const auth = getBrowserAuth();
    return listRecords<RawPocketBaseRecord>(this.collection, params, auth?.token);
  }
}

function authResponse() {
  const auth = getBrowserAuth();
  return {
    data: {
      user: auth?.user
        ? {
            ...auth.user,
            identities: [{ provider: "pocketbase" }],
            app_metadata: { provider: "pocketbase" },
            user_metadata: {
              username: auth.user.username,
              avatar_url: auth.user.avatar_url,
            },
          }
        : null,
      session: auth
        ? {
            access_token: auth.token,
            user: {
              ...auth.user,
              identities: [{ provider: "pocketbase" }],
              app_metadata: { provider: "pocketbase" },
              user_metadata: {
                username: auth.user.username,
                avatar_url: auth.user.avatar_url,
              },
            },
          }
        : null,
    },
    error: null,
  };
}

export const pocketbase = {
  auth: {
    async getUser() {
      return authResponse();
    },
    async getSession() {
      return authResponse();
    },
    onAuthStateChange(callback: (event: string, session: any) => void) {
      const handler = () => callback("SIGNED_IN", authResponse().data.session);
      window.addEventListener("givememidi-auth", handler);
      return {
        data: {
          subscription: {
            unsubscribe: () => window.removeEventListener("givememidi-auth", handler),
          },
        },
      };
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      try {
        const auth = await signInPb(email, password);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("givememidi-auth"));
        }
        return { data: { user: auth.user, session: auth }, error: null };
      } catch (error) {
        return { data: { user: null, session: null }, error: error as Error };
      }
    },
    async signUp({
      email,
      password,
      username,
    }: {
      email: string;
      password: string;
      username?: string;
    }) {
      try {
        const user = await signUpPb(email, password, username);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("givememidi-auth"));
        }
        return { data: { user }, error: null };
      } catch (error) {
        return { data: { user: null }, error: error as Error };
      }
    },
    async signOut() {
      clearBrowserAuth();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("givememidi-auth"));
      }
      return { error: null };
    },
    async updateUser({ password }: { password?: string }) {
      const auth = getBrowserAuth();
      if (!auth) return { data: null, error: new Error("Not logged in") };

      try {
        const body: Record<string, unknown> = {};
        if (password) {
          body.password = password;
          body.passwordConfirm = password;
        }

        const response = await fetch(`${POCKETBASE_URL}/api/collections/users/records/${auth.user.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) throw new Error("Unable to update user.");
        const record = normalizeRecord((await response.json()) as RawPocketBaseRecord);
        saveBrowserAuth({ ...auth, user: normalizeUser(record) });
        return { data: { user: record }, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },
    async resetPasswordForEmail(..._args: unknown[]) {
      return { data: null, error: new Error("Password reset email is not configured yet.") };
    },
    async signInWithOAuth(..._args: unknown[]) {
      return { data: null, error: new Error("OAuth is not configured yet.") };
    },
  },
  from(collection: string) {
    return new QueryBuilder<RawPocketBaseRecord[]>(collection);
  },
  channel(_name?: string) {
    return {
      on(..._args: unknown[]) {
        return this;
      },
      subscribe() {
        return this;
      },
    };
  },
  removeChannel(_channel?: unknown) {
    return null;
  },
};

export function createPocketBaseClient(..._args: unknown[]) {
  return pocketbase;
}
