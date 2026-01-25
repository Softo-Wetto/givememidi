"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supbaseClient";
import { Loader2, MessageSquare, Send, Trash2 } from "lucide-react";

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  username: string;
};

type CommentDbRow = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
};

type ProfileRow = {
  id: string;
  username: string | null;
};

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

export function CommentsSection({ midiId }: { midiId: string }) {
  const [userId, setUserId] = useState<string | null>(null);

  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  const canPost = useMemo(() => !!userId, [userId]);

  // session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const fetchComments = async () => {
    setLoading(true);

    // 1) Get comments (no join)
    const { data: commentData, error: commentErr } = await supabase
      .from("midi_comments")
      .select("id, body, created_at, user_id")
      .eq("midi_id", midiId)
      .order("created_at", { ascending: false });

    if (commentErr) {
      console.error("Fetch comments error:", {
        message: commentErr.message,
        details: (commentErr as any).details,
        hint: (commentErr as any).hint,
        code: (commentErr as any).code,
      });
      setComments([]);
      setLoading(false);
      return;
    }

    const rows = (commentData ?? []) as CommentDbRow[];

    // 2) Resolve usernames
    const ids = Array.from(new Set(rows.map((r) => r.user_id))).filter(Boolean);

    let usernameMap = new Map<string, string>();

    if (ids.length > 0) {
      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", ids);

      if (profileErr) {
        console.error("Fetch profiles error:", {
          message: profileErr.message,
          details: (profileErr as any).details,
          hint: (profileErr as any).hint,
          code: (profileErr as any).code,
        });
        // still show comments
      } else {
        (profileData ?? []).forEach((p: ProfileRow) => {
          usernameMap.set(p.id, (p.username ?? "Anonymous").trim() || "Anonymous");
        });
      }
    }

    const normalized: CommentRow[] = rows.map((r) => ({
      id: r.id,
      body: r.body,
      created_at: r.created_at,
      user_id: r.user_id,
      username: usernameMap.get(r.user_id) ?? "Anonymous",
    }));

    setComments(normalized);
    setLoading(false);
  };

  // initial fetch + realtime
  useEffect(() => {
    fetchComments();

    const channel = supabase
      .channel(`midi_comments:${midiId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "midi_comments", filter: `midi_id=eq.${midiId}` },
        () => fetchComments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midiId]);

  const submit = async () => {
    if (!userId) {
      window.location.href = `/login?redirect=/midi/${midiId}`;
      return;
    }

    const trimmed = body.trim();
    if (!trimmed) return;

    setPosting(true);

    const { error } = await supabase.from("midi_comments").insert({
      midi_id: midiId,
      user_id: userId,
      body: trimmed,
    });

    setPosting(false);

    if (error) {
      console.error("Insert comment error:", {
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint,
        code: (error as any).code,
      });
      alert("Could not post comment.");
      return;
    }

    setBody("");
    // optimistic: re-fetch immediately
    fetchComments();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("midi_comments").delete().eq("id", id);

    if (error) {
      console.error("Delete comment error:", {
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint,
        code: (error as any).code,
      });
      alert("Could not delete comment.");
      return;
    }

    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <section className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="text-blue-400" size={18} />
          <h2 className="text-xl font-semibold">Comments</h2>
          <span className="text-xs text-gray-400">({comments.length})</span>
        </div>

        {!canPost ? (
          <a
            href={`/login?redirect=/midi/${midiId}`}
            className="text-sm font-semibold text-blue-300 hover:text-blue-200 transition"
          >
            Log in to comment →
          </a>
        ) : (
          <div className="text-xs text-gray-400">You&apos;re signed in</div>
        )}
      </div>

      <div className="flex gap-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder={canPost ? "Write a comment…" : "Log in to write a comment…"}
          className="w-full p-3 rounded-xl bg-gray-900/60 border border-white/10
                     focus:outline-none focus:ring-2 focus:ring-blue-400/70
                     placeholder:text-gray-500"
        />

        <button
          onClick={submit}
          disabled={posting || !body.trim()}
          className="shrink-0 h-fit px-4 py-3 rounded-xl
                     bg-gradient-to-r from-blue-500 to-indigo-500
                     hover:from-blue-400 hover:to-indigo-400
                     font-semibold text-white shadow-lg transition
                     disabled:opacity-50"
          title="Post"
        >
          {posting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="animate-spin" size={18} />
            Loading comments…
          </div>
        ) : comments.length === 0 ? (
          <div className="text-gray-400 text-sm">No comments yet — be the first 🙂</div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="rounded-xl border border-white/10 bg-gray-900/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-gray-200">{c.username}</div>
                  <div className="text-sm text-gray-300 whitespace-pre-wrap break-words">
                    {c.body}
                  </div>
                  <div className="text-xs text-gray-500">{timeAgo(c.created_at)}</div>
                </div>

                {userId && c.user_id === userId && (
                  <button
                    onClick={() => remove(c.id)}
                    className="text-gray-400 hover:text-red-300 transition"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
