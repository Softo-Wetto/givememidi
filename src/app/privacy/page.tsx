import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-black text-white">
      {/* subtle glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-72 w-[900px] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 h-72 w-[720px] rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300">
            <span className="text-blue-300">🔒</span>
            Privacy Policy
          </div>

          <h1 className="mt-4 text-4xl md:text-5xl font-extrabold leading-tight">
            Your privacy,{" "}
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              made simple
            </span>
          </h1>

          <p className="mt-3 text-gray-400 max-w-3xl">
            This Privacy Policy explains what we collect, how we use it, and the
            choices you have when using GiveMeMIDI.
          </p>

          <div className="mt-4 text-xs text-gray-500">
            Last updated: <span className="text-gray-300">January 11, 2026</span>
          </div>
        </div>

        {/* Quick nav */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <QuickLink href="#what-we-collect" label="What we collect" />
          <QuickLink href="#how-we-use" label="How we use it" />
          <QuickLink href="#your-choices" label="Your choices" />
        </div>

        {/* Content cards */}
        <div className="space-y-6">
          <Card id="what-we-collect" title="1) Information we collect" icon="🧾">
            <ul className="space-y-3 text-gray-300 text-sm leading-relaxed">
              <li>
                <span className="text-white font-semibold">Account info:</span>{" "}
                email address, authentication identifiers, and a profile username
                (you can edit it in your Profile page).
              </li>
              <li>
                <span className="text-white font-semibold">Uploads:</span> MIDI
                files (required) and optional PDF sheet music you upload, plus
                metadata such as title, composer, genre, BPM, and the upload date.
              </li>
              <li>
                <span className="text-white font-semibold">Community content:</span>{" "}
                comments you post and bookmarks you create.
              </li>
              <li>
                <span className="text-white font-semibold">Usage signals:</span>{" "}
                basic operational logs needed to keep the service stable (e.g.,
                preventing abuse or troubleshooting errors).
              </li>
            </ul>

            <Notice>
              We don’t sell your personal data. We only use it to run the app and
              keep it safe.
            </Notice>
          </Card>

          <Card id="how-we-use" title="2) How we use information" icon="⚙️">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300 leading-relaxed">
              <MiniCard title="Core features">
                Authentication, profile username, uploads, comments, bookmarks,
                search, and display of uploader/comment usernames.
              </MiniCard>
              <MiniCard title="Safety & moderation">
                Prevent spam/abuse, respond to reports, enforce Terms, and remove
                content that violates policies.
              </MiniCard>
              <MiniCard title="Performance">
                Improve page speed and reliability, diagnose bugs, and keep
                storage organized.
              </MiniCard>
              <MiniCard title="Support">
                Respond to messages via the Contact page (if you provide your email).
              </MiniCard>
            </div>
          </Card>

          <Card title="3) Where data is stored & processed" icon="🗄️">
            <p className="text-gray-300 text-sm leading-relaxed">
              GiveMeMIDI uses Supabase for authentication, database, and file
              storage. Files you upload are stored in buckets and access may be
              controlled by signed URLs and/or row-level security (RLS).
            </p>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Pill label="Auth" value="Supabase Auth" />
              <Pill label="Database" value="Postgres" />
              <Pill label="Storage" value="Buckets (MIDI/PDF)" />
            </div>
          </Card>

          <Card title="4) Sharing & visibility" icon="👀">
            <div className="space-y-3 text-gray-300 text-sm leading-relaxed">
              <p>
                Your <span className="text-white font-semibold">username</span>{" "}
                may be shown publicly next to your uploads and comments.
              </p>
              <p>
                Uploaded MIDI/PDF files may be available to other users depending
                on how access is configured (public bucket, signed URLs, etc.).
              </p>
              <p>
                We may disclose information if required by law or to protect the
                safety and integrity of the service.
              </p>
            </div>
          </Card>

          <Card id="your-choices" title="5) Your choices & controls" icon="🧰">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300 leading-relaxed">
              <MiniCard title="Edit your username">
                Change your username in{" "}
                <Link href="/profile" className="text-blue-300 hover:text-blue-200 font-semibold">
                  Profile
                </Link>
                .
              </MiniCard>
              <MiniCard title="Delete your comments">
                You can delete your own comments from the MIDI detail page.
              </MiniCard>
              <MiniCard title="Manage uploads">
                You can edit or remove your own uploads from your uploads page.
              </MiniCard>
              <MiniCard title="Reset password">
                Use the “Forgot password” flow (recommended) if you can’t sign in.
              </MiniCard>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-gray-300 leading-relaxed">
                Want your account removed? Use the{" "}
                <Link href="/contact" className="text-blue-300 hover:text-blue-200 font-semibold">
                  Contact
                </Link>{" "}
                page and we’ll help you out (subject to legal and safety requirements).
              </p>
            </div>
          </Card>

          <Card title="6) Cookies" icon="🍪">
            <p className="text-gray-300 text-sm leading-relaxed">
              Authentication may rely on browser storage/cookies to keep you signed
              in. We use these to provide core functionality (login, session
              persistence). If you block cookies/storage, some features may not work.
            </p>
          </Card>

          <Card title="7) Contact" icon="📬">
            <p className="text-gray-300 text-sm leading-relaxed">
              If you have questions about this policy, report a rights issue, or
              request help with your data, reach out via{" "}
              <Link href="/contact" className="text-blue-300 hover:text-blue-200 font-semibold">
                Contact
              </Link>
              .
            </p>
          </Card>

          {/* Footer CTA */}
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <Link
              href="/terms"
              className="flex-1 inline-flex items-center justify-center px-4 py-3 rounded-2xl
                         bg-white/5 border border-white/10 hover:bg-white/10 hover:border-blue-400/30
                         text-sm font-semibold transition"
            >
              Read Terms of Service →
            </Link>
            <Link
              href="/contact"
              className="flex-1 inline-flex items-center justify-center px-4 py-3 rounded-2xl
                         bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400
                         text-sm font-semibold shadow-lg transition"
            >
              Contact support →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function Card({
  id,
  title,
  icon,
  children,
}: {
  id?: string;
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8 shadow-xl"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 rounded-2xl border border-white/10 bg-black/20 flex items-center justify-center">
          <span className="text-lg">{icon}</span>
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold">{title}</h2>
          <div className="mt-1 h-px w-24 bg-gradient-to-r from-blue-500/60 to-indigo-500/60" />
        </div>
      </div>
      {children}
    </section>
  );
}

function MiniCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-white font-semibold">{title}</p>
      <div className="mt-2 text-gray-300">{children}</div>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4 text-sm text-blue-100">
      {children}
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-200">{value}</p>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold
                 hover:bg-white/10 hover:border-blue-400/30 transition"
    >
      {label}
    </a>
  );
}
