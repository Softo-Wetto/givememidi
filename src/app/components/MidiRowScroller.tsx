"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function MidiRowScroller({
  children,
  itemCount,
}: {
  children: React.ReactNode;
  itemCount: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const drag = useRef({
    active: false,
    dragged: false,
    pointerId: 0,
    startX: 0,
    startScrollLeft: 0,
  });
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const showArrows = itemCount > 3;

  const updateProgress = useCallback(() => {
    const el = ref.current;
    if (!el || el.scrollWidth <= el.clientWidth) {
      setProgress(0);
      return;
    }

    setProgress(el.scrollLeft / (el.scrollWidth - el.clientWidth));
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(updateProgress);
    const el = ref.current;
    if (!el) {
      window.cancelAnimationFrame(frame);
      return;
    }

    el.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.cancelAnimationFrame(frame);
      el.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [itemCount, updateProgress]);

  const scrollByCards = (dir: "left" | "right") => {
    const el = ref.current;
    if (!el) return;

    const amount = Math.max(320, Math.floor(el.clientWidth * 0.85));
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || event.pointerType === "mouse" && event.button !== 0) return;
    if ((event.target as HTMLElement).closest("a, button, input, textarea, select")) return;

    drag.current = {
      active: true,
      dragged: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: el.scrollLeft,
    };
    el.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    const state = drag.current;
    if (!el || !state.active || state.pointerId !== event.pointerId) return;

    const delta = event.clientX - state.startX;
    if (Math.abs(delta) > 6) state.dragged = true;
    el.scrollLeft = state.startScrollLeft - delta;
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    const state = drag.current;
    if (!el || !state.active || state.pointerId !== event.pointerId) return;

    drag.current.active = false;
    setIsDragging(false);
    try {
      el.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released if the pointer leaves the window.
    }
  };

  const suppressClickAfterDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!drag.current.dragged) return;
    event.preventDefault();
    event.stopPropagation();
    drag.current.dragged = false;
  };

  return (
    <div className="relative">
      {showArrows ? (
        <div className="mb-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => scrollByCards("left")}
            className="tap hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] shadow-[0_0_20px_rgba(0,0,0,0.2)] backdrop-blur transition hover:border-cyan-300/40 hover:bg-white/10 md:flex"
            aria-label="Scroll left"
          >
            <ChevronLeft size={19} className="text-white" />
          </button>

          <button
            type="button"
            onClick={() => scrollByCards("right")}
            className="tap hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] shadow-[0_0_20px_rgba(0,0,0,0.2)] backdrop-blur transition hover:border-cyan-300/40 hover:bg-white/10 md:flex"
            aria-label="Scroll right"
          >
            <ChevronRight size={19} className="text-white" />
          </button>
        </div>
      ) : null}

      <div className="relative">
        {showArrows ? (
          <>
            <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-8 bg-gradient-to-r from-black/60 to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-8 bg-gradient-to-l from-black/60 to-transparent" />
          </>
        ) : null}

        <div
          ref={ref}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClickCapture={suppressClickAfterDrag}
          className={`scrollbar-hide flex snap-x snap-mandatory gap-6 overflow-x-auto pb-3 pr-2 ${
            isDragging
              ? "cursor-grabbing select-none scroll-auto"
              : "cursor-grab scroll-smooth"
          }`}
        >
          {children}
        </div>
      </div>

      {showArrows ? (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-300 transition-[width] duration-200"
            style={{ width: `${Math.max(18, progress * 100)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
