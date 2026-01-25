"use client";

import { useState } from "react";
import { FileText } from "lucide-react";

export function PdfPreview({ url }: { url?: string | null }) {
  const [loaded, setLoaded] = useState(false);

  if (!url) {
    return (
      <div className="h-[600px] flex flex-col items-center justify-center gap-2
        bg-white/5 border border-white/10 rounded-xl text-gray-400"
      >
        <FileText size={32} />
        <span>No sheet music preview available</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[600px] rounded-xl overflow-hidden
      border border-white/10 bg-white shadow-xl"
    >
      {/* Loading overlay */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center
          bg-black/20 backdrop-blur-sm z-10 text-gray-300"
        >
          Loading sheet music…
        </div>
      )}

      {/* PDF iframe */}
      <iframe
        src={`${url}#page=1&zoom=90&view=FitH`}
        className="w-full h-full"
        onLoad={() => setLoaded(true)}
      />

      {/* Top gradient fade (nice polish) */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-12
        bg-gradient-to-b from-black/10 to-transparent"
      />
    </div>
  );
}
