import { createPocketBaseClient } from "@/lib/pocketbaseClient";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Award,
  Bookmark,
  FileText,
  Flame,
  Music2,
  Search,
  Sparkles,
  Star,
  UploadCloud,
  Users,
} from "lucide-react";
import { MidiCard } from "./components/MidiCard";
import { MidiRowScroller } from "./components/MidiRowScroller";

export const dynamic = "force-dynamic";

const pocketbase = createPocketBaseClient();

type MidiRow = {
  id: string;
  title: string;
  composer?: string | null;
  downloads?: number | null;
  pdf_url?: string | null;
  genre?: string | null;
  bpm?: number | null;
};

type RatingAgg = { sum: number; count: number };

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
  for (const rating of data ?? []) {
    const midiId = (rating as any).midi_id as string;
    const prev = map.get(midiId) ?? { sum: 0, count: 0 };
    map.set(midiId, {
      sum: prev.sum + (((rating as any).rating ?? 0) as number),
      count: prev.count + 1,
    });
  }

  return map;
}

async function fetchTopRatedMidiIds(limit = 15, minRatings = 2) {
  const { data, error } = await pocketbase
    .from("midi_ratings")
    .select("midi_id, rating");

  if (error) {
    console.error("top rated ratings fetch error:", error);
    return [] as string[];
  }

  const map = new Map<string, RatingAgg>();
  for (const rating of data ?? []) {
    const midiId = (rating as any).midi_id as string;
    const prev = map.get(midiId) ?? { sum: 0, count: 0 };
    map.set(midiId, {
      sum: prev.sum + (((rating as any).rating ?? 0) as number),
      count: prev.count + 1,
    });
  }

  return Array.from(map.entries())
    .map(([midiId, agg]) => ({ midiId, avg: agg.sum / agg.count, count: agg.count }))
    .filter((item) => item.count >= minRatings)
    .sort((a, b) => b.avg - a.avg || b.count - a.count)
    .slice(0, limit)
    .map((item) => item.midiId);
}

