"use client";

import Link from "next/link";
import { BookmarkButton } from "./BookmarkButton";
import { Star } from "lucide-react";

type MidiCardProps = {
  id: string;
  title: string;
  composer: string;
  downloads: number;
  pdfUrl?: string | null;
  avgRating?: number | null;
  ratingCount?: number | null;
};

export function MidiCard({
  id,
  title,
  composer,
  downloads,
  pdfUrl,
  avgRating,
  ratingCount,
}: MidiCardProps) {
  const hasRatings = (ratingCount ?? 0) > 0;

  return (
    <div className="relative w-full bg-white/5 rounded-xl shadow-lg hover:bg-white/10 transition">
      {/* Bookmark (top-right) */}
      <div
        className="absolute top-3 right-3 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <BookmarkButton midiId={id} />
      </div>

      <Link
        href={`/midi/${id}`}
        className="block p-4 flex flex-col items-center gap-3"
      >
        {/* Thumbnail */}
        <div className="w-full h-48 flex items-center justify-center bg-white/10 rounded-lg overflow-hidden">
          {pdfUrl ? (
            <img
              src="/sheet-music-placeholder.png"
              alt="Sheet Music Available"
              className="object-contain w-5/6 h-5/6"
            />
          ) : (
            <div className="text-gray-400 text-sm font-medium">❌ No Preview</div>
          )}
        </div>

        <h3 className="font-semibold text-lg text-center">{title}</h3>

        <p className="text-sm text-gray-400 text-center">
          {composer || "Unknown"}
        </p>

        {/* NEW: Rating row */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Star
            size={14}
            className={
              hasRatings ? "text-yellow-300 fill-yellow-300" : "text-gray-600"
            }
          />
          {hasRatings ? (
            <>
              <span className="font-semibold text-gray-200">
                {avgRating!.toFixed(1)}
              </span>
              <span className="text-gray-600">•</span>
              <span>{ratingCount} rating{ratingCount === 1 ? "" : "s"}</span>
            </>
          ) : (
            <span>No ratings yet</span>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-1">⬇ {downloads} downloads</p>

        {pdfUrl ? (
          <div className="mt-2 px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs">
            📄 PDF Available
          </div>
        ) : (
          <div className="mt-2 px-2 py-1 bg-gray-600/20 text-gray-400 rounded text-xs">
            ❌ No PDF
          </div>
        )}
      </Link>
    </div>
  );
}
