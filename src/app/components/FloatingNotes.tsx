"use client";

import { useEffect, useState } from "react";

const NOTES = ["♩", "♪", "♫", "♬", "𝄞", "𝄢", "♩", "♪"];

type NoteItem = {
  id: number;
  symbol: string;
  left: number;
  size: number;
  dur: number;
  delay: number;
  color: string;
};

const COLORS = [
  "rgba(96,165,250,0.18)",
  "rgba(34,211,238,0.15)",
  "rgba(167,139,250,0.14)",
  "rgba(96,165,250,0.12)",
  "rgba(52,211,153,0.12)",
];

export function FloatingNotes() {
  const [notes, setNotes] = useState<NoteItem[]>([]);

  useEffect(() => {
    const items: NoteItem[] = Array.from({ length: 14 }, (_, i) => ({
      id: i,
      symbol: NOTES[i % NOTES.length],
      left: 3 + (i * 6.8) % 94,
      size: 13 + (i % 5) * 5,
      dur: 7 + (i % 6) * 1.8,
      delay: (i % 8) * 1.1,
      color: COLORS[i % COLORS.length],
    }));
    setNotes(items);
  }, []);

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      {notes.map((n) => (
        <span
          key={n.id}
          className="music-note"
          style={{
            left: `${n.left}%`,
            bottom: "-10%",
            fontSize: `${n.size}px`,
            color: n.color,
            "--dur": `${n.dur}s`,
            "--delay": `${n.delay}s`,
          } as React.CSSProperties}
        >
          {n.symbol}
        </span>
      ))}
    </div>
  );
}
