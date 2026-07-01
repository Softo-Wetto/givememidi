"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileInput,
  Loader2,
  PlayCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { ImportJob, PocketBaseList } from "@/lib/pocketbase/types";
import BulkFileImportClient from "./BulkFileImportClient";

type ImportStatus = "pending" | "ready" | "importing" | "imported" | "skipped" | "error";

type Draft = {
  source_url: string;
  title: string;
  composer: string;
  genre: string;
  bpm: string;
  description: string;
  license: string;
  permission_note: string;
};

const DEFAULT_LICENSE = "Needs review";
const STATUS_LABELS: Record<ImportStatus, string> = {
  pending: "Pending",
  ready: "Ready",
  importing: "Importing",
  imported: "Imported",
  skipped: "Skipped",
  error: "Error",
};

function parseUrls(text: string) {
  return Array.from(
    new Set(
      text
        .split(/[\s,]+/)
        .map((value) => value.trim())
        .filter((value) => /^https?:\/\//i.test(value))
    )
  );
}

function dedupeKey(url: string) {
  return url.trim().toLowerCase().replace(/\/$/, "");
}

function titleFromUrl(url: string) {
  try {
    const path = new URL(url).pathname.split("/").filter(Boolean).pop() || "Imported MIDI";
    return decodeURIComponent(path)
      .replace(/[-_]+/g, " ")
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  } catch {
    return "Imported MIDI";
  }
}

function statusClass(status: string) {
  if (status === "imported") return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  if (status === "ready") return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100";
  if (status === "error") return "border-red-300/25 bg-red-300/10 text-red-100";
  if (status === "skipped") return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  return "border-white/10 bg-white/[0.04] text-slate-300";
}
type ImportJobCreateResponse = {
  item: ImportJob;
  duplicate?: boolean;
};

type WorkerRun = {
  id?: string;
  state?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  exitCode?: number | null;
  logs?: string[];
};

type WorkerStatus = {
  ok?: boolean;
  running?: boolean;
  currentRun?: WorkerRun | null;
  lastRun?: WorkerRun | null;
  run?: WorkerRun;
};

async function importApi<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = (await response.json().catch(() => null)) as T | { error?: string } | null;
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body && body.error ? body.error : `Import request failed (${response.status}).`;
    throw new Error(message);
  }
  return body as T;
}

