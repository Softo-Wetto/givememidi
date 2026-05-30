import Link from "next/link";
import { createPocketBaseClient } from "@/lib/pocketbaseClient";
import { Crown, Music2, Sparkles, Star, TrendingUp, Upload, Users } from "lucide-react";

export const dynamic = "force-dynamic";

const pocketbase = createPocketBaseClient();

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

type LeaderRow = Profile & {
  uploads: number;
  followers: number;
  downloads: number;
  avgRating: number | null;
  ratingCount: number;
};

function formatDate(iso?: string | null) {
  if (!iso) return "Unknown";
  return new Intl.DateTimeFormat("en-AU", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(iso));
}

function badgeList(creator: LeaderRow) {
  const badges: { label: string; hint: string }[] = [];
  if (creator.followers >= 25) badges.push({ label: "Rising", hint: "25+ followers" });
  if (creator.uploads >= 10) badges.push({ label: "Prolific", hint: "10+ uploads" });
  if (creator.downloads >= 250) badges.push({ label: "Trending", hint: "250+ downloads" });
  if (creator.avgRating !== null && creator.ratingCount >= 10 && creator.avgRating >= 4.5) {
    badges.push({ label: "Top rated", hint: "4.5+ average" });
  }

  if (badges.length === 0) badges.push({ label: "New creator", hint: "Just getting started" });
  return badges.slice(0, 3);
}

export default async function CreatorsPage() {
  const { data: profiles, error: profErr } = await pocketbase
    .from("profiles")
    .select("id, username, avatar_url, bio, created_at")
    .limit(200);

  if (profErr) console.error("profiles fetch error:", profErr);

  const profs = (profiles ?? []) as Profile[];
  const ids = profs.map((profile) => profile.id);

  if (ids.length === 0) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#111827_0%,#020617_42%,#000_100%)] text-white">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <h1 className="text-4xl font-black">Creators</h1>
          <p className="mt-2 text-gray-400">No creators found yet.</p>
        </div>
      </main>
    );
  }

  const { data: followRows, error: folErr } = await pocketbase
    .from("follows")
    .select("following_id");

  if (folErr) console.error("follows fetch error:", folErr);

  const followersMap = new Map<string, number>();
  for (const row of followRows ?? []) {
    followersMap.set(row.following_id, (followersMap.get(row.following_id) ?? 0) + 1);
  }

  const { data: musicRows, error: musErr } = await pocketbase
    .from("music_files")
    .select("id, uploaded_by, downloads");

  if (musErr) console.error("music_files fetch error:", musErr);

  const uploadsMap = new Map<string, number>();
  const downloadsMap = new Map<string, number>();
  const creatorMidiIds = new Map<string, string[]>();

  for (const midi of musicRows ?? []) {
    const uid = midi.uploaded_by as string;
    uploadsMap.set(uid, (uploadsMap.get(uid) ?? 0) + 1);
    downloadsMap.set(uid, (downloadsMap.get(uid) ?? 0) + (midi.downloads ?? 0));
    creatorMidiIds.set(uid, [...(creatorMidiIds.get(uid) ?? []), midi.id]);
  }

  const allMidiIds = (musicRows ?? []).map((midi: any) => midi.id);
  let ratingRows: any[] = [];
  if (allMidiIds.length > 0) {
    const { data: ratings, error: rErr } = await pocketbase
      .from("midi_ratings")
      .select("midi_id, rating")
      .in("midi_id", allMidiIds);

    if (rErr) console.error("ratings fetch error:", rErr);
    ratingRows = ratings ?? [];
  }

  const midiAgg = new Map<string, { sum: number; count: number }>();
  for (const rating of ratingRows) {
    const prev = midiAgg.get(rating.midi_id) ?? { sum: 0, count: 0 };
    midiAgg.set(rating.midi_id, { sum: prev.sum + (rating.rating ?? 0), count: prev.count + 1 });
  }

  const creatorAgg = new Map<string, { sum: number; count: number }>();
  for (const [uid, midiIds] of creatorMidiIds.entries()) {
    let sum = 0;
    let count = 0;
    for (const midiId of midiIds) {
      const agg = midiAgg.get(midiId);
      if (!agg) continue;
      sum += agg.sum;
      count += agg.count;
    }
    creatorAgg.set(uid, { sum, count });
  }

  const leaders: LeaderRow[] = profs.map((profile) => {
    const uploads = uploadsMap.get(profile.id) ?? 0;
    const followers = followersMap.get(profile.id) ?? 0;
    const downloads = downloadsMap.get(profile.id) ?? 0;
    const agg = creatorAgg.get(profile.id) ?? { sum: 0, count: 0 };

    return {
      ...profile,
      uploads,
      followers,
      downloads,
      avgRating: agg.count > 0 ? agg.sum / agg.count : null,
      ratingCount: agg.count,
    };
  });

  const mostFollowed = leaders.slice().sort((a, b) => b.followers - a.followers).slice(0, 10);
  const mostUploads = leaders.slice().sort((a, b) => b.uploads - a.uploads).slice(0, 10);
  const mostDownloaded = leaders.slice().sort((a, b) => b.downloads - a.downloads).slice(0, 10);
  const topRated = leaders
    .filter((creator) => creator.ratingCount >= 10)
    .slice()
    .sort((a, b) => (b.avgRating ?? -1) - (a.avgRating ?? -1))
    .slice(0, 10);

  const totalDownloads = leaders.reduce((sum, creator) => sum + creator.downloads, 0);
  const totalUploads = leaders.reduce((sum, creator) => sum + creator.uploads, 0);
  const activeCreators = leaders.filter((creator) => creator.uploads > 0).length;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#111827_0%,#020617_42%,#000_100%)] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:52px_52px]" />
        <div className="relative mx-auto max-w-7xl px-6 pb-10 pt-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-sm text-blue-100">
            <Sparkles size={16} className="text-cyan-300" />
            Community leaderboard, creator discovery, and library signals.
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">Top creators</h1>
          <p className="mt-3 max-w-2xl leading-7 text-gray-300">
            Find active uploaders, high-rated arrangers, and the profiles worth following next.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-4">
            <CreatorStat icon={<Users size={18} />} label="Creators" value={String(leaders.length)} />
            <CreatorStat icon={<Music2 size={18} />} label="Active" value={String(activeCreators)} />
            <CreatorStat icon={<Upload size={18} />} label="Uploads" value={String(totalUploads)} />
            <CreatorStat icon={<TrendingUp size={18} />} label="Downloads" value={String(totalDownloads)} />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-12 lg:grid-cols-2">
        <Leaderboard
          title="Most followed"
          subtitle="Creators with the biggest audiences."
          icon={<Users className="text-blue-300" size={18} />}
          rows={mostFollowed}
          metricLabel={(creator) => `${creator.followers} followers`}
        />
        <Leaderboard
          title="Most uploads"
          subtitle="The most active library builders."
          icon={<Upload className="text-emerald-300" size={18} />}
          rows={mostUploads}
          metricLabel={(creator) => `${creator.uploads} uploads`}
        />
        <Leaderboard
          title="Most downloaded"
          subtitle="Creators with the most total downloads."
          icon={<TrendingUp className="text-yellow-300" size={18} />}
          rows={mostDownloaded}
          metricLabel={(creator) => `${creator.downloads} downloads`}
        />
        <Leaderboard
          title="Top rated"
          subtitle="Highest average rating, with enough ratings to mean something."
          icon={<Star className="text-yellow-300" size={18} />}
          rows={topRated.length > 0 ? topRated : mostFollowed.slice(0, 10)}
          metricLabel={(creator) =>
            creator.avgRating === null
              ? "No ratings"
              : `${creator.avgRating.toFixed(1)} / 5 (${creator.ratingCount})`
          }
        />
      </div>
    </main>
  );
}

function CreatorStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card-lift rounded-2xl border border-white/10 bg-white/[0.055] p-4">
      <div className="flex items-center gap-2 text-cyan-200">{icon}</div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function Leaderboard({
  title,
  subtitle,
  icon,
  rows,
  metricLabel,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  rows: LeaderRow[];
  metricLabel: (creator: LeaderRow) => string;
}) {
  return (
    <section className="hover-shine rounded-3xl border border-white/10 bg-white/[0.055] p-6 shadow-xl shadow-black/20">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black">
            {icon}
            {title}
          </h2>
          <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((creator, index) => (
          <Link
            key={creator.id}
            href={`/u/${creator.id}`}
            className="card-lift block rounded-2xl border border-white/10 bg-black/25 p-4 transition hover:border-cyan-300/35 hover:bg-white/[0.075]"
          >
            <div className="flex items-center gap-4">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/10">
                {creator.avatar_url ? (
                  <img src={creator.avatar_url} alt={creator.username} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-cyan-100">
                    {creator.username?.slice(0, 1).toUpperCase() || "U"}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-bold text-white">{creator.username}</span>
                  {index === 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/20 bg-yellow-500/15 px-2 py-0.5 text-xs font-semibold text-yellow-200">
                      <Crown size={14} /> #1
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-sm text-gray-400">{creator.bio || "No bio yet"}</p>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-sm font-bold text-white">{metricLabel(creator)}</div>
                <div className="text-xs text-gray-500">Since {formatDate(creator.created_at)}</div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {badgeList(creator).map((badge) => (
                <span
                  key={badge.label}
                  title={badge.hint}
                  className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-100"
                >
                  {badge.label}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
