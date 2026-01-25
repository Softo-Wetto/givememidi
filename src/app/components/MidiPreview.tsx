"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Midi } from "@tonejs/midi";
import * as Tone from "tone";
import { Play, Pause, Square, ZoomIn } from "lucide-react";

type Props = {
  url: string;
  height?: number; // canvas height in px
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

const midiToNoteName = (m: number) => {
  const names = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const octave = Math.floor(m / 12) - 1;
  return `${names[m % 12]}${octave}`;
};

export function MidiPreview({ url, height = 240 }: Props) {
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

  const [zoom, setZoom] = useState(1.4); // affects px/sec
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const [tracks, setTracks] = useState<TrackInfo[]>([]);
  const [visibleTracks, setVisibleTracks] = useState<Set<number>>(new Set()); // track indices

  const [hover, setHover] = useState<{
    x: number;
    y: number;
    label: string;
  } | null>(null);

  const palette = useMemo(
    () => ["#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#a78bfa", "#fb7185"],
    []
  );

  const durationSec = useMemo(() => {
    const ns = notesRef.current;
    if (!ns.length) return 0;
    return Math.max(...ns.map((n) => n.time + n.duration));
  }, [tracks]); // re-evaluate after load

  const pxPerSec = useMemo(() => 180 * zoom, [zoom]); // base density

  // --- Load MIDI once ---
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setHover(null);

      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to fetch MIDI (${res.status})`);
        const buffer = await res.arrayBuffer();
        const midi = new Midi(buffer);

        if (cancelled) return;

        midiRef.current = midi;

        const flat: NoteDraw[] = [];
        midi.tracks.forEach((t, ti) => {
          t.notes.forEach((n, ni) => {
            flat.push({
              id: `${ti}-${ni}`,
              time: n.time,
              duration: n.duration,
              midi: n.midi,
              velocity: n.velocity,
              trackIndex: ti,
            });
          });
        });

        if (!flat.length) {
          setError("No notes found in this MIDI.");
          setLoading(false);
          return;
        }

        notesRef.current = flat;

        const trackList: TrackInfo[] = midi.tracks.map((t, i) => ({
          index: i,
          name: t.name?.trim() || `Track ${i + 1}`,
          noteCount: t.notes.length,
        }));

        setTracks(trackList);

        // default: show all tracks that actually have notes
        setVisibleTracks(new Set(trackList.filter(t => t.noteCount > 0).map(t => t.index)));

        setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Failed to load MIDI.");
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [url]);

  // --- Draw function ---
  const draw = () => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cssW = Math.max(600, Math.floor(durationSec * pxPerSec)); // wide canvas for scroll
    const cssH = height;

    // crisp on retina
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // background
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(0, 0, cssW, cssH);

    // grid (time)
    const gridEverySec = 1; // 1s grid
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    for (let t = 0; t <= durationSec; t += gridEverySec) {
      const x = t * pxPerSec;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, cssH);
      ctx.stroke();
    }

    // pitch range
    const all = notesRef.current.filter(n => visibleTracks.has(n.trackIndex));
    const fallback = notesRef.current;
    const used = all.length ? all : fallback;

    const minPitch = Math.min(...used.map(n => n.midi));
    const maxPitch = Math.max(...used.map(n => n.midi));
    const range = Math.max(1, maxPitch - minPitch);
    const pad = 12;

    // pitch helper lines
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    for (let i = 1; i < 6; i++) {
      const y = (i / 6) * cssH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cssW, y);
      ctx.stroke();
    }

    // draw notes + build hit rects
    hitRectsRef.current = [];
    for (const n of notesRef.current) {
      if (!visibleTracks.has(n.trackIndex)) continue;

      const x = n.time * pxPerSec;
      const w = Math.max(2, n.duration * pxPerSec);
      const yNorm = (n.midi - minPitch) / range; // 0..1
      const y = (1 - yNorm) * (cssH - pad * 2) + pad;

      const h = Math.max(5, Math.min(10, (cssH / 24)));

      const color = palette[n.trackIndex % palette.length];
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = color;
      ctx.fillRect(x, y - h / 2, w, h);

      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#fff";
      ctx.fillRect(x, y - h / 2, w, 1);
      ctx.globalAlpha = 1;

      hitRectsRef.current.push({ x, y: y - h / 2, w, h, note: n });
    }

    // playhead
    const playX = currentTime * pxPerSec;
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playX, 0);
    ctx.lineTo(playX, cssH);
    ctx.stroke();

    // soft glow around playhead
    ctx.strokeStyle = "rgba(96,165,250,0.35)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(playX, 0);
    ctx.lineTo(playX, cssH);
    ctx.stroke();
    ctx.lineWidth = 1;

    // border
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.strokeRect(0.5, 0.5, cssW - 1, cssH - 1);
  };

  // redraw when relevant changes happen
  useEffect(() => {
    if (loading || error) return;
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, zoom, height, visibleTracks, currentTime]);

  // --- Playback wiring ---
  const stopPlayback = async () => {
    setPlaying(false);
    Tone.Transport.stop();
    Tone.Transport.position = 0 as any;
    setCurrentTime(0);

    // clear scheduled parts
    partRefs.current.forEach((p) => p.dispose());
    partRefs.current = [];

    // stop raf
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const startPlayback = async () => {
    const midi = midiRef.current;
    if (!midi) return;

    await Tone.start();

    // create synth once
    if (!synthRef.current) {
      synthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.8 },
      }).toDestination();

      // a bit nicer volume
      synthRef.current.volume.value = -10;
    }

    // clear any previous parts
    partRefs.current.forEach((p) => p.dispose());
    partRefs.current = [];

    // schedule only visible tracks
    midi.tracks.forEach((t, ti) => {
      if (!visibleTracks.has(ti)) return;
      if (!t.notes.length) return;

      const events = t.notes.map((n) => ({
        time: n.time,
        midi: n.midi,
        duration: n.duration,
        velocity: n.velocity,
      }));

      const part = new Tone.Part((time, ev: any) => {
         const note = Tone.Frequency(ev.midi, "midi").toNote(); // e.g. "C4"
         synthRef.current?.triggerAttackRelease(note, ev.duration, time, ev.velocity);
      }, events).start(0);

      partRefs.current.push(part);
    });

    Tone.Transport.seconds = currentTime; // resume from playhead
    Tone.Transport.start();

    setPlaying(true);

    // RAF loop updates playhead + auto-scroll
    const tick = () => {
      const t = Tone.Transport.seconds;
      setCurrentTime(t);

      const wrap = wrapRef.current;
      if (wrap) {
        const x = t * pxPerSec;
        const viewLeft = wrap.scrollLeft;
        const viewRight = viewLeft + wrap.clientWidth;

        // keep playhead in view
        if (x > viewRight - 120) wrap.scrollLeft = x - wrap.clientWidth + 120;
        if (x < viewLeft + 40) wrap.scrollLeft = Math.max(0, x - 40);
      }

      if (t >= durationSec) {
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

  // --- Hover tooltip + seek on click ---
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left; // in CSS px relative to canvas
    const y = e.clientY - rect.top;

    // hit test
    const hits = hitRectsRef.current;
    const found = hits.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);

    if (!found) {
      setHover(null);
      return;
    }

    const n = found.note;
    const label = `${midiToNoteName(n.midi)} • ${n.time.toFixed(2)}s → ${(n.time + n.duration).toFixed(2)}s`;

    setHover({
      x: Math.min(x + 12, rect.width - 10),
      y: Math.max(10, y - 10),
      label,
    });
  };

  const handleMouseLeave = () => setHover(null);

  const seekToX = (x: number) => {
    const t = Math.max(0, Math.min(durationSec, x / pxPerSec));
    setCurrentTime(t);
    if (playing) {
      // reposition transport while playing
      Tone.Transport.seconds = t;
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    seekToX(x);
  };

  // --- Track toggles ---
  const toggleTrack = async (idx: number) => {
    setVisibleTracks((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });

    // if currently playing, restart scheduling with new tracks
    if (playing) {
      Tone.Transport.pause();
      partRefs.current.forEach((p) => p.dispose());
      partRefs.current = [];
      await startPlayback();
    }
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      partRefs.current.forEach((p) => p.dispose());
      partRefs.current = [];
      Tone.Transport.stop();
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full rounded-xl border border-white/10 bg-white/5 p-6 text-gray-300">
        Rendering MIDI preview…
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full rounded-xl border border-white/10 bg-white/5 p-6 text-gray-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl
              bg-gradient-to-r from-blue-500 to-indigo-500
              hover:from-blue-400 hover:to-indigo-400
              font-semibold text-white shadow-lg transition"
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
            {playing ? "Pause" : "Play"}
          </button>

          <button
            onClick={stopPlayback}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl
              border border-white/10 bg-white/5 text-gray-200
              hover:bg-white/10 transition"
          >
            <Square size={16} />
            Stop
          </button>

          <div className="ml-2 text-sm text-gray-400 tabular-nums">
            {currentTime.toFixed(2)}s / {durationSec.toFixed(2)}s
          </div>
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
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-48"
          />
        </div>
      </div>

      {/* Track toggles */}
      <div className="flex flex-wrap gap-2">
        {tracks
          .filter((t) => t.noteCount > 0)
          .map((t) => {
            const on = visibleTracks.has(t.index);
            return (
              <button
                key={t.index}
                onClick={() => toggleTrack(t.index)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition
                  ${on
                    ? "border-blue-400/40 bg-blue-500/10 text-blue-200"
                    : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                  }`}
                title={`${t.noteCount} notes`}
              >
                {t.name}
              </button>
            );
          })}
      </div>

      {/* Scrollable canvas */}
      <div
        ref={wrapRef}
        className="relative w-full overflow-x-auto rounded-xl border border-white/10 bg-black/30"
      >
        <canvas
          ref={canvasRef}
          className="block"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        />

        {/* Hover tooltip */}
        {hover && (
          <div
            className="pointer-events-none absolute px-2 py-1 rounded-md text-xs
              bg-black/80 border border-white/10 text-gray-100 shadow"
            style={{ left: hover.x, top: hover.y }}
          >
            {hover.label}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Tip: click anywhere on the roll to seek. Use track toggles to isolate parts.
      </p>
    </div>
  );
}
