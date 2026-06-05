import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  FileMusic,
  Gavel,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserCheck,
  Zap,
} from "lucide-react";

const rules = [
  {
    icon: UploadCloud,
    title: "Upload responsibly",
    text: "Only upload MIDI or PDF files you own or have permission to share.",
  },
  {
    icon: MessageSquare,
    title: "Be respectful",
    text: "No harassment, hate, threats, spam, scams, or malicious links.",
  },
  {
    icon: ShieldCheck,
    title: "Protect the service",
    text: "Do not exploit bugs, bypass access controls, or overload the site.",
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#111827_0%,#020617_42%,#000_100%)] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:52px_52px]" />
        <div className="relative mx-auto max-w-6xl px-6 py-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-indigo-300/10 px-4 py-2 text-sm font-semibold text-indigo-100">
            <Gavel size={16} />
            Terms of Service
          </div>
          <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight md:text-6xl">
            Clear rules for a healthier MIDI library.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
            These Terms explain how to use GiveMeMIDI responsibly, what you can upload, and how we handle community behavior and rights concerns.
          </p>
          <p className="mt-4 text-xs text-slate-500">
            Last updated: <span className="text-slate-300">June 5, 2026</span>
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {rules.map(({ icon: Icon, title, text }) => (
            <div key={title} className="hover-shine card-lift rounded-3xl border border-white/10 bg-white/[0.045] p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-400/10 text-blue-200 ring-1 ring-blue-300/20">
                <Icon size={20} />
              </span>
              <h2 className="mt-4 font-black text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <TermsCard icon={<UserCheck />} title="1. Accounts">
            <ul className="space-y-3 text-sm leading-7 text-slate-300">
              <li>You are responsible for keeping your login details secure.</li>
              <li>Do not impersonate others or use misleading usernames.</li>
              <li>Accounts involved in abuse, spam, or repeated violations may be limited or suspended.</li>
            </ul>
          </TermsCard>

          <TermsCard icon={<FileMusic />} title="2. Uploads and copyright">
            <div className="space-y-3 text-sm leading-7 text-slate-300">
              <p>
                GiveMeMIDI is for sharing MIDI files and optional PDF sheet music. Upload only material you own or have the right to share.
              </p>
              <p>
                If content infringes someone&apos;s rights, we may remove it and take action on the account that uploaded it.
              </p>
              <p>
                To report a rights issue, use{" "}
                <Link href="/contact" className="font-bold text-cyan-200 hover:text-white">
                  Contact
                </Link>{" "}
                with the MIDI link, proof of ownership, and the action you are requesting.
              </p>
            </div>
            <div className="mt-5 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-4 text-sm leading-6 text-yellow-100">
              If you found a file online, that does not automatically mean you can upload it here.
            </div>
          </TermsCard>

          <TermsCard icon={<MessageSquare />} title="3. Community behavior">
            <div className="grid gap-4 md:grid-cols-2">
              <MiniRule title="Allowed">
                Helpful comments, respectful requests, ratings, bookmarks, follows, and constructive feedback.
              </MiniRule>
              <MiniRule title="Not allowed">
                Harassment, hate speech, threats, spam, doxxing, malicious links, scams, or deceptive download prompts.
              </MiniRule>
            </div>
          </TermsCard>

          <TermsCard icon={<Zap />} title="4. Service availability">
            <p className="text-sm leading-7 text-slate-300">
              We work to keep GiveMeMIDI reliable, but the site may occasionally be unavailable for maintenance, updates, or unexpected issues. Features, layouts, and limits may change to improve stability, safety, or user experience.
            </p>
          </TermsCard>

          <TermsCard icon={<AlertTriangle />} title="5. Prohibited behavior">
            <div className="grid gap-4 md:grid-cols-2">
              <MiniRule title="Security abuse">
                Attempting to bypass login, steal data, exploit vulnerabilities, or disrupt service.
              </MiniRule>
              <MiniRule title="Aggressive scraping">
                Automated extraction that harms performance or ignores access limits.
              </MiniRule>
              <MiniRule title="Malicious uploads">
                Files designed to harm devices, mislead users, or distribute malware.
              </MiniRule>
              <MiniRule title="Fraud and scams">
                Phishing, impersonation, or fake download links.
              </MiniRule>
            </div>
          </TermsCard>

          <TermsCard icon={<Gavel />} title="6. Liability and responsibility">
            <p className="text-sm leading-7 text-slate-300">
              GiveMeMIDI is provided as is. To the extent permitted by law, we are not liable for indirect damages, data loss, or issues caused by user-uploaded content. You are responsible for ensuring you have permission to use downloaded files.
            </p>
          </TermsCard>

          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-indigo-500/15 via-white/[0.045] to-cyan-300/10 p-6 md:p-8">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div>
                <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-cyan-200/80">
                  <Sparkles size={14} />
                  Related policies
                </p>
                <h2 className="mt-2 text-2xl font-black">Need help or clarification?</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  Read the privacy policy or contact support with questions about these Terms.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/privacy"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-bold text-slate-100 transition hover:border-cyan-300/40"
                >
                  Privacy
                </Link>
                <Link
                  href="/contact"
                  className="btn-glow inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 px-5 py-3 text-sm font-bold text-white"
                >
                  Contact
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function TermsCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-xl shadow-black/20 md:p-8">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-300/10 text-indigo-200 ring-1 ring-indigo-300/20">
          {icon}
        </span>
        <h2 className="text-xl font-black md:text-2xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function MiniRule({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card-lift rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="font-bold text-white">{title}</p>
      <div className="mt-2 text-sm leading-6 text-slate-400">{children}</div>
    </div>
  );
}
