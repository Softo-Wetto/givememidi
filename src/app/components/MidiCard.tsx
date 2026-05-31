"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Download, FileText, Music2, Star } from "lucide-react";
import { BookmarkButton } from "./BookmarkButton";

type MidiCardProps = {
  id: string;
  title: string;
  composer?: string | null;
  downloads?: number | null;
  pdfUrl?: string | null;
  genre?: string | null;
  bpm?: number | null;
  avgRating?: number | null;
  ratingCount?: number | null;
};

export function MidiCard({
  id,
  title,
  composer,
  downloads,
  pdfUrl,
  genre,
  bpm,
  avgRating,
  ratingCount,
}: MidiCardProps) {
  const hasRatings = (ratingCount ?? 0) > 0;

  return (
    <motion.article
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 360, damping: 28 }}
      className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] shadow-lg shadow-black/20 backdrop-blur transition hover:border-blue-300/35 hover:bg-white/[0.08]"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/60 to-transparent opacity-0 transition group-hover:opacity-100" />

      <div className="absolute right-3 top-3 z-20" onClick={(e) => e.stopPropagation()}>
        <BookmarkButton midiId={id} />
      </div>

      <Link href={`/midi/${id}`} className="flex h-full flex-col p-4">
        <PdfArtwork title={title} composer={composer} genre={genre} hasPdf={Boolean(pdfUrl)} />

        <div className="min-h-[72px]">
          <h3 className="line-clamp-2 text-lg font-bold leading-snug text-white transition group-hover:text-blue-100">
            {title}
          </h3>
          <p className="mt-1 line-clamp-1 text-sm text-gray-400">
            {composer || "Unknown composer"}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-gray-400">
          <span className="inline-flex items-center gap-1.5">
            <Star
              size={14}
              className={hasRatings ? "fill-yellow-300 text-yellow-300" : "text-gray-600"}
            />
            {hasRatings ? (
              <span>
                <b className="font-semibold text-gray-200">{avgRating!.toFixed(1)}</b>{" "}
                ({ratingCount})
              </span>
            ) : (
              <span>Unrated</span>
            )}
          </span>

          <span className="inline-flex items-center gap-1.5">
            <Download size={14} className="text-blue-300" />
            {downloads ?? 0}
          </span>

          {bpm ? (
            <span className="rounded-full bg-white/5 px-2 py-1 text-gray-300">{bpm} BPM</span>
          ) : null}
        </div>

        <div className="mt-4 inline-flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-slate-200 transition group-hover:border-blue-300/30 group-hover:bg-blue-400/10">
          Open details
          <ArrowUpRight size={16} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
      </Link>
    </motion.article>
  );
}

function PdfArtwork({
  title,
  composer,
  genre,
  hasPdf,
}: {
  title: string;
  composer?: string | null;
  genre?: string | null;
  hasPdf: boolean;
}) {
  return (
    <div className="pdf-card-art relative mb-4 h-44 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.20),transparent_44%),linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:auto,22px_22px,22px_22px]" />

      <div className="absolute left-1/2 top-5 h-[142px] w-[104px] -translate-x-1/2 rounded-lg border border-slate-200/80 bg-slate-100 shadow-2xl shadow-blue-950/40 transition duration-300 group-hover:-translate-y-1 group-hover:rotate-[-1deg]">
        <div className="absolute right-0 top-0 h-0 w-0 border-l-[18px] border-t-[18px] border-l-slate-300 border-t-white" />
        <div className="px-4 pt-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white">
              <FileText size={15} />
            </div>
            <div>
              <div className="h-1.5 w-10 rounded-full bg-slate-800" />
              <div className="mt-1 h-1 w-7 rounded-full bg-slate-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="h-1.5 w-full rounded-full bg-slate-300" />
            <div className="h-1.5 w-10/12 rounded-full bg-slate-300" />
            <div className="h-1.5 w-11/12 rounded-full bg-slate-300" />
            <div className="h-1.5 w-8/12 rounded-full bg-slate-300" />
          </div>

          <div className="mt-4 grid grid-cols-8 gap-1">
            {Array.from({ length: 32 }).map((_, index) => (
              <span
                key={index}
                className="h-1 rounded-full bg-slate-700/80"
                style={{ opacity: 0.28 + ((index * 7) % 5) * 0.12 }}
              />
            ))}
          </div>

          <div className="mt-4 h-7 rounded-md border border-slate-300 bg-white/70">
            <div className="h-full w-2/3 rounded-l-md bg-blue-500/20" />
          </div>
        </div>
      </div>

      <div className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-blue-200 ring-1 ring-white/10 backdrop-blur">
        <Music2 size={22} />
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2">
        <span className="rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-xs font-semibold text-slate-200 backdrop-blur">
          {genre || "MIDI"}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
            hasPdf
              ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
              : "border-blue-300/20 bg-blue-400/10 text-blue-100"
          }`}
        >
          <FileText size={12} />
          {hasPdf ? "PDF" : "Score"}
        </span>
      </div>

      <div className="absolute left-20 right-4 top-5 truncate text-right text-xs font-semibold text-white/45">
        {composer || title}
      </div>
    </div>
  );
}
