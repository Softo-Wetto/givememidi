"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, FileMusic, FileText, Loader2, Plus, RefreshCw, Trash2, UploadCloud, Wand2, XCircle } from "lucide-react";
import { createRecord, getCurrentAuth, updateRecord } from "@/lib/pocketbase/client";
import { getPocketBaseFileUrl } from "@/lib/pocketbase/config";
import type { MusicFile } from "@/lib/pocketbase/types";
import { awardXp } from "@/lib/xp-client";

const GENRES = [
  "Pop",
  "Rock",
  "Hip-Hop / Rap",
  "R&B / Soul",
  "Jazz",
  "Blues",
  "Classical",
  "Film Score / Soundtrack",
  "Game / OST",
  "Musical / Theatre",
  "Funk",
  "Disco",
  "Country",
  "Folk",
  "Indie",
  "Electronic",
  "EDM",
  "House",
  "Trance",
  "Synthwave",
  "Ambient",
  "Lo-fi",
  "K-Pop",
  "J-Pop",
  "Latin",
  "Piano Solo",
  "Orchestral",
  "Chiptune",
  "Instrumental",
  "Experimental",
];

type BulkRowStatus = "ready" | "uploading" | "imported" | "error" | "skipped";

type BulkRow = {
  id: string;
  key: string;
  title: string;
  composer: string;
  genre: string;
  bpm: string;
  description: string;
  license: string;
  permissionNote: string;
  midi: File | null;
  pdf: File | null;
  selected: boolean;
  status: BulkRowStatus;
  message: string;
  createdId?: string;
};

function fileBaseName(file: File) {
  return file.name.replace(/\.[^.]+$/, "");
}

function pairKey(file: File) {
  return fileBaseName(file)
    .toLowerCase()
    .replace(/\b(sheet|score|midi|pdf|final|copy)\b/g, "")
    .replace(/[\s_.()\[\]-]+/g, " ")
    .trim();
}

