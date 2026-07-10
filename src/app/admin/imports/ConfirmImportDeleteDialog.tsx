"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";

type ConfirmImportDeleteDialogProps = {
  open: boolean;
  count: number;
  containsImported: boolean;
  busy: boolean;
  label: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmImportDeleteDialog({
  open,
  count,
  containsImported,
  busy,
  label,
  onCancel,
  onConfirm,
}: ConfirmImportDeleteDialogProps) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-import-title"
        aria-describedby="delete-import-description"
        className="w-full max-w-md rounded-lg border border-white/10 bg-slate-950 p-5 shadow-2xl shadow-black/60"
      >
        <div className="flex items-start justify-between gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-300/20 bg-red-300/10 text-red-200">
            <AlertTriangle size={19} />
          </span>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Close confirmation"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
          >
            <X size={17} />
          </button>
        </div>

        <h2 id="delete-import-title" className="mt-4 text-xl font-bold text-white">
          Delete {label}?
        </h2>
        <p id="delete-import-description" className="mt-2 text-sm leading-6 text-slate-400">
          This will permanently remove {count} queue {count === 1 ? "record" : "records"}.
          This action cannot be undone.
        </p>

        {containsImported ? (
          <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/10 px-3 py-2.5 text-sm leading-6 text-amber-100">
            Published MIDI files will remain in the library. Only this import history will be removed.
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex min-w-28 items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-400 disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
