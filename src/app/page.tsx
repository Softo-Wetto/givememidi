// src/app/page.tsx
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { MidiCard } from "./components/MidiCard";
import { MidiRowScroller } from "./components/MidiRowScroller";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
    map.set(r.midi_id, { sum: prev.sum + (r.rating ?? 0), count: prev.count + 1 });
  }

  return map;
}

async function fetchTopRatedMidiIds(limit = 15, minRatings = 2) {
  const { data, error } = await supabase
    .from("midi_ratings")
    .select("midi_id, rating");

  if (error) {
    console.error("top rated ratings fetch error:", error);
    return [] as string[];
  }

  const map = new Map<string, { sum: number; count: number }>();

  for (const r of data ?? []) {
    const id = r.midi_id as string;
    const prev = map.get(id) ?? { sum: 0, count: 0 };
    map.set(id, { sum: prev.sum + (r.rating ?? 0), count: prev.count + 1 });
  }

  // sort by avg desc, then count desc
  const sorted = Array.from(map.entries())
    .map(([midiId, agg]) => ({ midiId, avg: agg.sum / agg.count, count: agg.count }))
    .filter((x) => x.count >= minRatings)
    .sort((a, b) => (b.avg - a.avg) || (b.count - a.count))
    .slice(0, limit)
    .map((x) => x.midiId);

  return sorted;
}

