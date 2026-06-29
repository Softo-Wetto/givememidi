import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

function loadEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = trimmed.slice(0, equalsIndex).trim().replace(/^\$env:/, "");
    let value = trimmed.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const POCKETBASE_URL = (process.env.POCKETBASE_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL || "https://api-midi.softowetto.com").replace(/\/$/, "");
const ADMIN_EMAIL = process.env.POCKETBASE_SUPERUSER_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_SUPERUSER_PASSWORD;
const UPLOADER_EMAIL = process.env.IMPORT_UPLOADER_EMAIL || "nightmareasian@gmail.com";

const args = new Set(process.argv.slice(2));
const getArg = (name, fallback = "") => {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
};

const dryRun = args.has("--dry-run") || !args.has("--commit");
const csvFile = getArg("--file", "");
const processJobs = args.has("--jobs") || !csvFile;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Missing POCKETBASE_SUPERUSER_EMAIL or POCKETBASE_SUPERUSER_PASSWORD.");
  process.exit(1);
}

function escapeFilterValue(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function request(path, options = {}) {
  const response = await fetch(`${POCKETBASE_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
    body: options.body,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`${options.method || "GET"} ${path} failed (${response.status}) ${text}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function authenticate() {
  const body = JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  try {
    const auth = await request("/api/collections/_superusers/auth-with-password", { method: "POST", body });
    return auth.token;
  } catch {
    const auth = await request("/api/admins/auth-with-password", { method: "POST", body });
    return auth.token;
  }
}

async function listRecords(token, collection, params) {
  return request(`/api/collections/${collection}/records?${params.toString()}`, { token });
}

async function createRecord(token, collection, body) {
  return request(`/api/collections/${collection}/records`, { method: "POST", token, body });
}

async function updateRecord(token, collection, id, body) {
  return request(`/api/collections/${collection}/records/${id}`, { method: "PATCH", token, body });
}

async function findUploaderProfile(token) {
  const users = await listRecords(token, "users", new URLSearchParams({
    page: "1",
    perPage: "1",
    filter: `email = "${escapeFilterValue(UPLOADER_EMAIL)}"`,
  }));
  const user = users.items?.[0];
  if (!user) throw new Error(`No user found for IMPORT_UPLOADER_EMAIL=${UPLOADER_EMAIL}`);

  const profiles = await listRecords(token, "profiles", new URLSearchParams({
    page: "1",
    perPage: "1",
    filter: `user_id = "${escapeFilterValue(user.id)}"`,
  }));
  const profile = profiles.items?.[0];
  if (!profile) throw new Error(`No profile found for ${UPLOADER_EMAIL}`);
  return profile.id;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted && char === '"' && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === ",") {
      row.push(value);
      value = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  const headers = rows.shift()?.map((header) => header.trim()) || [];
  return rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index]?.trim() || ""])));
}

function normalizeRow(row) {
  const sourceUrl = row.source_url || row.url || "";
  return {
    id: row.id || "",
    source_url: sourceUrl,
    source_name: row.source_name || sourceUrl ? new URL(sourceUrl || "https://local.invalid").hostname : "Local import",
    title: row.title || titleFromPath(row.midi_path || row.pdf_path || sourceUrl || "Imported MIDI"),
    composer: row.composer || "",
    description: row.description || "",
    genre: row.genre || "",
    bpm: row.bpm || "",
    license: row.license || "Needs review",
    permission_note: row.permission_note || "",
    midi_path: row.midi_path || "",
    pdf_path: row.pdf_path || "",
    status: row.status || "ready",
  };
}

