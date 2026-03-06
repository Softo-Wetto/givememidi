// src/app/profile/page.tsx
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
  UploadCloud,
  Star,
  TrendingUp,
  Music2,
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

type RatingAgg = { sum: number; count: number };

function badgeList(args: {
  uploads: number;
  totalDownloads: number;
  avgRating: number | null;
  totalRatings: number;
}) {
  const { uploads, totalDownloads, avgRating, totalRatings } = args;

  const badges: { label: string; hint: string }[] = [];

  if (uploads >= 10) badges.push({ label: "Prolific Uploader", hint: "10+ uploads" });
  if (totalDownloads >= 250) badges.push({ label: "Trending", hint: "250+ total downloads" });
  if (avgRating !== null && totalRatings >= 5 && avgRating >= 4.5)
    badges.push({ label: "Top Rated", hint: "4.5+ avg (5+ ratings)" });

  if (badges.length === 0) badges.push({ label: "New Creator", hint: "Just getting started" });

  return badges.slice(0, 4);
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [email, setEmail] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);

  const [provider, setProvider] = useState<string>("unknown");

  // Stats
  const [totalUploads, setTotalUploads] = useState(0);
  const [totalDownloads, setTotalDownloads] = useState(0);
  const [overallAvg, setOverallAvg] = useState<number | null>(null);
  const [totalRatings, setTotalRatings] = useState(0);

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

  const badges = useMemo(
    () =>
      badgeList({
        uploads: totalUploads,
        totalDownloads,
        avgRating: overallAvg,
        totalRatings,
      }),
    [totalUploads, totalDownloads, overallAvg, totalRatings]
  );

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

      const id0 = user.identities?.[0];
      const p = id0?.provider || (user.app_metadata as any)?.provider || "unknown";
      setProvider(p);

      // Profile
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("username, bio, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (profErr) console.error("Profile fetch error:", profErr);

      setUsername(prof?.username ?? "");
      setBio(prof?.bio ?? "");
      setAvatarUrl(prof?.avatar_url ?? null);

      // Upload stats
      const { data: uploads, error: upErr } = await supabase
        .from("music_files")
        .select("id, downloads")
        .eq("uploaded_by", user.id);

      if (upErr) console.error("uploads stats error:", upErr);

      const ids = (uploads ?? []).map((m: any) => m.id);
      setTotalUploads(ids.length);
      setTotalDownloads((uploads ?? []).reduce((sum: number, m: any) => sum + (m.downloads ?? 0), 0));

      // Rating stats (bulk fetch)
      let ratingMap = new Map<string, RatingAgg>();
      if (ids.length > 0) {
        const { data: ratingRows, error: rErr } = await supabase
          .from("midi_ratings")
          .select("midi_id, rating")
          .in("midi_id", ids);

        if (rErr) console.error("ratings stats error:", rErr);

        for (const r of ratingRows ?? []) {
          const prev = ratingMap.get(r.midi_id) ?? { sum: 0, count: 0 };
          ratingMap.set(r.midi_id, { sum: prev.sum + (r.rating ?? 0), count: prev.count + 1 });
        }
      }

      const totalR = Array.from(ratingMap.values()).reduce((sum, a) => sum + a.count, 0);
      const sumStars = Array.from(ratingMap.values()).reduce((sum, a) => sum + a.sum, 0);
      setTotalRatings(totalR);
      setOverallAvg(totalR > 0 ? sumStars / totalR : null);

      setLoading(false);
    })();
  }, [router]);

  const saveProfile = async () => {
    const clean = username.trim();
    const cleanBio = bio.trim();

    if (!clean) return alert("Username cannot be empty.");
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(clean)) {
      return alert("Username must be 3–20 chars and contain only letters, numbers, underscore.");
    }
    if (cleanBio.length > 280) return alert("Bio is too long (max 280 characters).");

    setSavingProfile(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setSavingProfile(false);
      router.push("/login?redirect=/profile");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ username: clean, bio: cleanBio })
      .eq("id", user.id);

    setSavingProfile(false);

    if (error) {
      console.error("Profile update error:", error);
      alert("That username might already be taken (or update failed).");
      return;
    }

    alert("Profile updated!");
  };

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      setUploadingAvatar(false);
      router.push("/login?redirect=/profile");
      return;
    }

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const safeExt = ["png", "jpg", "jpeg", "webp"].includes(ext) ? ext : "png";
      const path = `${user.id}/avatar.${safeExt}`;

      // overwrite by removing old (optional)
      await supabase.storage.from("avatars").remove([path]);

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (upErr) throw upErr;

      // public URL
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      const { error: profErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (profErr) throw profErr;

      setAvatarUrl(publicUrl);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Avatar upload failed.");
    } finally {
      setUploadingAvatar(false);
    }
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
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-full overflow-hidden bg-white/10 border border-white/10 shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-xl">👤</div>
                )}
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
                    Member since{" "}
                    <span className="text-gray-100 font-semibold">{formatDate(memberSince)}</span>
                  </span>

                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-gray-300">
                    Auth: <span className="text-gray-100 font-semibold">{provider}</span>
                  </span>
                </div>

                {/* Badges */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {badges.map((b) => (
                    <span
                      key={b.label}
                      title={b.hint}
                      className="px-3 py-1 rounded-full text-xs font-semibold
                                 bg-white/5 border border-white/10 text-gray-200"
                    >
                      ✨ {b.label}
                    </span>
                  ))}
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

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 flex items-center gap-3">
              <Music2 size={18} className="text-emerald-300" />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Uploads</p>
                <p className="text-lg font-semibold">{totalUploads}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 flex items-center gap-3">
              <TrendingUp size={18} className="text-yellow-300" />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Total downloads</p>
                <p className="text-lg font-semibold">{totalDownloads}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 flex items-center gap-3">
              <Star size={18} className="text-yellow-300" />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Avg rating</p>
                <p className="text-lg font-semibold">
                  {overallAvg === null ? "—" : overallAvg.toFixed(1)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 flex items-center gap-3">
              <Star size={18} className="text-indigo-300" />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Total ratings</p>
                <p className="text-lg font-semibold">{totalRatings}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Public profile card */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-xl">
          <h2 className="text-xl font-semibold mb-1">Public profile</h2>
          <p className="text-sm text-gray-400 mb-6">
            This username, bio, and avatar are shown on your uploads and comments.
          </p>

          {/* Avatar uploader */}
          <div className="mb-6">
            <label className="block text-sm text-gray-300 mb-2">Avatar</label>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl
                                 border border-white/10 bg-white/5 hover:bg-white/10 transition cursor-pointer">
                <UploadCloud size={16} className="text-blue-300" />
                {uploadingAvatar ? "Uploading..." : "Upload avatar"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadAvatar(f);
                  }}
                />
              </label>

              <p className="text-xs text-gray-500">PNG/JPG/WebP. Square works best.</p>
            </div>
          </div>

          {/* Username */}
          <label className="block text-sm text-gray-300 mb-2">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 rounded-xl bg-gray-900/60 border border-white/10
                       focus:outline-none focus:ring-2 focus:ring-blue-400/70"
            placeholder="your_username"
          />
          <p className="text-xs text-gray-500 mt-2">3–20 chars. Letters, numbers, underscore.</p>

          {/* Bio */}
          <label className="block text-sm text-gray-300 mb-2 mt-6">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full p-3 rounded-xl bg-gray-900/60 border border-white/10
                       focus:outline-none focus:ring-2 focus:ring-blue-400/70"
            placeholder="Tell people about yourself…"
          />
          <p className="text-xs text-gray-500 mt-2">{bio.trim().length}/280</p>

          <button
            onClick={saveProfile}
            disabled={savingProfile}
            className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl
                       bg-gradient-to-r from-blue-500 to-indigo-500
                       hover:from-blue-400 hover:to-indigo-400
                       font-semibold shadow-lg transition disabled:opacity-50"
          >
            {savingProfile ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Save profile
          </button>
        </div>

        {/* Password card */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-xl">
          <h2 className="text-xl font-semibold mb-1">Security</h2>
          <p className="text-sm text-gray-400 mb-6">Update your password to keep your account secure.</p>

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
              Note: You’re signed in with <span className="text-gray-200 font-semibold">{provider}</span>. You can still set
              a password here if you want.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}