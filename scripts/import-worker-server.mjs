import { createServer } from "node:http";
import { spawn } from "node:child_process";
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

const PORT = Number(process.env.IMPORT_WORKER_PORT || 8789);
const HOST = process.env.IMPORT_WORKER_HOST || "127.0.0.1";
const WORKER_KEY = process.env.IMPORT_WORKER_KEY || "";
const MAX_LOG_LINES = 300;

let running = false;
let currentRun = null;
let lastRun = null;

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolvePromise) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1024 * 1024) req.destroy();
    });
    req.on("end", () => {
      try {
        resolvePromise(data ? JSON.parse(data) : {});
      } catch {
        resolvePromise({});
      }
    });
  });
}

function isAuthorized(req) {
  if (!WORKER_KEY) return false;
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${WORKER_KEY}`;
}

function appendLog(run, line) {
  const text = String(line).trimEnd();
  if (!text) return;
  run.logs.push(...text.split(/\r?\n/).filter(Boolean));
  if (run.logs.length > MAX_LOG_LINES) run.logs.splice(0, run.logs.length - MAX_LOG_LINES);
}

function runImporter(options = {}) {
  if (running) return { error: "Import worker is already running.", status: 409 };

  const limit = Math.min(Math.max(Number(options.limit || 25), 1), 200);
  const status = String(options.status || "pending");
  const types = String(options.types || "midi,pdf");
  const shouldImport = options.import !== false;
  const output = typeof options.output === "string" && options.output.trim() ? options.output.trim() : "imports/downloads";

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const args = [
    "scripts/download-librescore-jobs.mjs",
    "--commit",
    `--limit=${limit}`,
    `--status=${status}`,
    `--types=${types}`,
    `--output=${output}`,
  ];
  if (shouldImport) args.push("--import");

  const run = {
    id,
    state: "running",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    exitCode: null,
    args,
    logs: [],
  };

  running = true;
  currentRun = run;
  lastRun = run;

  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    env: process.env,
    shell: false,
  });

  child.stdout.on("data", (chunk) => appendLog(run, chunk.toString("utf8")));
  child.stderr.on("data", (chunk) => appendLog(run, chunk.toString("utf8")));
  child.on("error", (error) => {
    appendLog(run, error instanceof Error ? error.message : String(error));
  });
  child.on("exit", (code) => {
    run.exitCode = code;
    run.state = code === 0 ? "complete" : "error";
    run.finishedAt = new Date().toISOString();
    running = false;
    currentRun = null;
  });

  return { run, status: 202 };
}

function statusPayload() {
  return {
    ok: true,
    running,
    currentRun,
    lastRun,
  };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || `${HOST}:${PORT}`}`);

  if (url.pathname === "/health" && req.method === "GET") {
    return json(res, 200, { ok: true, running, service: "givememidi-import-worker" });
  }

  if (!isAuthorized(req)) {
    return json(res, 401, { error: "Unauthorized." });
  }

  if (url.pathname === "/status" && req.method === "GET") {
    return json(res, 200, statusPayload());
  }

  if (url.pathname === "/run" && req.method === "POST") {
    const body = await readBody(req);
    const result = runImporter(body);
    if (result.error) return json(res, result.status, { error: result.error, ...statusPayload() });
    return json(res, result.status, { ok: true, run: result.run });
  }

  return json(res, 404, { error: "Not found." });
});

server.listen(PORT, HOST, () => {
  console.log(`GiveMeMIDI import worker listening on http://${HOST}:${PORT}`);
});