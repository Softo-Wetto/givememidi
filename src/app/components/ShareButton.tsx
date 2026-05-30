"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

export function ShareButton({
  label = "Share",
  text,
  url,
}: {
  label?: string;
  text?: string;
  url?: string;
}) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const targetUrl = url || window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title: text || document.title, url: targetUrl });
        return;
      }

      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      try {
        await navigator.clipboard.writeText(targetUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      } catch {
        alert("Could not copy link.");
      }
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="tap inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:bg-white/10"
    >
      {copied ? <Check size={16} className="text-emerald-300" /> : <Share2 size={16} className="text-cyan-300" />}
      {copied ? "Copied" : label}
      {!copied ? <Copy size={14} className="text-slate-500" /> : null}
    </button>
  );
}