export default async function Home() {
  const topRatedIdsPromise = fetchTopRatedMidiIds(15, 2);

  const [
    { data: popularMidis },
    { data: latestMidis },
    { data: pdfMidis },
    topRatedIds,
  ] = await Promise.all([
    supabase.from("music_files").select("*").order("downloads", { ascending: false }).limit(15),
    supabase.from("music_files").select("*").order("created_at", { ascending: false }).limit(15),
    supabase.from("music_files").select("*").not("pdf_url", "is", null).order("created_at", { ascending: false }).limit(15),
    topRatedIdsPromise,
  ]);

  const { data: topRatedMidis, error: topRatedErr } =
    topRatedIds.length > 0
      ? await supabase
          .from("music_files")
          .select("*")
          .in("id", topRatedIds)
      : { data: [], error: null };

  if (topRatedErr) console.error("topRatedMidis fetch error:", topRatedErr);

  // keep order same as topRatedIds
  const topRatedOrdered =
    (topRatedMidis ?? []).slice().sort(
      (a: any, b: any) => topRatedIds.indexOf(a.id) - topRatedIds.indexOf(b.id)
    );

    // Build a unique list of IDs shown on the homepage (popular + latest + pdf)
    const allIds = Array.from(
      new Set([
        ...(popularMidis ?? []).map((m: any) => m.id),
        ...(latestMidis ?? []).map((m: any) => m.id),
        ...(pdfMidis ?? []).map((m: any) => m.id),
        ...(topRatedOrdered ?? []).map((m: any) => m.id),
      ])
    );

    const ratingMap = await fetchRatingAggForMidiIds(allIds);

    const getAvg = (id: string) => {
      const agg = ratingMap.get(id);
      if (!agg || agg.count === 0) return { avgRating: null, ratingCount: 0 };
      return { avgRating: agg.sum / agg.count, ratingCount: agg.count };
    };

  const hasPopular = (popularMidis?.length ?? 0) > 0;
  const hasLatest = (latestMidis?.length ?? 0) > 0;
  const hasPdf = (pdfMidis?.length ?? 0) > 0;
  const hasTopRated = (topRatedOrdered?.length ?? 0) > 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* subtle background glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute top-24 left-16 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute top-40 right-16 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-12 md:pt-28 md:pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300">
            🎵 MIDI + 📄 Sheet music • fast downloads • clean previews
          </div>

          <h1 className="mt-6 text-4xl md:text-6xl font-extrabold leading-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
              Download MIDI & Sheet Music
            </span>
          </h1>

          <p className="mt-4 text-gray-300/90 text-base md:text-lg max-w-2xl mx-auto">
            High-quality MIDI and PDF scores for composers, producers, and musicians.
            Find popular files, explore new uploads, and bookmark your favorites.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/midi"
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold
                         bg-gradient-to-r from-blue-500 to-indigo-500
                         hover:from-blue-400 hover:to-indigo-400
                         shadow-lg transition"
            >
              Browse all MIDI
            </Link>

            <Link
              href="/upload"
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold
                        border border-white/15 text-gray-200
                        hover:border-blue-400/60 hover:bg-white/5
                        transition"
            >
              Upload your MIDI
            </Link>
          </div>

          {/* quick stats (safe fallbacks) */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <Stat
              label="Popular picks"
              value={hasPopular ? `${popularMidis!.length} featured` : "—"}
            />
            <Stat
              label="New uploads"
              value={hasLatest ? `${latestMidis!.length} latest` : "—"}
            />
            <Stat
              label="Sheet music"
              value={hasPdf ? `${pdfMidis!.length} with PDF` : "—"}
            />
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="max-w-7xl mx-auto px-6 pb-24 space-y-14">
        {/* POPULAR */}
        <SectionHeader
          title="🔥 Popular MIDI Files"
          subtitle="The most downloaded files right now."
          href="/midi"
          linkLabel="View all"
        />
        {hasPopular ? (
        <MidiRowScroller itemCount={popularMidis!.length}>
          {popularMidis!.map((midi: any) => {
            const { avgRating, ratingCount } = getAvg(midi.id);

            return (
              <div
                key={midi.id}
                className="snap-start shrink-0 w-[280px] sm:w-[320px]"
              >
                <MidiCard
                  id={midi.id}
                  title={midi.title}
                  composer={midi.composer}
                  downloads={midi.downloads}
                  pdfUrl={midi.pdf_url || null}
                  avgRating={avgRating}
                  ratingCount={ratingCount}
                />
              </div>
            );
          })}
        </MidiRowScroller>
      ) : (
        <EmptyState
          title="No popular files yet"
          subtitle="Once people start downloading, your top files will show up here."
        />
      )}

        {/* LATEST */}
        <SectionHeader
          title="🆕 Latest Uploads"
          subtitle="Fresh uploads added recently."
          href="/midi"
          linkLabel="Browse latest"
        />
        {hasLatest ? (
          <MidiRowScroller itemCount={popularMidis!.length}>
            {latestMidis!.map((midi: any) => {
              const { avgRating, ratingCount } = getAvg(midi.id);

                    return (
                      <div
                        key={midi.id}
                        className="snap-start shrink-0 w-[280px] sm:w-[320px]"
                      >
                        <MidiCard
                          id={midi.id}
                          title={midi.title}
                          composer={midi.composer}
                          downloads={midi.downloads}
                          pdfUrl={midi.pdf_url || null}
                          avgRating={avgRating}
                          ratingCount={ratingCount}
                        />
                      </div>
                    );
                  })}
                </MidiRowScroller>
              ) : (
          <EmptyState
            title="No uploads yet"
            subtitle="Be the first to upload a MIDI file."
            ctaHref="/upload"
            ctaLabel="Upload MIDI"
          />
        )}

        {/* TOP RATED */}
        <SectionHeader
          title="🏆 Highest Rated"
          subtitle="Top-rated MIDI files (by average rating)."
          href="/midi"
          linkLabel="View all"
        />

        {hasTopRated ? (
          <MidiRowScroller itemCount={topRatedOrdered!.length}>
            {topRatedOrdered!.map((midi: any) => {
              const { avgRating, ratingCount } = getAvg(midi.id);

              return (
                <div key={midi.id} className="snap-start shrink-0 w-[280px] sm:w-[320px]">
                  <MidiCard
                    id={midi.id}
                    title={midi.title}
                    composer={midi.composer}
                    downloads={midi.downloads}
                    pdfUrl={midi.pdf_url || null}
                    avgRating={avgRating}
                    ratingCount={ratingCount}
                  />
                </div>
              );
            })}
          </MidiRowScroller>
        ) : (
          <EmptyState
            title="No rated files yet"
            subtitle="Once people start rating uploads, the top-rated files will show up here."
          />
        )}

        {/* SHEET MUSIC / PDF SECTION */}
        <SectionHeader
          title="📄 With Sheet Music (PDF)"
          subtitle="MIDI files that include downloadable sheet music."
          href="/midi"
          linkLabel="Explore PDFs"
        />
        {hasPdf ? (
          <MidiRowScroller itemCount={popularMidis!.length}>
            {pdfMidis!.map((midi: any) => {
              const { avgRating, ratingCount } = getAvg(midi.id);

                    return (
                      <div
                        key={midi.id}
                        className="snap-start shrink-0 w-[280px] sm:w-[320px]"
                      >
                        <MidiCard
                          id={midi.id}
                          title={midi.title}
                          composer={midi.composer}
                          downloads={midi.downloads}
                          pdfUrl={midi.pdf_url || null}
                          avgRating={avgRating}
                          ratingCount={ratingCount}
                        />
                      </div>
                    );
                  })}
                </MidiRowScroller>
              ) : (
          <EmptyState
            title="No PDFs uploaded yet"
            subtitle="Upload a sheet music PDF with your MIDI and it will appear here."
            ctaHref="/upload"
            ctaLabel="Upload MIDI + PDF"
          />
        )}

        {/* CTA STRIP */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold">Build your collection</h3>
            <p className="text-gray-300/80 mt-1">
              Upload MIDI (and optional PDF) or bookmark favorites to keep them handy.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Link
              href="/upload"
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold
                        bg-gradient-to-r from-blue-500 to-indigo-500
                        hover:from-blue-400 hover:to-indigo-400
                        shadow-lg transition text-center"
            >
              Upload
            </Link>
            <Link
              href="/bookmarks"
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold
                         border border-white/15 text-gray-200
                         hover:border-blue-400/60 hover:bg-white/5
                         transition text-center"
            >
              View bookmarks
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-left">
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  href,
  linkLabel,
}: {
  title: string;
  subtitle: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-gray-400">{subtitle}</p>
      </div>

      {href && linkLabel && (
        <Link
          href={href}
          className="text-sm font-semibold text-blue-300 hover:text-blue-200 transition self-start md:self-auto"
        >
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

function EmptyState({
  title,
  subtitle,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  subtitle: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const isUpload = ctaHref === "/upload";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-gray-400 mt-1">{subtitle}</p>

      {ctaHref && ctaLabel && (
        isUpload ? (
          <Link
            href="/upload"
            className="inline-flex mt-5 px-6 py-3 rounded-xl font-semibold
                       bg-gradient-to-r from-blue-500 to-indigo-500
                       hover:from-blue-400 hover:to-indigo-400
                       shadow-lg transition"
          >
            {ctaLabel}
          </Link>
        ) : (
          <Link
            href={ctaHref}
            className="inline-flex mt-5 px-6 py-3 rounded-xl font-semibold
                       bg-gradient-to-r from-blue-500 to-indigo-500
                       hover:from-blue-400 hover:to-indigo-400
                       shadow-lg transition"
          >
            {ctaLabel}
          </Link>
        )
      )}
    </div>
  );
}
