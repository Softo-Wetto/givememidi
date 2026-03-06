"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supbaseClient";
import {
  Loader2,
  Users,
  UserPlus,
  UserCheck,
  Search,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

type ProfileRow = {
  id: string;
  username: string | null;
  created_at?: string | null;
};

type FollowRowFollowing = {
  following_id: string;
  created_at?: string;
  // Supabase may return joined relations as ARRAY depending on FK shape
  profiles?: ProfileRow[] | ProfileRow | null;
};

type FollowRowFollowers = {
  follower_id: string;
  created_at?: string;
  profiles?: ProfileRow[] | ProfileRow | null;
};

const PAGE_SIZE = 20;

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-AU", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

function pickProfile(p?: ProfileRow[] | ProfileRow | null): ProfileRow | null {
  if (!p) return null;
  return Array.isArray(p) ? (p[0] ?? null) : p;
}

export default function FollowingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"following" | "followers">("following");
  const [q, setQ] = useState("");

  const [page, setPage] = useState(1);

  const [following, setFollowing] = useState<ProfileRow[]>([]);
  const [followers, setFollowers] = useState<ProfileRow[]>([]);

  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);

  const pageCount = useMemo(() => {
    const total = tab === "following" ? followingCount : followersCount;
    return Math.max(1, Math.ceil(total / PAGE_SIZE));
  }, [tab, followingCount, followersCount]);

  const fetchCounts = async (userId: string) => {
    const [{ count: followingC }, { count: followersC }] = await Promise.all([
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId),
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userId),
    ]);

    setFollowingCount(followingC ?? 0);
    setFollowersCount(followersC ?? 0);
  };

  const fetchPage = async (
    userId: string,
    which: "following" | "followers",
    p: number
  ) => {
    const from = (p - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    if (which === "following") {
      const { data, error } = await supabase
        .from("follows")
        .select(
          `
          following_id,
          created_at,
          profiles:following_id (
            id,
            username,
            created_at
          )
        `
        )
        .eq("follower_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("fetch following error:", error);
        setFollowing([]);
        return;
      }

      const rows = (data ?? []) as FollowRowFollowing[];
      const list: ProfileRow[] = [];

      for (const r of rows) {
        const prof = pickProfile(r.profiles);
        if (prof) list.push(prof);
      }

      setFollowing(list);
      return;
    }

    // followers tab
    const { data, error } = await supabase
      .from("follows")
      .select(
        `
        follower_id,
        created_at,
        profiles:follower_id (
          id,
          username,
          created_at
        )
      `
      )
      .eq("following_id", userId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("fetch followers error:", error);
      setFollowers([]);
      return;
    }

    const rows = (data ?? []) as FollowRowFollowers[];
    const list: ProfileRow[] = [];

    for (const r of rows) {
      const prof = pickProfile(r.profiles);
      if (prof) list.push(prof);
    }

    setFollowers(list);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: userData, error } = await supabase.auth.getUser();
      if (error) console.error("getUser error:", error);

      const user = userData?.user;
      if (!user) {
        router.push("/login?redirect=/following");
        return;
      }

      await fetchCounts(user.id);
      await fetchPage(user.id, tab, 1);

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;

      setLoading(true);
      setPage(1);
      await fetchPage(user.id, tab, 1);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;

      setLoading(true);
      await fetchPage(user.id, tab, page);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const list = tab === "following" ? following : followers;
  const total = tab === "following" ? followingCount : followersCount;

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return list;
    return list.filter((p) => (p.username ?? "").toLowerCase().includes(qq));
  }, [list, q]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        {/* Header */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-7 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold flex items-center gap-3">
                <Users className="text-blue-300" />
                Connections
              </h1>
              <p className="text-gray-400 mt-1">
                Manage your following list and see who follows you.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTab("following")}
                className={`px-4 py-2 rounded-2xl text-sm font-semibold border transition
                  ${
                    tab === "following"
                      ? "bg-white/10 border-blue-400/30 text-white"
                      : "bg-white/5 border-white/10 text-gray-200 hover:bg-white/10"
                  }`}
              >
                <span className="inline-flex items-center gap-2">
                  <UserCheck size={16} className="text-emerald-300" />
                  Following
                  <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                    {followingCount}
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTab("followers")}
                className={`px-4 py-2 rounded-2xl text-sm font-semibold border transition
                  ${
                    tab === "followers"
                      ? "bg-white/10 border-blue-400/30 text-white"
                      : "bg-white/5 border-white/10 text-gray-200 hover:bg-white/10"
                  }`}
              >
                <span className="inline-flex items-center gap-2">
                  <UserPlus size={16} className="text-blue-300" />
                  Followers
                  <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                    {followersCount}
                  </span>
                </span>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mt-5 flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2 focus-within:ring-2 focus-within:ring-blue-400/60">
            <Search size={16} className="text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${tab}…`}
              className="w-full bg-transparent outline-none text-white placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-300">
              Showing <span className="font-semibold text-white">{filtered.length}</span>{" "}
              of <span className="font-semibold text-white">{total}</span>
            </p>

            {/* Pagination */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl
                  border border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 transition
                  disabled:opacity-50"
              >
                <ArrowLeft size={16} />
                Prev
              </button>

              <div className="text-sm text-gray-300 px-3">
                Page <span className="font-semibold text-white">{page}</span> /{" "}
                <span className="font-semibold text-white">{pageCount}</span>
              </div>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page >= pageCount}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl
                  border border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 transition
                  disabled:opacity-50"
              >
                Next
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="min-h-[220px] flex items-center justify-center text-gray-400 gap-2">
              <Loader2 className="animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="min-h-[220px] flex items-center justify-center text-gray-400">
              {q.trim()
                ? `No matches for "${q.trim()}".`
                : tab === "following"
                ? "You aren’t following anyone yet."
                : "No one is following you yet."}
            </div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map((p) => (
                <li
                  key={p.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4 hover:bg-black/30 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-lg font-semibold text-white truncate">
                        {p.username ?? "User"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Member since {formatDate(p.created_at ?? null)}
                      </p>
                    </div>

                    <Link
                      href={`/u/${p.id}`}
                      className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold
                        bg-white/5 border border-white/10 hover:bg-white/10 transition"
                    >
                      View profile →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-gray-500">
          Pagination is {PAGE_SIZE} per page so it stays fast even with lots of users.
        </p>
      </div>
    </main>
  );
}