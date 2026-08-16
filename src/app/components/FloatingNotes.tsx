"use client";

const NOTE_SYMBOLS = ["\u2669", "\u266A", "\u266B", "\u266C", "\uD834\uDD1E", "\u266A"];
const NOTE_COLORS = [
  "rgba(96,165,250,0.18)",
  "rgba(34,211,238,0.15)",
  "rgba(167,139,250,0.14)",
  "rgba(52,211,153,0.12)",
];

const notes = Array.from({ length: 14 }, (_, index) => ({
  id: index,
  symbol: NOTE_SYMBOLS[index % NOTE_SYMBOLS.length],
  left: 3 + (index * 6.8) % 94,
  size: 13 + (index % 5) * 5,
  duration: 7 + (index % 6) * 1.8,
  delay: (index % 8) * 1.1,
  color: NOTE_COLORS[index % NOTE_COLORS.length],
}));

export function FloatingNotes() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none" aria-hidden="true">
      {notes.map((note) => (
        <span
          key={note.id}
          className="music-note"
          style={{
            left: `${note.left}%`,
            bottom: "-10%",
            fontSize: `${note.size}px`,
            color: note.color,
            "--dur": `${note.duration}s`,
            "--delay": `${note.delay}s`,
          } as React.CSSProperties}
        >
          {note.symbol}
        </span>
      ))}
    </div>
  );
}
