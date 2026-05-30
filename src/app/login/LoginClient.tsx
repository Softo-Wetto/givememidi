"use client";

import { useState } from "react";
import { pocketbase } from "../../lib/pocketbaseClient";
import { ensureProfileForCurrentUser } from "../../lib/ensureProfile";
import { ArrowRight, KeyRound, Loader2, Lock, Mail, Music2, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function LoginClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawRedirect = searchParams.get("redirect") || "/upload";

  const redirect =
    rawRedirect.startsWith("/") &&
    !rawRedirect.startsWith("//") &&
    !rawRedirect.startsWith("/login")
      ? rawRedirect
      : "/upload";

  const [identity, setIdentity] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState<
    "signin" | "signup" | "oauth" | "reset" | null
  >(null);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const signIn = async () => {
    const login = identity.trim();
    if (!login || !password) return alert("Enter username or email and password.");

    setLoading("signin");
    const { error } = await pocketbase.auth.signInWithPassword({ email: login, password });
    setLoading(null);

    if (error) return alert(error.message);

    await ensureProfileForCurrentUser();

    router.replace(redirect);
    router.refresh();
  };

  const signUp = async () => {
    const e = identity.trim();
    const username = signupUsername.trim();
    if (!e || !password) return alert("Enter email and password.");
    if (!e.includes("@")) return alert("Please use an email address to create an account. You can log in with your username afterward.");
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return alert("Choose a username with 3-20 letters, numbers, or underscores.");
    }

    setLoading("signup");
    const { error } = await pocketbase.auth.signUp({ email: e, password, username });
    setLoading(null);

    if (error) return alert(error.message);

    await ensureProfileForCurrentUser();
    alert("Account created! If email confirmation is enabled, check your inbox. Then log in.");
  };

  const signInWithProvider = async (provider: "google" | "github") => {
    setLoading("oauth");

    await pocketbase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    });
  };

  const sendResetEmail = async () => {
    const e = resetEmail.trim();
    if (!e) return alert("Enter your email.");

    setLoading("reset");
    const redirectTo = `${location.origin}/reset-password`;
    const { error } = await pocketbase.auth.resetPasswordForEmail(e, { redirectTo });
    setLoading(null);

    if (error) return alert(error.message);

    setResetSent(true);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#111827_0%,#020617_45%,#000_100%)] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-6 py-12 lg:grid-cols-[1fr_440px]">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="hidden lg:block"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-blue-100">
            <Sparkles size={16} className="text-cyan-300" />
            Creator tools, clean previews, fast collecting.
          </div>

          <h1 className="mt-6 max-w-2xl text-5xl font-black leading-[1.02] tracking-tight">
            Your MIDI library, tuned for speed.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
            Sign in to upload arrangements, bookmark discoveries, rate MIDI files, and keep your creative finds in one place.
          </p>

          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            {[
              ["Uploads", "Share MIDI and PDF"],
              ["Bookmarks", "Save favorites"],
              ["Ratings", "Guide the best files"],
            ].map(([label, value]) => (
              <div key={label} className="card-lift rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
                <p className="mt-2 text-sm font-semibold text-slate-100">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 h-28 max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-black/30 p-4">
            <div className="flex h-full items-end gap-2">
              {Array.from({ length: 28 }).map((_, i) => (
                <span
                  key={i}
                  className="motion-bar block flex-1 rounded-t bg-gradient-to-t from-blue-500/50 to-cyan-300/80"
                  style={{
                    height: `${28 + ((i * 17) % 58)}%`,
                    animationDelay: `${i * 45}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.38, ease: "easeOut" }}
          className="w-full rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-blue-950/30 backdrop-blur-xl sm:p-8"
        >
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-200 ring-1 ring-blue-300/20">
                <Music2 size={22} />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                {mode === "signin" ? "Welcome back" : "Create account"}
              </h1>
              <p className="mt-1 text-sm text-gray-400">
                {mode === "signin"
                  ? "Log in with your email or username."
                  : "Use an email to start. Your username works for future logins."}
              </p>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 rounded-2xl border border-white/10 bg-black/30 p-1">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                mode === "signin" ? "bg-white text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                mode === "signup" ? "bg-white text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              Create
            </button>
          </div>

        <div>
          <label className="text-sm text-gray-400">
            {mode === "signin" ? "Email or username" : "Email"}
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/35 px-3 transition focus-within:border-blue-300/60 focus-within:ring-2 focus-within:ring-blue-400/40">
            {mode === "signin" ? (
              <UserRound size={16} className="text-gray-400" />
            ) : (
              <Mail size={16} className="text-gray-400" />
            )}
            <input
              type={mode === "signin" ? "text" : "email"}
              autoComplete={mode === "signin" ? "username" : "email"}
              className="w-full py-3 bg-transparent outline-none"
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              placeholder={mode === "signin" ? "you@email.com or username" : "you@email.com"}
            />
          </div>
        </div>

        {mode === "signup" ? (
          <div className="mt-4">
            <label className="text-sm text-gray-400">Username</label>
            <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/35 px-3 transition focus-within:border-blue-300/60 focus-within:ring-2 focus-within:ring-blue-400/40">
              <UserRound size={16} className="text-gray-400" />
              <input
                type="text"
                autoComplete="username"
                className="w-full bg-transparent py-3 outline-none"
                value={signupUsername}
                onChange={(e) => setSignupUsername(e.target.value)}
                placeholder="your_username"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              You can use this username to log in later.
            </p>
          </div>
        ) : null}

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-400">Password</label>

            <button
              type="button"
              onClick={() => {
                setResetEmail(identity.includes("@") ? identity.trim() : "");
                setResetSent(false);
                setResetOpen(true);
              }}
              className="text-xs font-semibold text-blue-300 hover:text-blue-200 transition"
            >
              Forgot password?
            </button>
          </div>

          <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/35 px-3 transition focus-within:border-blue-300/60 focus-within:ring-2 focus-within:ring-blue-400/40">
            <Lock size={16} className="text-gray-400" />
            <input
              type="password"
              autoComplete="current-password"
              className="w-full py-3 bg-transparent outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          onClick={mode === "signin" ? signIn : signUp}
          disabled={!!loading}
          className="btn-glow tap mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 py-3 font-bold shadow-lg shadow-blue-950/40 transition hover:brightness-110 disabled:opacity-50"
        >
          {loading === mode ? <Loader2 className="animate-spin" size={18} /> : null}
          {loading === mode ? (mode === "signin" ? "Signing in..." : "Creating...") : mode === "signin" ? "Log in" : "Create account"}
          {!loading ? <ArrowRight size={18} /> : null}
        </button>

        <p className="mt-4 text-center text-sm text-gray-400">
          {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            disabled={!!loading}
            className="text-blue-400 hover:text-blue-300 font-semibold transition disabled:opacity-50"
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>

        <div className="my-5 flex items-center gap-3 text-gray-500 text-sm">
          <div className="flex-1 h-px bg-white/10" />
          OR
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <div className="space-y-3">
          <button
            onClick={() => signInWithProvider("google")}
            disabled={!!loading}
            className="tap w-full rounded-2xl bg-white py-3 font-semibold text-black transition hover:bg-gray-200 disabled:opacity-50"
          >
            Continue with Google
          </button>

          <button
            onClick={() => signInWithProvider("github")}
            disabled={!!loading}
            className="tap w-full rounded-2xl border border-white/10 bg-black/35 py-3 font-semibold transition hover:bg-white/10 disabled:opacity-50"
          >
            Continue with GitHub
          </button>

          <p className="flex items-center justify-center gap-2 pt-1 text-center text-xs text-gray-500">
            <ShieldCheck size={14} />
            Use uploads responsibly.
          </p>
        </div>
        </motion.div>
      </div>

      {resetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={() => setResetOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          <div
            className="relative w-full max-w-md rounded-3xl border border-white/10 bg-gray-950/80 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="text-blue-300" size={18} />
              <h2 className="text-lg font-bold">Reset password</h2>
            </div>

            {!resetSent ? (
              <>
                <p className="text-sm text-gray-400 mb-4">Enter your email and we’ll send you a reset link.</p>

                <div className="flex items-center gap-2 bg-gray-800/70 border border-gray-700 rounded-xl px-3 focus-within:ring-2 focus-within:ring-blue-400/70">
                  <Mail size={16} className="text-gray-400" />
                  <input
                    type="email"
                    className="w-full py-3 bg-transparent outline-none"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="you@email.com"
                  />
                </div>

                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => setResetOpen(false)}
                    className="flex-1 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={sendResetEmail}
                    disabled={loading === "reset"}
                    className="flex-1 py-3 rounded-2xl font-semibold transition
                               bg-gradient-to-r from-blue-500 to-indigo-500
                               hover:from-blue-400 hover:to-indigo-400
                               disabled:opacity-50 shadow-lg inline-flex items-center justify-center gap-2"
                  >
                    {loading === "reset" ? <Loader2 className="animate-spin" size={18} /> : null}
                    Send link
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-300">
                  Done ✅ If an account exists for <span className="font-semibold">{resetEmail}</span>, you’ll receive an email shortly.
                </p>

                <button
                  onClick={() => setResetOpen(false)}
                  className="mt-5 w-full py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                >
                  Close
                </button>

                <p className="mt-3 text-xs text-gray-500">Tip: Check spam/junk if you don’t see it.</p>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
