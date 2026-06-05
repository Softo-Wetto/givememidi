"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Midi } from "@tonejs/midi";
import * as Tone from "tone";
import {
  Activity,
  ChevronLeft,
  Layers,
  MousePointer2,
  Pause,
  Play,
  RotateCcw,
  ScanLine,
  Square,
  ZoomIn,
} from "lucide-react";

type Props = {
  url: string;
  height?: number;
};

type NoteDraw = {
  id: string;
  time: number;
  duration: number;
  midi: number;
  velocity: number;
  trackIndex: number;
};

type TrackInfo = {
  index: number;
  name: string;
  noteCount: number;
};

type HitRect = {
  x: number;
  y: number;
  w: number;
  h: number;
  note: NoteDraw;
};

const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function midiToNoteName(midi: number) {
  const octave = Math.floor(midi / 12) - 1;
  return `${noteNames[midi % 12]}${octave}`;
}

function formatSeconds(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  const decimals = Math.floor((value % 1) * 10);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${decimals}`;
}

export function MidiPreview({ url, height = 260 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const midiRef = useRef<Midi | null>(null);
  const notesRef = useRef<NoteDraw[]>([]);
  const hitRectsRef = useRef<HitRect[]>([]);
  const rafRef = useRef<number | null>(null);
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const partRefs = useRef<Tone.Part[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.4);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [followPlayhead, setFollowPlayhead] = useState(true);
  const [showVelocity, setShowVelocity] = useState(true);
  const [tracks, setTracks] = useState<TrackInfo[]>([]);
  const [visibleTracks, setVisibleTracks] = useState<Set<number>>(new Set());
  const [selectedNote, setSelectedNote] = useState<NoteDraw | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; label: string } | null>(null);

  const palette = useMemo(
    () => ["#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#a78bfa", "#fb7185", "#22d3ee"],
    []
  );

  const pxPerSec = useMemo(() => 180 * zoom, [zoom]);
  const activeTrackCount = tracks.filter((track) => track.noteCount > 0).length;
  const visibleNoteCount = useMemo(
    () => notesRef.current.filter((note) => visibleTracks.has(note.trackIndex)).length,
    [visibleTracks]
  );
  const progress = durationSec > 0 ? Math.min(100, (currentTime / durationSec) * 100) : 0;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setHover(null);
      setSelectedNote(null);
      setCurrentTime(0);

      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error(`Failed to fetch MIDI (${response.status})`);

        const midi = new Midi(await response.arrayBuffer());
        if (cancelled) return;

        midiRef.current = midi;

        const notes: NoteDraw[] = [];
        midi.tracks.forEach((track, trackIndex) => {
          track.notes.forEach((note, noteIndex) => {
            notes.push({
              id: `${trackIndex}-${noteIndex}`,
              time: note.time,
              duration: note.duration,
              midi: note.midi,
              velocity: note.velocity,
              trackIndex,
            });
          });
        });

        if (!notes.length) {
          setError("No notes found in this MIDI.");
          setLoading(false);
          return;
        }

        notesRef.current = notes;
        setDurationSec(Math.max(...notes.map((note) => note.time + note.duration)));

        const trackList = midi.tracks.map((track, index) => ({
          index,
          name: track.name?.trim() || `Track ${index + 1}`,
          noteCount: track.notes.length,
        }));

        setTracks(trackList);
        setVisibleTracks(new Set(trackList.filter((track) => track.noteCount > 0).map((track) => track.index)));
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load MIDI.");
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [url]);

  const draw = () => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cssW = Math.max(680, Math.floor(durationSec * pxPerSec));
    const cssH = height;
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, cssW, cssH);

    const gradient = ctx.createLinearGradient(0, 0, cssW, cssH);
    gradient.addColorStop(0, "rgba(59,130,246,0.10)");
    gradient.addColorStop(0.45, "rgba(15,23,42,0.92)");
    gradient.addColorStop(1, "rgba(34,211,238,0.08)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, cssW, cssH);

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    for (let time = 0; time <= durationSec; time += 1) {
      const x = time * pxPerSec;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, cssH);
      ctx.stroke();
    }

    for (let i = 1; i < 6; i += 1) {
      const y = (i / 6) * cssH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cssW, y);
      ctx.stroke();
    }

    const visibleNotes = notesRef.current.filter((note) => visibleTracks.has(note.trackIndex));
    const usedNotes = visibleNotes.length ? visibleNotes : notesRef.current;
    const minPitch = Math.min(...usedNotes.map((note) => note.midi));
    const maxPitch = Math.max(...usedNotes.map((note) => note.midi));
    const range = Math.max(1, maxPitch - minPitch);
    const pad = 14;

    hitRectsRef.current = [];
    for (const note of notesRef.current) {
      if (!visibleTracks.has(note.trackIndex)) continue;

      const x = note.time * pxPerSec;
      const w = Math.max(3, note.duration * pxPerSec);
      const yNorm = (note.midi - minPitch) / range;
      const y = (1 - yNorm) * (cssH - pad * 2) + pad;
      const h = Math.max(5, Math.min(11, cssH / 23));
      const color = palette[note.trackIndex % palette.length];

      ctx.globalAlpha = showVelocity ? Math.max(0.32, note.velocity) : 0.9;
      ctx.fillStyle = color;
      ctx.fillRect(x, y - h / 2, w, h);

      ctx.globalAlpha = 0.34;
      ctx.fillStyle = "#fff";
      ctx.fillRect(x, y - h / 2, w, 1);
      ctx.globalAlpha = 1;

      if (selectedNote?.id === note.id) {
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 1, y - h / 2 - 2, w + 2, h + 4);
        ctx.lineWidth = 1;
      }

      hitRectsRef.current.push({ x, y: y - h / 2, w, h, note });
    }

    const playX = currentTime * pxPerSec;
    ctx.strokeStyle = "rgba(96,165,250,0.35)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(playX, 0);
    ctx.lineTo(playX, cssH);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.70)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playX, 0);
    ctx.lineTo(playX, cssH);
    ctx.stroke();
    ctx.lineWidth = 1;

    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.strokeRect(0.5, 0.5, cssW - 1, cssH - 1);
  };

  useEffect(() => {
    if (loading || error) return;
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, zoom, height, visibleTracks, currentTime, showVelocity, selectedNote]);

  const disposeParts = () => {
    partRefs.current.forEach((part) => part.dispose());
    partRefs.current = [];
  };

  const stopPlayback = async () => {
    setPlaying(false);
    Tone.Transport.stop();
    Tone.Transport.position = "0:0:0";
    setCurrentTime(0);
    disposeParts();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const startPlayback = async () => {
    const midi = midiRef.current;
    if (!midi) return;

    await Tone.start();

    if (!synthRef.current) {
      synthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.8 },
      }).toDestination();
      synthRef.current.volume.value = -10;
    }

    disposeParts();

    midi.tracks.forEach((track, trackIndex) => {
      if (!visibleTracks.has(trackIndex) || !track.notes.length) return;

      const events = track.notes.map((note) => ({
        time: note.time,
        midi: note.midi,
        duration: note.duration,
        velocity: note.velocity,
      }));

      const part = new Tone.Part((time, event: { midi: number; duration: number; velocity: number }) => {
        const noteName = Tone.Frequency(event.midi, "midi").toNote();
        synthRef.current?.triggerAttackRelease(noteName, event.duration, time, event.velocity);
      }, events).start(0);

      partRefs.current.push(part);
    });

    Tone.Transport.seconds = currentTime;
    Tone.Transport.start();
    setPlaying(true);

    const tick = () => {
      const time = Tone.Transport.seconds;
      setCurrentTime(time);

      const wrap = wrapRef.current;
      if (wrap && followPlayhead) {
        const x = time * pxPerSec;
        const viewLeft = wrap.scrollLeft;
        const viewRight = viewLeft + wrap.clientWidth;
        if (x > viewRight - 120) wrap.scrollLeft = x - wrap.clientWidth + 120;
        if (x < viewLeft + 40) wrap.scrollLeft = Math.max(0, x - 40);
      }

      if (time >= durationSec) {
        stopPlayback();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  };

  const togglePlay = async () => {
    if (playing) {
      setPlaying(false);
      Tone.Transport.pause();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    await startPlayback();
  };

  const findHit = (x: number, y: number) => {
    return hitRectsRef.current.find((rect) => x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h);
  };

  const seekTo = (time: number) => {
    const next = Math.max(0, Math.min(durationSec, time));
    setCurrentTime(next);
    Tone.Transport.seconds = next;
  };

  const handleProgressChange = (value: string) => {
    seekTo((Number(value) / 100) * durationSec);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const found = findHit(x, y);

    if (!found) {
      setHover(null);
      return;
    }

    const note = found.note;
    setHover({
      x: Math.min(x + 12, rect.width - 10),
      y: Math.max(10, y - 10),
      label: `${midiToNoteName(note.midi)} - ${note.time.toFixed(2)}s to ${(note.time + note.duration).toFixed(2)}s`,
    });
  };

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const hit = findHit(x, y);
    setSelectedNote(hit?.note ?? null);
    seekTo(hit?.note.time ?? x / pxPerSec);
  };

  const toggleTrack = async (index: number) => {
    setVisibleTracks((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

    if (playing) {
      Tone.Transport.pause();
      disposeParts();
      await startPlayback();
    }
  };

  const setAllTracks = (on: boolean) => {
    const active = tracks.filter((track) => track.noteCount > 0).map((track) => track.index);
    setVisibleTracks(new Set(on ? active : []));
  };

  const scrollToStart = () => {
    seekTo(0);
    if (wrapRef.current) wrapRef.current.scrollLeft = 0;
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      disposeParts();
      Tone.Transport.stop();
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-cyan-200">
          <Activity className="animate-pulse" size={18} />
          Rendering MIDI preview...
        </div>
        <div className="skeleton h-56 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full rounded-3xl border border-white/10 bg-white/[0.045] p-6 text-gray-400">
        <div className="flex items-center gap-2 font-bold text-white">
          <ScanLine size={18} className="text-cyan-300" />
          Preview unavailable
        </div>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-black/20 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <PreviewStat label="Duration" value={formatSeconds(durationSec)} />
        <PreviewStat label="Visible notes" value={String(visibleNoteCount)} />
        <PreviewStat label="Tracks" value={`${visibleTracks.size}/${activeTrackCount}`} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span className="tabular-nums">{formatSeconds(currentTime)}</span>
          <span className="tabular-nums">{formatSeconds(durationSec)}</span>
        </div>
        <input
          aria-label="MIDI preview progress"
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={progress}
          onChange={(event) => handleProgressChange(event.target.value)}
          className="w-full accent-cyan-300"
        />
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={togglePlay}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 font-semibold text-white shadow-lg transition hover:from-blue-400 hover:to-indigo-400"
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
            {playing ? "Pause" : "Play"}
          </button>

          <button
            onClick={stopPlayback}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-gray-200 transition hover:bg-white/10"
          >
            <Square size={16} />
            Stop
          </button>

          <button
            onClick={scrollToStart}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-gray-200 transition hover:bg-white/10"
            title="Return to start"
          >
            <ChevronLeft size={16} />
            Start
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <ZoomIn size={16} className="text-gray-400" />
            Zoom
          </div>
          <input
            type="range"
            min={0.8}
            max={3.5}
            step={0.1}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="w-44 accent-cyan-300"
          />
          <button
            onClick={() => setZoom(1.4)}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10"
            title="Reset zoom"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <TogglePill active={followPlayhead} onClick={() => setFollowPlayhead((value) => !value)}>
          Follow playhead
        </TogglePill>
        <TogglePill active={showVelocity} onClick={() => setShowVelocity((value) => !value)}>
          Velocity shading
        </TogglePill>
        <button
          onClick={() => setAllTracks(true)}
          className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-300/35 hover:text-white"
        >
          Show all
        </button>
        <button
          onClick={() => setAllTracks(false)}
          className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-300/35 hover:text-white"
        >
          Hide all
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1 pr-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          <Layers size={14} />
          Tracks
        </div>
        {tracks
          .filter((track) => track.noteCount > 0)
          .map((track) => {
            const on = visibleTracks.has(track.index);
            return (
              <button
                key={track.index}
                onClick={() => toggleTrack(track.index)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  on
                    ? "border-blue-400/40 bg-blue-500/10 text-blue-200"
                    : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                }`}
                title={`${track.noteCount} notes`}
              >
                {track.name}
              </button>
            );
          })}
      </div>

      <div ref={wrapRef} className="relative w-full overflow-x-auto rounded-2xl border border-white/10 bg-black/30">
        <canvas
          ref={canvasRef}
          className="block cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
          onClick={handleClick}
        />

        {hover && (
          <div
            className="pointer-events-none absolute rounded-md border border-white/10 bg-black/80 px-2 py-1 text-xs text-gray-100 shadow"
            style={{ left: hover.x, top: hover.y }}
          >
            {hover.label}
          </div>
        )}
      </div>

      {selectedNote ? (
        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-50">
          <div className="flex items-center gap-2 font-bold">
            <MousePointer2 size={15} />
            Selected note
          </div>
          <p className="mt-1 text-xs text-cyan-100/80">
            {midiToNoteName(selectedNote.midi)} on{" "}
            {tracks.find((track) => track.index === selectedNote.trackIndex)?.name ?? "Track"} starts at{" "}
            {selectedNote.time.toFixed(2)}s, lasts {selectedNote.duration.toFixed(2)}s, velocity{" "}
            {Math.round(selectedNote.velocity * 100)}%.
          </p>
        </div>
      ) : (
        <p className="text-xs text-gray-500">
          Tip: click a note to inspect it, or click empty space on the roll to seek. Use track toggles to isolate parts.
        </p>
      )}
    </div>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function TogglePill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100"
          : "border-white/10 bg-white/[0.045] text-slate-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
