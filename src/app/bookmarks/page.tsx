"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supbaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Loader,
  Bookmark,
  Search,
  Trash2,
  Music2,
  ArrowRight,
  Star,
} from "lucide-react";

type MidiRow = {
  id: string;
  title: string;
  composer: string | null;
  pdf_url?: string | null;
};

type BookmarkRow = {
  id: string;
  midi: MidiRow;
  created_at?: string;
};

type BookmarkDbRow = {
  id: string;
  created_at: string;
  music_files:
    | {
        id: string;
        title: string;
        composer: string | null;
        pdf_url: string | null;
      }
    | Array<{
        id: string;
        title: string;
        composer: string | null;
        pdf_url: string | null;
      }>
    | null;
};

type RatingAgg = { sum: number; count: number };

async function fetchRatingAggForMidiIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, RatingAgg>();

  const { data, error } = await supabase
    .from("midi_ratings")
    .select("midi_id, rating")
    .in("midi_id", ids);

  if (error) {
    console.error("ratings bulk fetch error:", error);
    return new Map<string, RatingAgg>();
  }

  const map = new Map<string, RatingAgg>();

  for (const r of data ?? []) {
    const prev = map.get(r.midi_id) ?? { sum: 0, count: 0 };
    map.set(r.midi_id, {
      sum: prev.sum + (r.rating ?? 0),
      count: prev.count + 1,
    });
  }

  return map;
}

function RatingDisplay({ avg, count }: { avg: number | null; count: number }) {
  // 5-star display, half-stars optional later; for now simple fill by rounding
  const filled = avg == null ? 0 : Math.round(avg);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={16}
            className={
              i < filled
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-600"
            }
          />
        ))}
      </div>

      <span className="text-xs text-gray-400">
        {avg == null ? "No ratings" : `${avg.toFixed(1)} (${count})`}
      </span>
    </div>
  );
}

export default function BookmarksPage() {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [ratingMap, setRatingMap] = useState<Map<string, RatingAgg>>(new Map());

  const getAvg = (id: string) => {
    const agg = ratingMap.get(id);
    if (!agg || agg.count === 0) return { avgRating: null as number | null, ratingCount: 0 };
    return { avgRating: agg.sum / agg.count, ratingCount: agg.count };
  };

  const fetchBookmarks = async () => {
    setLoading(true);

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) console.error("getUser error:", userErr);

    if (!userData?.user) {
      router.push("/login?redirect=/bookmarks");
      return;
    }

    const { data, error } = await supabase
      .from("bookmarks")
      .select(
        `
        id,
        created_at,
        music_files (
          id,
          title,
          composer,
          pdf_url
        )
      `
      )
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Bookmarks error:", error);
      setBookmarks([]);
      setRatingMap(new Map());
      setLoading(false);
      return;
    }

    const formatted: BookmarkRow[] = (data ?? [])
      .map((b: BookmarkDbRow) => {
        const mf = Array.isArray(b.music_files) ? b.music_files[0] : b.music_files;
        if (!mf) return null;
        return {
          id: b.id as string,
          created_at: b.created_at as string,
          midi: {
            id: mf.id,
            title: mf.title,
            composer: mf.composer ?? null,
            pdf_url: mf.pdf_url ?? null,
          },
        };
      })
      .filter(Boolean) as BookmarkRow[];

    setBookmarks(formatted);

    // ratings: bulk fetch for bookmarked midi ids
    const ids = formatted.map((b) => b.midi.id);
    const map = await fetchRatingAggForMidiIds(ids);
    setRatingMap(map);

    setLoading(false);
  };

  useEffect(() => {
    fetchBookmarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bookmarks;
    return bookmarks.filter((b) => {
      const t = (b.midi.title || "").toLowerCase();
      const c = (b.midi.composer || "").toLowerCase();
      return t.includes(q) || c.includes(q);
    });
  }, [bookmarks, query]);

  const removeBookmark = async (bookmarkId: string) => {
    setRemovingId(bookmarkId);
    const { error } = await supabase.from("bookmarks").delete().eq("id", bookmarkId);
    setRemovingId(null);

    if (error) {
      console.error("Remove bookmark error:", error);
      alert("Failed to remove bookmark");
      return;
    }

    // Optimistic UI
    setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
  };

  // keep ratingMap in sync if user removes bookmarks
