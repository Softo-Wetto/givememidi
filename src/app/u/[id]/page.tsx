// src/app/u/[id]/page.tsx
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import FollowButton from "./FollowButton";
import { MidiCard } from "../../components/MidiCard";
import { MidiRowScroller } from "../../components/MidiRowScroller";
import { Star, TrendingUp, Music2, Users } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Props = { params: { id: string } | Promise<{ id: string }> };
type RatingAgg = { sum: number; count: number };

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-AU", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

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

function badgeList(args: {
  uploads: number;
  totalDownloads: number;
  avgRating: number | null;
  totalRatings: number;
  followers: number;
}) {
  const { uploads, totalDownloads, avgRating, totalRatings, followers } = args;

  const badges: { label: string; hint: string }[] = [];

  if (followers >= 25) badges.push({ label: "Rising Creator", hint: "25+ followers" });
  if (uploads >= 10) badges.push({ label: "Prolific Uploader", hint: "10+ uploads" });
  if (totalDownloads >= 250) badges.push({ label: "Trending", hint: "250+ total downloads" });
  if (avgRating !== null && totalRatings >= 5 && avgRating >= 4.5)
    badges.push({ label: "Top Rated", hint: "4.5+ avg (5+ ratings)" });

  if (badges.length === 0) badges.push({ label: "New Creator", hint: "Just getting started" });

  return badges.slice(0, 4);
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
        {icon}
      </div>
      <div className="leading-tight">
        <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
        <p className="text-lg font-semibold text-white">{value}</p>
      </div>
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

export default async function PublicProfilePage({ params }: Props) {
  const { id } = await Promise.resolve(params);

  // profile
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("id, username, bio, avatar_url, created_at")
    .eq("id", id)
    .maybeSingle();

  if (profErr) console.error("profile fetch error:", profErr);
  if (!profile) return notFound();

  // follower/following counts
  const [
    { count: followersCount },
    { count: followingCount },
    { data: uploads, error: upErr },
  ] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", id),
    supabase
      .from("music_files")
      .select("*")
      .eq("uploaded_by", id)
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  if (upErr) console.error("uploads fetch error:", upErr);

  const uploadIds = (uploads ?? []).map((m: any) => m.id);
  const ratingMap = await fetchRatingAggForMidiIds(uploadIds);

  const getAgg = (midiId: string) => {
    const agg = ratingMap.get(midiId);
    if (!agg || agg.count === 0) return { avgRating: null as number | null, ratingCount: 0 };
    return { avgRating: agg.sum / agg.count, ratingCount: agg.count };
  };

  // Summary stats
  const totalUploads = uploads?.length ?? 0;
  const totalDownloads = (uploads ?? []).reduce((sum: number, m: any) => sum + (m.downloads ?? 0), 0);

  const totalRatings = Array.from(ratingMap.values()).reduce((sum, a) => sum + a.count, 0);
  const sumStars = Array.from(ratingMap.values()).reduce((sum, a) => sum + a.sum, 0);
  const overallAvg = totalRatings > 0 ? sumStars / totalRatings : null;

  const badges = badgeList({
    uploads: totalUploads,
    totalDownloads,
    avgRating: overallAvg,
    totalRatings,
    followers: followersCount ?? 0,
  });

  // Sections
  const latestUploads = (uploads ?? []).slice(0, 15);

  const topRated = (uploads ?? [])
    .map((m: any) => {
      const { avgRating, ratingCount } = getAgg(m.id);
      return { m, avgRating, ratingCount };
    })
    .filter((x) => x.ratingCount >= 2) // reduce noise
    .sort((a, b) => {
      // primary: avg desc, secondary: count desc
      const ad = a.avgRating ?? -1;
      const bd = b.avgRating ?? -1;
      if (bd !== ad) return bd - ad;
      return (b.ratingCount ?? 0) - (a.ratingCount ?? 0);
    })
    .slice(0, 15);

  const mostDownloaded = (uploads ?? [])
    .slice()
    .sort((a: any, b: any) => (b.downloads ?? 0) - (a.downloads ?? 0))
    .slice(0, 15);

  const hasAnyUploads = (uploads?.length ?? 0) > 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-12">
        {/* Header */}
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl relative overflow-hidden">
          <div className="pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full overflow-hidden bg-white/10 border border-white/10 shrink-0">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-2xl">
                    👤
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-400">Creator profile</p>
                <h1 className="text-4xl font-extrabold mt-1">{profile.username}</h1>

                {profile.bio ? (
                  <p className="text-gray-300 mt-3 max-w-2xl leading-relaxed">{profile.bio}</p>
                ) : (
                  <p className="text-gray-500 mt-3 italic">No bio yet.</p>
                )}

                {/* Badges */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {badges.map((b) => (
                    <span
                      key={b.label}
                      title={b.hint}
                      className="px-3 py-1 rounded-full text-xs font-semibold
                                 bg-white/5 border border-white/10 text-gray-200"
                    >
                      ✨ {b.label}
                    </span>
                  ))}
                </div>

                <p className="mt-4 text-sm text-gray-400">
                  Member since <span className="font-semibold text-gray-200">{formatDate(profile.created_at)}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FollowButton targetUserId={profile.id} />

              <Link
                href="/midi"
                className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
              >
                Browse MIDI
              </Link>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Users size={18} className="text-blue-300" />} label="Followers" value={String(followersCount ?? 0)} />
            <StatCard icon={<Users size={18} className="text-indigo-300" />} label="Following" value={String(followingCount ?? 0)} />
            <StatCard icon={<Music2 size={18} className="text-emerald-300" />} label="Uploads" value={String(totalUploads)} />
            <StatCard icon={<TrendingUp size={18} className="text-yellow-300" />} label="Total downloads" value={String(totalDownloads)} />
          </div>

          {/* Rating summary */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-gray-300">
              <Star size={16} className="text-yellow-300" />
              <span className="font-semibold">Creator rating</span>
            </div>

            <div className="text-sm text-gray-400">
              {overallAvg === null ? (
                <span>No ratings yet</span>
              ) : (
                <span>
                  <span className="font-semibold text-gray-200">{overallAvg.toFixed(1)}</span> / 5 ·{" "}
                  <span className="font-semibold text-gray-200">{totalRatings}</span> rating{totalRatings === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Latest uploads */}
        <section className="space-y-4">
          <SectionHeader
            title="Latest uploads"
            subtitle={`Newest MIDI files by ${profile.username}.`}
          />

          {hasAnyUploads ? (
            <MidiRowScroller itemCount={latestUploads.length}>
              {latestUploads.map((midi: any) => {
                const { avgRating, ratingCount } = getAgg(midi.id);
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
            <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-gray-300">
              No uploads yet.
            </div>
          )}
        </section>

        {/* Top rated */}
        <section className="space-y-4">
          <SectionHeader
            title="Top rated"
            subtitle="Best rated uploads (requires at least 2 ratings)."
          />

          {topRated.length > 0 ? (
            <MidiRowScroller itemCount={topRated.length}>
              {topRated.map(({ m, avgRating, ratingCount }: any) => (
                <div key={m.id} className="snap-start shrink-0 w-[280px] sm:w-[320px]">
                  <MidiCard
                    id={m.id}
                    title={m.title}
                    composer={m.composer}
                    downloads={m.downloads}
                    pdfUrl={m.pdf_url || null}
                    avgRating={avgRating}
                    ratingCount={ratingCount}
                  />
                </div>
              ))}
            </MidiRowScroller>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-gray-300">
              Not enough ratings yet.
            </div>
          )}
        </section>

        {/* Most downloaded */}
        <section className="space-y-4">
          <SectionHeader title="Most downloaded" subtitle="Most downloaded uploads from this creator." />

          {mostDownloaded.length > 0 ? (
            <MidiRowScroller itemCount={mostDownloaded.length}>
              {mostDownloaded.map((m: any) => {
                const { avgRating, ratingCount } = getAgg(m.id);
                return (
                  <div key={m.id} className="snap-start shrink-0 w-[280px] sm:w-[320px]">
                    <MidiCard
                      id={m.id}
                      title={m.title}
                      composer={m.composer}
                      downloads={m.downloads}
                      pdfUrl={m.pdf_url || null}
                      avgRating={avgRating}
                      ratingCount={ratingCount}
                    />
                  </div>
                );
              })}
            </MidiRowScroller>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-gray-300">
              No downloads yet.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}