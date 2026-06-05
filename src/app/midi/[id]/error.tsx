"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";

export default function MidiError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("MIDI page boundary caught an error:", error);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#111827_0%,#020617_42%,#000_100%)] px-6 py-16 text-white">
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-red-300/20 bg-white/[0.045] p-6 shadow-2xl shadow-black/30">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-300/20 bg-red-300/10 text-red-100">
            <AlertTriangle size={22} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-100/75">
              MIDI page interrupted
            </p>
            <h1 className="mt-1 text-2xl font-black">This MIDI page hit a loading problem.</h1>
            <p className="mt-3 leading-7 text-slate-300">
              Your browser is still fine. Retry the MIDI page, or return to the library.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 px-5 py-3 text-sm font-bold text-white transition hover:brightness-110"
          >
            <RefreshCw size={17} />
            Retry page
          </button>
          <Link
            href="/midi"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/10"
          >
            <ArrowLeft size={17} />
            Back to MIDI
          </Link>
        </div>
      </section>
    </main>
  );
}
