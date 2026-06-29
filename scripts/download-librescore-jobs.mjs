import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";

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
const args = process.argv.slice(2);
const hasArg = (name) => args.includes(name);
const getArg = (name, fallback = "") => {
  const prefix = `${name}=`;
  const found = args.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
};

const commit = hasArg("--commit");
const runImport = hasArg("--import");
const limit = Number(getArg("--limit", "25"));
const status = getArg("--status", "pending");
const outputRoot = resolve(process.cwd(), getArg("--output", "imports/downloads"));
const typeArg = getArg("--types", "midi,pdf");
const types = typeArg.split(/[ ,]+/).map((value) => value.trim()).filter(Boolean);

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

async function readyJobs(token) {
  const params = new URLSearchParams({
    page: "1",
    perPage: String(Math.max(1, limit)),
    sort: "created_at",
    filter: `status = "${escapeFilterValue(status)}" && source_url != ""`,
  });
  const result = await request(`/api/collections/import_jobs/records?${params.toString()}`, { token });
  return result.items || [];
}

async function updateJob(token, id, patch) {
  if (!commit) return;
  await request(`/api/collections/import_jobs/records/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
}

function walkFiles(dir) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walkFiles(full) : [full];
  });
}

function findDownloadedFiles(dir) {
  const files = walkFiles(dir);
  const midi = files.find((file) => [".mid", ".midi"].includes(extname(file).toLowerCase())) || "";
  const pdf = files.find((file) => extname(file).toLowerCase() === ".pdf") || "";
  return { midi, pdf, files };
}

function commandForDlLibrescore() {
  const local = resolve(process.cwd(), "node_modules", ".bin", process.platform === "win32" ? "dl-librescore.cmd" : "dl-librescore");
  if (existsSync(local)) return { command: local, prefix: [] };
  return { command: process.platform === "win32" ? "npx.cmd" : "npx", prefix: ["-y", "dl-librescore@0.35.40"] };
}

function runDownloader(input, outputDir) {
  const { command, prefix } = commandForDlLibrescore();
  const cliArgs = [...prefix, "-i", input, "-o", outputDir, ...types.flatMap((type) => ["-t", type])];
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, cliArgs, { stdio: "inherit", shell: false });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`dl-librescore exited with code ${code}`));
    });
  });
}

function relativePath(file) {
  return file ? relative(process.cwd(), file).replace(/\\/g, "/") : "";
}

async function runImportWorker() {
  const command = process.execPath;
  const cliArgs = ["scripts/import-midi-batch.mjs", "--commit", "--jobs"];
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, cliArgs, { stdio: "inherit", shell: false });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`import worker exited with code ${code}`));
    });
  });
}

async function main() {
  console.log(commit ? "Commit mode enabled." : "Dry run only. Add --commit to update import jobs.");
  console.log(`Downloader types: ${types.join(", ")}`);
  mkdirSync(outputRoot, { recursive: true });

  const token = await authenticate();
  const jobs = await readyJobs(token);
  if (!jobs.length) {
    console.log(`No import jobs found with status=${status}.`);
    return;
  }

  let ready = 0;
  let failed = 0;

  for (const job of jobs) {
    const sourceUrl = job.source_url || "";
    const jobDir = join(outputRoot, job.id);
    mkdirSync(jobDir, { recursive: true });
    console.log(`[download] ${job.title || basename(sourceUrl)} -> ${relativePath(jobDir)}`);

    try {
      if (commit) await updateJob(token, job.id, { status: "importing", error_message: "" });
      await runDownloader(sourceUrl, jobDir);
      const found = findDownloadedFiles(jobDir);
      if (!found.midi) throw new Error(`No MIDI file was produced in ${relativePath(jobDir)}.`);

      const patch = {
        midi_path: relativePath(found.midi),
        pdf_path: relativePath(found.pdf),
        status: "ready",
        error_message: "",
      };
      await updateJob(token, job.id, patch);
      ready += 1;
      console.log(`[ready] ${job.title || sourceUrl} midi=${patch.midi_path}${patch.pdf_path ? ` pdf=${patch.pdf_path}` : ""}`);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Unknown download error";
      await updateJob(token, job.id, { status: "error", error_message: message });
      console.error(`[error] ${job.title || sourceUrl}: ${message}`);
    }
  }

  console.log(`Download pass complete. ready=${ready} failed=${failed}`);

  if (runImport && commit && ready > 0) {
    await runImportWorker();
  } else if (ready > 0) {
    console.log("Next step: npm run import:midis -- --commit --jobs");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});