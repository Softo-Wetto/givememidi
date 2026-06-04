import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Award,
  Bookmark,
  Download,
  FileMusic,
  FileText,
  Headphones,
  Music2,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Upload,
  Users,
} from "lucide-react";

const workflow = [
  {
    step: "01",
    title: "Upload",
    desc: "Share a MIDI file, add composer details, include an optional description, and attach a PDF score when you have one.",
  },
  {
    step: "02",
    title: "Discover",
    desc: "Browse by genre, search by title or composer, collect favorites, and open clean detail pages for each arrangement.",
  },
  {
    step: "03",
    title: "Reward creators",
    desc: "Ratings, downloads, bookmarks, and uploads feed the creator experience so contributors feel seen.",
  },
];

const features = [
  {
    icon: FileMusic,
    title: "MIDI-first library",
    desc: "Every page is built around finding playable MIDI quickly, with composer, genre, BPM, ratings, and download stats close at hand.",
  },
  {
    icon: FileText,
    title: "Optional sheet music",
    desc: "Creators can attach PDF scores so musicians can study, print, and play from the same entry.",
  },
  {
    icon: Bookmark,
    title: "Personal collection",
    desc: "Signed-in users can bookmark favorites and return to useful arrangements without searching again.",
  },
  {
    icon: Award,
    title: "Creator recognition",
    desc: "Uploader progress, points, and creator highlights make sharing feel more rewarding than a silent file dump.",
  },
];

const principles = [
  "Upload only music you own or have permission to share.",
  "Keep titles, composers, genres, and descriptions clear so the library stays searchable.",
  "Report ownership concerns and we will review them promptly.",
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#101827_0%,#030712_42%,#000_100%)] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:52px_52px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 pb-16 pt-16 lg:grid-cols-[1fr_430px] lg:pb-20 lg:pt-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-blue-100 backdrop-blur">
              <Sparkles size={16} className="text-cyan-300" />
              About GiveMeMIDI
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.02] tracking-tight md:text-6xl">
              A better home for playable ideas.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
              GiveMeMIDI is a community MIDI library for musicians, producers, composers, and curious listeners. Find useful arrangements, save your favorites, and share MIDI with optional PDF sheet music.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/midi"
                className="btn-glow tap inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 px-6 py-3 font-bold shadow-lg shadow-blue-950/40 transition hover:brightness-110"
              >
                <Search size={18} />
                Explore library
              </Link>
              <Link
                href="/upload"
                className="tap inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-3 font-bold text-gray-100 transition hover:border-cyan-300/40 hover:bg-white/[0.08]"
              >
                <Upload size={18} />
                Upload MIDI
              </Link>
            </div>

            <div className="mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
              <Stat icon={<Music2 size={18} />} label="Library" value="MIDI + PDFs" />
              <Stat icon={<Star size={18} />} label="Community" value="Ratings + comments" />
              <Stat icon={<Award size={18} />} label="Creators" value="Points + levels" />
            </div>
          </div>

          <div className="hover-shine relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-blue-950/20">
            <div className="relative z-10 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-sm text-slate-200">
                <Headphones size={16} className="text-cyan-300" />
                Discovery signal
              </div>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                Live library
              </span>
            </div>

            <div className="relative z-10 mt-10 h-44 overflow-hidden rounded-3xl border border-white/10 bg-black/30 p-5">
              <div className="flex h-full items-end gap-2">
                {Array.from({ length: 28 }).map((_, index) => (
                  <span
                    key={index}
                    className="motion-bar block flex-1 rounded-t bg-gradient-to-t from-blue-500/50 via-cyan-300/75 to-white/80"
                    style={{
                      height: `${22 + ((index * 19) % 68)}%`,
                      animationDelay: `${index * 42}ms`,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="relative z-10 mt-5 grid gap-3">
              {["Search by composer", "Attach clean PDF scores", "Earn recognition for uploads"].map((item, index) => (
                <div
                  key={item}
                  className="card-lift flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200 ring-1 ring-cyan-300/20">
                    {index + 1}
                  </span>
                  <span className="text-sm font-semibold text-slate-200">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <SectionLabel label="What it does" title="Built for finding, saving, and sharing MIDI." />

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 md:p-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <SectionLabel label="Workflow" title="From upload to discovery in three steps." />
            <Link href="/upload" className="inline-flex items-center gap-2 self-start text-sm font-bold text-cyan-200 transition hover:text-white md:self-auto">
              Start uploading
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {workflow.map((item) => (
              <Step key={item.step} {...item} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-20 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-blue-500/15 via-white/[0.04] to-cyan-300/10 p-6 md:p-8">
          <ShieldCheck className="text-emerald-300" />
          <h2 className="mt-5 text-2xl font-black">Designed around trust.</h2>
          <p className="mt-3 leading-7 text-slate-300">
            The library works best when uploads are clear, respectful, and easy to verify. Good metadata helps everyone, and rights issues can be reported from the contact page.
          </p>
          <Link
            href="/contact"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-bold text-slate-100 transition hover:border-cyan-300/40 hover:bg-white/[0.08]"
          >
            Contact support
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid gap-3">
          {principles.map((principle, index) => (
            <div key={principle} className="card-lift flex items-start gap-4 rounded-3xl border border-white/10 bg-white/[0.045] p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-400/10 font-bold text-blue-200 ring-1 ring-blue-300/20">
                {index + 1}
              </span>
              <p className="pt-2 text-sm leading-6 text-slate-300">{principle}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function SectionLabel({ label, title }: { label: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300/80">{label}</p>
      <h2 className="mt-2 max-w-3xl text-2xl font-black tracking-tight text-white md:text-3xl">
        {title}
      </h2>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="card-lift rounded-2xl border border-white/10 bg-white/[0.055] p-4">
      <div className="text-cyan-300">{icon}</div>
      <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-white">{value}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof FileMusic;
  title: string;
  desc: string;
}) {
  return (
    <div className="hover-shine card-lift rounded-3xl border border-white/10 bg-white/[0.045] p-6">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-400/10 text-blue-200 ring-1 ring-blue-300/20">
        <Icon size={22} />
      </span>
      <h3 className="mt-5 text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{desc}</p>
    </div>
  );
}

function Step({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="card-lift rounded-3xl border border-white/10 bg-black/20 p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] font-black text-cyan-200 ring-1 ring-white/10">
          {step}
        </span>
        <h3 className="font-bold text-white">{title}</h3>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-400">{desc}</p>
    </div>
  );
}
