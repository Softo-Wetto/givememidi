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
  "https://givememidi.duckdns.org";
const superuserEmail = process.env.POCKETBASE_SUPERUSER_EMAIL;
const superuserPassword = process.env.POCKETBASE_SUPERUSER_PASSWORD;
const legacyStorageBaseUrl = process.env.LEGACY_PUBLIC_STORAGE_URL?.replace(/\/$/, "");

if (!superuserEmail || !superuserPassword) {
  console.error("Missing POCKETBASE_SUPERUSER_EMAIL or POCKETBASE_SUPERUSER_PASSWORD.");
  process.exit(1);
}

const baseUrl = pocketBaseUrl.replace(/\/$/, "");
const downloads = "C:\\Users\\User\\Downloads";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
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
      // Keep status.
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

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      row.push(value);
      value = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(value);
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      value = "";
      continue;
    }
    value += char;
  }

  row.push(value);
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  const headers = rows.shift() || [];
  return rows.map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]))
  );
}

function readCsv(fileName) {
  const path = `${downloads}\\${fileName}`;
  if (!existsSync(path)) {
    console.warn(`Missing ${path}; skipping.`);
    return [];
  }
  return parseCsv(readFileSync(path, "utf8"));
}

function dateValue(value) {
  if (!value) return "";
  return value.includes("T") ? value : value.replace(" ", "T").replace(/\+00$/, "Z");
}

function numberValue(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function legacyEmail(row) {
  const username = (row.username || row.id || "legacy_user").replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${username}@legacy.givememidi.local`;
}

function publicStorageUrl(bucket, path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return legacyStorageBaseUrl ? `${legacyStorageBaseUrl}/${bucket}/${encodeURIComponent(path)}` : path;
}

async function findByLegacy(token, collection, legacyId) {
  if (!legacyId) return null;
  const filter = encodeURIComponent(`legacy_id = "${legacyId.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
  const result = await request(`/api/collections/${collection}/records?page=1&perPage=1&filter=${filter}`, { token });
  return result.items?.[0] ?? null;
}

async function upsertByLegacy(token, collection, legacyId, data) {
  const existing = await findByLegacy(token, collection, legacyId);
  if (existing) {
    return request(`/api/collections/${collection}/records/${existing.id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    });
  }
  return request(`/api/collections/${collection}/records`, {
    method: "POST",
    token,
    body: JSON.stringify({ ...data, legacy_id: legacyId }),
  });
}

async function createProfileWithUser(token, row) {
  const existingProfile = await findByLegacy(token, "profiles", row.id);
  if (existingProfile) return existingProfile;

  const user = await request("/api/collections/users/records", {
    method: "POST",
    token,
    body: JSON.stringify({
      legacy_id: row.id,
      email: legacyEmail(row),
      username: row.username || "legacy_user",
      bio: row.bio || "",
      avatar_url: row.avatar_url || "",
      password: superuserPassword,
      passwordConfirm: superuserPassword,
      created_at: dateValue(row.created_at),
      updated_at: dateValue(row.updated_at || row.created_at),
    }),
  });

  return request("/api/collections/profiles/records", {
    method: "POST",
    token,
    body: JSON.stringify({
      id: user.id,
      legacy_id: row.id,
      user_id: user.id,
      username: row.username || "legacy_user",
      bio: row.bio || "",
      avatar_url: row.avatar_url || "",
      created_at: dateValue(row.created_at),
      updated_at: dateValue(row.updated_at || row.created_at),
    }),
  });
}

async function main() {
  const token = await authenticate();

  const profileRows = readCsv("profiles_rows.csv");
  const musicRows = readCsv("music_files_rows.csv");
  const ratingRows = readCsv("midi_ratings_rows.csv");
  const commentRows = readCsv("midi_comments_rows.csv");
  const followRows = readCsv("follows_rows.csv");
  const bookmarkRows = readCsv("bookmarks_rows.csv");

  const profileMap = new Map();
  const musicMap = new Map();

  for (const row of profileRows) {
    const profile = await createProfileWithUser(token, row);
    profileMap.set(row.id, profile.id);
  }
  console.log(`Imported profiles: ${profileMap.size}`);

  for (const row of musicRows) {
    const music = await upsertByLegacy(token, "music_files", row.id, {
      title: row.title || "Untitled",
      composer: row.composer || "",
      genre: row.genre || "",
      bpm: row.bpm ? numberValue(row.bpm, 0) : null,
      midi_url: publicStorageUrl("midis", row.midi_url),
      pdf_url: publicStorageUrl("pdfs", row.pdf_url),
      downloads: numberValue(row.downloads, 0),
      uploaded_by: profileMap.get(row.uploaded_by) || "",
      created_at: dateValue(row.created_at),
      updated_at: dateValue(row.created_at),
    });
    musicMap.set(row.id, music.id);
  }
  console.log(`Imported music files: ${musicMap.size}`);

  let ratings = 0;
  for (const row of ratingRows) {
    const midiId = musicMap.get(row.midi_id);
    const userId = profileMap.get(row.user_id);
    if (!midiId || !userId) continue;
    await upsertByLegacy(token, "midi_ratings", row.id, {
      midi_id: midiId,
      user_id: userId,
      rating: numberValue(row.rating, 0),
      created_at: dateValue(row.created_at),
      updated_at: dateValue(row.updated_at || row.created_at),
    });
    ratings += 1;
  }
  console.log(`Imported ratings: ${ratings}`);

  let comments = 0;
  for (const row of commentRows) {
    const midiId = musicMap.get(row.midi_id);
    const userId = profileMap.get(row.user_id);
    if (!midiId || !userId) continue;
    await upsertByLegacy(token, "midi_comments", row.id, {
      midi_id: midiId,
      user_id: userId,
      body: row.body || "",
      created_at: dateValue(row.created_at),
    });
    comments += 1;
  }
  console.log(`Imported comments: ${comments}`);

  let follows = 0;
  for (const row of followRows) {
    const followerId = profileMap.get(row.follower_id);
    const followingId = profileMap.get(row.following_id);
    if (!followerId || !followingId) continue;
    const legacyId = `${row.follower_id}:${row.following_id}`;
    await upsertByLegacy(token, "follows", legacyId, {
      follower_id: followerId,
      following_id: followingId,
      created_at: dateValue(row.created_at),
    });
    follows += 1;
  }
  console.log(`Imported follows: ${follows}`);

  let bookmarks = 0;
  for (const row of bookmarkRows) {
    const midiId = musicMap.get(row.midi_id);
    const userId = profileMap.get(row.user_id);
    if (!midiId || !userId) continue;
    await upsertByLegacy(token, "bookmarks", row.id, {
      user_id: userId,
      midi_id: midiId,
      created_at: dateValue(row.created_at),
    });
    bookmarks += 1;
  }
  console.log(`Imported bookmarks: ${bookmarks}`);

  console.log("GiveMeMIDI CSV import complete.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
