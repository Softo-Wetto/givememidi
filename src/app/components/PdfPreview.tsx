"use client";

import { useMemo, useState } from "react";
import {
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Maximize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

type Props = {
  url?: string | null;
  title?: string;
};

type FitMode = "FitH" | "FitV" | "Fit";

export function PdfPreview({ url, title = "Sheet music" }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState(90);
  const [fitMode, setFitMode] = useState<FitMode>("FitH");

  const iframeSrc = useMemo(() => {
    if (!url) return "";
    return `${url}#page=1&zoom=${zoom}&view=${fitMode}`;
  }, [fitMode, url, zoom]);

  if (!url) {
    return (
      <div className="flex h-[520px] flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-white/[0.045] p-8 text-center text-gray-400">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.055] text-cyan-200">
          <FileText size={30} />
        </div>
        <div>
          <p className="text-lg font-bold text-white">No sheet music attached</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-gray-400">
            This upload only includes the MIDI file. If you are the creator, you can add a PDF from your uploads page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-[620px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/30">
      <div className="flex flex-col gap-3 border-b border-white/10 bg-black/35 p-3 backdrop-blur md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200 ring-1 ring-cyan-300/20">
            <FileText size={20} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{title}</p>
            <p className="text-xs text-slate-500">PDF sheet music preview</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setLoaded(false);
              setZoom((value) => Math.max(50, value - 10));
            }}
            className="rounded-xl border border-white/10 bg-white/[0.045] p-2 text-slate-300 transition hover:bg-white/10"
            title="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
          <span className="min-w-14 text-center text-xs font-bold text-slate-300">{zoom}%</span>
          <button
            onClick={() => {
              setLoaded(false);
              setZoom((value) => Math.min(180, value + 10));
            }}
            className="rounded-xl border border-white/10 bg-white/[0.045] p-2 text-slate-300 transition hover:bg-white/10"
            title="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={() => {
              setLoaded(false);
              setZoom(90);
              setFitMode("FitH");
            }}
            className="rounded-xl border border-white/10 bg-white/[0.045] p-2 text-slate-300 transition hover:bg-white/10"
            title="Reset view"
          >
            <RotateCcw size={16} />
          </button>
          <select
            value={fitMode}
            onChange={(event) => {
              setLoaded(false);
              setFitMode(event.target.value as FitMode);
            }}
            className="h-9 rounded-xl border border-white/10 bg-slate-950 px-3 text-xs font-semibold text-slate-200 outline-none transition focus:border-cyan-300/40"
          >
            <option value="FitH">Fit width</option>
            <option value="FitV">Fit height</option>
            <option value="Fit">Fit page</option>
          </select>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-white/10 bg-white/[0.045] p-2 text-slate-300 transition hover:bg-white/10"
            title="Open in new tab"
          >
            <ExternalLink size={16} />
          </a>
          <a
            href={url}
            download
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-2 text-xs font-bold text-white shadow-lg transition hover:brightness-110"
          >
            <Download size={15} />
            Download
          </a>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 bg-slate-200">
        {!loaded && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950/75 text-gray-300 backdrop-blur-sm">
            <Loader2 className="animate-spin text-cyan-300" size={24} />
            <span className="text-sm font-semibold">Loading sheet music...</span>
          </div>
        )}

        <iframe
          key={iframeSrc}
          src={iframeSrc}
          title={title}
          className="h-full min-h-[620px] w-full bg-white"
          onLoad={() => setLoaded(true)}
        />
      </div>

      <div className="border-t border-white/10 bg-black/35 px-4 py-3 text-xs text-slate-500">
        Tip: use the browser PDF controls inside the preview for page navigation and printing.
      </div>
    </div>
  );
}
