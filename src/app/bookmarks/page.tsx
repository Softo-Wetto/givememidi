"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { pocketbase } from "../../lib/pocketbaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  Copy,
  Download,
  FileText,
  Filter,
  Library,
  Loader,
  Music2,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";

type MidiRow = {
  id: string;
  title: string;
  composer: string | null;
  pdf_url?: string | null;
  genre?: string | null;
  downloads?: number | null;
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
        genre: string | null;
        downloads: number | null;
      }
    | Array<{
        id: string;
        title: string;
        composer: string | null;
        pdf_url: string | null;
        genre: string | null;
        downloads: number | null;
      }>
    | null;
};

type RatingAgg = { sum: number; count: number };
type SortKey = "recent" | "title" | "composer" | "rating" | "downloads";
type FilterKey = "all" | "pdf" | "rated";

async function fetchRatingAggForMidiIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, RatingAgg>();

  const { data, error } = await pocketbase
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

function ratingFor(map: Map<string, RatingAgg>, id: string) {
  const agg = map.get(id);
  if (!agg || agg.count === 0) return { avg: null as number | null, count: 0 };
  return { avg: agg.sum / agg.count, count: agg.count };
}

function RatingDisplay({ avg, count }: { avg: number | null; count: number }) {
  const filled = avg == null ? 0 : Math.round(avg);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={15}
            className={i < filled ? "fill-yellow-300 text-yellow-300" : "text-slate-700"}
          />
        ))}
      </div>
      <span className="text-xs text-slate-400">
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
  const [sort, setSort] = useState<SortKey>("recent");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const [ratingMap, setRatingMap] = useState<Map<string, RatingAgg>>(new Map());

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);

    const { data: userData, error: userErr } = await pocketbase.auth.getUser();
    if (userErr) console.error("getUser error:", userErr);

    if (!userData?.user) {
      router.push("/login?redirect=/bookmarks");
      return;
    }

    const { data, error } = await pocketbase
      .from("bookmarks")
      .select<BookmarkDbRow>(
        `
        id,
        created_at,
        music_files (
          id,
          title,
          composer,
          pdf_url,
          genre,
          downloads
        )
      `,
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
          id: b.id,
          created_at: b.created_at,
          midi: {
            id: mf.id,
            title: mf.title,
            composer: mf.composer ?? null,
            pdf_url: mf.pdf_url ?? null,
            genre: mf.genre ?? null,
            downloads: mf.downloads ?? 0,
          },
        };
      })
      .filter(Boolean) as BookmarkRow[];

    setBookmarks(formatted);
    setRatingMap(await fetchRatingAggForMidiIds(formatted.map((b) => b.midi.id)));
    setLoading(false);
  }, [router]);

  useEffect(() => {
    // Bookmarks are user-specific client data, so this page hydrates then loads them.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBookmarks();
  }, [fetchBookmarks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return bookmarks
      .filter((b) => {
        const rating = ratingFor(ratingMap, b.midi.id);
        if (filter === "pdf" && !b.midi.pdf_url) return false;
        if (filter === "rated" && rating.count === 0) return false;
        if (!q) return true;
        return [b.midi.title, b.midi.composer, b.midi.genre]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        if (sort === "title") return a.midi.title.localeCompare(b.midi.title);
        if (sort === "composer") return (a.midi.composer || "").localeCompare(b.midi.composer || "");
        if (sort === "rating") {
          return (ratingFor(ratingMap, b.midi.id).avg ?? -1) - (ratingFor(ratingMap, a.midi.id).avg ?? -1);
        }
        if (sort === "downloads") return (b.midi.downloads ?? 0) - (a.midi.downloads ?? 0);
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
  }, [bookmarks, filter, query, ratingMap, sort]);

  const stats = useMemo(() => {
    const pdfCount = bookmarks.filter((b) => b.midi.pdf_url).length;
    const totalDownloads = bookmarks.reduce((sum, b) => sum + (b.midi.downloads ?? 0), 0);
    const rated = bookmarks
      .map((b) => ratingFor(ratingMap, b.midi.id))
      .filter((r) => r.avg !== null);
    const avgRating =
      rated.length > 0
        ? rated.reduce((sum, r) => sum + (r.avg ?? 0), 0) / rated.length
        : null;

    return { pdfCount, totalDownloads, avgRating };
  }, [bookmarks, ratingMap]);

  const removeBookmark = async (bookmarkId: string) => {
    setRemovingId(bookmarkId);
    const target = bookmarks.find((b) => b.id === bookmarkId);
    const { error } = await pocketbase.from("bookmarks").delete().eq("id", bookmarkId);
    setRemovingId(null);

    if (error) {
      console.error("Remove bookmark error:", error);
      alert("Failed to remove bookmark");
      return;
    }

    setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
    if (target) {
      setRatingMap((prev) => {
        const next = new Map(prev);
        next.delete(target.midi.id);
        return next;
      });
    }
  };

  const copyBookmarkList = async () => {
    const text = filtered
      .map((b) => {
        const composer = b.midi.composer ? ` by ${b.midi.composer}` : "";
        return `${b.midi.title}${composer} - /midi/${b.midi.id}`;
      })
      .join("\n");

    try {
      await navigator.clipboard.writeText(text || "No bookmarks");
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    } catch {
      setCopyStatus("error");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    }
  };

  if (loading) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
          <Loader className="animate-spin text-cyan-200" size={18} />
          Loading bookmarks...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#111827_0%,#020617_42%,#000_100%)] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-72 w-[900px] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-10">
        <section className="hover-shine overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/30 md:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100">
                <Bookmark size={16} />
                Saved library
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tight md:text-6xl">
                Your MIDI vault
              </h1>
              <p className="mt-3 text-base leading-7 text-slate-400">
                Keep favorite arrangements, sheet music, and high-rated finds in one clean workspace.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
              <StatCard label="Saved" value={String(bookmarks.length)} icon={<Library size={18} />} />
              <StatCard label="With PDF" value={String(stats.pdfCount)} icon={<FileText size={18} />} />
              <StatCard label="Downloads" value={compactNumber(stats.totalDownloads)} icon={<Download size={18} />} />
              <StatCard label="Avg rating" value={stats.avgRating ? stats.avgRating.toFixed(1) : "-"} icon={<Star size={18} />} />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 focus-within:border-cyan-300/40 focus-within:ring-2 focus-within:ring-cyan-300/15">
            <Search size={17} className="text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, composer, or genre..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="rounded-full p-1 text-slate-500 transition hover:bg-white/10 hover:text-white"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            ) : null}
          </label>

          <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-300">
            <Filter size={16} className="text-cyan-200" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterKey)}
              className="w-full bg-transparent text-white outline-none"
            >
              <option value="all">All saved</option>
              <option value="pdf">PDF only</option>
              <option value="rated">Rated</option>
            </select>
          </label>

          <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-300">
            <SlidersHorizontal size={16} className="text-cyan-200" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="w-full bg-transparent text-white outline-none"
            >
              <option value="recent">Recently saved</option>
              <option value="title">Title A-Z</option>
              <option value="composer">Composer A-Z</option>
              <option value="rating">Top rated</option>
              <option value="downloads">Most downloaded</option>
            </select>
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={copyBookmarkList}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/30 hover:text-white lg:flex-none"
            >
              <Copy size={16} />
              {copyStatus === "copied" ? "Copied" : copyStatus === "error" ? "Copy failed" : "Copy list"}
            </button>

            <Link
              href="/midi"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:from-blue-400 hover:to-indigo-400 lg:flex-none"
            >
              <Music2 size={16} />
              Browse
            </Link>
          </div>
        </section>

        {bookmarks.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.045] p-10 text-center text-slate-300">
            <p className="text-lg font-bold text-white">No matches found</p>
            <p className="mt-2 text-sm text-slate-400">
              Try a different search or clear your filters.
            </p>
          </div>
        ) : (
          <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((bookmark) => {
              const rating = ratingFor(ratingMap, bookmark.midi.id);

              return (
                <article
                  key={bookmark.id}
                  className="card-lift group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.055] shadow-xl shadow-black/20 transition hover:border-cyan-300/35 hover:bg-white/[0.08]"
                >
                  <div className="relative h-44 overflow-hidden border-b border-white/10 bg-[linear-gradient(135deg,#0f172a,#111827_48%,#020617)]">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
                    <div className="absolute left-5 top-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
                      <Music2 size={22} />
                    </div>
                    <div className="absolute bottom-5 left-5 right-5">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-semibold text-slate-200 backdrop-blur">
                        {bookmark.midi.pdf_url ? <FileText size={13} /> : <Sparkles size={13} />}
                        {bookmark.midi.pdf_url ? "Sheet music saved" : "MIDI only"}
                      </div>
                    </div>
                    <div className="absolute right-5 top-5 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-right backdrop-blur">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Downloads</p>
                      <p className="text-sm font-black text-white">{compactNumber(bookmark.midi.downloads ?? 0)}</p>
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    <div>
                      <Link
                        href={`/midi/${bookmark.midi.id}`}
                        className="line-clamp-1 text-xl font-black text-white transition hover:text-cyan-200"
                      >
                        {bookmark.midi.title}
                      </Link>
                      <p className="mt-1 line-clamp-1 text-sm text-slate-400">
                        {bookmark.midi.composer || "Unknown Composer"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      {bookmark.midi.genre ? (
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                          {bookmark.midi.genre}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                        <CalendarDays size={12} />
                        {formatSavedAt(bookmark.created_at)}
                      </span>
                    </div>

                    <RatingDisplay avg={rating.avg} count={rating.count} />

                    <div className="flex items-center gap-3 pt-1">
                      <Link
                        href={`/midi/${bookmark.midi.id}`}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-cyan-300/30 hover:text-white"
                      >
                        Open details
                        <ArrowRight size={15} />
                      </Link>

                      <button
                        type="button"
                        onClick={() => removeBookmark(bookmark.id)}
                        disabled={removingId === bookmark.id}
                        className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/10 text-red-200 transition hover:bg-red-400/15 disabled:opacity-50"
                        title="Remove bookmark"
                        aria-label={`Remove ${bookmark.midi.title} from bookmarks`}
                      >
                        {removingId === bookmark.id ? (
                          <Loader className="animate-spin" size={17} />
                        ) : (
                          <Trash2 size={17} />
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3 inline-flex rounded-xl border border-cyan-300/15 bg-cyan-300/10 p-2 text-cyan-100">
        {icon}
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] p-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
        <Bookmark size={28} />
      </div>
      <p className="mt-5 text-2xl font-black">No bookmarks yet</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
        Save favorites from the MIDI library and they will appear here with ratings, PDFs, and quick actions.
      </p>
      <Link
        href="/midi"
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-3 font-bold text-white shadow-lg transition hover:from-blue-400 hover:to-indigo-400"
      >
        Browse MIDI
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(value);
}

function formatSavedAt(iso?: string | null) {
  if (!iso) return "Saved";
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}
