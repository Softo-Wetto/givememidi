"use client";

import { useMemo, useState } from "react";
import { supabase } from "../../lib/supbaseClient"; // ✅ use your existing client
import { Mail, MessageSquare, Send, ShieldCheck, Loader2 } from "lucide-react";

export default function ContactPage() {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");

  const emailOk = useMemo(() => {
    // simple email check, good enough for UI
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }, [email]);

  const canSend = emailOk && message.trim().length >= 10 && !sending;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    setStatusMsg("");

    if (!emailOk) {
      setStatus("error");
      setStatusMsg("Please enter a valid email address.");
      return;
    }

    if (message.trim().length < 10) {
      setStatus("error");
      setStatusMsg("Message is too short — add a bit more detail (10+ chars).");
      return;
    }

    setSending(true);

    const { error } = await supabase.from("contact_messages").insert({
      email: email.trim(),
      subject: subject.trim() ? subject.trim() : null,
      message: message.trim(),
    });

    setSending(false);

    if (error) {
      console.error(error);
      setStatus("error");
      setStatusMsg("Couldn’t send right now. Please try again in a moment.");
      return;
    }

    setStatus("success");
    setStatusMsg("Sent! Thanks — we’ll get back to you soon.");
    setEmail("");
    setSubject("");
    setMessage("");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* background glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 h-[420px] w-[420px] rounded-full bg-indigo-500/20 blur-3xl" />

      <div className="relative max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300">
            <MessageSquare size={16} className="text-blue-400" />
            Contact
          </div>

          <h1 className="mt-4 text-3xl md:text-4xl font-extrabold">
            Get in touch{" "}
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              anytime
            </span>
          </h1>

          <p className="mt-2 text-gray-400 max-w-2xl">
            Questions, requests, or copyright concerns? Send a message and we’ll
            respond as soon as possible.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Form */}
          <div className="lg:col-span-3 bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 shadow-xl">
            <form onSubmit={onSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Your email</label>
                <div className="flex items-center gap-2 rounded-xl bg-gray-900/60 border border-gray-700 px-3 focus-within:ring-2 focus-within:ring-blue-400/60">
                  <Mail size={16} className="text-gray-400" />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="you@example.com"
                    className="w-full py-3 bg-transparent outline-none text-white placeholder:text-gray-500"
                  />
                </div>
                {!emailOk && email.length > 0 && (
                  <p className="mt-1 text-xs text-red-300">Please enter a valid email.</p>
                )}
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Subject <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. MIDI request, bug report, copyright claim…"
                  className="w-full p-3 rounded-xl bg-gray-900/60 border border-gray-700
                    focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400/40
                    placeholder:text-gray-500"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  placeholder="Tell us what you need…"
                  className="w-full p-3 rounded-xl bg-gray-900/60 border border-gray-700
                    focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400/40
                    placeholder:text-gray-500 resize-none"
                />
                <div className="mt-1 flex justify-between text-xs text-gray-500">
                  <span>Minimum 10 characters.</span>
                  <span>{message.trim().length} chars</span>
                </div>
              </div>

              {/* Status */}
              {status !== "idle" && (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    status === "success"
                      ? "bg-green-500/10 border-green-500/20 text-green-200"
                      : "bg-red-500/10 border-red-500/20 text-red-200"
                  }`}
                >
                  {statusMsg}
                </div>
              )}

              {/* Send */}
              <button
                type="submit"
                disabled={!canSend}
                className="w-full py-3 rounded-2xl font-semibold transition
                  bg-gradient-to-r from-blue-500 to-indigo-500
                  hover:from-blue-400 hover:to-indigo-400
                  disabled:opacity-40 disabled:cursor-not-allowed
                  shadow-lg"
              >
                {sending ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={18} />
                    Sending…
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Send size={16} />
                    Send message
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* Side panel */}
          <aside className="lg:col-span-2 space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="text-indigo-300" size={18} />
                <h3 className="font-bold text-lg">Quick notes</h3>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400" />
                  For copyright issues, include the MIDI title + proof of ownership.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400" />
                  Requests are welcome — add reference links if possible.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400" />
                  We store messages in our database so we can respond.
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-r from-blue-500/15 to-indigo-500/15 border border-white/10 rounded-3xl p-6 shadow-xl">
              <h3 className="font-bold text-lg">Prefer email?</h3>
              <p className="text-sm text-gray-300 mt-2">
                You can also contact us directly at{" "}
                <span className="font-semibold text-white">support@givememidi.com</span>{" "}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
