"use client";

import { useState } from "react";
import { supabase } from "../../lib/supbaseClient";
import { ensureProfileForCurrentUser } from "../../lib/ensureProfile";
import { Mail, Lock, Loader2, KeyRound } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawRedirect = searchParams.get("redirect") || "/upload";

  // only allow internal paths, and never allow redirecting to /login
  const redirect =
    rawRedirect.startsWith("/") &&
    !rawRedirect.startsWith("//") &&
    !rawRedirect.startsWith("/login")
      ? rawRedirect
      : "/upload";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"signin" | "signup" | "oauth" | "reset" | null>(null);

  // forgot password UI
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const signIn = async () => {
    const e = email.trim();
    if (!e || !password) return alert("Enter email and password.");

    setLoading("signin");
    const { error } = await supabase.auth.signInWithPassword({ email: e, password });
    setLoading(null);

    if (error) return alert(error.message);

    await ensureProfileForCurrentUser();

    router.replace(redirect);
    router.refresh();
  };

  const signUp = async () => {
    const e = email.trim();
    if (!e || !password) return alert("Enter email and password.");

    setLoading("signup");
    const { error } = await supabase.auth.signUp({ email: e, password });
    setLoading(null);

    if (error) return alert(error.message);

    // If email confirmation is enabled, they must confirm before they can log in
    await ensureProfileForCurrentUser();
    alert("Account created! If email confirmation is enabled, check your inbox. Then log in.");
  };

  const signInWithProvider = async (provider: "google" | "github") => {
    setLoading("oauth");

    await supabase.auth.signInWithOAuth({
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

    // IMPORTANT: set this URL in Supabase Auth settings too (see notes below)
    const redirectTo = `${location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(e, { redirectTo });

    setLoading(null);

    if (error) {
      alert(error.message);
      return;
    }

    setResetSent(true);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white p-6">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-8 shadow-xl space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-extrabold">Log in</h1>
          <p className="text-sm text-gray-400">Access uploads, bookmarks, and comments.</p>
        </div>

        {/* Email */}
        <div>
          <label className="text-sm text-gray-400">Email</label>
          <div className="mt-2 flex items-center gap-2 bg-gray-800/70 border border-gray-700 rounded-xl px-3 focus-within:ring-2 focus-within:ring-blue-400/70">
            <Mail size={16} className="text-gray-400" />
            <input
              type="email"
              autoComplete="email"
              className="w-full py-3 bg-transparent outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-400">Password</label>

            <button
              type="button"
              onClick={() => {
                setResetEmail(email.trim());
                setResetSent(false);
                setResetOpen(true);
              }}
              className="text-xs font-semibold text-blue-300 hover:text-blue-200 transition"
            >
              Forgot password?
            </button>
          </div>

          <div className="mt-2 flex items-center gap-2 bg-gray-800/70 border border-gray-700 rounded-xl px-3 focus-within:ring-2 focus-within:ring-blue-400/70">
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

        {/* Log in */}
        <button
          onClick={signIn}
          disabled={!!loading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 font-semibold
                     hover:from-blue-400 hover:to-indigo-400 transition disabled:opacity-50
                     shadow-lg flex items-center justify-center gap-2"
        >
          {loading === "signin" ? <Loader2 className="animate-spin" size={18} /> : null}
          {loading === "signin" ? "Signing in..." : "Log In"}
        </button>

        {/* Sign up prompt */}
        <p className="text-sm text-center text-gray-400">
          Don&apos;t have an account?{" "}
          <button
            onClick={signUp}
            disabled={!!loading}
            className="text-blue-400 hover:text-blue-300 font-semibold transition disabled:opacity-50"
          >
            Sign Up
          </button>
        </p>

        {/* Divider */}
        <div className="flex items-center gap-3 text-gray-500 text-sm">
          <div className="flex-1 h-px bg-gray-700" />
          OR
          <div className="flex-1 h-px bg-gray-700" />
        </div>

        {/* SSO */}
        <div className="space-y-3">
          <button
            onClick={() => signInWithProvider("google")}
            disabled={!!loading}
            className="w-full py-3 rounded-xl bg-white text-black font-semibold hover:bg-gray-200 transition disabled:opacity-50"
          >
            Continue with Google
          </button>

          <button
            onClick={() => signInWithProvider("github")}
            disabled={!!loading}
            className="w-full py-3 rounded-xl bg-gray-900 border border-gray-700 font-semibold hover:bg-gray-800 transition disabled:opacity-50"
          >
            Continue with GitHub
          </button>

          <p className="text-xs text-gray-500 text-center pt-1">
            By continuing you agree to use uploads responsibly.
          </p>
        </div>
      </div>

      {/* Forgot password modal */}
      {resetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          onClick={() => setResetOpen(false)}
        >
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
                <p className="text-sm text-gray-400 mb-4">
                  Enter your email and we’ll send you a reset link.
                </p>

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
                  Done ✅ If an account exists for <span className="font-semibold">{resetEmail}</span>,
                  you’ll receive an email shortly.
                </p>

                <button
                  onClick={() => setResetOpen(false)}
                  className="mt-5 w-full py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                >
                  Close
                </button>

                <p className="mt-3 text-xs text-gray-500">
                  Tip: Check spam/junk if you don’t see it.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
