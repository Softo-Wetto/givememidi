"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Edit3,
  ExternalLink,
  FileClock,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  containsImportedJobs,
  filterImportJobs,
  reconcileDeletedJobs,
  toggleVisibleSelection,
  type ImportDeleteResult,
} from "@/lib/import-queue";
import type { ImportJob, PocketBaseList } from "@/lib/pocketbase/types";
import ConfirmImportDeleteDialog from "./ConfirmImportDeleteDialog";
import { importApi } from "./import-api";

type ImportStatus =
  | "pending"
  | "ready"
  | "importing"
  | "imported"
  | "skipped"
  | "error";

type StatusFilter = "all" | ImportStatus;

type WorkerRun = {
  id?: string;
  state?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  exitCode?: number | null;
  logs?: string[];
};

type WorkerStatus = {
  running?: boolean;
  currentRun?: WorkerRun | null;
  lastRun?: WorkerRun | null;
  run?: WorkerRun;
};

type PendingDelete = {
  ids: string[];
  label: string;
  containsImported: boolean;
};

type ImportQueuePanelProps = {
  active: boolean;
  revision: number;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
};

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "ready", label: "Ready" },
  { value: "importing", label: "Importing" },
  { value: "imported", label: "Imported" },
  { value: "error", label: "Failed" },
  { value: "skipped", label: "Skipped" },
];

function statusClass(status: string) {
  if (status === "imported") return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  if (status === "ready") return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100";
  if (status === "importing") return "border-blue-300/25 bg-blue-300/10 text-blue-100";
  if (status === "error") return "border-red-300/25 bg-red-300/10 text-red-100";
  if (status === "skipped") return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  return "border-white/10 bg-white/[0.04] text-slate-300";
}

