import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) return;

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;
    const rawKey = trimmed.slice(0, equalsIndex).trim();
    const key = rawKey.startsWith("$env:") ? rawKey.slice(5) : rawKey;
    let value = trimmed.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const pocketBaseUrl =
  process.env.POCKETBASE_URL ||
  process.env.NEXT_PUBLIC_POCKETBASE_URL ||
  "https://api-midi.softowetto.com";
const superuserEmail = process.env.POCKETBASE_SUPERUSER_EMAIL;
const superuserPassword = process.env.POCKETBASE_SUPERUSER_PASSWORD;

if (!superuserEmail || !superuserPassword) {
  console.error("Missing POCKETBASE_SUPERUSER_EMAIL or POCKETBASE_SUPERUSER_PASSWORD.");
  process.exit(1);
}

const baseUrl = pocketBaseUrl.replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = `${options.method || "GET"} ${path} failed (${response.status})`;
    try {
      const body = await response.json();
      message = [body.message || message, body.data ? JSON.stringify(body.data, null, 2) : ""]
        .filter(Boolean)
        .join("\n");
    } catch {
      // Keep status message.
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function authenticate() {
  const body = JSON.stringify({ identity: superuserEmail, password: superuserPassword });
  try {
    const auth = await request("/api/collections/_superusers/auth-with-password", { method: "POST", body });
    return auth.token;
  } catch {
    const auth = await request("/api/admins/auth-with-password", { method: "POST", body });
    return auth.token;
  }
}

async function getCollection(token, name) {
  try {
    return await request(`/api/collections/${name}`, { token });
  } catch {
    return null;
  }
}

function mergeFields(existingFields = [], desiredFields = []) {
  const byName = new Map(existingFields.map((field) => [field.name, field]));
  for (const desired of desiredFields) {
    const existing = byName.get(desired.name);
    byName.set(desired.name, {
      ...(existing || {}),
      ...desired,
      id: existing?.id,
      system: existing?.system ?? false,
    });
  }
  return Array.from(byName.values());
}

async function upsertCollection(token, definition) {
  const existing = await getCollection(token, definition.name);
  if (!existing) {
    await request("/api/collections", {
      method: "POST",
      token,
      body: JSON.stringify(definition),
    });
    console.log(`Created ${definition.name}`);
    return getCollection(token, definition.name);
  }

  await request(`/api/collections/${existing.id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify({
      ...definition,
      fields: mergeFields(existing.fields, definition.fields),
    }),
  });
  console.log(`Updated ${definition.name}`);
  return getCollection(token, definition.name);
}

function text(name, options = {}) {
  return { name, type: "text", required: false, ...options };
}

function email(name, options = {}) {
  return { name, type: "email", required: false, ...options };
}

function number(name, options = {}) {
  return { name, type: "number", required: false, ...options };
}

function date(name, options = {}) {
  return { name, type: "date", required: false, ...options };
}

function relation(name, collectionId, options = {}) {
  return {
    name,
    type: "relation",
    collectionId,
    cascadeDelete: false,
    maxSelect: 1,
    minSelect: 0,
    required: false,
    ...options,
  };
}

function file(name, options = {}) {
  return {
    name,
    type: "file",
    maxSelect: 1,
    maxSize: 104857600,
    mimeTypes: [],
    protected: false,
    thumbs: [],
    required: false,
    ...options,
  };
}

const publicEditable = {
  listRule: "",
  viewRule: "",
  createRule: '@request.auth.id != ""',
  updateRule: '@request.auth.id != ""',
  deleteRule: '@request.auth.id != ""',
};

async function main() {
  const token = await authenticate();

  const users = await upsertCollection(token, {
    name: "users",
    type: "auth",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: '@request.auth.id = id',
    deleteRule: '@request.auth.id = id',
    indexes: ["CREATE UNIQUE INDEX idx_users_username ON users (username)"],
    fields: [
      text("legacy_id"),
      text("username"),
      text("bio"),
      text("avatar_url"),
      date("created_at"),
      date("updated_at"),
    ],
    passwordAuth: {
      enabled: true,
      identityFields: ["email", "username"],
    },
  });

  const profiles = await upsertCollection(token, {
    name: "profiles",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id = user_id',
    deleteRule: '@request.auth.id = user_id',
    indexes: ["CREATE UNIQUE INDEX idx_profiles_legacy_id ON profiles (legacy_id)"],
    fields: [
      text("legacy_id"),
      relation("user_id", users.id),
      text("username", { required: true }),
      text("bio"),
      text("avatar_url"),
      file("avatar", { maxSize: 5242880, mimeTypes: ["image/png", "image/jpeg", "image/webp"] }),
      date("created_at"),
      date("updated_at"),
    ],
  });

  const musicFiles = await upsertCollection(token, {
    name: "music_files",
    type: "base",
    ...publicEditable,
    indexes: ["CREATE INDEX idx_music_files_uploaded_by ON music_files (uploaded_by)"],
    fields: [
      text("legacy_id"),
      text("title", { required: true }),
      text("composer"),
      text("genre"),
      number("bpm"),
      text("midi_url"),
      text("pdf_url"),
      file("midi_file", { mimeTypes: ["audio/midi", "audio/x-midi", "application/octet-stream"] }),
      file("pdf_file", { mimeTypes: ["application/pdf"] }),
      number("downloads"),
      relation("uploaded_by", profiles.id),
      date("created_at"),
      date("updated_at"),
    ],
  });

  await upsertCollection(token, {
    name: "midi_ratings",
    type: "base",
    ...publicEditable,
    indexes: ["CREATE UNIQUE INDEX idx_midi_ratings_unique ON midi_ratings (midi_id, user_id)"],
    fields: [
      text("legacy_id"),
      relation("midi_id", musicFiles.id),
      relation("user_id", profiles.id),
      number("rating", { required: true }),
      date("created_at"),
      date("updated_at"),
    ],
  });

  await upsertCollection(token, {
    name: "midi_comments",
    type: "base",
    ...publicEditable,
    fields: [
      text("legacy_id"),
      relation("midi_id", musicFiles.id),
      relation("user_id", profiles.id),
      text("body", { required: true }),
      date("created_at"),
    ],
  });

  await upsertCollection(token, {
    name: "follows",
    type: "base",
    ...publicEditable,
    indexes: ["CREATE UNIQUE INDEX idx_follows_unique ON follows (follower_id, following_id)"],
    fields: [
      text("legacy_id"),
      relation("follower_id", profiles.id),
      relation("following_id", profiles.id),
      date("created_at"),
    ],
  });

  await upsertCollection(token, {
    name: "bookmarks",
    type: "base",
    ...publicEditable,
    indexes: ["CREATE UNIQUE INDEX idx_bookmarks_unique ON bookmarks (user_id, midi_id)"],
    fields: [
      text("legacy_id"),
      relation("user_id", profiles.id),
      relation("midi_id", musicFiles.id),
      date("created_at"),
    ],
  });

  await upsertCollection(token, {
    name: "contact_messages",
    type: "base",
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: "",
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
    fields: [
      text("legacy_id"),
      email("email", { required: true }),
      text("subject"),
      text("message", { required: true }),
      date("created_at"),
    ],
  });

  console.log(`GiveMeMIDI PocketBase schema is ready at ${baseUrl}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