function topGenresFrom(rows: MidiRow[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const genre = row.genre?.trim();
    if (!genre) continue;
    counts.set(genre, (counts.get(genre) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([genre, count]) => ({ genre, count }));
}

export default async function Home() {
  const topRatedIdsPromise = fetchTopRatedMidiIds(15, 2);

  const [
    { data: popularMidis },
    { data: latestMidis },
    { data: pdfMidis },
    topRatedIds,
  ] = await Promise.all([
    pocketbase.from("music_files").select("*").order("downloads", { ascending: false }).limit(15),
    pocketbase.from("music_files").select("*").order("created_at", { ascending: false }).limit(15),
    pocketbase.from("music_files").select("*").not("pdf_url", "is", null).order("created_at", { ascending: false }).limit(15),
    topRatedIdsPromise,
  ]);

  const { data: topRatedMidis, error: topRatedErr } =
    topRatedIds.length > 0
      ? await pocketbase.from("music_files").select("*").in("id", topRatedIds)
      : { data: [], error: null };

  if (topRatedErr) console.error("topRatedMidis fetch error:", topRatedErr);

  const topRatedOrdered = ((topRatedMidis ?? []) as MidiRow[]).slice().sort(
    (a, b) => topRatedIds.indexOf(a.id) - topRatedIds.indexOf(b.id)
  );

  const shownRows = [
    ...((popularMidis ?? []) as MidiRow[]),
    ...((latestMidis ?? []) as MidiRow[]),
    ...((pdfMidis ?? []) as MidiRow[]),
    ...topRatedOrdered,
  ];

  const allIds = Array.from(new Set(shownRows.map((midi) => midi.id)));
  const ratingMap = await fetchRatingAggForMidiIds(allIds);
  const topGenres = topGenresFrom(shownRows);

  const getAvg = (id: string) => {
    const agg = ratingMap.get(id);
    if (!agg || agg.count === 0) return { avgRating: null, ratingCount: 0 };
    return { avgRating: agg.sum / agg.count, ratingCount: agg.count };
  };

  const hasPopular = (popularMidis?.length ?? 0) > 0;
  const hasLatest = (latestMidis?.length ?? 0) > 0;
  const hasPdf = (pdfMidis?.length ?? 0) > 0;
  const hasTopRated = topRatedOrdered.length > 0;
  const totalDownloads = shownRows.reduce((sum, midi) => sum + (midi.downloads ?? 0), 0);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#111827_0%,#020617_42%,#000_100%)] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:52px_52px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 pb-14 pt-16 md:grid-cols-[1.05fr_0.95fr] md:pb-18 md:pt-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-blue-100 backdrop-blur">
              <Sparkles size={16} className="text-cyan-300" />
              MIDI, PDF scores, ratings, bookmarks, and creator discovery.
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.02] tracking-tight md:text-6xl">
              Find the MIDI that gets your idea moving.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
              Browse community uploads, preview arrangements, collect favorites, and share your own MIDI with optional sheet music.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/midi"
                className="btn-glow tap inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 px-6 py-3 font-bold shadow-lg shadow-blue-950/40 transition hover:brightness-110"
              >
                <Search size={18} />
                Browse MIDI
              </Link>
              <Link
                href="/upload"
                className="tap inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-3 font-bold text-gray-100 transition hover:border-cyan-300/40 hover:bg-white/[0.08]"
              >
                <UploadCloud size={18} />
                Upload a file
              </Link>
            </div>

            <div className="mt-8 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat label="Popular picks" value={hasPopular ? `${popularMidis!.length} featured` : "None yet"} />
              <Stat label="New uploads" value={hasLatest ? `${latestMidis!.length} latest` : "None yet"} />
              <Stat label="Sheet music" value={hasPdf ? `${pdfMidis!.length} with PDF` : "None yet"} />
            </div>

            {topGenres.length > 0 ? <FeaturedGenres genres={topGenres} /> : null}

            <div className="mt-7 grid max-w-2xl gap-3 sm:grid-cols-2">
              <MiniFeature
                icon={<Award size={17} />}
                title="Creator awards"
                text="Uploads, ratings, and downloads help creators build visible progress."
              />
              <MiniFeature
                icon={<Bookmark size={17} />}
                title="Personal library"
                text="Bookmark useful MIDI files and return to them without digging."
              />
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden rounded-[2rem] border border-white/10 bg-black/30 p-5 shadow-2xl shadow-blue-950/20 backdrop-blur">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(59,130,246,0.14),transparent_35%),linear-gradient(315deg,rgba(34,211,238,0.12),transparent_35%)]" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-sm text-slate-200">
                  <Music2 size={16} className="text-cyan-300" />
                  Live discovery
                </div>
                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-300/20">
                  Community powered
                </span>
              </div>

              <div className="mt-10 space-y-4">
                {((popularMidis ?? []) as MidiRow[]).slice(0, 4).map((midi, index) => (
                  <Link
                    key={midi.id}
                    href={`/midi/${midi.id}`}
                    className="card-lift flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur transition hover:border-cyan-300/35 hover:bg-white/[0.085]"
                    style={{ animationDelay: `${index * 90}ms` }}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-400/15 text-blue-100 ring-1 ring-blue-300/20">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-white">{midi.title}</p>
                      <p className="truncate text-sm text-slate-400">{midi.composer || "Unknown composer"}</p>
                    </div>
                    <ArrowRight size={18} className="text-slate-500" />
                  </Link>
                ))}
              </div>

              <div className="mt-8 h-24 overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex h-full items-end gap-1.5">
                  {Array.from({ length: 34 }).map((_, i) => (
                    <span
                      key={i}
                      className="motion-bar block flex-1 rounded-t bg-gradient-to-t from-blue-500/45 to-cyan-300/80"
                      style={{ height: `${24 + ((i * 23) % 62)}%`, animationDelay: `${i * 40}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pt-10">
        <div className="grid gap-4 lg:grid-cols-4">
          <DiscoveryTile
            icon={<Flame size={20} />}
            label="Popular"
            value={hasPopular ? `${popularMidis!.length} picks` : "Starting soon"}
            href="/midi?sort=downloads"
          />
          <DiscoveryTile
            icon={<Star size={20} />}
            label="Top rated"
            value={hasTopRated ? `${topRatedOrdered.length} favorites` : "Needs ratings"}
            href="/midi"
          />
          <DiscoveryTile
            icon={<FileText size={20} />}
            label="Sheet music"
            value={hasPdf ? `${pdfMidis!.length} PDFs` : "Upload PDFs"}
            href="/midi"
          />
          <DiscoveryTile
            icon={<Users size={20} />}
            label="Creators"
            value={totalDownloads > 0 ? `${totalDownloads} downloads` : "Join in"}
            href="/creators"
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-14 px-6 pb-24 pt-12">
        <div className="hover-shine rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/15 via-white/[0.045] to-cyan-300/10 p-6 shadow-xl shadow-black/20 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300/80">
                Creator rewards
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">
                Uploads should feel worth it.
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-slate-300">
                GiveMeMIDI highlights creator momentum through ratings, bookmarks, downloads, and upload progress, so contributors get more than a quiet file listing.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <RewardMetric label="Rate" value="Stars" />
              <RewardMetric label="Collect" value="Bookmarks" />
              <RewardMetric label="Share" value="Uploads" />
            </div>
          </div>
        </div>

        <MidiSection
          title="Popular MIDI files"
          subtitle="The most downloaded files right now."
          href="/midi?sort=downloads"
          linkLabel="View all"
          rows={(popularMidis ?? []) as MidiRow[]}
          getAvg={getAvg}
          emptyTitle="No popular files yet"
          emptySubtitle="Once people start downloading, your top files will show up here."
        />

        <MidiSection
          title="Latest uploads"
          subtitle="Fresh uploads added recently."
          href="/midi"
          linkLabel="Browse latest"
          rows={(latestMidis ?? []) as MidiRow[]}
          getAvg={getAvg}
          emptyTitle="No uploads yet"
          emptySubtitle="Be the first to upload a MIDI file."
          ctaHref="/upload"
          ctaLabel="Upload MIDI"
        />

        <MidiSection
          title="Highest rated"
          subtitle="Community favorites by average rating."
          href="/midi"
          linkLabel="View all"
          rows={topRatedOrdered}
          getAvg={getAvg}
          emptyTitle="No rated files yet"
          emptySubtitle="Once people start rating uploads, the top-rated files will show up here."
        />

        <MidiSection
          title="With sheet music"
          subtitle="MIDI files that include downloadable PDF sheet music."
          href="/midi"
          linkLabel="Explore PDFs"
          rows={(pdfMidis ?? []) as MidiRow[]}
          getAvg={getAvg}
          emptyTitle="No PDFs uploaded yet"
          emptySubtitle="Upload a sheet music PDF with your MIDI and it will appear here."
          ctaHref="/upload"
          ctaLabel="Upload MIDI + PDF"
        />

        <div className="hover-shine rounded-3xl border border-white/10 bg-white/[0.055] p-6 shadow-xl shadow-black/20 md:p-8">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h3 className="text-2xl font-black">Build your collection</h3>
              <p className="mt-2 max-w-2xl text-gray-300">
                Upload MIDI, attach optional sheet music, rate discoveries, and bookmark favorites to keep your creative reference library close.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
              <Link
                href="/upload"
                className="btn-glow tap inline-flex justify-center rounded-2xl bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 px-6 py-3 font-bold shadow-lg transition hover:brightness-110"
              >
                Upload
              </Link>
              <Link
                href="/bookmarks"
                className="tap inline-flex justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-3 font-bold text-gray-100 transition hover:border-cyan-300/40 hover:bg-white/[0.08]"
              >
                View bookmarks
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function MidiSection({
  title,
  subtitle,
  href,
  linkLabel,
  rows,
  getAvg,
  emptyTitle,
  emptySubtitle,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  subtitle: string;
  href: string;
  linkLabel: string;
  rows: MidiRow[];
  getAvg: (id: string) => { avgRating: number | null; ratingCount: number };
  emptyTitle: string;
  emptySubtitle: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <section className="space-y-5">
      <SectionHeader title={title} subtitle={subtitle} href={href} linkLabel={linkLabel} />
      {rows.length > 0 ? (
        <MidiRowScroller itemCount={rows.length}>
          {rows.map((midi) => {
            const { avgRating, ratingCount } = getAvg(midi.id);

            return (
              <div key={midi.id} className="snap-start shrink-0 w-[280px] sm:w-[320px]">
                <MidiCard
                  id={midi.id}
                  title={midi.title}
                  composer={midi.composer}
                  downloads={midi.downloads}
                  pdfUrl={midi.pdf_url || null}
                  genre={midi.genre}
                  bpm={midi.bpm}
                  avgRating={avgRating}
                  ratingCount={ratingCount}
                />
              </div>
            );
          })}
        </MidiRowScroller>
      ) : (
        <EmptyState title={emptyTitle} subtitle={emptySubtitle} ctaHref={ctaHref} ctaLabel={ctaLabel} />
      )}
    </section>
  );
}

function FeaturedGenres({ genres }: { genres: { genre: string; count: number }[] }) {
  return (
    <div className="mt-7">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Start with a genre</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {genres.map(({ genre, count }) => (
          <Link
            key={genre}
            href={`/midi?genre=${encodeURIComponent(genre)}`}
            className="tap rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-sm text-slate-200 transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
          >
            {genre} <span className="text-slate-500">{count}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function MiniFeature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-white">
        <span className="text-cyan-300">{icon}</span>
        {title}
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-400">{text}</p>
    </div>
  );
}

function DiscoveryTile({
  icon,
  label,
  value,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="hover-shine card-lift rounded-3xl border border-white/10 bg-white/[0.045] p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-400/10 text-cyan-200 ring-1 ring-blue-300/20">
          {icon}
        </span>
        <ArrowRight size={17} className="text-slate-500" />
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </Link>
  );
}

function RewardMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 font-black text-white">{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-lift rounded-2xl border border-white/10 bg-white/[0.055] px-5 py-4 text-left">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-bold text-white">{value}</p>
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
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-2xl font-black tracking-tight">{title}</h2>
        <p className="text-gray-400">{subtitle}</p>
      </div>

      <Link
        href={href}
        className="inline-flex items-center gap-1 self-start text-sm font-bold text-cyan-200 transition hover:text-white md:self-auto"
      >
        {linkLabel}
        <ArrowRight size={15} />
      </Link>
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
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-8 text-center">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1 text-gray-400">{subtitle}</p>

      {ctaHref && ctaLabel ? (
        <Link
          href={ctaHref}
          className="btn-glow mt-5 inline-flex rounded-2xl bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 px-6 py-3 font-bold shadow-lg transition hover:brightness-110"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}
