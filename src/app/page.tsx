import { createPocketBaseClient } from "@/lib/pocketbaseClient";
import { formatMetric } from "@/lib/editorial-ui";
import { ArrowRight, Bookmark, FileMusic, Headphones, Search, Sparkles, Upload, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AnimateIn } from "./components/AnimateIn";
import { EditorialHeading, EditorialSection } from "./components/EditorialSection";
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
  created_at?: string | null;
  duration_seconds?: number | string | null;
  duration?: number | string | null;
};

type RatingAgg = { sum: number; count: number };
type RatingRow = { midi_id: string; rating: number };

async function fetchRatings(ids: string[]) {
  if (!ids.length) return new Map<string, RatingAgg>();
  const { data, error } = await pocketbase.from("midi_ratings").select<RatingRow>("midi_id, rating").in("midi_id", ids);
  if (error) {
    console.error("ratings bulk fetch error:", error);
    return new Map<string, RatingAgg>();
  }

  const map = new Map<string, RatingAgg>();
  for (const row of data ?? []) {
    const midiId = String(row.midi_id);
    const current = map.get(midiId) ?? { sum: 0, count: 0 };
    map.set(midiId, { sum: current.sum + Number(row.rating ?? 0), count: current.count + 1 });
  }
  return map;
}

async function fetchTopRatedIds(limit = 15, minRatings = 2) {
  const { data, error } = await pocketbase.from("midi_ratings").select<RatingRow>("midi_id, rating");
  if (error) {
    console.error("top rated ratings fetch error:", error);
    return [] as string[];
  }

  const map = new Map<string, RatingAgg>();
  for (const row of data ?? []) {
    const midiId = String(row.midi_id);
    const current = map.get(midiId) ?? { sum: 0, count: 0 };
    map.set(midiId, { sum: current.sum + Number(row.rating ?? 0), count: current.count + 1 });
  }

  return [...map.entries()]
    .map(([id, rating]) => ({ id, average: rating.sum / rating.count, count: rating.count }))
    .filter((item) => item.count >= minRatings)
    .sort((a, b) => b.average - a.average || b.count - a.count)
    .slice(0, limit)
    .map((item) => item.id);
}

