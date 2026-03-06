// src/app/creators/page.tsx
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Star, Users, Upload, TrendingUp, Crown } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-AU", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

function badgeList(u: LeaderRow) {
  const badges: { label: string; hint: string }[] = [];

  if (u.followers >= 25) badges.push({ label: "Rising Creator", hint: "25+ followers" });
  if (u.uploads >= 10) badges.push({ label: "Prolific", hint: "10+ uploads" });
  if (u.downloads >= 250) badges.push({ label: "Trending", hint: "250+ total downloads" });
  if (u.avgRating !== null && u.ratingCount >= 10 && u.avgRating >= 4.5)
    badges.push({ label: "Top Rated", hint: "4.5+ avg (10+ ratings)" });

  if (badges.length === 0) badges.push({ label: "New Creator", hint: "Just getting started" });

  return badges.slice(0, 3);
}

function Card({
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
  metricLabel: (r: LeaderRow) => string;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            {icon}
            {title}
          </h2>
          <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((u, idx) => (
          <Link
            key={u.id}
            href={`/u/${u.id}`}
            className="group block rounded-2xl border border-white/10 bg-black/20 hover:bg-white/5 transition p-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 border border-white/10 shrink-0">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-gray-400">👤</div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white truncate">{u.username}</span>
                  {idx === 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/15 border border-yellow-500/20 text-yellow-200">
                      <Crown size={14} /> #1
                    </span>
                  )}
                </div>

                {u.bio ? (
                  <p className="text-sm text-gray-400 truncate">{u.bio}</p>
                ) : (
                  <p className="text-sm text-gray-600 italic truncate">No bio</p>
                )}

                <div className="mt-2 flex flex-wrap gap-2">
                  {badgeList(u).map((b) => (
                    <span
                      key={b.label}
                      title={b.hint}
                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/5 border border-white/10 text-gray-200"
                    >
                      ✨ {b.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-sm font-semibold text-white">{metricLabel(u)}</div>
                <div className="text-xs text-gray-500">Member since {formatDate(u.created_at)}</div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              <div className="rounded-xl border border-white/10 bg-white/5 py-2">
                <div className="text-xs text-gray-400">Uploads</div>
                <div className="text-sm font-semibold">{u.uploads}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 py-2">
                <div className="text-xs text-gray-400">Followers</div>
                <div className="text-sm font-semibold">{u.followers}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 py-2">
                <div className="text-xs text-gray-400">Downloads</div>
                <div className="text-sm font-semibold">{u.downloads}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 py-2">
                <div className="text-xs text-gray-400">Rating</div>
                <div className="text-sm font-semibold">
                  {u.avgRating === null ? "—" : `${u.avgRating.toFixed(1)} (${u.ratingCount})`}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default async function CreatorsPage() {
  // 1) Base profiles
  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio, created_at")
    .limit(200); // tweak if you expect lots of users

  if (profErr) console.error("profiles fetch error:", profErr);

  const profs = (profiles ?? []) as Profile[];
  const ids = profs.map((p) => p.id);

  if (ids.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-4xl font-extrabold">Creators</h1>
          <p className="text-gray-400 mt-2">No creators found yet.</p>
        </div>
      </main>
    );
  }

  // 2) Followers counts
  const { data: followRows, error: folErr } = await supabase
    .from("follows")
    .select("following_id");

  if (folErr) console.error("follows fetch error:", folErr);

  const followersMap = new Map<string, number>();
  for (const r of followRows ?? []) {
    followersMap.set(r.following_id, (followersMap.get(r.following_id) ?? 0) + 1);
  }

  // 3) Uploads + downloads per creator
  const { data: musicRows, error: musErr } = await supabase
    .from("music_files")
    .select("id, uploaded_by, downloads");

  if (musErr) console.error("music_files fetch error:", musErr);

  const uploadsMap = new Map<string, number>();
  const downloadsMap = new Map<string, number>();
  const creatorMidiIds = new Map<string, string[]>();

  for (const m of musicRows ?? []) {
    const uid = m.uploaded_by as string;
    uploadsMap.set(uid, (uploadsMap.get(uid) ?? 0) + 1);
    downloadsMap.set(uid, (downloadsMap.get(uid) ?? 0) + (m.downloads ?? 0));

    const arr = creatorMidiIds.get(uid) ?? [];
    arr.push(m.id);
    creatorMidiIds.set(uid, arr);
  }

  // 4) Ratings (bulk) -> per creator aggregate
  const allMidiIds = (musicRows ?? []).map((m: any) => m.id);
  let ratingRows: any[] = [];
  if (allMidiIds.length > 0) {
    const { data: r, error: rErr } = await supabase
      .from("midi_ratings")
      .select("midi_id, rating")
      .in("midi_id", allMidiIds);

    if (rErr) console.error("ratings fetch error:", rErr);
    ratingRows = r ?? [];
  }

  // midi -> agg
  const midiAgg = new Map<string, { sum: number; count: number }>();
  for (const r of ratingRows) {
    const prev = midiAgg.get(r.midi_id) ?? { sum: 0, count: 0 };
    midiAgg.set(r.midi_id, { sum: prev.sum + (r.rating ?? 0), count: prev.count + 1 });
  }

  // creator -> agg
  const creatorAgg = new Map<string, { sum: number; count: number }>();
  for (const [uid, mids] of creatorMidiIds.entries()) {
    let sum = 0;
    let count = 0;
    for (const mid of mids) {
      const a = midiAgg.get(mid);
      if (!a) continue;
      sum += a.sum;
      count += a.count;
    }
    creatorAgg.set(uid, { sum, count });
  }

  const leaders: LeaderRow[] = profs.map((p) => {
    const up = uploadsMap.get(p.id) ?? 0;
    const fol = followersMap.get(p.id) ?? 0;
    const dl = downloadsMap.get(p.id) ?? 0;
    const a = creatorAgg.get(p.id) ?? { sum: 0, count: 0 };
    const avg = a.count > 0 ? a.sum / a.count : null;

    return {
      ...p,
      uploads: up,
      followers: fol,
      downloads: dl,
      avgRating: avg,
      ratingCount: a.count,
    };
  });

  // Leaderboards
  const mostFollowed = leaders
    .slice()
    .sort((a, b) => b.followers - a.followers)
    .slice(0, 10);

  const mostUploads = leaders
    .slice()
    .sort((a, b) => b.uploads - a.uploads)
    .slice(0, 10);

  const mostDownloaded = leaders
    .slice()
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, 10);

  // Weighted rating with minimum ratings to avoid 1-hit wonder
  const topRated = leaders
    .filter((u) => u.ratingCount >= 10)
    .slice()
    .sort((a, b) => (b.avgRating ?? -1) - (a.avgRating ?? -1))
    .slice(0, 10);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="absolute top-24 left-16 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute top-40 right-16 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-14 pb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300">
            🏆 Community leaderboard • creators • uploads • ratings
          </div>

          <h1 className="mt-5 text-4xl md:text-5xl font-extrabold">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
              Top Creators
            </span>
          </h1>

          <p className="mt-3 text-gray-300/90 max-w-2xl">
            Discover the most active and most loved creators — follow profiles and explore their uploads.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Most followed"
          subtitle="Creators with the biggest audiences."
          icon={<Users className="text-blue-300" size={18} />}
          rows={mostFollowed}
          metricLabel={(u) => `${u.followers} followers`}
        />
        <Card
          title="Most uploads"
          subtitle="Most active uploaders."
          icon={<Upload className="text-emerald-300" size={18} />}
          rows={mostUploads}
          metricLabel={(u) => `${u.uploads} uploads`}
        />
        <Card
          title="Most downloaded"
          subtitle="Total downloads across all uploads."
          icon={<TrendingUp className="text-yellow-300" size={18} />}
          rows={mostDownloaded}
          metricLabel={(u) => `${u.downloads} downloads`}
        />
        <Card
          title="Top rated"
          subtitle="Highest average rating (10+ ratings)."
          icon={<Star className="text-yellow-300" size={18} />}
          rows={topRated.length > 0 ? topRated : mostFollowed.slice(0, 10)}
          metricLabel={(u) =>
            u.avgRating === null ? "—" : `${u.avgRating.toFixed(1)} / 5 (${u.ratingCount})`
          }
        />
      </div>
    </main>
  );
}