function titleFromPath(value) {
  return basename(value || "Imported MIDI")
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function readFileBlob(path, mime) {
  if (!path) return null;
  const fullPath = resolve(process.cwd(), path);
  if (!existsSync(fullPath)) throw new Error(`File not found: ${path}`);
  const bytes = readFileSync(fullPath);
  return {
    fullPath,
    fileName: basename(fullPath),
    bytes,
    blob: new Blob([bytes], { type: mime }),
  };
}

function combinedHash(files) {
  const hash = createHash("sha256");
  for (const file of files.filter(Boolean)) hash.update(file.bytes);
  return hash.digest("hex");
}

function fileUrl(recordId, fileName) {
  if (!fileName) return "";
  return `${POCKETBASE_URL}/api/files/music_files/${recordId}/${encodeURIComponent(fileName)}`;
}

async function duplicateExists(token, row, fileHash) {
  const filters = [];
  if (fileHash) filters.push(`file_hash = "${escapeFilterValue(fileHash)}"`);
  if (row.source_url) filters.push(`source_url = "${escapeFilterValue(row.source_url)}"`);
  if (!filters.length) return false;
  const result = await listRecords(token, "music_files", new URLSearchParams({
    page: "1",
    perPage: "1",
    filter: filters.join(" || "),
  }));
  return Boolean(result.items?.length);
}

async function importRow(token, uploaderProfileId, row, jobId = "") {
  const normalized = normalizeRow(row);
  const midi = readFileBlob(normalized.midi_path, "audio/midi");
  const pdf = readFileBlob(normalized.pdf_path, "application/pdf");
  if (!midi) throw new Error("midi_path is required for import.");

  const fileHash = combinedHash([midi, pdf]);
  if (await duplicateExists(token, normalized, fileHash)) {
    if (jobId) await updateRecord(token, "import_jobs", jobId, JSON.stringify({ status: "skipped", file_hash: fileHash, error_message: "Duplicate source_url or file_hash.", updated_at: new Date().toISOString() }));
    return { status: "skipped", title: normalized.title };
  }

  if (dryRun) return { status: "dry-run", title: normalized.title, hash: fileHash };

  const form = new FormData();
  form.set("title", normalized.title);
  form.set("composer", normalized.composer);
  form.set("description", normalized.description);
  form.set("genre", normalized.genre);
  if (normalized.bpm) form.set("bpm", String(normalized.bpm));
  form.set("downloads", "0");
  form.set("uploaded_by", uploaderProfileId);
  form.set("source_url", normalized.source_url);
  form.set("source_name", normalized.source_name);
  form.set("license", normalized.license);
  form.set("permission_note", normalized.permission_note);
  form.set("import_status", "imported");
  form.set("file_hash", fileHash);
  form.set("created_at", new Date().toISOString());
  form.set("updated_at", new Date().toISOString());
  form.set("midi_file", midi.blob, midi.fileName);
  if (pdf) form.set("pdf_file", pdf.blob, pdf.fileName);

  const record = await createRecord(token, "music_files", form);
  const update = {
    midi_url: fileUrl(record.id, record.midi_file),
    pdf_url: fileUrl(record.id, record.pdf_file),
    updated_at: new Date().toISOString(),
  };
  await updateRecord(token, "music_files", record.id, JSON.stringify(update));

  if (jobId) {
    await updateRecord(token, "import_jobs", jobId, JSON.stringify({
      status: "imported",
      file_hash: fileHash,
      music_file: record.id,
      error_message: "",
      updated_at: new Date().toISOString(),
    }));
  }

  return { status: "imported", title: normalized.title, id: record.id };
}

async function readyJobs(token) {
  const result = await listRecords(token, "import_jobs", new URLSearchParams({
    page: "1",
    perPage: "200",
    sort: "created_at",
    filter: 'status = "ready"',
  }));
  return result.items || [];
}

async function main() {
  console.log(dryRun ? "Dry run only. Add --commit to write records." : "Commit mode enabled.");
  const token = await authenticate();
  const uploaderProfileId = await findUploaderProfile(token);

  const rows = [];
  if (csvFile) rows.push(...parseCsv(readFileSync(resolve(process.cwd(), csvFile), "utf8")));
  if (processJobs) rows.push(...(await readyJobs(token)));

  if (!rows.length) {
    console.log("No rows/jobs to import.");
    return;
  }

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const jobId = row.id || "";
    try {
      if (jobId && !dryRun) await updateRecord(token, "import_jobs", jobId, JSON.stringify({ status: "importing", updated_at: new Date().toISOString() }));
      const result = await importRow(token, uploaderProfileId, row, jobId);
      if (result.status === "skipped") skipped += 1;
      else imported += 1;
      console.log(`[${result.status}] ${result.title}${result.id ? ` (${result.id})` : ""}`);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Unknown error";
      if (jobId && !dryRun) await updateRecord(token, "import_jobs", jobId, JSON.stringify({ status: "error", error_message: message, updated_at: new Date().toISOString() }));
      console.error(`[error] ${row.title || row.source_url || row.midi_path || "Untitled"}: ${message}`);
    }
  }

  console.log(`Done. imported=${imported} skipped=${skipped} failed=${failed}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});