function titleFromFile(file: File) {
  return fileBaseName(file)
    .replace(/[_]+/g, " ")
    .replace(/\s+-\s+/g, " - ")
    .replace(/\b(mid|midi|pdf|score|sheet)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isMidi(file: File) {
  return /\.(mid|midi)$/i.test(file.name);
}

function isPdf(file: File) {
  return /\.pdf$/i.test(file.name);
}

function fileSize(file?: File | null) {
  if (!file) return "-";
  const mb = file.size / 1024 / 1024;
  if (mb >= 1) return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
  return `${Math.max(1, Math.round(file.size / 1024))} KB`;
}

function mergeFiles(files: File[], existing: BulkRow[]) {
  const rows = new Map<string, BulkRow>();
  for (const row of existing) rows.set(row.key, row);

  for (const file of files) {
    if (!isMidi(file) && !isPdf(file)) continue;
    const key = pairKey(file) || fileBaseName(file).toLowerCase();
    const current = rows.get(key);
    const next: BulkRow = current ?? {
      id: crypto.randomUUID(),
      key,
      title: titleFromFile(file) || "Untitled MIDI",
      composer: "",
      genre: "",
      bpm: "",
      description: "",
      license: "Uploaded by site admin",
      permissionNote: "Bulk file import. Review rights before publishing publicly.",
      midi: null,
      pdf: null,
      selected: true,
      status: "ready",
      message: "Ready to publish",
    };

    if (isMidi(file)) next.midi = file;
    if (isPdf(file)) next.pdf = file;
    if (!next.title || next.title === "Untitled MIDI") next.title = titleFromFile(file) || next.title;
    next.status = next.midi ? "ready" : "skipped";
    next.message = next.midi ? "Ready to publish" : "Needs a MIDI file";
    rows.set(key, next);
  }

  return Array.from(rows.values()).sort((a, b) => a.title.localeCompare(b.title));
}

export default function BulkFileImportClient() {
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [dragging, setDragging] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [globalComposer, setGlobalComposer] = useState("");
  const [globalGenre, setGlobalGenre] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const stats = useMemo(() => {
    const publishable = rows.filter((row) => row.selected && row.midi && row.status !== "imported").length;
    const paired = rows.filter((row) => row.midi && row.pdf).length;
    const missingPdf = rows.filter((row) => row.midi && !row.pdf).length;
    const missingMidi = rows.filter((row) => !row.midi).length;
    const imported = rows.filter((row) => row.status === "imported").length;
    return { publishable, paired, missingPdf, missingMidi, imported };
  }, [rows]);

  function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    setRows((current) => mergeFiles(files, current));
    setMessage(`${files.length} file${files.length === 1 ? "" : "s"} scanned and paired by filename.`);
    setError("");
  }

  function updateRow(id: string, patch: Partial<BulkRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  function applyDefaults() {
    setRows((current) =>
      current.map((row) => ({
        ...row,
        composer: row.composer || globalComposer,
        genre: row.genre || globalGenre,
      }))
    );
  }

  function resetImported() {
    setRows((current) => current.filter((row) => row.status !== "imported"));
  }

  async function publishRow(row: BulkRow, userId: string) {
    if (!row.midi) throw new Error("Missing MIDI file.");
    const now = new Date().toISOString();
    const form = new FormData();
    form.append("title", row.title.trim() || fileBaseName(row.midi));
    form.append("composer", row.composer.trim());
    form.append("description", row.description.trim());
    form.append("genre", row.genre.trim());
    if (row.bpm.trim()) form.append("bpm", row.bpm.trim());
    form.append("downloads", "0");
    form.append("uploaded_by", userId);
    form.append("midi_file", row.midi);
    if (row.pdf) form.append("pdf_file", row.pdf);
    form.append("source_name", "Admin bulk upload");
    form.append("license", row.license.trim() || "Uploaded by site admin");
    form.append("permission_note", row.permissionNote.trim());
    form.append("import_status", "published");
    form.append("created_at", now);
    form.append("updated_at", now);

    const created = await createRecord<MusicFile>("music_files", form);
    const midiUrl = getPocketBaseFileUrl("music_files", created.id, created.midi_file);
    const pdfUrl = getPocketBaseFileUrl("music_files", created.id, created.pdf_file);
    if (midiUrl || pdfUrl) {
      const updateForm = new FormData();
      if (midiUrl) updateForm.append("midi_url", midiUrl);
      if (pdfUrl) updateForm.append("pdf_url", pdfUrl);
      await updateRecord("music_files", created.id, updateForm);
    }
    await awardXp("upload", created.id);
    return created.id;
  }

  async function publishSelected() {
    const auth = getCurrentAuth();
    if (!auth?.user.id) {
      window.location.href = "/login?redirect=/admin/imports";
      return;
    }

    const targets = rows.filter((row) => row.selected && row.midi && row.status !== "imported");
    if (!targets.length) {
      setError("Select at least one row with a MIDI file.");
      return;
    }

    setPublishing(true);
    setError("");
    setMessage("");
    let imported = 0;
    let failed = 0;

    for (const row of targets) {
      updateRow(row.id, { status: "uploading", message: "Uploading to library..." });
      try {
        const createdId = await publishRow(row, auth.user.id);
        imported += 1;
        updateRow(row.id, { status: "imported", message: "Published", selected: false, createdId });
      } catch (err) {
        failed += 1;
        updateRow(row.id, { status: "error", message: err instanceof Error ? err.message : "Upload failed" });
      }
    }

    setPublishing(false);
    setMessage(`Bulk publish complete. Imported ${imported}. Failed ${failed}.`);
  }

  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/65 shadow-xl shadow-black/20">
      <div className="flex flex-col gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-300">
            Local files
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">Bulk MIDI and PDF upload</h2>
          <p className="mt-1 text-sm text-slate-400">
            Files with matching names are paired automatically before publishing.
          </p>
        </div>
        <button
          onClick={publishSelected}
          disabled={publishing || !stats.publishable}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-40"
        >
          {publishing ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Publish selected
        </button>
      </div>

      <div className="grid lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b border-white/10 bg-white/[0.025] p-5 lg:border-b-0 lg:border-r">
          <label
            onDragEnter={() => setDragging(true)}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              addFiles(event.dataTransfer.files);
            }}
            className={[
              "flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition",
              dragging
                ? "border-cyan-200 bg-cyan-300/10"
                : "border-white/15 bg-black/25 hover:border-cyan-300/40 hover:bg-cyan-300/[0.04]",
            ].join(" ")}
          >
            <UploadCloud className="text-cyan-200" size={30} />
            <span className="mt-3 text-sm font-bold text-white">Drop MIDI and PDF files</span>
            <span className="mt-1 text-xs text-slate-500">or select multiple files</span>
            <input
              type="file"
              multiple
              accept=".mid,.midi,.pdf"
              className="hidden"
              onChange={(event) => event.target.files && addFiles(event.target.files)}
            />
          </label>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Metric label="Publishable" value={stats.publishable} />
            <Metric label="Paired" value={stats.paired} />
            <Metric label="MIDI only" value={stats.missingPdf} />
            <Metric label="Needs MIDI" value={stats.missingMidi} />
          </div>

          <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Default composer</span>
              <input value={globalComposer} onChange={(event) => setGlobalComposer(event.target.value)} className="field" placeholder="Apply to blank rows" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Default genre</span>
              <select value={globalGenre} onChange={(event) => setGlobalGenre(event.target.value)} className="field">
                <option value="">Select genre</option>
                {GENRES.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-3 grid gap-2">
            <button onClick={applyDefaults} disabled={!rows.length} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 px-3 text-sm font-semibold text-slate-300 transition hover:border-cyan-300/35 hover:text-white disabled:opacity-35">
              <Wand2 size={15} /> Apply defaults
            </button>
            <button onClick={resetImported} disabled={!stats.imported} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 px-3 text-sm font-semibold text-slate-400 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-35">
              <RefreshCw size={15} /> Clear imported rows
            </button>
          </div>
        </aside>

        <div className="min-w-0 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">File review</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {rows.length} rows · {stats.imported} published
              </p>
            </div>
          </div>

          {message ? <Notice tone="success" text={message} /> : null}
          {error ? <Notice tone="error" text={error} /> : null}

          <div className="mt-4 max-h-[660px] space-y-3 overflow-auto pr-1">
            {rows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 px-5 py-12 text-center">
                <FileMusic size={23} className="mx-auto text-slate-600" />
                <p className="mt-3 text-sm font-semibold text-slate-300">No files selected</p>
                <p className="mt-1 text-xs text-slate-500">
                  Add .mid, .midi, and .pdf files to start pairing.
                </p>
              </div>
            ) : (
              rows.map((row) => (
                <BulkRowCard key={row.id} row={row} onUpdate={updateRow} onRemove={removeRow} />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/55 px-3 py-3">
      <p className="text-xl font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
    </div>
  );
}

function Notice({ tone, text }: { tone: "success" | "error"; text: string }) {
  const Icon = tone === "success" ? CheckCircle2 : XCircle;
  const cls = tone === "success" ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100" : "border-red-300/20 bg-red-300/10 text-red-100";
  return <div className={`mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${cls}`}><Icon size={16} />{text}</div>;
}

function BulkRowCard({ row, onUpdate, onRemove }: { row: BulkRow; onUpdate: (id: string, patch: Partial<BulkRow>) => void; onRemove: (id: string) => void }) {
  const isLocked = row.status === "uploading" || row.status === "imported";
  const statusClass = row.status === "imported"
    ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
    : row.status === "error"
      ? "border-red-300/20 bg-red-300/10 text-red-100"
      : row.midi
        ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
        : "border-amber-300/20 bg-amber-300/10 text-amber-100";

  return (
    <article className="rounded-lg border border-white/10 bg-slate-950/60 p-4 transition hover:border-white/20">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <input type="checkbox" checked={row.selected} disabled={isLocked || !row.midi} onChange={(event) => onUpdate(row.id, { selected: event.target.checked })} className="h-4 w-4 accent-cyan-300" />
            <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass}`}>{row.status}</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-300"><FileMusic size={12} />{row.midi ? fileSize(row.midi) : "No MIDI"}</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-300"><FileText size={12} />{row.pdf ? fileSize(row.pdf) : "No PDF"}</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">{row.message}</p>
        </div>
        <button type="button" onClick={() => onRemove(row.id)} disabled={isLocked} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-red-300/40 hover:text-red-100 disabled:opacity-40">
          <Trash2 size={14} /> Remove
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <label className="md:col-span-2">
          <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Title</span>
          <input value={row.title} disabled={isLocked} onChange={(event) => onUpdate(row.id, { title: event.target.value })} className="field" />
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Composer</span>
          <input value={row.composer} disabled={isLocked} onChange={(event) => onUpdate(row.id, { composer: event.target.value })} className="field" />
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Genre</span>
          <select value={row.genre} disabled={isLocked} onChange={(event) => onUpdate(row.id, { genre: event.target.value })} className="field">
            <option value="">Genre</option>
            {GENRES.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">BPM</span>
          <input value={row.bpm} disabled={isLocked} type="number" min={1} max={400} onChange={(event) => onUpdate(row.id, { bpm: event.target.value })} className="field" />
        </label>
        <label className="md:col-span-3">
          <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Description</span>
          <input value={row.description} disabled={isLocked} onChange={(event) => onUpdate(row.id, { description: event.target.value })} className="field" placeholder="Optional note shown on the MIDI page" />
        </label>
        <label className="md:col-span-2">
          <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">MIDI file</span>
          <input type="file" accept=".mid,.midi" disabled={isLocked} onChange={(event) => onUpdate(row.id, { midi: event.target.files?.[0] || row.midi, status: event.target.files?.[0] ? "ready" : row.status })} className="field file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-300 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-slate-950" />
          <p className="mt-1 truncate text-xs text-slate-500">{row.midi?.name || "Required"}</p>
        </label>
        <label className="md:col-span-2">
          <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">PDF file</span>
          <input type="file" accept=".pdf" disabled={isLocked} onChange={(event) => onUpdate(row.id, { pdf: event.target.files?.[0] || row.pdf })} className="field file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-300 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-slate-950" />
          <p className="mt-1 truncate text-xs text-slate-500">{row.pdf?.name || "Optional"}</p>
        </label>
      </div>
    </article>
  );
}