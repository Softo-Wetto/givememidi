"use client";

import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileWarning,
  Lightbulb,
  Loader2,
  Mail,
  MessageSquare,
  Music2,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const presets = [
  {
    label: "Copyright concern",
    subject: "Copyright concern",
    icon: FileWarning,
    hint: "Include the MIDI title, link, proof of ownership, and requested action.",
  },
  {
    label: "MIDI request",
    subject: "MIDI request",
    icon: Music2,
    hint: "Share the song or reference link, preferred key, and any score details.",
  },
  {
    label: "Bug report",
    subject: "Bug report",
    icon: AlertTriangle,
    hint: "Include the page, browser, what happened, and what you expected.",
  },
  {
    label: "Feature idea",
    subject: "Feature idea",
    icon: Lightbulb,
    hint: "Tell us what workflow it improves and who it helps.",
  },
];

export default function ContactPage() {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const emailOk = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);
  const messageLength = message.trim().length;
  const canSend = emailOk && messageLength >= 10 && !sending;
  const progress = Math.min(100, Math.round((messageLength / 180) * 100));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("idle");
    setStatusMsg("");

    if (!emailOk) {
      setStatus("error");
      setStatusMsg("Please enter a valid email address.");
      return;
    }

    if (messageLength < 10) {
      setStatus("error");
      setStatusMsg("Message is too short. Add a bit more detail.");
      return;
    }

    setSending(true);

    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      }),
    });

    setSending(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus("error");
      setStatusMsg(payload?.error ?? "Couldn't send right now. Please try again in a moment.");
      return;
    }

    setStatus("success");
    setStatusMsg("Sent. Thanks, we'll get back to you soon.");
    setEmail("");
    setSubject("");
    setMessage("");
    setSelectedPreset(null);
  };

  const applyPreset = (preset: (typeof presets)[number]) => {
    setSelectedPreset(preset.label);
    setSubject(preset.subject);
    setMessage((current) => current || `${preset.subject}\n\n`);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#111827_0%,#020617_42%,#000_100%)] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:52px_52px]" />
        <div className="relative mx-auto max-w-6xl px-6 py-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100">
            <MessageSquare size={16} />
            Contact support
          </div>
          <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight md:text-6xl">
            Tell us what needs attention.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
            Send copyright concerns, bug reports, feature ideas, and MIDI requests. The more detail you include, the faster we can respond.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-12 lg:grid-cols-[1fr_380px]">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] shadow-2xl shadow-black/25">
          <div className="border-b border-white/10 bg-black/25 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300/80">
              Message details
            </p>
            <h2 className="mt-2 text-2xl font-black">Choose a topic</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {presets.map((preset) => {
                const Icon = preset.icon;
                const active = selectedPreset === preset.label;

                return (
                  <button
                    key={preset.label}
                    onClick={() => applyPreset(preset)}
                    className={`card-lift rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-cyan-300/40 bg-cyan-300/10"
                        : "border-white/10 bg-black/20 hover:border-cyan-300/30"
                    }`}
                    type="button"
                  >
                    <span className="flex items-center gap-2 font-bold text-white">
                      <Icon size={17} className="text-cyan-300" />
                      {preset.label}
                    </span>
                    <span className="mt-2 block text-xs leading-5 text-slate-400">{preset.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-5 p-5 md:p-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">Your email</label>
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/60 px-3 transition focus-within:border-cyan-300/50 focus-within:ring-2 focus-within:ring-cyan-300/20">
                <Mail size={16} className="text-gray-400" />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  placeholder="you@example.com"
                  className="w-full bg-transparent py-3 text-white outline-none placeholder:text-gray-500"
                />
              </div>
              {!emailOk && email.length > 0 ? (
                <p className="mt-1 text-xs text-red-300">Please enter a valid email.</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">
                Subject <span className="text-gray-500">(optional)</span>
              </label>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="e.g. MIDI request, bug report, copyright claim..."
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-white outline-none transition placeholder:text-gray-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">Message</label>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={7}
                placeholder="Tell us what you need..."
                className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-white outline-none transition placeholder:text-gray-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
              />
              <div className="mt-2 flex items-center justify-between gap-4 text-xs text-gray-500">
                <span>Minimum 10 characters.</span>
                <span>{messageLength} chars</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {status !== "idle" ? (
              <div
                className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm ${
                  status === "success"
                    ? "border-green-500/20 bg-green-500/10 text-green-200"
                    : "border-red-500/20 bg-red-500/10 text-red-200"
                }`}
              >
                {status === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                {statusMsg}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSend}
              className="btn-glow inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 px-5 py-3 font-bold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={17} />
                  Send message
                </>
              )}
            </button>
          </form>
        </div>

        <aside className="space-y-5">
          <InfoCard icon={<ShieldCheck />} title="Rights reports">
            Include the MIDI page link, proof of ownership, and whether you want attribution, correction, or removal.
          </InfoCard>
          <InfoCard icon={<Clock3 />} title="What happens next">
            Your message goes to support. We keep enough context to reply and follow up properly.
          </InfoCard>
          <InfoCard icon={<Sparkles />} title="Better requests">
            For MIDI requests, include a reference link, genre, key, tempo, and whether you need a PDF score.
          </InfoCard>
        </aside>
      </section>
    </main>
  );
}

function InfoCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="hover-shine rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/20">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200 ring-1 ring-cyan-300/20">
        {icon}
      </span>
      <h3 className="mt-4 font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{children}</p>
    </div>
  );
}
