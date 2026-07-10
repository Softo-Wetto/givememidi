"use client";

import { useState } from "react";
import {
  ClipboardList,
  FileInput,
  Loader2,
  Plus,
  SearchCheck,
  Sparkles,
} from "lucide-react";
import type { ImportJob } from "@/lib/pocketbase/types";
import { importApi } from "./import-api";

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

type ImportSourcePanelProps = {
  onMessage: (message: string) => void;
  onError: (message: string) => void;
  onQueued: () => void;
};

type ImportJobCreateResponse = {
  item: ImportJob;
  duplicate?: boolean;
};

const DEFAULT_LICENSE = "Needs review";

const EMPTY_DRAFT: Draft = {
  source_url: "",
  title: "",
  composer: "",
  genre: "",
  bpm: "",
  description: "",
  license: DEFAULT_LICENSE,
  permission_note: "",
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
    const path =
      new URL(url).pathname.split("/").filter(Boolean).pop() || "Imported MIDI";
    return decodeURIComponent(path)
      .replace(/[-_]+/g, " ")
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  } catch {
    return "Imported MIDI";
  }
}

export default function ImportSourcePanel({
  onMessage,
  onError,
  onQueued,
}: ImportSourcePanelProps) {
  const [sourceText, setSourceText] = useState("");
  const [working, setWorking] = useState<"queue" | "discover" | "draft" | null>(
    null
  );
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  async function createJobs(urls: string[], sourceType = "score_url") {
    let created = 0;
    let duplicates = 0;

    for (const url of urls) {
      const result = await importApi<ImportJobCreateResponse>(
        "/api/import/jobs",
        {
          method: "POST",
          body: JSON.stringify({
            source_url: url,
            source_type: sourceType,
            title: titleFromUrl(url),
            composer: "",
            genre: "",
            description: "",
            license: DEFAULT_LICENSE,
            permission_note: "Review license and permission before importing.",
            status: "pending",
            dedupe_key: dedupeKey(url),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        }
      );

      if (result.duplicate) duplicates += 1;
      else created += 1;
    }

    setSourceText("");
    onMessage(
      `Queued ${created} ${created === 1 ? "source" : "sources"}${duplicates ? `; skipped ${duplicates} duplicate${duplicates === 1 ? "" : "s"}` : ""}.`
    );
    onQueued();
  }

  async function queuePastedUrls() {
    const urls = parseUrls(sourceText);
    if (!urls.length) {
      onError("Paste at least one valid URL.");
      return;
    }

    setWorking("queue");
    try {
      await createJobs(urls);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to queue sources.");
    } finally {
      setWorking(null);
    }
  }

  async function discoverSourceLinks() {
    const urls = parseUrls(sourceText);
    if (!urls.length) {
      onError("Paste a creator, collection, search, or score URL first.");
      return;
    }

    setWorking("discover");
    try {
      const found = new Set<string>();

      for (const url of urls) {
        const result = await importApi<{ links?: string[] }>(
          "/api/import/discover",
          {
            method: "POST",
            body: JSON.stringify({ url }),
          }
        );
        (result.links || []).forEach((link) => found.add(link));
      }

      if (!found.size) {
        onMessage(
          "No score links were discovered. The original URLs are still ready to queue directly."
        );
        return;
      }

      await createJobs(Array.from(found), "discovered_score_url");
    } catch (error) {
      onError(
        error instanceof Error
          ? `${error.message} You can still use Queue URLs.`
          : "Unable to discover score links. You can still queue the URLs directly."
      );
    } finally {
      setWorking(null);
    }
  }

  async function createManualDraft() {
    if (!draft.source_url.trim() && !draft.title.trim()) {
      onError("Add at least a source URL or title for the draft.");
      return;
    }

    setWorking("draft");
    try {
      const now = new Date().toISOString();
      await importApi<ImportJobCreateResponse>("/api/import/jobs", {
        method: "POST",
        body: JSON.stringify({
          ...draft,
          bpm: draft.bpm ? Number(draft.bpm) : null,
          source_url: draft.source_url.trim(),
          source_type: "manual_draft",
          status: "ready",
          dedupe_key: dedupeKey(
            draft.source_url ||
              `manual:${draft.title.trim()}:${draft.composer.trim()}`
          ),
          created_at: now,
          updated_at: now,
        }),
      });

      setDraft(EMPTY_DRAFT);
      onMessage("Manual import draft created.");
      onQueued();
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "Unable to create manual draft."
      );
    } finally {
      setWorking(null);
    }
  }

  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/65 shadow-xl shadow-black/20">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-300">
                URL intake
              </p>
              <h2 className="mt-1 text-xl font-bold text-white">Queue source pages</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                Paste one URL per line. Direct score links can be queued immediately;
                creator and collection pages can be scanned for score links first.
              </p>
            </div>
            <FileInput className="mt-1 shrink-0 text-cyan-300" size={21} />
          </div>

          <textarea
            value={sourceText}
            onChange={(event) => setSourceText(event.target.value)}
            rows={9}
            placeholder={"https://example.com/score/123\nhttps://example.com/creator/scores"}
            className="mt-5 w-full resize-y rounded-lg border border-white/10 bg-black/30 p-4 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/45 focus:ring-2 focus:ring-cyan-300/10"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void queuePastedUrls()}
              disabled={Boolean(working)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-cyan-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-40"
            >
              {working === "queue" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ClipboardList size={16} />
              )}
              Queue URLs
            </button>
            <button
              type="button"
              onClick={() => void discoverSourceLinks()}
              disabled={Boolean(working)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 px-4 text-sm font-semibold text-slate-300 transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.06] hover:text-white disabled:opacity-40"
            >
              {working === "discover" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <SearchCheck size={16} />
              )}
              Discover links
            </button>
          </div>
        </div>

        <aside className="border-t border-white/10 bg-white/[0.025] p-5 lg:border-l lg:border-t-0">
          <Sparkles size={18} className="text-indigo-300" />
          <h3 className="mt-3 text-sm font-bold text-white">Fastest reliable path</h3>
          <ol className="mt-3 space-y-3 text-sm leading-6 text-slate-400">
            <li><span className="mr-2 font-bold text-cyan-300">1.</span>Queue direct score URLs.</li>
            <li><span className="mr-2 font-bold text-cyan-300">2.</span>Review metadata and rights in Queue.</li>
            <li><span className="mr-2 font-bold text-cyan-300">3.</span>Run the worker when records are ready.</li>
          </ol>
          <p className="mt-4 border-t border-white/10 pt-4 text-xs leading-5 text-slate-500">
            Source discovery depends on the source page allowing automated access.
            Direct queueing remains available when discovery is blocked.
          </p>
        </aside>
      </div>

      <details className="border-t border-white/10">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-bold text-slate-200 transition hover:bg-white/[0.025]">
          <span className="inline-flex items-center gap-2">
            <Plus size={16} className="text-indigo-300" />
            Create a manual draft
          </span>
          <span className="text-xs font-normal text-slate-500">For local worker manifests</span>
        </summary>
        <div className="border-t border-white/[0.07] p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <SourceField label="Source URL" className="md:col-span-2">
              <input value={draft.source_url} onChange={(event) => setDraft({ ...draft, source_url: event.target.value })} className="field" />
            </SourceField>
            <SourceField label="BPM">
              <input type="number" min={1} max={400} value={draft.bpm} onChange={(event) => setDraft({ ...draft, bpm: event.target.value })} className="field" />
            </SourceField>
            <SourceField label="Title">
              <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="field" />
            </SourceField>
            <SourceField label="Composer">
              <input value={draft.composer} onChange={(event) => setDraft({ ...draft, composer: event.target.value })} className="field" />
            </SourceField>
            <SourceField label="Genre">
              <input value={draft.genre} onChange={(event) => setDraft({ ...draft, genre: event.target.value })} className="field" />
            </SourceField>
            <SourceField label="License">
              <input value={draft.license} onChange={(event) => setDraft({ ...draft, license: event.target.value })} className="field" />
            </SourceField>
            <SourceField label="Description" className="md:col-span-2">
              <textarea rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="field resize-y" />
            </SourceField>
            <SourceField label="Permission note" className="md:col-span-3">
              <textarea rows={2} value={draft.permission_note} onChange={(event) => setDraft({ ...draft, permission_note: event.target.value })} className="field resize-y" />
            </SourceField>
          </div>
          <button
            type="button"
            onClick={() => void createManualDraft()}
            disabled={Boolean(working)}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-500 px-4 text-sm font-bold text-white transition hover:bg-indigo-400 disabled:opacity-40"
          >
            {working === "draft" ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Create draft
          </button>
        </div>
      </details>
    </section>
  );
}

function SourceField({
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
