"use client";

import { useMemo, useState } from "react";
import {
  Award,
  Download,
  Music2,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import {
  calculateCreatorPoints,
  CREATOR_AWARD_BADGES,
  getCreatorAwards,
  getCreatorLevel,
  getLevelProgress,
} from "@/lib/creator-awards";

type PlannerState = {
  uploads: number;
  downloads: number;
  totalRatings: number;
  avgRating: number;
  followers: number;
};

const controls = [
  { key: "uploads", label: "Uploads", max: 60, icon: Music2 },
  { key: "downloads", label: "Downloads", max: 3000, icon: Download },
  { key: "totalRatings", label: "Ratings", max: 300, icon: Star },
  { key: "followers", label: "Followers", max: 300, icon: Users },
] as const;

export default function AwardPlanner() {
  const [state, setState] = useState<PlannerState>({
    uploads: 3,
    downloads: 120,
    totalRatings: 12,
    avgRating: 4.3,
    followers: 8,
  });

  const result = useMemo(() => {
    const input = {
      ...state,
      avgRating: state.totalRatings > 0 ? state.avgRating : null,
    };
    const points = calculateCreatorPoints(input);
    const level = getCreatorLevel(points);
    const progress = getLevelProgress(points);
    const awards = getCreatorAwards(input);
    const nextBadges = CREATOR_AWARD_BADGES.filter(
      (badge) => !badge.isUnlocked(input, points)
    ).slice(0, 4);

    return { points, level, progress, awards, nextBadges };
  }, [state]);

  function update(key: keyof PlannerState, value: number) {
    setState((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] shadow-2xl shadow-black/25">
      <div className="border-b border-white/10 bg-black/25 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-300/10 text-yellow-200 ring-1 ring-yellow-300/20">
            <Trophy size={22} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-200/80">
              Rank planner
            </p>
            <h2 className="text-xl font-black text-white">Test your creator path</h2>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {controls.map(({ key, label, max, icon: Icon }) => (
            <label key={key} className="block rounded-3xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-sm font-bold text-white">
                  <Icon size={16} className="text-cyan-300" />
                  {label}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-xs font-bold text-slate-300">
                  {state[key].toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={max}
                step={key === "downloads" ? 25 : 1}
                value={state[key]}
                onChange={(event) => update(key, Number(event.target.value))}
                className="w-full accent-cyan-300"
              />
            </label>
          ))}

          <label className="block rounded-3xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-white">
                <Star size={16} className="text-yellow-200" />
                Average rating
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-xs font-bold text-slate-300">
                {state.avgRating.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={5}
              step={0.1}
              value={state.avgRating}
              onChange={(event) => update("avgRating", Number(event.target.value))}
              className="w-full accent-yellow-300"
            />
          </label>
        </div>

        <aside className="rounded-[1.6rem] border border-yellow-300/20 bg-gradient-to-br from-yellow-300/12 via-white/[0.04] to-cyan-300/10 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-100/75">
            Estimated rank
          </p>
          <h3 className="mt-3 text-3xl font-black text-white">{result.level.label}</h3>
          <p className="mt-2 text-sm text-slate-300">
            {result.points.toLocaleString()} creator points
          </p>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-cyan-300"
              style={{ width: `${result.progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {result.level.nextPoints
              ? `${(result.level.nextPoints - result.points).toLocaleString()} points to ${result.level.nextLabel}`
              : "Highest rank reached"}
          </p>

          <div className="mt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Unlocked badges
            </p>
            <div className="flex flex-wrap gap-2">
              {result.awards.map((award) => (
                <span
                  key={award.label}
                  title={award.hint}
                  className="inline-flex items-center gap-1.5 rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1.5 text-xs font-bold text-yellow-100"
                >
                  <Award size={13} />
                  {award.label}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Next goals
            </p>
            <div className="space-y-2">
              {result.nextBadges.map((badge) => (
                <div key={badge.label} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                  <p className="text-sm font-bold text-white">{badge.label}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{badge.requirement}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
