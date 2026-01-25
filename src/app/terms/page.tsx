import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-black text-white">
      {/* subtle glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-44 left-1/2 -translate-x-1/2 h-72 w-[900px] rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 h-72 w-[720px] rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300">
            <span className="text-indigo-300">📜</span>
            Terms of Service
          </div>

          <h1 className="mt-4 text-4xl md:text-5xl font-extrabold leading-tight">
            Rules that keep{" "}
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              GiveMeMIDI
            </span>{" "}
            healthy
          </h1>

          <p className="mt-3 text-gray-400 max-w-3xl">
            By using GiveMeMIDI, you agree to these Terms. They exist to protect
            creators, users, and the service.
          </p>

          <div className="mt-4 text-xs text-gray-500">
            Last updated: <span className="text-gray-300">January 11, 2026</span>
          </div>
        </div>

        {/* Key rules */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <RuleCard title="Upload responsibly" icon="⬆️">
            Only upload MIDI/PDF you own or have permission to share.
          </RuleCard>
          <RuleCard title="Be respectful" icon="💬">
            No harassment, hate, or spam in comments.
          </RuleCard>
          <RuleCard title="No abuse" icon="🛡️">
            Don’t exploit bugs, scrape aggressively, or break the service.
          </RuleCard>
        </div>

        <div className="space-y-6">
          <Card title="1) Accounts" icon="👤">
            <ul className="space-y-3 text-gray-300 text-sm leading-relaxed">
              <li>
                You’re responsible for keeping your account secure (passwords,
                access to your email, etc.).
              </li>
              <li>
                You must not impersonate others or choose misleading usernames.
              </li>
              <li>
                We may suspend accounts engaged in abuse, spam, or violations.
              </li>
            </ul>
          </Card>

          <Card title="2) Uploads & copyright" icon="©️">
            <div className="space-y-3 text-gray-300 text-sm leading-relaxed">
              <p>
                GiveMeMIDI is built for sharing and discovering MIDI and optional
                PDF sheet music. Upload only content you have the rights to share.
              </p>
              <p>
                If you upload content that infringes someone’s rights, we may remove
                it and take action on your account.
              </p>
              <p>
                To report a copyright issue, use{" "}
                <Link href="/contact" className="text-blue-300 hover:text-blue-200 font-semibold">
                  Contact
                </Link>{" "}
                with details (link, proof of ownership, and the requested action).
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-yellow-400/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
              Tip: If you’re uploading a cover/transcription, make sure you’re allowed
              to share it publicly. “Found it online” isn’t permission.
            </div>
          </Card>

          <Card title="3) Comments & community" icon="🗣️">
            <ul className="space-y-3 text-gray-300 text-sm leading-relaxed">
              <li>No harassment, hate speech, or threats.</li>
              <li>No spam, scams, or malicious links.</li>
              <li>No doxxing or sharing personal data.</li>
              <li>We may remove content that violates these rules.</li>
            </ul>
          </Card>

          <Card title="4) Service availability" icon="⚡">
            <div className="space-y-3 text-gray-300 text-sm leading-relaxed">
              <p>
                We aim for high availability, but the service may occasionally be
                down for maintenance or unexpected issues.
              </p>
              <p>
                We may update features, change layouts, or adjust limits to improve
                stability and prevent abuse.
              </p>
            </div>
          </Card>

          <Card title="5) Prohibited behavior" icon="⛔">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
              <MiniCard title="Security abuse">
                Attempting to bypass authentication, steal data, or exploit vulnerabilities.
              </MiniCard>
              <MiniCard title="Aggressive scraping">
                Automated extraction that harms performance or violates access controls.
              </MiniCard>
              <MiniCard title="Malicious uploads">
                Uploading files intended to harm devices or users (malware, deceptive content).
              </MiniCard>
              <MiniCard title="Fraud & scams">
                Phishing, impersonation, or misleading “download” links.
              </MiniCard>
            </div>
          </Card>

          <Card title="6) Limitation of liability" icon="⚖️">
            <p className="text-gray-300 text-sm leading-relaxed">
              GiveMeMIDI is provided “as is”. To the extent permitted by law, we
              aren’t liable for indirect damages, loss of data, or issues caused by
              user-uploaded content. You are responsible for ensuring you have
              permission to use downloaded content.
            </p>
          </Card>

          <Card title="7) Privacy" icon="🔒">
            <p className="text-gray-300 text-sm leading-relaxed">
              Our{" "}
              <Link href="/privacy" className="text-blue-300 hover:text-blue-200 font-semibold">
                Privacy Policy
              </Link>{" "}
              explains what data we collect and why.
            </p>
          </Card>

          <Card title="8) Contact" icon="📬">
            <p className="text-gray-300 text-sm leading-relaxed">
              Questions about these Terms? Reach out via{" "}
              <Link href="/contact" className="text-blue-300 hover:text-blue-200 font-semibold">
                Contact
              </Link>
              .
            </p>
          </Card>

          {/* Footer CTA */}
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <Link
              href="/privacy"
              className="flex-1 inline-flex items-center justify-center px-4 py-3 rounded-2xl
                         bg-white/5 border border-white/10 hover:bg-white/10 hover:border-blue-400/30
                         text-sm font-semibold transition"
            >
              Read Privacy Policy →
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
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8 shadow-xl">
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
      <div className="mt-2 text-gray-300 leading-relaxed">{children}</div>
    </div>
  );
}

function RuleCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl border border-white/10 bg-black/20 flex items-center justify-center">
          <span className="text-lg">{icon}</span>
        </div>
        <p className="text-white font-extrabold">{title}</p>
      </div>
      <p className="mt-3 text-sm text-gray-400 leading-relaxed">{children}</p>
    </div>
  );
}
