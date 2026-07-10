"use client";

import { useCallback, useState } from "react";
import {
  CheckCircle2,
  FileStack,
  Link2,
  ListChecks,
  ShieldCheck,
  UploadCloud,
  XCircle,
} from "lucide-react";
import BulkFileImportClient from "./BulkFileImportClient";
import ImportQueuePanel from "./ImportQueuePanel";
import ImportSourcePanel from "./ImportSourcePanel";

type WorkspaceTab = "queue" | "bulk" | "sources";

const TABS: Array<{
  value: WorkspaceTab;
  label: string;
  description: string;
  icon: typeof ListChecks;
}> = [
  {
    value: "queue",
    label: "Queue",
    description: "Review and process jobs",
    icon: ListChecks,
  },
  {
    value: "bulk",
    label: "Bulk upload",
    description: "Pair local MIDI and PDF files",
    icon: UploadCloud,
  },
  {
    value: "sources",
    label: "Add sources",
    description: "Queue URLs and drafts",
    icon: Link2,
  },
];

export default function ImportInboxClient() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("queue");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [queueRevision, setQueueRevision] = useState(0);

  const showMessage = useCallback((value: string) => {
    setMessage(value);
    setError("");
  }, []);

  const showError = useCallback((value: string) => {
    setError(value);
    setMessage("");
  }, []);

  function changeTab(tab: WorkspaceTab) {
    setActiveTab(tab);
    setMessage("");
    setError("");
  }

  return (
    <main className="min-h-screen bg-[#020617] px-4 py-6 text-white sm:px-6 md:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
              <FileStack size={21} />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Import workspace
                </h1>
                <span className="inline-flex items-center gap-1 rounded border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-100">
                  <ShieldCheck size={12} />
                  Admin
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                Review queued sources, publish local file batches, and keep import
                history under control.
              </p>
            </div>
          </div>
        </header>

        <nav
          aria-label="Import workspace"
          className="mt-5 grid gap-2 sm:grid-cols-3"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => changeTab(tab.value)}
                className={[
                  "flex min-h-16 items-center gap-3 rounded-lg border px-4 text-left transition",
                  active
                    ? "border-cyan-300/35 bg-cyan-300/10 text-white shadow-[inset_0_-2px_0_rgba(103,232,249,0.55)]"
                    : "border-white/10 bg-white/[0.025] text-slate-400 hover:border-white/20 hover:bg-white/[0.05] hover:text-white",
                ].join(" ")}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  size={18}
                  className={active ? "text-cyan-200" : "text-slate-500"}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{tab.label}</span>
                  <span className="mt-0.5 block truncate text-xs opacity-65">
                    {tab.description}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        {message ? (
          <Notice tone="success" text={message} onClose={() => setMessage("")} />
        ) : null}
        {error ? (
          <Notice tone="error" text={error} onClose={() => setError("")} />
        ) : null}

        <div className="mt-4">
          {activeTab === "queue" ? (
            <ImportQueuePanel
              active
              revision={queueRevision}
              onMessage={showMessage}
              onError={showError}
            />
          ) : null}
          {activeTab === "bulk" ? <BulkFileImportClient /> : null}
          {activeTab === "sources" ? (
            <ImportSourcePanel
              onMessage={showMessage}
              onError={showError}
              onQueued={() => setQueueRevision((value) => value + 1)}
            />
          ) : null}
        </div>

        <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-slate-500">
          Import only material you own, public-domain or appropriately licensed
          work, or files you have permission to redistribute.
        </p>
      </div>
    </main>
  );
}

function Notice({
  tone,
  text,
  onClose,
}: {
  tone: "success" | "error";
  text: string;
  onClose: () => void;
}) {
  const Icon = tone === "success" ? CheckCircle2 : XCircle;
  const classes =
    tone === "success"
      ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
      : "border-red-300/20 bg-red-300/10 text-red-100";

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={[
        "mt-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm font-semibold",
        classes,
      ].join(" ")}
    >
      <span className="flex items-start gap-2">
        <Icon size={16} className="mt-0.5 shrink-0" />
        {text}
      </span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss message"
        className="opacity-60 transition hover:opacity-100"
      >
        <XCircle size={16} />
      </button>
    </div>
  );
}
