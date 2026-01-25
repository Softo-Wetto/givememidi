"use client";

import { useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function MidiRowScroller({
  children,
  itemCount,
}: {
  children: React.ReactNode;
  itemCount: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const showArrows = itemCount > 3;

  const scrollByCards = (dir: "left" | "right") => {
    const el = ref.current;
    if (!el) return;

    // scroll roughly 3 cards at a time
    const amount = Math.max(320, Math.floor(el.clientWidth * 0.9));
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {showArrows && (
        <>
          {/* Left */}
          <button
            type="button"
            onClick={() => scrollByCards("left")}
            className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20
                       h-10 w-10 items-center justify-center rounded-full
                       border border-white/10 bg-black/50 backdrop-blur
                       hover:bg-black/70 hover:border-white/20 transition
                       shadow-[0_0_20px_rgba(0,0,0,0.35)]"
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} className="text-white" />
          </button>

          {/* Right */}
          <button
            type="button"
            onClick={() => scrollByCards("right")}
            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20
                       h-10 w-10 items-center justify-center rounded-full
                       border border-white/10 bg-black/50 backdrop-blur
                       hover:bg-black/70 hover:border-white/20 transition
                       shadow-[0_0_20px_rgba(0,0,0,0.35)]"
            aria-label="Scroll right"
          >
            <ChevronRight size={18} className="text-white" />
          </button>
        </>
      )}

      {/* Fade edges (looks fancy) */}
      {showArrows && (
        <>
          <div className="pointer-events-none absolute left-0 top-0 h-full w-10 z-10 bg-gradient-to-r from-black/60 to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 h-full w-10 z-10 bg-gradient-to-l from-black/60 to-transparent" />
        </>
      )}

    <div
    ref={ref}
    className="
        flex gap-6 overflow-x-auto pb-2 pr-2 scroll-smooth
        snap-x snap-mandatory

        /* Hide scrollbar (cross-browser) */
        scrollbar-hide
    "
    >
    {children}
    </div>

      {/* Mobile hint */}
      {showArrows && (
        <div className="mt-2 text-xs text-gray-500 md:hidden">
          Swipe to scroll →
        </div>
      )}
    </div>
  );
}
