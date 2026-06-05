import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Cookie,
  Database,
  FileMusic,
  LockKeyhole,
  MessageSquare,
  ShieldCheck,
  SlidersHorizontal,
  UserCircle2,
} from "lucide-react";

const quickLinks = [
  ["What we collect", "#collect"],
  ["How we use it", "#use"],
  ["Your controls", "#controls"],
] as const;

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#111827_0%,#020617_42%,#000_100%)] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:52px_52px]" />
        <div className="relative mx-auto max-w-6xl px-6 py-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100">
            <LockKeyhole size={16} />
            Privacy Policy
          </div>
          <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight md:text-6xl">
            Privacy, written for actual humans.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
            This policy explains what GiveMeMIDI collects, why it is collected, and how you can manage your account, uploads, comments, and support requests.
          </p>
          <p className="mt-4 text-xs text-slate-500">
            Last updated: <span className="text-slate-300">June 5, 2026</span>
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          {quickLinks.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="hover-shine rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-cyan-300/35"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="space-y-6">
          <PolicyCard id="collect" icon={<Database />} title="1. Information we collect">
            <div className="grid gap-4 md:grid-cols-2">
              <MiniCard icon={<UserCircle2 />} title="Account information">
                Email address, login identifiers, username, avatar, and profile details you choose to add.
              </MiniCard>
              <MiniCard icon={<FileMusic />} title="Uploads">
                MIDI files, optional PDF scores, title, composer, genre, BPM, description, and upload date.
              </MiniCard>
              <MiniCard icon={<MessageSquare />} title="Community activity">
                Comments, bookmarks, ratings, follows, and creator progress signals.
              </MiniCard>
              <MiniCard icon={<ShieldCheck />} title="Operational signals">
                Basic logs used to keep the site stable, prevent abuse, and troubleshoot errors.
              </MiniCard>
            </div>
          </PolicyCard>

          <PolicyCard id="use" icon={<SlidersHorizontal />} title="2. How we use information">
            <div className="grid gap-4 md:grid-cols-2">
              <MiniCard title="Core features">
                Run login, profiles, uploads, downloads, comments, bookmarks, search, ratings, and creator awards.
              </MiniCard>
              <MiniCard title="Safety and moderation">
                Respond to reports, review rights concerns, reduce spam, and enforce the Terms.
              </MiniCard>
              <MiniCard title="Support">
                Reply to messages sent through the contact form and keep context for follow-up.
              </MiniCard>
              <MiniCard title="Reliability">
                Diagnose bugs, improve page speed, and keep file access working as expected.
              </MiniCard>
            </div>
          </PolicyCard>

          <PolicyCard icon={<FileMusic />} title="3. Files and visibility">
            <p className="text-sm leading-7 text-slate-300">
              Your username may be shown next to uploads and comments. Uploaded MIDI/PDF files may be available to other visitors depending on the page and access settings. Do not upload private files unless you are comfortable sharing them.
            </p>
          </PolicyCard>

          <PolicyCard id="controls" icon={<ShieldCheck />} title="4. Your choices">
            <div className="grid gap-4 md:grid-cols-2">
              <MiniCard title="Profile">
                Edit your username, bio, and avatar from the{" "}
                <Link href="/profile" className="font-bold text-cyan-200 hover:text-white">
                  profile page
                </Link>
                .
              </MiniCard>
              <MiniCard title="Uploads and comments">
                Manage uploads from your uploads page and delete your own comments from MIDI detail pages.
              </MiniCard>
              <MiniCard title="Bookmarks">
                Save or remove favorites from the MIDI library and bookmarks page.
              </MiniCard>
              <MiniCard title="Account help">
                For account deletion or data requests, contact support. Some records may be retained where required for safety or legal reasons.
              </MiniCard>
            </div>
          </PolicyCard>

          <PolicyCard icon={<Cookie />} title="5. Cookies and browser storage">
            <p className="text-sm leading-7 text-slate-300">
              GiveMeMIDI uses browser storage or cookies for login sessions and core account functionality. Blocking storage may prevent login, bookmarks, uploads, and comments from working correctly.
            </p>
          </PolicyCard>

          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-blue-500/15 via-white/[0.045] to-cyan-300/10 p-6 md:p-8">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-black">Questions about your data?</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  Send a message if you need help with privacy, account access, or rights concerns.
                </p>
              </div>
              <Link
                href="/contact"
                className="btn-glow inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 px-5 py-3 text-sm font-bold text-white"
              >
                Contact support
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function PolicyCard({
  id,
  icon,
  title,
  children,
}: {
  id?: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-xl shadow-black/20 md:p-8">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200 ring-1 ring-cyan-300/20">
          {icon}
        </span>
        <h2 className="text-xl font-black md:text-2xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function MiniCard({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="card-lift rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="flex items-center gap-2 font-bold text-white">
        {icon ? <span className="text-cyan-300">{icon}</span> : null}
        {title}
      </p>
      <div className="mt-2 text-sm leading-6 text-slate-400">{children}</div>
    </div>
  );
}