const bookmarkIdsKey = useMemo(
  () => bookmarks.map((b) => b.midi.id).join("|"),
  [bookmarks]
);

useEffect(() => {
  const ids = bookmarks.map((b) => b.midi.id);
  fetchRatingAggForMidiIds(ids).then(setRatingMap);
}, [bookmarkIdsKey]);

  if (loading) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center text-gray-400">
        <div className="flex items-center gap-2">
          <Loader className="animate-spin" size={18} />
          Loading bookmarks...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
              <Bookmark className="text-blue-400" />
              Your Bookmarks
            </h1>
            <p className="text-gray-400 mt-2">
              Keep your favorite MIDI files here for quick access.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300">
              {bookmarks.length} saved
            </div>

            <Link
              href="/midi"
              className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl
                bg-white/5 border border-white/10 hover:bg-white/10 transition"
            >
              <Music2 size={16} className="text-gray-300 group-hover:text-white transition" />
              Browse MIDI
              <ArrowRight size={16} className="text-gray-400 group-hover:text-white transition" />
            </Link>
          </div>
        </div>

        {/* Search bar */}
        <div className="mb-8">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-blue-400">
            <Search size={16} className="text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your bookmarks (title or composer)…"
              className="w-full bg-transparent outline-none text-white placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Empty state */}
        {bookmarks.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
            <p className="text-xl font-semibold">No bookmarks yet</p>
            <p className="text-gray-400 mt-2">
              Start bookmarking your favorite MIDI files from the All MIDI page.
            </p>
            <Link
              href="/midi"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl
                bg-gradient-to-r from-blue-500 to-indigo-500
                hover:from-blue-400 hover:to-indigo-400 font-semibold shadow-lg transition"
            >
              Browse MIDI
              <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {/* No results */}
        {bookmarks.length > 0 && filtered.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-gray-300">
            No matches for{" "}
            <span className="font-semibold">&quot;{query.trim()}&quot;</span>
          </div>
        )}

        {/* Grid */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filtered.map((b) => {
              const { avgRating, ratingCount } = getAvg(b.midi.id);

              return (
                <Link
                  key={b.id}
                  href={`/midi/${b.midi.id}`}
                  className="group bg-white/5 border border-white/10 rounded-2xl p-4
                    hover:bg-white/10 hover:border-blue-400/40 transition shadow-lg
                    flex flex-col gap-3 relative overflow-hidden"
                >
                  {/* Thumbnail */}
                  <div className="w-full h-44 bg-white/10 rounded-xl flex items-center justify-center overflow-hidden">
                    {b.midi.pdf_url ? (
                      <Image
                        src="/sheet-music-placeholder.png"
                        alt="Sheet music available"
                        width={800}
                        height={600}
                        className="object-contain w-5/6 h-5/6"
                      />
                    ) : (
                      <div className="text-gray-400 text-sm font-medium">❌ No PDF</div>
                    )}
                  </div>

                  {/* Title + Composer */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg truncate">{b.midi.title}</h3>
                    <p className="text-sm text-gray-400 truncate">
                      {b.midi.composer || "Unknown Composer"}
                    </p>

                    {/* ⭐ Rating */}
                    <div className="mt-2">
                      <RatingDisplay avg={avgRating} count={ratingCount} />
                    </div>
                  </div>

                  {/* Badges + actions */}
                  <div className="flex items-center justify-between gap-3">
                    {b.midi.pdf_url ? (
                      <div className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs font-medium">
                        📄 PDF Available
                      </div>
                    ) : (
                      <div className="px-2 py-1 bg-gray-600/20 text-gray-400 rounded text-xs font-medium">
                        ❌ No PDF
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeBookmark(b.id);
                      }}
                      disabled={removingId === b.id}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl
                        border border-red-500/25 text-red-300
                        hover:bg-red-500/10 hover:text-red-200 transition
                        disabled:opacity-50"
                      title="Remove bookmark"
                    >
                      {removingId === b.id ? (
                        <Loader className="animate-spin" size={16} />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
