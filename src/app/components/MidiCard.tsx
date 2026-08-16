"use client";

import { artworkVariant } from "@/lib/editorial-ui";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, CalendarDays, Clock3, Download, FileText, Music2, Star } from "lucide-react";
import Link from "next/link";
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
  createdAt?: string | null;
  durationSeconds?: number | string | null;
};

export function MidiCard(props: MidiCardProps) {
  const reduceMotion = useReducedMotion();
  const variant = artworkVariant(props.id);
  const uploaded = formatUploadedDate(props.createdAt);
  const duration = formatDuration(props.durationSeconds);
  const rated = (props.ratingCount ?? 0) > 0;

  return (
    <motion.article
      className="gmm-midi-card"
      data-variant={variant}
      whileHover={reduceMotion ? undefined : { y: -4 }}
      transition={{ duration: 0.16 }}
    >
      <div className="gmm-midi-bookmark" onClick={(event) => event.stopPropagation()}>
        <BookmarkButton midiId={props.id} />
      </div>

      <Link href={`/midi/${props.id}`} className="gmm-midi-card-link">
        <CardArtwork variant={variant} genre={props.genre} hasPdf={Boolean(props.pdfUrl)} />

        <div className="gmm-midi-card-body">
          <div className="gmm-midi-card-labels">
            <span>{props.genre || "MIDI"}</span>
            <span>{props.pdfUrl ? "MIDI + PDF" : "MIDI"}</span>
          </div>

          <h3>{props.title}</h3>
          <p className="gmm-midi-composer">{props.composer || "Unknown composer"}</p>

          <div className="gmm-midi-card-meta">
            {duration ? <span><Clock3 size={13} /> {duration}</span> : null}
            {uploaded ? <span><CalendarDays size={13} /> {uploaded}</span> : null}
            {props.bpm ? <span>{props.bpm} BPM</span> : null}
          </div>

          <div className="gmm-midi-card-footer">
            <span><Star size={14} className={rated ? "fill-current text-yellow-300" : "text-slate-600"} /> {rated ? `${props.avgRating!.toFixed(1)} (${props.ratingCount})` : "Unrated"}</span>
            <span><Download size={14} /> {props.downloads ?? 0}</span>
            <ArrowUpRight size={17} />
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

function CardArtwork({ variant, genre, hasPdf }: { variant: 0 | 1 | 2 | 3; genre?: string | null; hasPdf: boolean }) {
  return (
    <div className="gmm-midi-art" aria-hidden="true">
      <span className="gmm-midi-art-index">0{variant + 1}</span>
      <div className="gmm-score-shadow" />
      <div className="gmm-score-page">
        <span className="gmm-score-fold" />
        <div className="gmm-score-heading"><FileText size={15} /><i /><i /></div>
        <div className="gmm-score-lines">{Array.from({ length: 5 }).map((_, index) => <i key={index} />)}</div>
        <div className="gmm-score-notes">{Array.from({ length: 28 }).map((_, index) => <i key={index} />)}</div>
      </div>
      <span className="gmm-midi-art-type"><Music2 size={14} /> {genre || "Arrangement"}</span>
      <span className="gmm-midi-art-file"><FileText size={13} /> {hasPdf ? "PDF" : "MIDI"}</span>
    </div>
  );
}

function formatUploadedDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatDuration(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return null;
  const seconds = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const rounded = Math.round(seconds);
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  if (mins >= 60) return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}
