"use client";

import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function MidiError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("MIDI page boundary caught an error:", error);

  return (
    <main className="gmm-public-page min-h-[72vh] border-y border-white/10 bg-[#02050a] px-6 py-20 text-white sm:py-28">
      <section className="gmm-shell grid items-end gap-10 border-y border-white/10 py-12 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="max-w-3xl">
          <p className="gmm-kicker">MIDI detail / recovery</p>
          <div className="mt-6 flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-amber-300/25 bg-amber-300/10 text-amber-200">
              <AlertTriangle size={23} />
            </span>
            <div>
              <h1 className="text-3xl font-black leading-tight sm:text-5xl">This arrangement could not load.</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
                Retry the record without losing your place, or return to the full library and keep browsing.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-cyan-300 px-5 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
          >
            <RefreshCw size={17} />
            Retry MIDI
          </button>
          <Link
            href="/midi"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/15 px-5 text-sm font-bold text-slate-200 transition hover:border-cyan-300/40 hover:text-white"
          >
            <ArrowLeft size={17} />
            Back to library
          </Link>
        </div>
      </section>
    </main>
  );
}
