"use client";

import { createPocketBaseClient } from "@/lib/pocketbaseClient";
import { ArrowUpDown, LoaderCircle, Search, SlidersHorizontal, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { MidiCard } from "../components/MidiCard";

type SortKey = "newest" | "downloads" | "title";
const PAGE_SIZE = 9;

type MidiRow = {
  id: string;
  title: string;
  composer: string | null;
  description?: string | null;
  downloads: number | null;
  pdf_url: string | null;
  created_at?: string | null;
  genre?: string | null;
  bpm?: number | null;
};

type MidiWithRatings = MidiRow & { avgRating: number | null; ratingCount: number };
type RatingAgg = { sum: number; count: number };
type RatingRow = { midi_id: string; rating: number };

export default function AllMidiClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pocketbase = useMemo(() => createPocketBaseClient(), []);
  const [midis, setMidis] = useState<MidiWithRatings[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("search") || "");
  const [genre, setGenre] = useState(searchParams.get("genre") || "");
  const [sort, setSort] = useState<SortKey>((searchParams.get("sort") as SortKey) || "newest");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  async function ratingMap(ids: string[]) {
    if (!ids.length) return new Map<string, RatingAgg>();
    const { data, error } = await pocketbase.from("midi_ratings").select<RatingRow>("midi_id, rating").in("midi_id", ids);
    if (error) {
      console.error("ratings bulk fetch error:", error);
      return new Map<string, RatingAgg>();
    }
    const map = new Map<string, RatingAgg>();
    for (const row of data ?? []) {
      const current = map.get(row.midi_id) ?? { sum: 0, count: 0 };
      map.set(row.midi_id, { sum: current.sum + Number(row.rating ?? 0), count: current.count + 1 });
    }
    return map;
  }

  const mergeRatings = (rows: MidiRow[], map: Map<string, RatingAgg>): MidiWithRatings[] => rows.map((row) => {
    const rating = map.get(row.id);
    return { ...row, avgRating: rating?.count ? rating.sum / rating.count : null, ratingCount: rating?.count ?? 0 };
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (genre) params.set("genre", genre);
    if (sort !== "newest") params.set("sort", sort);
    const query = params.toString();
    router.replace(query ? `/midi?${query}` : "/midi");
  }, [genre, router, search, sort]);

  useEffect(() => {
    void pocketbase
      .from("music_files")
      .select<{ genre: string | null }>("genre")
      .not("genre", "is", null)
      .then(({ data, error }) => {
        if (error) return;
        const values = [...new Set((data ?? []).map((row) => row.genre?.trim()).filter((value): value is string => Boolean(value)))];
        setGenres(values.sort((a, b) => a.localeCompare(b)));
      });
  }, [pocketbase]);

  const buildQuery = () => {
    let query = pocketbase.from("music_files").select("id,title,composer,description,downloads,pdf_url,created_at,genre,bpm");
    if (genre) query = query.eq("genre", genre);
    const value = debouncedSearch.trim();
    if (value) query = query.or(`title.ilike.%${value}%,composer.ilike.%${value}%,description.ilike.%${value}%,genre.ilike.%${value}%`);
    if (sort === "downloads") return query.order("downloads", { ascending: false });
    if (sort === "title") return query.order("title", { ascending: true });
    return query.order("created_at", { ascending: false });
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setHasMore(true);
      const { data, error } = await buildQuery().range(0, PAGE_SIZE - 1);
      if (error) {
        console.error("Fetch MIDI error:", error);
        setMidis([]);
        setHasMore(false);
        setLoading(false);
        return;
      }
      const rows = (data ?? []) as MidiRow[];
      setMidis(mergeRatings(rows, await ratingMap(rows.map((row) => row.id))));
      setHasMore(rows.length === PAGE_SIZE);
      setLoading(false);
    };
    void load();
    // Query building intentionally follows these three filter values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, genre, sort]);

  const loadMore = async () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const { data, error } = await buildQuery().range(midis.length, midis.length + PAGE_SIZE - 1);
    if (error) {
      console.error("Fetch more MIDI error:", error);
      setHasMore(false);
      setLoadingMore(false);
      return;
    }
    const rows = (data ?? []) as MidiRow[];
    const rowsWithRatings = mergeRatings(rows, await ratingMap(rows.map((row) => row.id)));
    setMidis((current) => [...current, ...rowsWithRatings]);
    setHasMore(rows.length === PAGE_SIZE);
    setLoadingMore(false);
  };

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void loadMore();
    }, { rootMargin: "600px" });
    observer.observe(element);
    return () => observer.disconnect();
    // Observer refreshes when the current result boundary moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, loadingMore, midis.length]);

  const clearFilters = () => {
    setSearch("");
    setGenre("");
    setSort("newest");
  };

  const activeFilters = [
    search.trim() ? { key: "search", label: `Search / ${search.trim()}`, remove: () => setSearch("") } : null,
    genre ? { key: "genre", label: `Genre / ${genre}`, remove: () => setGenre("") } : null,
    sort !== "newest" ? { key: "sort", label: `Sort / ${sort === "downloads" ? "Most downloaded" : "Title A-Z"}`, remove: () => setSort("newest") } : null,
  ].filter((item): item is { key: string; label: string; remove: () => void } => Boolean(item));

  return (
    <main className="gmm-catalog">
      <section className="gmm-catalog-heading">
        <div className="gmm-shell">
          <div>
            <p className="gmm-kicker">Library index</p>
            <h1 className="gmm-section-title">All MIDI files</h1>
            <p>Search the full collection by title, composer, description, or genre.</p>
          </div>
          <div className="gmm-catalog-count"><strong>{loading ? "--" : midis.length}</strong><span>results loaded</span></div>
        </div>
      </section>

      {genres.length ? (
        <div className="gmm-catalog-genres">
          <div className="gmm-shell">
            <span>Quick genres</span>
            {genres.slice(0, 8).map((item) => <button key={item} type="button" data-active={genre === item} onClick={() => setGenre(genre === item ? "" : item)}>{item}</button>)}
          </div>
        </div>
      ) : null}

      <div className="gmm-catalog-toolbar-wrap">
        <div className="gmm-shell">
          <div className="gmm-catalog-toolbar">
            <label className="gmm-catalog-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the library" />{search ? <button type="button" onClick={() => setSearch("")} aria-label="Clear search"><X size={15} /></button> : null}</label>
            <label><SlidersHorizontal size={16} /><select value={genre} onChange={(event) => setGenre(event.target.value)}><option value="">All genres</option>{genres.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label><ArrowUpDown size={16} /><select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}><option value="newest">Newest</option><option value="downloads">Most downloaded</option><option value="title">Title A-Z</option></select></label>
            <button type="button" onClick={clearFilters}>Reset</button>
          </div>
          {activeFilters.length ? <div className="gmm-active-filters">{activeFilters.map((item) => <button key={item.key} type="button" onClick={item.remove}>{item.label}<X size={13} /></button>)}</div> : null}
        </div>
      </div>

      <section className="gmm-shell gmm-catalog-results">
        {loading ? (
          <div className="gmm-catalog-grid" aria-label="Loading MIDI files">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="gmm-catalog-skeleton"><i /><i /><i /></div>)}</div>
        ) : midis.length ? (
          <>
            <div className="gmm-catalog-grid">
              {midis.map((midi) => <MidiCard key={midi.id} id={midi.id} title={midi.title} composer={midi.composer} downloads={midi.downloads} pdfUrl={midi.pdf_url} genre={midi.genre} bpm={midi.bpm} avgRating={midi.avgRating} ratingCount={midi.ratingCount} createdAt={midi.created_at} />)}
            </div>
            <div ref={sentinelRef} className="h-8" />
            {loadingMore ? <p className="gmm-catalog-loading"><LoaderCircle size={17} className="animate-spin" /> Loading more</p> : null}
            {!loadingMore && hasMore ? <button type="button" className="gmm-catalog-more" onClick={() => void loadMore()}>Load more</button> : null}
            {!hasMore ? <p className="gmm-catalog-end">End of the current library.</p> : null}
          </>
        ) : (
          <div className="gmm-catalog-empty"><span>0 results</span><h2>Nothing matches that combination.</h2><p>Remove a filter or try a broader search term.</p><button type="button" onClick={clearFilters}>Clear filters</button></div>
        )}
      </section>
    </main>
  );
}
