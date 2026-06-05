import { existsSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
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

const baseUrl = pocketBaseUrl.replace(/\/+$/, "");

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
    const text = await response.text().catch(() => "");
    throw new Error(`${options.method || "GET"} ${path} failed (${response.status}) ${text}`);
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

async function main() {
  const token = await authenticate();
  let page = 1;
  let updated = 0;

  while (true) {
    const params = new URLSearchParams({
      page: String(page),
      perPage: "200",
    });
    const result = await request(`/api/collections/midi_comments/records?${params.toString()}`, { token });

    for (const comment of result.items ?? []) {
      const patch = {};
      if (!comment.legacy_id) patch.legacy_id = randomUUID();
      if (!comment.created_at) patch.created_at = comment.created || new Date().toISOString();

      if (Object.keys(patch).length > 0) {
        await request(`/api/collections/midi_comments/records/${comment.id}`, {
          method: "PATCH",
          token,
          body: JSON.stringify(patch),
        });
        updated += 1;
      }
    }

    if (page >= result.totalPages) break;
    page += 1;
  }

  console.log(`Backfilled ${updated} comment record${updated === 1 ? "" : "s"}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
