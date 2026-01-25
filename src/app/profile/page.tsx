"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supbaseClient";
import { useRouter } from "next/navigation";
import {
  Loader2,
  User,
  Save,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  LogOut,
  ShieldCheck,
} from "lucide-react";

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);

  // Provider (password/google/github etc)
  const [provider, setProvider] = useState<string>("unknown");

  // Password change form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const pwStrength = useMemo(() => {
    const p = newPassword;
    if (!p) return { label: "—", score: 0 };

    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[a-z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;

    const label =
      score <= 1 ? "Weak" : score === 2 ? "Okay" : score === 3 ? "Good" : "Strong";
    return { label, score };
  }, [newPassword]);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        router.push("/login?redirect=/profile");
        return;
      }

      setEmail(user.email ?? null);
      setMemberSince(user.created_at ?? null);

      // provider extraction
      // user.app_metadata.provider is common, but identities is safest
      const id0 = user.identities?.[0];
      const p = id0?.provider || (user.app_metadata as any)?.provider || "unknown";
      setProvider(p);

      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

      if (error) console.error("Profile fetch error:", error);
      setUsername(data?.username ?? "");
      setLoading(false);
    })();
  }, [router]);

  const saveProfile = async () => {
    const clean = username.trim();
    if (!clean) return alert("Username cannot be empty.");
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(clean)) {
      return alert("Username must be 3–20 chars and contain only letters, numbers, underscore.");
    }

    setSavingProfile(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setSavingProfile(false);
      router.push("/login?redirect=/profile");
      return;
    }

    const { error } = await supabase.from("profiles").update({ username: clean }).eq("id", user.id);

    setSavingProfile(false);

    if (error) {
      console.error("Profile update error:", error);
      alert("That username might already be taken (or update failed).");
      return;
    }

    alert("Profile updated!");
  };

  const changePassword = async () => {
    if (!newPassword) return alert("Please enter a new password.");
    if (newPassword.length < 8) return alert("Password must be at least 8 characters.");
    if (newPassword !== confirmPassword) return alert("Passwords do not match.");

    setSavingPassword(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setSavingPassword(false);

    if (error) {
      console.error("Password update error:", error);
      alert(error.message || "Could not update password.");
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    alert("Password updated!");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const copyEmail = async () => {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      alert("Email copied!");
    } catch {
      alert("Could not copy email.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-400 gap-2">
        <Loader2 className="animate-spin" /> Loading profile…
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header card */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-blue-500/15 border border-blue-400/20 flex items-center justify-center">
                <User className="text-blue-300" size={18} />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold">Profile</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="text-gray-300 text-sm">{email}</p>
                  <button
                    onClick={copyEmail}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                               border border-white/10 bg-white/5 text-xs text-gray-300
                               hover:bg-white/10 transition"
                    title="Copy email"
                  >
                    <Copy size={14} /> Copy
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-gray-300">
                    <ShieldCheck size={14} className="text-green-300" />
                    Member since <span className="text-gray-100 font-semibold">{formatDate(memberSince)}</span>
                  </span>

                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-gray-300">
                    Auth: <span className="text-gray-100 font-semibold">{provider}</span>
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl
                         border border-red-500/30 text-red-300
                         hover:bg-red-500/10 transition"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>

        {/* Username card */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-xl">
          <h2 className="text-xl font-semibold mb-1">Public profile</h2>
          <p className="text-sm text-gray-400 mb-6">
            This username is shown on your uploads and comments.
          </p>

          <label className="block text-sm text-gray-300 mb-2">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 rounded-xl bg-gray-900/60 border border-white/10
                       focus:outline-none focus:ring-2 focus:ring-blue-400/70"
            placeholder="your_username"
          />
          <p className="text-xs text-gray-500 mt-2">3–20 chars. Letters, numbers, underscore.</p>

          <button
            onClick={saveProfile}
            disabled={savingProfile}
            className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl
                       bg-gradient-to-r from-blue-500 to-indigo-500
                       hover:from-blue-400 hover:to-indigo-400
                       font-semibold shadow-lg transition disabled:opacity-50"
          >
            {savingProfile ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Save username
          </button>
        </div>

        {/* Password card */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-xl">
          <h2 className="text-xl font-semibold mb-1">Security</h2>
          <p className="text-sm text-gray-400 mb-6">
            Update your password to keep your account secure.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">New password</label>
              <div className="flex items-center gap-2 rounded-xl bg-gray-900/60 border border-white/10 px-3">
                <KeyRound size={16} className="text-gray-400" />
                <input
                  type={showPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full py-3 bg-transparent outline-none"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="text-gray-400 hover:text-gray-200 transition"
                  title={showPw ? "Hide" : "Show"}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Strength: <span className="text-gray-200 font-semibold">{pwStrength.label}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Confirm password</label>
              <div className="flex items-center gap-2 rounded-xl bg-gray-900/60 border border-white/10 px-3">
                <KeyRound size={16} className="text-gray-400" />
                <input
                  type={showPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full py-3 bg-transparent outline-none"
                  placeholder="Repeat password"
                />
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="mt-2 text-xs text-red-300">Passwords don’t match.</p>
              )}
            </div>
          </div>

          <button
            onClick={changePassword}
            disabled={savingPassword || !newPassword || newPassword !== confirmPassword}
            className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl
                       bg-gradient-to-r from-indigo-500 to-blue-500
                       hover:from-indigo-400 hover:to-blue-400
                       font-semibold shadow-lg transition disabled:opacity-50"
          >
            {savingPassword ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={18} />}
            Change password
          </button>

          {provider !== "email" && provider !== "unknown" && (
            <p className="mt-4 text-xs text-gray-500">
              Note: You’re signed in with <span className="text-gray-200 font-semibold">{provider}</span>.
              You can still set a password here if you want, but most people manage login through their provider.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
