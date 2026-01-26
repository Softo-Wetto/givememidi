"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter, useSearchParams } from "next/navigation";
import { MidiCard } from "../components/MidiCard";
import { Search, SlidersHorizontal, ArrowUpDown, X, Loader } from "lucide-react";

type SortKey = "newest" | "downloads" | "title";
const PAGE_SIZE = 9;

type MidiRow = {
  id: string;
  title: string;
  composer: string | null;
  downloads: number | null;
  pdf_url: string | null;
  created_at?: string | null;
  genre?: string | null;
  bpm?: number | null;
};

type MidiWithRatings = MidiRow & {
  avgRating: number | null;
  ratingCount: number;
};

type RatingAgg = { sum: number; count: number };

export default function AllMidiClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Create supabase client ONLY on client side
  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  // URL -> state
  const initialSearch = searchParams.get("search") || "";
  const initialGenre = searchParams.get("genre") || "";
  const initialSort = (searchParams.get("sort") as SortKey) || "newest";

  const [midis, setMidis] = useState<MidiWithRatings[]>([]);
  const [genres, setGenres] = useState<string[]>([]);

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [genre, setGenre] = useState(initialGenre);
  const [sort, setSort] = useState<SortKey>(initialSort);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

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
      const prev = map.get((r as any).midi_id) ?? { sum: 0, count: 0 };
      map.set((r as any).midi_id, {
        sum: prev.sum + (((r as any).rating ?? 0) as number),
        count: prev.count + 1,
      });
    }
    return map;
  }

  function mergeRatings(rows: MidiRow[], ratingMap: Map<string, RatingAgg>): MidiWithRatings[] {
    return rows.map((m) => {
      const agg = ratingMap.get(m.id);
      const ratingCount = agg?.count ?? 0;
      const avgRating = ratingCount ? agg!.sum / ratingCount : null;
      return { ...m, avgRating, ratingCount };
    });
  }

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Sync state -> URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (genre) params.set("genre", genre);
    if (sort) params.set("sort", sort);

    const qs = params.toString();
    router.replace(qs ? `/midi?${qs}` : "/midi");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, genre, sort]);

  // Fetch genres once
  useEffect(() => {
    const fetchGenres = async () => {
      const { data, error } = await supabase
        .from("music_files")
        .select("genre")
        .not("genre", "is", null);

      if (!error && data) {
        const unique = Array.from(
          new Set(
            (data as any[])
              .map((r) => (r.genre || "").trim())
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b));
        setGenres(unique);
      }
    };
    fetchGenres();
  }, [supabase]);

  const applySort = (query: any) => {
    if (sort === "newest") return query.order("created_at", { ascending: false });
    if (sort === "downloads") return query.order("downloads", { ascending: false });
    return query.order("title", { ascending: true });
  };

  const buildQuery = () => {
    let query = supabase
      .from("music_files")
      .select("id,title,composer,downloads,pdf_url,created_at,genre,bpm");

    if (genre) query = query.eq("genre", genre);

    const q = debouncedSearch.trim();
    if (q) {
      query = query.or(`title.ilike.%${q}%,composer.ilike.%${q}%,genre.ilike.%${q}%`);
    }

    query = applySort(query);
    return query;
  };

  // Fetch first page
  useEffect(() => {
    const fetchFirstPage = async () => {
      setLoading(true);
      setHasMore(true);

      const { data, error } = await buildQuery().range(0, PAGE_SIZE - 1);

      if (error) {
        console.error("Fetch midis error:", error);
        setMidis([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as MidiRow[];
      const ids = rows.map((r) => r.id);
      const ratingMap = await fetchRatingAggForMidiIds(ids);
      const withRatings = mergeRatings(rows, ratingMap);

      setMidis(withRatings);
      setHasMore(rows.length === PAGE_SIZE);
      setLoading(false);
    };

    fetchFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genre, debouncedSearch, sort]);

  const fetchMore = async () => {
    if (loading || loadingMore || !hasMore) return;

    setLoadingMore(true);

    const from = midis.length;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await buildQuery().range(from, to);

    if (error) {
      console.error("Fetch more error:", error);
      setHasMore(false);
      setLoadingMore(false);
      return;
    }

    const rows = (data ?? []) as MidiRow[];
    const ids = rows.map((r) => r.id);
    const ratingMap = await fetchRatingAggForMidiIds(ids);
    const withRatings = mergeRatings(rows, ratingMap);

    setMidis((prev) => [...prev, ...withRatings]);
    setHasMore(rows.length === PAGE_SIZE);
    setLoadingMore(false);
  };

  // Infinite scroll observer
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchMore();
      },
      { rootMargin: "600px" }
    );

    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midis.length, hasMore, loading, loadingMore]);

  const resultsLabel = useMemo(() => {
    if (loading) return "Loading…";
    return `${midis.length} result${midis.length === 1 ? "" : "s"}`;
  }, [loading, midis.length]);

  const clearFilters = () => {
    setSearch("");
    setGenre("");
    setSort("newest");
  };

  const chips = useMemo(() => {
    const list: { key: string; label: string; onRemove: () => void }[] = [];
    if (search.trim()) {
      list.push({
        key: "search",
        label: `Search: "${search.trim()}"`,
        onRemove: () => setSearch(""),
      });
    }
    if (genre) {
      list.push({
        key: "genre",
        label: `Genre: ${genre}`,
        onRemove: () => setGenre(""),
      });
    }
    if (sort && sort !== "newest") {
      list.push({
        key: "sort",
        label: `Sort: ${sort === "downloads" ? "Most downloaded" : "Title A–Z"}`,
        onRemove: () => setSort("newest"),
      });
    }
    return list;
  }, [search, genre, sort]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">All MIDI Files</h1>
            <p className="text-gray-400 mt-2">
              Search by title, composer, or genre. Filter, sort, and scroll to load more.
            </p>
          </div>

          <div className="text-sm text-gray-400">
            <span className="px-3 py-2 rounded-xl bg-white/5 border border-white/10">
              {resultsLabel}
            </span>
          </div>
        </div>

        {/* Chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {chips.map((c) => (
              <button
                key={c.key}
                onClick={c.onRemove}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-full
                  bg-white/5 border border-white/10 text-sm text-gray-200
                  hover:bg-white/10 transition"
                title="Remove filter"
              >
                <span className="truncate max-w-[260px]">{c.label}</span>
                <X size={14} className="text-gray-400 group-hover:text-white" />
              </button>
            ))}

            <button
              onClick={clearFilters}
              className="px-3 py-1.5 rounded-full text-sm
                bg-gradient-to-r from-blue-500 to-indigo-500
                hover:from-blue-400 hover:to-indigo-400 font-semibold shadow-lg transition"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Filters (sticky) */}
        <div className="sticky top-[72px] z-40 mb-8">
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-xl">
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              {/* Search */}
              <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-blue-400">
                <Search size={16} className="text-gray-400" />
                <input
                  placeholder="Search title, composer, or genre…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent outline-none text-white placeholder:text-gray-500"
                />
                {search.trim() && (
                  <button
                    onClick={() => setSearch("")}
                    className="text-gray-400 hover:text-white"
                    title="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Genre */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <SlidersHorizontal size={16} className="text-gray-400" />
                <select
                  className="bg-transparent outline-none text-white w-full md:w-52"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                >
                  <option value="">All genres</option>
                  {genres.map((g) => (
                    <option key={g} value={g} className="text-black">
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <ArrowUpDown size={16} className="text-gray-400" />
                <select
                  className="bg-transparent outline-none text-white w-full md:w-48"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                >
                  <option value="newest" className="text-black">Newest</option>
                  <option value="downloads" className="text-black">Most downloaded</option>
                  <option value="title" className="text-black">Title (A–Z)</option>
                </select>
              </div>

              <button
                onClick={clearFilters}
                className="md:ml-auto px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/10 bg-white/5 p-4 animate-pulse"
              >
                <div className="h-48 rounded-lg bg-white/10 mb-4" />
                <div className="h-5 bg-white/10 rounded w-3/4 mb-2" />
                <div className="h-4 bg-white/10 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {!loading && midis.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
            <p className="text-xl font-semibold">No results</p>
            <p className="text-gray-400 mt-2">Try changing your search or filters.</p>
            <button
              onClick={clearFilters}
              className="mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 font-semibold shadow-lg transition"
            >
              Clear filters
            </button>
          </div>
        )}

        {!loading && midis.length > 0 && (
          <>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              {midis.map((midi) => (
                <MidiCard
                  key={midi.id}
                  id={midi.id}
                  title={midi.title}
                  composer={midi.composer || ""}
                  downloads={midi.downloads ?? 0}
                  pdfUrl={midi.pdf_url || null}
                  avgRating={midi.avgRating}
                  ratingCount={midi.ratingCount}
                />
              ))}
            </div>

            <div ref={sentinelRef} className="h-10" />

            {loadingMore && (
              <div className="flex items-center justify-center gap-2 text-gray-400 mt-8">
                <Loader className="animate-spin" size={18} />
                Loading more…
              </div>
            )}

            {!loadingMore && hasMore && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={fetchMore}
                  className="px-6 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                >
                  Load more
                </button>
              </div>
            )}

            {!hasMore && (
              <div className="text-center text-gray-500 mt-10">You’ve reached the end.</div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
