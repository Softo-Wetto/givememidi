"use client";

import Link from "next/link";
import { RefreshCw, Home, AlertTriangle } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("Application boundary caught an error:", error);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#111827_0%,#020617_42%,#000_100%)] px-6 py-16 text-white">
      <section className="mx-auto max-w-2xl overflow-hidden rounded-[2rem] border border-red-300/20 bg-white/[0.045] shadow-2xl shadow-black/30">
        <div className="border-b border-white/10 bg-red-400/10 p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-300/20 bg-red-300/10 text-red-100">
              <AlertTriangle size={24} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-100/75">
                Something interrupted the page
              </p>
              <h1 className="mt-1 text-2xl font-black">This page could not finish loading.</h1>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6">
          <p className="leading-7 text-slate-300">
            The app caught the problem safely. Retry the page, or head back home and keep browsing.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 px-5 py-3 text-sm font-bold text-white transition hover:brightness-110"
            >
              <RefreshCw size={17} />
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/10"
            >
              <Home size={17} />
              Go home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
