import Link from "next/link";
import {
  Music2,
  FileMusic,
  FileText,
  Download,
  ShieldCheck,
  Sparkles,
  Bookmark,
  Upload,
  ArrowRight,
} from "lucide-react";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* glow blobs */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/4 h-[420px] w-[420px] rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="max-w-7xl mx-auto px-6 pt-16 pb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300">
            <Sparkles size={16} className="text-blue-400" />
            About GiveMeMIDI
          </div>

          <h1 className="mt-5 text-4xl md:text-6xl font-extrabold tracking-tight">
            MIDI & sheet music,
            <span className="block bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              beautifully organized
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-lg text-gray-300 leading-relaxed">
            GiveMeMIDI is a simple library for creators — producers, composers,
            and musicians — to upload, discover, and download MIDI files and
            optional PDF sheet music in one clean place.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Link
              href="/midi"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400
                font-semibold shadow-lg transition"
            >
              Browse MIDI <ArrowRight size={18} />
            </Link>

            <Link
              href="/upload"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                border border-white/10 bg-white/5 hover:bg-white/10
                text-gray-200 font-semibold transition"
            >
              <Upload size={18} /> Upload your files
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Stat title="Fast downloads" value="Signed URLs" desc="Secure file access via Supabase Storage" />
            <Stat title="Optional sheet music" value="PDF support" desc="MIDI + score, all in one entry" />
            <Stat title="Save favorites" value="Bookmarks" desc="Only for logged-in users" />
          </div>
        </div>
      </section>

      {/* What it offers */}
      <section className="max-w-7xl mx-auto px-6 py-14">
        <h2 className="text-2xl md:text-3xl font-bold">What you can do</h2>
        <p className="mt-2 text-gray-400 max-w-2xl">
          A clean workflow from browsing to downloading — and uploading when you’re ready.
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Feature
            icon={<FileMusic className="text-blue-400" />}
            title="Browse MIDI files"
            desc="Search by title or composer, filter by genre, and open a clean detail page for each track."
          />
          <Feature
            icon={<FileText className="text-green-400" />}
            title="PDF sheet music (optional)"
            desc="If an upload includes a PDF, users can preview and download it alongside the MIDI."
          />
          <Feature
            icon={<Bookmark className="text-indigo-300" />}
            title="Bookmarks"
            desc="Logged-in users can save favorites to a personal bookmarks page for quick access."
          />
          <Feature
            icon={<Download className="text-gray-200" />}
            title="One-click downloads"
            desc="Files download with clean names (no ugly random IDs in the filename)."
          />
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-6 pb-14">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 md:p-10">
          <div className="flex items-start gap-3">
            <ShieldCheck className="text-blue-400 mt-1" />
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">How it works</h2>
              <p className="mt-2 text-gray-300 max-w-2xl">
                GiveMeMIDI uses Supabase for authentication and storage. Files live in buckets
                and are served via short-lived signed URLs for secure access.
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Step n="01" title="Upload" desc="Add a MIDI file and optionally a PDF score. Metadata is stored in the music_files table." />
            <Step n="02" title="Discover" desc="Browse all MIDI files, preview, filter, and open details for downloads." />
            <Step n="03" title="Save favorites" desc="Logged-in users can bookmark MIDI files to a personal bookmarks page." />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <h2 className="text-2xl md:text-3xl font-bold">FAQ</h2>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Faq
            q="Do I need an account to download?"
            a="No — browsing and downloads can be public. But bookmarks and uploads require login."
          />
          <Faq
            q="Does SSO (Google/GitHub) work?"
            a="Yes, if enabled in Supabase Auth Providers. SSO creates a Supabase user automatically, same as email/password."
          />
          <Faq
            q="Why are downloads secure?"
            a="Files are accessed via signed URLs (short expiry), so direct bucket paths aren’t exposed permanently."
          />
          <Faq
            q="Can I upload MIDI without PDF?"
            a="Yep. PDF is optional. Cards show a “PDF Available” badge only when pdf_url exists."
          />
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-3xl border border-white/10 bg-gradient-to-r from-blue-500/15 to-indigo-500/15 p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold">Ready to share something?</h3>
              <p className="mt-2 text-gray-300">
                Upload your MIDI and optionally include sheet music so others can learn and play.
              </p>
            </div>

            <Link
              href="/upload"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400
                font-semibold shadow-lg transition"
            >
              <Upload size={18} /> Upload now
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({
  title,
  value,
  desc,
}: {
  title: string;
  value: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-wide text-gray-400">{title}</p>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
      <p className="mt-1 text-sm text-gray-400">{desc}</p>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition">
      <div className="flex items-start gap-3">
        <div className="mt-1">{icon}</div>
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="mt-2 text-gray-400">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-bold text-blue-300">
          {n}
        </div>
        <h4 className="text-lg font-semibold">{title}</h4>
      </div>
      <p className="mt-3 text-gray-400">{desc}</p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <p className="font-semibold">{q}</p>
      <p className="mt-2 text-gray-400">{a}</p>
    </div>
  );
}
