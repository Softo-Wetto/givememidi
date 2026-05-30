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

      <div className="absolute right-3 top-3 z-10" onClick={(e) => e.stopPropagation()}>
        <BookmarkButton midiId={id} />
      </div>

      <Link href={`/midi/${id}`} className="flex h-full flex-col p-4">
        <div className="relative mb-4 h-44 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-black">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:22px_22px] opacity-60" />
          <div className="absolute inset-x-4 bottom-5 flex h-16 items-end gap-1">
            {Array.from({ length: 18 }).map((_, i) => (
              <span
                key={i}
                className="motion-bar block flex-1 rounded-t bg-gradient-to-t from-blue-500/45 to-cyan-300/75"
                style={{
                  height: `${25 + ((i * 19) % 58)}%`,
                  animationDelay: `${i * 55}ms`,
                }}
              />
            ))}
          </div>

          <div className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-blue-200 ring-1 ring-white/10">
            <Music2 size={22} />
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2">
            <span className="rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-xs font-semibold text-slate-200 backdrop-blur">
              {genre || "MIDI"}
            </span>
            {pdfUrl ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                <FileText size={12} />
                PDF
              </span>
            ) : null}
          </div>
        </div>

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