function collectGenres(rows: MidiRow[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const genre = row.genre?.trim();
    if (genre) counts.set(genre, (counts.get(genre) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
}

export default async function Home() {
  const [{ data: popular }, { data: latest }, { data: withPdf }, topRatedIds] = await Promise.all([
    pocketbase.from("music_files").select("*").order("downloads", { ascending: false }).limit(15),
    pocketbase.from("music_files").select("*").order("created_at", { ascending: false }).limit(15),
    pocketbase.from("music_files").select("*").not("pdf_url", "is", null).order("created_at", { ascending: false }).limit(15),
    fetchTopRatedIds(),
  ]);

  const { data: ratedRows, error: ratedError } = topRatedIds.length
    ? await pocketbase.from("music_files").select("*").in("id", topRatedIds)
    : { data: [], error: null };
  if (ratedError) console.error("top rated MIDI fetch error:", ratedError);

  const popularRows = (popular ?? []) as MidiRow[];
  const latestRows = (latest ?? []) as MidiRow[];
  const pdfRows = (withPdf ?? []) as MidiRow[];
  const topRatedRows = ((ratedRows ?? []) as MidiRow[]).sort((a, b) => topRatedIds.indexOf(a.id) - topRatedIds.indexOf(b.id));
  const allRows = [...popularRows, ...latestRows, ...pdfRows, ...topRatedRows];
  const uniqueRows = [...new Map(allRows.map((row) => [row.id, row])).values()];
  const ratings = await fetchRatings(uniqueRows.map((row) => row.id));
  const genres = collectGenres(uniqueRows);
  const totalDownloads = uniqueRows.reduce((sum, row) => sum + Number(row.downloads ?? 0), 0);
  const ratingCount = [...ratings.values()].reduce((sum, rating) => sum + rating.count, 0);

  const getRating = (id: string) => {
    const value = ratings.get(id);
    return value ? { avgRating: value.sum / value.count, ratingCount: value.count } : { avgRating: null, ratingCount: 0 };
  };

  const ticker = ["MIDI files", "Sheet music", "Creator ranks", "Community ratings", ...genres.map(([genre]) => genre)];

  return (
    <main className="gmm-home">
      <section className="gmm-home-hero">
        <Image
          src="/givememidi-editorial-hero.png"
          alt="Sheet music and a MIDI keyboard in a dark recording studio"
          fill
          priority
          sizes="100vw"
          className="gmm-home-hero-image"
        />
        <div className="gmm-home-hero-shade" />
        <div className="gmm-shell gmm-home-hero-content">
          <AnimateIn direction="up">
            <p className="gmm-kicker">Community MIDI library / 2026</p>
            <h1 className="gmm-display">Find your next <span>MIDI.</span></h1>
            <p className="gmm-home-intro">
              Discover arrangements, preview the music, collect the keepers, and share work that deserves to be played.
            </p>
            <div className="gmm-home-actions">
              <Link href="/midi" className="gmm-button-primary"><Search size={17} /> Explore library</Link>
              <Link href="/upload" className="gmm-button-secondary"><Upload size={17} /> Upload a file</Link>
            </div>
          </AnimateIn>

          <div className="gmm-hero-index">
            <span>01</span>
            <p>Built for listeners, arrangers, performers, and the unfinished idea waiting in your DAW.</p>
          </div>
        </div>
      </section>

      <div className="gmm-ticker" aria-label="GiveMeMIDI features">
        <div className="gmm-ticker-track">
          {[...ticker, ...ticker].map((item, index) => <span className="gmm-ticker-item" key={`${item}-${index}`}>{item}</span>)}
        </div>
      </div>

      <section className="gmm-metric-strip">
        <div className="gmm-shell">
          <HomeMetric index="01" label="Library snapshot" value={formatMetric(uniqueRows.length)} detail="featured files" />
          <HomeMetric index="02" label="Sheet music" value={formatMetric(pdfRows.length)} detail="PDF arrangements" />
          <HomeMetric index="03" label="Community reach" value={formatMetric(totalDownloads)} detail="downloads" />
          <HomeMetric index="04" label="Listener signal" value={formatMetric(ratingCount)} detail="ratings" />
        </div>
      </section>

      <EditorialSection className="gmm-discovery-band" tone="raised">
        <EditorialHeading
          eyebrow="Start somewhere"
          title="The library has range."
          description="Move through the strongest signals in the collection, or begin with the style already in your head."
        />
        <div className="gmm-discovery-grid">
          <DiscoveryLink index="01" href="/midi?sort=downloads" icon={<Headphones size={18} />} title="Most played" detail={`${popularRows.length} current picks`} />
          <DiscoveryLink index="02" href="/midi" icon={<Sparkles size={18} />} title="Fresh uploads" detail={`${latestRows.length} new arrivals`} />
          <DiscoveryLink index="03" href="/creators" icon={<Users size={18} />} title="Creators" detail="Meet the contributors" />
          <DiscoveryLink index="04" href="/bookmarks" icon={<Bookmark size={18} />} title="Your collection" detail="Return to saved work" />
        </div>
        {genres.length ? (
          <div className="gmm-genre-index">
            <span>Browse by genre</span>
            <div>{genres.map(([genre, count]) => <Link key={genre} href={`/midi?genre=${encodeURIComponent(genre)}`}>{genre}<small>{count}</small></Link>)}</div>
          </div>
        ) : null}
      </EditorialSection>

      <CollectionSection eyebrow="Trending now" title="Popular MIDI" description="The files listeners are taking with them." href="/midi?sort=downloads" rows={popularRows} getRating={getRating} />
      <CollectionSection eyebrow="Just landed" title="Latest uploads" description="New arrangements from across the community." href="/midi" rows={latestRows} getRating={getRating} tone="raised" />

      <section className="gmm-creator-band">
        <div className="gmm-shell">
          <p className="gmm-kicker">Creator rewards</p>
          <div className="gmm-creator-statement">
            <h2>Uploads should earn more than a quiet listing.</h2>
            <div>
              <p>Build rank through uploads, ratings, bookmarks, and real listener activity. Your contribution stays visible.</p>
              <Link href="/awards">See how ranks work <ArrowRight size={16} /></Link>
            </div>
          </div>
          <div className="gmm-reward-steps">
            <span><strong>01</strong> Share</span><span><strong>02</strong> Get heard</span><span><strong>03</strong> Build rank</span>
          </div>
        </div>
      </section>

      <CollectionSection eyebrow="Community signal" title="Highest rated" description="Arrangements backed by repeat listener approval." href="/midi" rows={topRatedRows} getRating={getRating} />
      <CollectionSection eyebrow="Read and play" title="With sheet music" description="MIDI files paired with downloadable PDF scores." href="/midi" rows={pdfRows} getRating={getRating} tone="raised" />

      <EditorialSection className="gmm-home-final" tone="accent">
        <div>
          <p className="gmm-kicker">Your move</p>
          <h2>Open the library. Find the part you were missing.</h2>
        </div>
        <div className="gmm-home-final-actions">
          <Link href="/midi">Browse every MIDI <ArrowRight size={17} /></Link>
          <Link href="/upload"><FileMusic size={17} /> Add your own</Link>
        </div>
      </EditorialSection>
    </main>
  );
}

function HomeMetric({ index, label, value, detail }: { index: string; label: string; value: string; detail: string }) {
  return <div><span>{index}</span><p>{label}</p><strong>{value}</strong><small>{detail}</small></div>;
}

function DiscoveryLink({ index, href, icon, title, detail }: { index: string; href: string; icon: React.ReactNode; title: string; detail: string }) {
  return <Link href={href}><span>{index}</span><i>{icon}</i><strong>{title}</strong><small>{detail}</small><ArrowRight size={17} /></Link>;
}

function CollectionSection({ eyebrow, title, description, href, rows, getRating, tone = "base" }: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  rows: MidiRow[];
  getRating: (id: string) => { avgRating: number | null; ratingCount: number };
  tone?: "base" | "raised";
}) {
  return (
    <EditorialSection className="gmm-collection-band" tone={tone}>
      <AnimateIn direction="up">
        <EditorialHeading
          eyebrow={eyebrow}
          title={title}
          description={description}
          action={<Link href={href} className="gmm-section-link">View all <ArrowRight size={15} /></Link>}
        />
      </AnimateIn>
      {rows.length ? (
        <MidiRowScroller itemCount={rows.length}>
          {rows.map((midi) => {
            const rating = getRating(midi.id);
            return (
              <div key={midi.id} className="w-[280px] shrink-0 snap-start sm:w-[320px]">
                <MidiCard
                  id={midi.id}
                  title={midi.title}
                  composer={midi.composer}
                  downloads={midi.downloads}
                  pdfUrl={midi.pdf_url || null}
                  genre={midi.genre}
                  bpm={midi.bpm}
                  avgRating={rating.avgRating}
                  ratingCount={rating.ratingCount}
                  createdAt={midi.created_at}
                  durationSeconds={midi.duration_seconds ?? midi.duration}
                />
              </div>
            );
          })}
        </MidiRowScroller>
      ) : (
        <div className="gmm-empty-line"><span>No files here yet.</span><Link href="/upload">Upload the first one <ArrowRight size={15} /></Link></div>
      )}
    </EditorialSection>
  );
}
