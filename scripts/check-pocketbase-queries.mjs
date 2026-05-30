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

const baseUrl = (
  process.env.POCKETBASE_URL ||
  process.env.NEXT_PUBLIC_POCKETBASE_URL ||
  "https://givememidi.duckdns.org"
).replace(/\/$/, "");

async function request(path) {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) throw new Error(`${path} failed (${response.status})`);
  return response.json();
}

async function main() {
  for (const collection of [
    "profiles",
    "music_files",
    "midi_ratings",
    "midi_comments",
    "follows",
    "bookmarks",
    "contact_messages",
  ]) {
    const data = await request(`/api/collections/${collection}/records?page=1&perPage=1`);
    console.log(`${collection}=${data.totalItems}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