function formatUpdated(job: ImportJob) {
  const value = job.updated_at || job.updated || job.created_at || job.created;
  if (!value) return "No timestamp";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No timestamp";
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function ImportQueuePanel({
  active,
  revision,
  onMessage,
  onError,
}: ImportQueuePanelProps) {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [workerStatus, setWorkerStatus] = useState<WorkerStatus | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: "1",
        perPage: "200",
        sort: "-created_at",
      });
      const result = await importApi<PocketBaseList<ImportJob>>(
        `/api/import/jobs?${params.toString()}`
      );
      setJobs(result.items);
      setSelectedIds((current) => {
        const available = new Set(result.items.map((job) => job.id));
        return new Set(Array.from(current).filter((id) => available.has(id)));
      });
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to load import jobs.");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    if (active) void loadJobs();
  }, [active, loadJobs, revision]);

  const filteredJobs = useMemo(
    () => filterImportJobs(jobs, query, statusFilter),
    [jobs, query, statusFilter]
  );

  const counts = useMemo(() => {
    const count = (status: string) =>
      jobs.filter((job) => job.status === status).length;
    return {
      total: jobs.length,
      active: count("pending") + count("ready") + count("importing"),
      imported: count("imported"),
      attention: count("error"),
    };
  }, [jobs]);

  const visibleIds = useMemo(
    () => filteredJobs.map((job) => job.id),
    [filteredJobs]
  );
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  async function updateJob(job: ImportJob, patch: Partial<ImportJob>) {
    setBusyAction(`update:${job.id}`);
    try {
      const result = await importApi<{ item: ImportJob }>(
        `/api/import/jobs/${job.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            ...patch,
            updated_at: new Date().toISOString(),
          }),
        }
      );
      setJobs((current) =>
        current.map((item) => (item.id === job.id ? result.item : item))
      );
      onMessage(`Updated ${result.item.title || "import job"}.`);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to update import job.");
      throw error;
    } finally {
      setBusyAction(null);
    }
  }

  function requestDelete(ids: string[], label: string) {
    if (!ids.length) {
      onError("Select at least one import job.");
      return;
    }

    setPendingDelete({
      ids,
      label,
      containsImported: containsImportedJobs(jobs, ids),
    });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setBusyAction("delete");

    try {
      const result = await importApi<ImportDeleteResult>("/api/import/jobs", {
        method: "DELETE",
        body: JSON.stringify({ ids: pendingDelete.ids }),
      });
      const reconciled = reconcileDeletedJobs(jobs, selectedIds, result);
      setJobs(reconciled.jobs);
      setSelectedIds(reconciled.selectedIds);
      setPendingDelete(null);

      if (result.failures.length) {
        onError(
          `Deleted ${result.deletedIds.length}; ${result.failures.length} could not be removed and remain selected.`
        );
      } else {
        onMessage(
          `Deleted ${result.deletedIds.length} queue ${result.deletedIds.length === 1 ? "record" : "records"}.`
        );
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to delete import jobs.");
    } finally {
      setBusyAction(null);
    }
  }

  function deleteStatus(status: "error" | "skipped" | "imported") {
    const ids = jobs.filter((job) => job.status === status).map((job) => job.id);
    const label =
      status === "error"
        ? "failed jobs"
        : status === "skipped"
          ? "skipped jobs"
          : "imported history";
    requestDelete(ids, label);
  }

  async function bulkStatus(status: "ready" | "skipped") {
    const targets = (
      selectedIds.size
        ? jobs.filter((job) => selectedIds.has(job.id))
        : filteredJobs
    ).filter((job) => job.status !== "imported");

    if (!targets.length) {
      onError("There are no editable queue records in this selection.");
      return;
    }

    setBusyAction(`bulk:${status}`);
    let updated = 0;
    try {
      for (const job of targets) {
        const result = await importApi<{ item: ImportJob }>(
          `/api/import/jobs/${job.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              status,
              updated_at: new Date().toISOString(),
            }),
          }
        );
        setJobs((current) =>
          current.map((item) => (item.id === job.id ? result.item : item))
        );
        updated += 1;
      }
      onMessage(
        `Marked ${updated} queue ${updated === 1 ? "record" : "records"} as ${status}.`
      );
    } catch (error) {
      onError(
        error instanceof Error
          ? `${error.message} ${updated} records were updated before the failure.`
          : "Unable to update selected jobs."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function loadWorkerStatus() {
    try {
      const result = await importApi<WorkerStatus>("/api/import/run");
      setWorkerStatus(result);
      return result;
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to load worker status.");
      return null;
    }
  }

  async function runWorker() {
    setBusyAction("worker");
    try {
      const result = await importApi<WorkerStatus>("/api/import/run", {
        method: "POST",
        body: JSON.stringify({
          limit: 25,
          status: "pending,ready",
          types: "midi,pdf",
          import: true,
        }),
      });
      setWorkerStatus(result);
      onMessage(
        `Import worker started${result.run?.id ? ` (${result.run.id})` : ""}.`
      );
      window.setTimeout(() => {
        void loadJobs();
        void loadWorkerStatus();
      }, 2500);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to start import worker.");
    } finally {
      setBusyAction(null);
    }
  }

  const workerRun =
    workerStatus?.currentRun || workerStatus?.lastRun || workerStatus?.run || null;

  return (
    <>
      <section className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/65 shadow-xl shadow-black/20">
        <div className="grid grid-cols-2 border-b border-white/10 sm:grid-cols-4">
          <QueueMetric label="Total" value={counts.total} />
          <QueueMetric label="In progress" value={counts.active} />
          <QueueMetric label="Imported" value={counts.imported} />
          <QueueMetric label="Needs attention" value={counts.attention} tone={counts.attention ? "danger" : "default"} />
        </div>

        <div className="space-y-3 border-b border-white/10 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3">
              <Search size={16} className="shrink-0 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search title, composer, source, or license"
                className="h-10 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadJobs()}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
              >
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => void runWorker()}
                disabled={busyAction === "worker"}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-cyan-300 px-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-40"
              >
                {busyAction === "worker" ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                Run import
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
                className={`h-9 shrink-0 rounded-lg border px-3 text-xs font-bold transition ${
                  statusFilter === filter.value
                    ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100"
                    : "border-white/10 text-slate-400 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                {filter.label}
                <span className="ml-1.5 text-[10px] opacity-65">
                  {filter.value === "all"
                    ? jobs.length
                    : jobs.filter((job) => job.status === filter.value).length}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 border-t border-white/[0.06] pt-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-xs text-slate-500">
              {filteredJobs.length} visible
              {selectedIds.size ? ` · ${selectedIds.size} selected` : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              <QueueAction label="Mark ready" onClick={() => void bulkStatus("ready")} disabled={Boolean(busyAction)} />
              <QueueAction label="Skip" onClick={() => void bulkStatus("skipped")} disabled={Boolean(busyAction)} />
              <QueueAction label="Clear failed" onClick={() => deleteStatus("error")} disabled={!counts.attention || Boolean(busyAction)} />
              <QueueAction label="Clear skipped" onClick={() => deleteStatus("skipped")} disabled={!jobs.some((job) => job.status === "skipped") || Boolean(busyAction)} />
              <QueueAction label="Clear imported" onClick={() => deleteStatus("imported")} disabled={!counts.imported || Boolean(busyAction)} />
              <button
                type="button"
                onClick={() => requestDelete(Array.from(selectedIds), "selected jobs")}
                disabled={!selectedIds.size || Boolean(busyAction)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-300/20 bg-red-300/10 px-3 text-xs font-bold text-red-100 transition hover:border-red-300/40 disabled:opacity-35"
              >
                <Trash2 size={14} />
                Delete selected
              </button>
            </div>
          </div>
        </div>

        <div className="hidden grid-cols-[42px_minmax(220px,1fr)_130px_150px_190px] items-center border-b border-white/10 bg-white/[0.025] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 md:grid">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={() => setSelectedIds((current) => toggleVisibleSelection(current, visibleIds))}
            aria-label="Select all visible import jobs"
            className="h-4 w-4 accent-cyan-300"
          />
          <span>Import</span>
          <span>Status</span>
          <span>Updated</span>
          <span className="text-right">Actions</span>
        </div>

        <div className="divide-y divide-white/[0.07]">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-14 text-sm text-slate-400">
              <Loader2 size={17} className="animate-spin" />
              Loading queue
            </div>
          ) : filteredJobs.length === 0 ? (
            <QueueEmpty filtered={Boolean(query || statusFilter !== "all")} onReset={() => { setQuery(""); setStatusFilter("all"); }} />
          ) : (
            filteredJobs.map((job) => (
              <QueueRow
                key={job.id}
                job={job}
                selected={selectedIds.has(job.id)}
                busy={busyAction === `update:${job.id}`}
                onSelect={(selected) =>
                  setSelectedIds((current) => {
                    const next = new Set(current);
                    if (selected) next.add(job.id);
                    else next.delete(job.id);
                    return next;
                  })
                }
                onUpdate={updateJob}
                onDelete={() => requestDelete([job.id], job.title || "import job")}
              />
            ))
          )}
        </div>

        {workerRun ? (
          <details className="border-t border-white/10 p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-300">
              <span className="inline-flex items-center gap-2">
                <FileClock size={16} className="text-cyan-300" />
                Worker activity: {workerRun.state || (workerStatus?.running ? "running" : "complete")}
              </span>
              <ChevronDown size={16} />
            </summary>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {workerRun.id || "Latest run"}
                {typeof workerRun.exitCode === "number" ? ` · exit ${workerRun.exitCode}` : ""}
              </p>
              <button type="button" onClick={() => void loadWorkerStatus()} className="text-xs font-semibold text-cyan-200 hover:text-white">
                Refresh logs
              </button>
            </div>
            {workerRun.logs?.length ? (
              <pre className="mt-3 max-h-64 overflow-auto rounded-lg border border-white/10 bg-black/60 p-3 text-xs leading-6 text-slate-300">
                {workerRun.logs.join("\n")}
              </pre>
            ) : (
              <p className="mt-3 text-xs text-slate-500">No worker log lines yet.</p>
            )}
          </details>
        ) : null}
      </section>

      <ConfirmImportDeleteDialog
        open={Boolean(pendingDelete)}
        count={pendingDelete?.ids.length || 0}
        containsImported={pendingDelete?.containsImported || false}
        busy={busyAction === "delete"}
        label={pendingDelete?.label || "queue records"}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}

function QueueMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "danger";
}) {
  return (
    <div className="border-r border-white/10 px-4 py-3 last:border-r-0">
      <p className={`text-xl font-bold ${tone === "danger" ? "text-red-200" : "text-white"}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
    </div>
  );
}

function QueueAction({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-9 rounded-lg border border-white/10 px-3 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-35"
    >
      {label}
    </button>
  );
}

function QueueEmpty({
  filtered,
  onReset,
}: {
  filtered: boolean;
  onReset: () => void;
}) {
  return (
    <div className="px-4 py-14 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-500">
        {filtered ? <Search size={19} /> : <CheckCircle2 size={19} />}
      </span>
      <h3 className="mt-3 text-sm font-bold text-white">
        {filtered ? "No matching imports" : "Queue is clear"}
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        {filtered
          ? "Try a different search or status."
          : "New source jobs will appear here when they are queued."}
      </p>
      {filtered ? (
        <button type="button" onClick={onReset} className="mt-3 text-sm font-semibold text-cyan-200 hover:text-white">
          Reset filters
        </button>
      ) : null}
    </div>
  );
}

function QueueRow({
  job,
  selected,
  busy,
  onSelect,
  onUpdate,
  onDelete,
}: {
  job: ImportJob;
  selected: boolean;
  busy: boolean;
  onSelect: (selected: boolean) => void;
  onUpdate: (job: ImportJob, patch: Partial<ImportJob>) => Promise<void>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    title: job.title || "",
    composer: job.composer || "",
    genre: job.genre || "",
    bpm: job.bpm ? String(job.bpm) : "",
    description: job.description || "",
    license: job.license || "Needs review",
    permission_note: job.permission_note || "",
    midi_path: job.midi_path || "",
    pdf_path: job.pdf_path || "",
  });

  async function save() {
    try {
      await onUpdate(job, {
        ...draft,
        bpm: draft.bpm ? Number(draft.bpm) : null,
        status: job.status === "pending" ? "ready" : job.status,
      });
      setEditing(false);
    } catch {
      // The parent keeps the row open and surfaces the error.
    }
  }

  return (
    <article className={`px-4 transition ${selected ? "bg-cyan-300/[0.035]" : "hover:bg-white/[0.02]"}`}>
      <div className="grid gap-3 py-3 md:grid-cols-[42px_minmax(220px,1fr)_130px_150px_190px] md:items-center">
        <div className="flex items-center justify-between md:block">
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelect(event.target.checked)}
            aria-label={`Select ${job.title || "import job"}`}
            className="h-4 w-4 accent-cyan-300"
          />
          <span className={`rounded-full border px-2 py-1 text-[10px] font-bold md:hidden ${statusClass(job.status)}`}>
            {job.status}
          </span>
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-white">
            {job.title || "Untitled import"}
          </h3>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {job.composer || "Unknown composer"}
            {job.genre ? ` · ${job.genre}` : ""}
          </p>
          {job.source_url ? (
            <a
              href={job.source_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-cyan-300 hover:text-cyan-100"
            >
              <ExternalLink size={12} className="shrink-0" />
              <span className="truncate">{job.source_url}</span>
            </a>
          ) : null}
          {job.error_message ? (
            <p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-red-200">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              {job.error_message}
            </p>
          ) : null}
        </div>

        <span className={`hidden w-fit rounded-full border px-2.5 py-1 text-xs font-bold md:inline-flex ${statusClass(job.status)}`}>
          {job.status}
        </span>

        <p className="text-xs text-slate-500">
          <span className="mr-2 font-semibold text-slate-400 md:hidden">Updated</span>
          {formatUpdated(job)}
        </p>

        <div className="flex flex-wrap justify-start gap-2 md:justify-end">
          {job.status !== "imported" ? (
            <button
              type="button"
              onClick={() => void onUpdate(job, { status: "ready" })}
              disabled={busy}
              title="Mark ready"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-2.5 text-xs font-bold text-cyan-100 transition hover:border-cyan-300/40 disabled:opacity-40"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Ready
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
          >
            <Edit3 size={14} />
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Delete queue record"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-300/15 text-red-200 transition hover:border-red-300/40 hover:bg-red-300/10"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {editing ? (
        <div className="mb-4 border-t border-white/[0.07] py-4">
          <div className="grid gap-3 md:grid-cols-4">
            <EditField label="Title" className="md:col-span-2">
              <input className="field" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
            </EditField>
            <EditField label="Composer">
              <input className="field" value={draft.composer} onChange={(event) => setDraft({ ...draft, composer: event.target.value })} />
            </EditField>
            <EditField label="Genre">
              <input className="field" value={draft.genre} onChange={(event) => setDraft({ ...draft, genre: event.target.value })} />
            </EditField>
            <EditField label="BPM">
              <input className="field" type="number" min={1} max={400} value={draft.bpm} onChange={(event) => setDraft({ ...draft, bpm: event.target.value })} />
            </EditField>
            <EditField label="License">
              <input className="field" value={draft.license} onChange={(event) => setDraft({ ...draft, license: event.target.value })} />
            </EditField>
            <EditField label="MIDI path">
              <input className="field" value={draft.midi_path} onChange={(event) => setDraft({ ...draft, midi_path: event.target.value })} />
            </EditField>
            <EditField label="PDF path">
              <input className="field" value={draft.pdf_path} onChange={(event) => setDraft({ ...draft, pdf_path: event.target.value })} />
            </EditField>
            <EditField label="Description" className="md:col-span-2">
              <textarea className="field resize-y" rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
            </EditField>
            <EditField label="Permission note" className="md:col-span-2">
              <textarea className="field resize-y" rows={3} value={draft.permission_note} onChange={(event) => setDraft({ ...draft, permission_note: event.target.value })} />
            </EditField>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/[0.06]">
              Cancel
            </button>
            <button type="button" onClick={() => void save()} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              Save changes
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function EditField({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={className}>
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
