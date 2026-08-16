"use client";

import { ChevronLeft, ChevronRight, MoveHorizontal } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export function MidiRowScroller({ children, itemCount }: { children: React.ReactNode; itemCount: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const drag = useRef({ active: false, dragged: false, pointerId: 0, startX: 0, startScrollLeft: 0 });
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const showControls = itemCount > 3;

  const updateProgress = useCallback(() => {
    const element = ref.current;
    if (!element || element.scrollWidth <= element.clientWidth) {
      setProgress(0);
      return;
    }
    setProgress(element.scrollLeft / (element.scrollWidth - element.clientWidth));
  }, []);

  useEffect(() => {
    const element = ref.current;
    const frame = window.requestAnimationFrame(updateProgress);
    if (!element) return () => window.cancelAnimationFrame(frame);
    element.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.cancelAnimationFrame(frame);
      element.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [itemCount, updateProgress]);

  const scroll = (direction: -1 | 1) => {
    const element = ref.current;
    if (!element) return;
    element.scrollBy({ left: direction * Math.max(320, element.clientWidth * 0.82), behavior: "smooth" });
  };

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const element = ref.current;
    if (!element || (event.pointerType === "mouse" && event.button !== 0)) return;
    if ((event.target as HTMLElement).closest("button, input, textarea, select")) return;
    drag.current = { active: true, dragged: false, pointerId: event.pointerId, startX: event.clientX, startScrollLeft: element.scrollLeft };
    element.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const element = ref.current;
    const state = drag.current;
    if (!element || !state.active || state.pointerId !== event.pointerId) return;
    const delta = event.clientX - state.startX;
    if (Math.abs(delta) > 6) state.dragged = true;
    element.scrollLeft = state.startScrollLeft - delta;
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const element = ref.current;
    if (!element || !drag.current.active || drag.current.pointerId !== event.pointerId) return;
    drag.current.active = false;
    setDragging(false);
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
  };

  return (
    <div className="gmm-midi-scroller">
      <div
        ref={ref}
        className={`gmm-midi-scroll-track ${dragging ? "is-dragging" : ""}`}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(event) => {
          if (!drag.current.dragged) return;
          event.preventDefault();
          event.stopPropagation();
          drag.current.dragged = false;
        }}
      >
        {children}
      </div>

      {showControls ? (
        <div className="gmm-scroller-controls">
          <span><MoveHorizontal size={14} /> Drag to browse</span>
          <div className="gmm-scroller-progress"><i style={{ transform: `scaleX(${Math.max(0.04, progress)})` }} /></div>
          <div>
            <button type="button" onClick={() => scroll(-1)} disabled={progress <= 0.01} aria-label="Scroll MIDI cards left"><ChevronLeft size={18} /></button>
            <button type="button" onClick={() => scroll(1)} disabled={progress >= 0.99} aria-label="Scroll MIDI cards right"><ChevronRight size={18} /></button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