export default function ImportInboxClient() {
  const [sourceText, setSourceText] = useState("");
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [workerRunning, setWorkerRunning] = useState(false);
  const [workerStatus, setWorkerStatus] = useState<WorkerStatus | null>(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft>({
    source_url: "",
    title: "",
    composer: "",
    genre: "",
    bpm: "",
    description: "",
    license: DEFAULT_LICENSE,
    permission_note: "",
  });

  const stats = useMemo(() => {
    const byStatus = new Map<string, number>();
    jobs.forEach((job) => byStatus.set(job.status, (byStatus.get(job.status) || 0) + 1));
    return {
      total: jobs.length,
      pending: byStatus.get("pending") || 0,
      ready: byStatus.get("ready") || 0,
      imported: byStatus.get("imported") || 0,
      error: byStatus.get("error") || 0,
    };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((job) =>
      [job.title, job.composer, job.source_url, job.license, job.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [jobs, query]);

  async function loadJobs() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: "1", perPage: "200", sort: "-created_at" });
      const result = await importApi<PocketBaseList<ImportJob>>(`/api/import/jobs?${params.toString()}`);
      setJobs(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load import jobs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  async function createJobs(urls: string[], sourceType = "score_url") {
    setWorking(true);
    setError("");
    setMessage("");

    try {
      let created = 0;
      let skipped = 0;
      const existingKeys = new Set(jobs.map((job) => job.dedupe_key));

      for (const url of urls) {
        const key = dedupeKey(url);
        if (existingKeys.has(key)) {
          skipped += 1;
          continue;
        }

        const result = await importApi<ImportJobCreateResponse>("/api/import/jobs", {
          method: "POST",
          body: JSON.stringify({
          source_url: url,
          source_type: sourceType,
          title: titleFromUrl(url),
          composer: "",
          genre: "",
          description: "",
          license: DEFAULT_LICENSE,
          permission_note: "Review license/permission before importing.",
          status: "pending",
          dedupe_key: key,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          }),
        });
        existingKeys.add(key);
        if (result.duplicate) skipped += 1;
        else created += 1;
      }

      setSourceText("");
      setMessage(`Queued ${created} source${created === 1 ? "" : "s"}.${skipped ? ` Skipped ${skipped} duplicate${skipped === 1 ? "" : "s"}.` : ""}`);
      await loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create import jobs.");
    } finally {
      setWorking(false);
    }
  }

  async function queuePastedUrls() {
    const urls = parseUrls(sourceText);
    if (!urls.length) {
      setError("Paste at least one valid URL.");
      return;
    }
    await createJobs(urls);
  }

  async function discoverSourceLinks() {
    const urls = parseUrls(sourceText);
    if (!urls.length) {
      setError("Paste a creator, collection, search, or score URL first.");
      return;
    }

    setDiscovering(true);
    setError("");
    setMessage("");
    try {
      const found = new Set<string>();
      for (const url of urls) {
        const response = await fetch("/api/import/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const body = (await response.json()) as { links?: string[]; error?: string };
        if (!response.ok) throw new Error(body.error || "Discovery failed.");
        (body.links || []).forEach((link) => found.add(link));
      }
      if (!found.size) {
        setMessage("No score links found. You can still queue the pasted URLs directly.");
        return;
      }
      await createJobs(Array.from(found), "discovered_score_url");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to discover score links.");
    } finally {
      setDiscovering(false);
    }
  }

  async function createManualDraft() {
    if (!draft.source_url.trim() && !draft.title.trim()) {
      setError("Add at least a source URL or title for the draft.");
      return;
    }
    const key = dedupeKey(draft.source_url || `manual:${draft.title}:${draft.composer}`);
    setWorking(true);
    setError("");
    try {
      await importApi<ImportJobCreateResponse>("/api/import/jobs", {
        method: "POST",
        body: JSON.stringify({
          ...draft,
          bpm: draft.bpm ? Number(draft.bpm) : null,
          source_url: draft.source_url.trim(),
          status: "ready",
          source_type: "manual_draft",
          dedupe_key: key,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
      setDraft({
        source_url: "",
        title: "",
        composer: "",
        genre: "",
        bpm: "",
        description: "",
        license: DEFAULT_LICENSE,
        permission_note: "",
      });
      setMessage("Manual draft created.");
      await loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create manual draft.");
    } finally {
      setWorking(false);
    }
  }

  async function updateJob(job: ImportJob, patch: Partial<ImportJob>) {
    const result = await importApi<{ item: ImportJob }>(`/api/import/jobs/${job.id}`, {
      method: "PATCH",
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    });
    setJobs((current) => current.map((item) => (item.id === job.id ? result.item : item)));
  }

  async function loadWorkerStatus() {
    try {
      const result = await importApi<WorkerStatus>("/api/import/run");
      setWorkerStatus(result);
      return result;
    } catch {
      return null;
    }
  }

  async function runImportWorker() {
    setWorkerRunning(true);
    setError("");
    setMessage("");
    try {
      const result = await importApi<WorkerStatus>("/api/import/run", {
        method: "POST",
        body: JSON.stringify({ limit: 25, status: "pending,ready", types: "midi,pdf", import: true }),
      });
      setWorkerStatus(result);
      setMessage(`Import worker started${result.run?.id ? ` (${result.run.id})` : ""}. Logs will update below.`);
      window.setTimeout(() => {
        void loadJobs();
        void loadWorkerStatus();
      }, 2500);
      window.setTimeout(() => {
        void loadJobs();
        void loadWorkerStatus();
      }, 8000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start import worker.");
    } finally {
      setWorkerRunning(false);
    }
  }

  async function bulkStatus(status: ImportStatus) {
    const targets = filteredJobs.filter((job) => job.status !== "imported");
    setWorking(true);
    try {
      for (const job of targets) await updateJob(job, { status });
      setMessage(`Updated ${targets.length} job${targets.length === 1 ? "" : "s"} to ${STATUS_LABELS[status]}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk update failed.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#111827_0%,#020617_42%,#000_100%)] px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-3xl border border-cyan-300/15 bg-white/[0.045] shadow-2xl shadow-black/30">
          <div className="relative p-6 md:p-8">
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">
                  <ShieldCheck size={15} /> Admin Import Inbox
                </span>
                <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">Queue MIDI/PDF imports without spreadsheet pain</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
                  Paste creator/search/score URLs, discover score links, review license status, then let the local worker import approved drafts into PocketBase.
                </p>
              </div>
              <div className="grid grid-cols-5 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 text-center">
                <Metric label="Total" value={stats.total} />
                <Metric label="Pending" value={stats.pending} />
                <Metric label="Ready" value={stats.ready} />
                <Metric label="Imported" value={stats.imported} />
                <Metric label="Errors" value={stats.error} />
              </div>
            </div>
          </div>
        </section>

        <BulkFileImportClient />

        <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Paste source URLs</h2>
                <p className="mt-1 text-sm text-slate-400">Paste individual score URLs or a creator/search page. Discovery tries to pull score links from the page.</p>
              </div>
              <FileInput className="text-cyan-300" />
            </div>
            <textarea
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              rows={8}
              placeholder="https://musescore.com/user/.../scores\nhttps://musescore.com/user/.../scores/123"
              className="mt-4 w-full resize-y rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/15"
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={discoverSourceLinks} disabled={discovering || working} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50">
                {discovering ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Discover score links
              </button>
              <button onClick={queuePastedUrls} disabled={working} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:border-cyan-300/40 hover:text-white disabled:opacity-50">
                {working ? <Loader2 size={16} className="animate-spin" /> : <ClipboardList size={16} />}
                Queue pasted URLs
              </button>
              <button onClick={loadJobs} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/[0.06] disabled:opacity-50">
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
              </button>
              <button onClick={runImportWorker} disabled={workerRunning || working} className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-2.5 text-sm font-black text-emerald-100 transition hover:border-emerald-200/50 hover:bg-emerald-300/15 disabled:opacity-50">
                {workerRunning ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
                Run import
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-xl">
            <h2 className="text-xl font-black">Manual draft</h2>
            <p className="mt-1 text-sm text-slate-400">Useful when you already have local files for the worker manifest.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Source URL"><input value={draft.source_url} onChange={(e) => setDraft({ ...draft, source_url: e.target.value })} className="field" /></Field>
              <Field label="Title"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="field" /></Field>
              <Field label="Composer"><input value={draft.composer} onChange={(e) => setDraft({ ...draft, composer: e.target.value })} className="field" /></Field>
              <Field label="Genre"><input value={draft.genre} onChange={(e) => setDraft({ ...draft, genre: e.target.value })} className="field" /></Field>
              <Field label="BPM"><input value={draft.bpm} onChange={(e) => setDraft({ ...draft, bpm: e.target.value })} className="field" type="number" /></Field>
              <Field label="License"><input value={draft.license} onChange={(e) => setDraft({ ...draft, license: e.target.value })} className="field" /></Field>
            </div>
            <Field label="Description"><textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={3} className="field resize-y" /></Field>
            <Field label="Permission note"><textarea value={draft.permission_note} onChange={(e) => setDraft({ ...draft, permission_note: e.target.value })} rows={2} className="field resize-y" /></Field>
            <button onClick={createManualDraft} disabled={working} className="mt-4 w-full rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3 text-sm font-black text-white transition hover:from-blue-400 hover:to-indigo-400 disabled:opacity-50">Create draft</button>
          </div>
        </section>
        {message ? <Notice tone="success" text={message} /> : null}
        {error ? <Notice tone="error" text={error} /> : null}
        <WorkerLogPanel status={workerStatus} onRefresh={loadWorkerStatus} />

        <section className="rounded-3xl border border-white/10 bg-white/[0.045] shadow-xl">
          <div className="flex flex-col gap-4 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5">
              <Search size={16} className="text-slate-500" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search queue..." className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => bulkStatus("ready")} disabled={working} className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-bold text-cyan-100">Mark ready</button>
              <button onClick={() => bulkStatus("skipped")} disabled={working} className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-100">Skip filtered</button>
            </div>
          </div>

          <div className="divide-y divide-white/10">
            {loading ? (
              <div className="p-8 text-center text-slate-400">Loading import queue...</div>
            ) : filteredJobs.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No import jobs yet.</div>
            ) : (
              filteredJobs.map((job) => <JobRow key={job.id} job={job} onUpdate={updateJob} />)
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-amber-300/15 bg-amber-300/10 p-5 text-sm leading-7 text-amber-50">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 shrink-0" size={18} />
            <p>
              Use this only for uploads you own, public-domain material, Creative Commons material, or files you have permission to redistribute. The importer keeps license and source fields so every item can be audited later.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-r border-white/10 px-4 py-3 last:border-r-0">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-3 block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function Notice({ tone, text }: { tone: "success" | "error"; text: string }) {
  const Icon = tone === "success" ? CheckCircle2 : XCircle;
  const cls = tone === "success" ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100" : "border-red-300/20 bg-red-300/10 text-red-100";
  return <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold ${cls}`}><Icon size={16} />{text}</div>;
}

function JobRow({ job, onUpdate }: { job: ImportJob; onUpdate: (job: ImportJob, patch: Partial<ImportJob>) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    title: job.title || "",
    composer: job.composer || "",
    genre: job.genre || "",
    bpm: job.bpm ? String(job.bpm) : "",
    description: job.description || "",
    license: job.license || DEFAULT_LICENSE,
    permission_note: job.permission_note || "",
    midi_path: job.midi_path || "",
    pdf_path: job.pdf_path || "",
  });

  async function save() {
    setSaving(true);
    try {
      await onUpdate(job, {
        ...draft,
        bpm: draft.bpm ? Number(draft.bpm) : null,
        status: job.status === "pending" ? "ready" : job.status,
      });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="p-4 transition hover:bg-white/[0.025]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(job.status)}`}>{job.status}</span>
            {job.license ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300">{job.license}</span> : null}
          </div>
          <h3 className="mt-2 truncate text-lg font-black text-white">{job.title || titleFromUrl(job.source_url || "")}</h3>
          <p className="mt-1 truncate text-sm text-slate-400">{job.composer || "Unknown composer"}</p>
          {job.source_url ? <a href={job.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex max-w-full items-center gap-1 truncate text-xs font-semibold text-cyan-300 hover:text-cyan-100"><ExternalLink size={13} />{job.source_url}</a> : null}
          {job.error_message ? <p className="mt-2 text-sm text-red-200">{job.error_message}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onUpdate(job, { status: "ready" })} className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-bold text-cyan-100">Ready</button>
          <button onClick={() => onUpdate(job, { status: "skipped" })} className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-100">Skip</button>
          <button onClick={() => setOpen((value) => !value)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/[0.06]">Edit</button>
        </div>
      </div>

      {open ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Title"><input className="field" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
            <Field label="Composer"><input className="field" value={draft.composer} onChange={(e) => setDraft({ ...draft, composer: e.target.value })} /></Field>
            <Field label="Genre"><input className="field" value={draft.genre} onChange={(e) => setDraft({ ...draft, genre: e.target.value })} /></Field>
            <Field label="BPM"><input className="field" type="number" value={draft.bpm} onChange={(e) => setDraft({ ...draft, bpm: e.target.value })} /></Field>
            <Field label="License"><input className="field" value={draft.license} onChange={(e) => setDraft({ ...draft, license: e.target.value })} /></Field>
            <Field label="MIDI path"><input className="field" value={draft.midi_path} onChange={(e) => setDraft({ ...draft, midi_path: e.target.value })} /></Field>
            <Field label="PDF path"><input className="field" value={draft.pdf_path} onChange={(e) => setDraft({ ...draft, pdf_path: e.target.value })} /></Field>
          </div>
          <Field label="Description"><textarea className="field resize-y" rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
          <Field label="Permission note"><textarea className="field resize-y" rows={2} value={draft.permission_note} onChange={(e) => setDraft({ ...draft, permission_note: e.target.value })} /></Field>
          <button onClick={save} disabled={saving} className="mt-4 rounded-2xl bg-cyan-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-50">{saving ? "Saving..." : "Save draft"}</button>
        </div>
      ) : null}
    </article>
  );
}
function WorkerLogPanel({ status, onRefresh }: { status: WorkerStatus | null; onRefresh: () => Promise<WorkerStatus | null> }) {
  const run = status?.currentRun || status?.lastRun || status?.run || null;
  if (!run) return null;
  const state = run.state || (status?.running ? "running" : "unknown");
  const logs = run.logs || [];
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/75 p-5 shadow-xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-black text-white">Worker activity</h2>
          <p className="mt-1 text-sm text-slate-400">
            Last run {run.id ? <span className="font-mono text-slate-300">{run.id}</span> : null} is <span className="font-bold text-cyan-200">{state}</span>
            {typeof run.exitCode === "number" ? ` with exit code ${run.exitCode}` : ""}.
          </p>
        </div>
        <button onClick={() => void onRefresh()} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/[0.06]">
          <RefreshCw size={16} /> Refresh worker logs
        </button>
      </div>
      {logs.length ? (
        <pre className="mt-4 max-h-72 overflow-auto rounded-2xl border border-white/10 bg-black/60 p-4 text-xs leading-6 text-slate-200">{logs.join("\n")}</pre>
      ) : (
        <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-500">No worker log lines yet.</p>
      )}
    </section>
  );
}
