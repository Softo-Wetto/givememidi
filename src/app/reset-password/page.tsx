"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supbaseClient";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);

  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // When the user lands here from the email link, Supabase establishes a recovery session.
    // We can just mark ready after a session check.
    (async () => {
      const { data } = await supabase.auth.getSession();
      // If session is null, they likely opened this page without the email link
      setReady(true);
    })();
  }, []);

  const submit = async () => {
    if (pw.length < 8) return alert("Password must be at least 8 characters.");
    if (pw !== confirm) return alert("Passwords do not match.");

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);

    if (error) {
      alert(error.message || "Could not update password.");
      return;
    }

    setDone(true);

    // optional: kick them to login after a moment
    setTimeout(() => router.push("/login"), 800);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6 flex items-center justify-center">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="text-blue-300" size={18} />
          <h1 className="text-2xl font-extrabold">Set a new password</h1>
        </div>

        <p className="text-sm text-gray-400 mb-6">
          Choose a new password for your account.
        </p>

        {!ready ? (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="animate-spin" size={18} /> Loading…
          </div>
        ) : done ? (
          <div className="flex items-start gap-3 rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
            <CheckCircle2 className="text-green-300 mt-0.5" size={18} />
            <div>
              <p className="font-semibold text-green-200">Password updated!</p>
              <p className="text-sm text-green-200/80">Redirecting to login…</p>
            </div>
          </div>
        ) : (
          <>
            <label className="block text-sm text-gray-300 mb-2">New password</label>
            <div className="flex items-center gap-2 rounded-xl bg-gray-900/60 border border-white/10 px-3">
              <input
                type={show ? "text" : "password"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="w-full py-3 bg-transparent outline-none"
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="text-gray-400 hover:text-gray-200 transition"
                title={show ? "Hide" : "Show"}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <label className="block text-sm text-gray-300 mt-4 mb-2">Confirm password</label>
            <div className="flex items-center gap-2 rounded-xl bg-gray-900/60 border border-white/10 px-3">
              <input
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full py-3 bg-transparent outline-none"
                placeholder="Repeat password"
              />
            </div>

            <button
              onClick={submit}
              disabled={saving || !pw || pw !== confirm}
              className="mt-6 w-full py-3 rounded-2xl font-semibold transition
                         bg-gradient-to-r from-blue-500 to-indigo-500
                         hover:from-blue-400 hover:to-indigo-400
                         disabled:opacity-50 shadow-lg inline-flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : null}
              Update password
            </button>

            <p className="mt-3 text-xs text-gray-500">
              If you opened this page without a valid reset link, request a new one from the login page.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
