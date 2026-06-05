import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Download,
  Music2,
  Sparkles,
  Star,
  Trophy,
  UploadCloud,
  Users,
} from "lucide-react";
import AwardPlanner from "@/app/components/AwardPlanner";
import RewardsStore from "@/app/components/RewardsStore";
import {
  CREATOR_AWARD_BADGES,
  CREATOR_LEVELS,
  POINT_RULES,
} from "@/lib/creator-awards";

const categoryIcons = {
  points: Trophy,
  uploads: Music2,
  downloads: Download,
  ratings: Star,
  followers: Users,
};

export default function AwardsPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#111827_0%,#020617_42%,#000_100%)] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:52px_52px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-200/70 to-transparent" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 pb-14 pt-16 lg:grid-cols-[1fr_420px] lg:pb-20 lg:pt-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-300/20 bg-yellow-300/10 px-4 py-2 text-sm font-semibold text-yellow-100">
              <Sparkles size={16} />
              Creator awards
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.02] tracking-tight md:text-6xl">
              Rank up by sharing MIDI people actually use.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
              Uploads, downloads, ratings, and followers all contribute to your creator score. This page shows every rank, badge, and the actions that move you forward.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/upload"
                className="btn-glow tap inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 px-6 py-3 font-bold shadow-lg shadow-blue-950/40 transition hover:brightness-110"
              >
                <UploadCloud size={18} />
                Upload MIDI
              </Link>
              <Link
                href="/creators"
                className="tap inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-3 font-bold text-gray-100 transition hover:border-yellow-300/40 hover:bg-white/[0.08]"
              >
                <Trophy size={18} />
                View creators
              </Link>
            </div>
          </div>

          <div className="hover-shine rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-yellow-950/20">
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-yellow-300/10 text-yellow-100 ring-1 ring-yellow-300/20">
                <Trophy size={28} />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-100/70">
                  Top rank
                </p>
                <h2 className="text-2xl font-black">Legend</h2>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              {POINT_RULES.map((rule) => (
                <div key={rule.label} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-200">{rule.label}</span>
                  <span className="text-right text-xs text-cyan-200">{rule.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-12 px-6 py-14">
        <AwardPlanner />

        <RewardsStore />

        <section>
          <SectionHeader
            eyebrow="Rank ladder"
            title="Every creator rank"
            text="Ranks are based on creator points. Higher ranks need broader contribution: uploads, usage, ratings, and followers."
          />

          <div className="mt-8 grid gap-4">
            {CREATOR_LEVELS.map((level, index) => (
              <div
                key={level.label}
                className="card-lift grid gap-4 rounded-3xl border border-white/10 bg-white/[0.045] p-5 md:grid-cols-[90px_1fr_180px]"
              >
                <div className="flex items-center gap-3 md:block">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br ${level.accent} font-black text-slate-950 shadow-lg`}>
                    {index + 1}
                  </div>
                  <p className="md:mt-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    Rank
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-black text-white">{level.label}</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{level.description}</p>
                  <p className="mt-3 text-sm font-semibold text-cyan-100">{level.requirement}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 md:text-right">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Starts at</p>
                  <p className="mt-1 text-2xl font-black text-white">{level.minPoints.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">points</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader
            eyebrow="Badge goals"
            title="Awards you can unlock"
            text="Badges give users smaller goals between rank jumps, making contribution feel more visible."
          />

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {CREATOR_AWARD_BADGES.map((badge) => {
              const Icon = categoryIcons[badge.category];

              return (
                <div key={badge.label} className="hover-shine card-lift rounded-3xl border border-white/10 bg-white/[0.045] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-300/10 text-yellow-100 ring-1 ring-yellow-300/20">
                      <Icon size={20} />
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-xs font-bold capitalize text-slate-300">
                      {badge.category}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-black text-white">{badge.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{badge.requirement}</p>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-cyan-200">
                    <BadgeCheck size={14} />
                    {badge.hint}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-blue-500/15 via-white/[0.045] to-yellow-300/10 p-6 md:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-200/80">
                Make the site more interactive
              </p>
              <h2 className="mt-2 text-2xl font-black md:text-3xl">Your next action moves the rank bar.</h2>
              <p className="mt-3 max-w-2xl leading-7 text-slate-300">
                Upload something useful, rate MIDI you download, follow creators you like, and leave comments that help others choose the right arrangement.
              </p>
            </div>
            <Link
              href="/midi"
              className="btn-glow tap inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 px-6 py-3 font-bold shadow-lg transition hover:brightness-110"
            >
              Browse and rate
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}

function SectionHeader({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300/80">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{text}</p>
    </div>
  );
}
