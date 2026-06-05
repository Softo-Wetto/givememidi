"use client";

import { useEffect, useMemo, useState } from "react";
import { pocketbase } from "../../lib/pocketbaseClient";
import { awardXp } from "@/lib/xp-client";
import {
  ArrowDownUp,
  Loader2,
  LogIn,
  MessageSquare,
  Quote,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  UserCircle2,
  X,
} from "lucide-react";

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

type SortMode = "newest" | "oldest";

const MAX_COMMENT_LENGTH = 1000;
const prompts = ["Love the arrangement", "Is there a slower version?", "Great for practice", "Could you add sheet music?"];

function timeAgo(iso: string) {
  const date = new Date(iso).getTime();
  const diff = Date.now() - date;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function fullDate(iso: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "A";
}

export function CommentsSection({ midiId }: { midiId: string }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("newest");
  const [mineOnly, setMineOnly] = useState(false);
  const [replyTo, setReplyTo] = useState<CommentRow | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const canPost = !!userId;
  const remaining = MAX_COMMENT_LENGTH - body.length;

  useEffect(() => {
    pocketbase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });

    const { data } = pocketbase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const fetchComments = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data: commentData, error: commentErr } = await pocketbase
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
        setErrorMessage("Comments could not be loaded. Try refreshing this section.");
        return;
      }

      const rows = (commentData ?? []) as CommentDbRow[];
      const ids = Array.from(new Set(rows.map((row) => row.user_id))).filter(Boolean);
      const usernameMap = new Map<string, string>();

      if (ids.length > 0) {
        const { data: profileData, error: profileErr } = await pocketbase
          .from("profiles")
          .select<ProfileRow>("id, username")
          .in("id", ids);

        if (profileErr) {
          console.error("Fetch profiles error:", {
            message: profileErr.message,
            details: (profileErr as any).details,
            hint: (profileErr as any).hint,
            code: (profileErr as any).code,
          });
        } else {
          (profileData ?? []).forEach((profile: ProfileRow) => {
            usernameMap.set(profile.id, (profile.username ?? "Anonymous").trim() || "Anonymous");
          });
        }
      }

      setComments(
        rows.map((row) => ({
          id: row.id,
          body: row.body,
          created_at: row.created_at,
          user_id: row.user_id,
          username: usernameMap.get(row.user_id) ?? "Anonymous",
        }))
      );
    } catch (error) {
      console.error("Unexpected comments load error:", error);
      setComments([]);
      setErrorMessage("Comments could not be loaded. Try refreshing this section.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();

    const channel = pocketbase
      .channel(`midi_comments:${midiId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "midi_comments", filter: `midi_id=eq.${midiId}` },
        () => fetchComments()
      )
      .subscribe();

    return () => {
      pocketbase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midiId]);

  const filteredComments = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = comments.filter((comment) => {
      const matchesMine = !mineOnly || comment.user_id === userId;
      const matchesQuery =
        !q ||
        comment.body.toLowerCase().includes(q) ||
        comment.username.toLowerCase().includes(q);

      return matchesMine && matchesQuery;
    });

    return rows.sort((a, b) => {
      const left = new Date(a.created_at).getTime();
      const right = new Date(b.created_at).getTime();
      return sort === "newest" ? right - left : left - right;
    });
  }, [comments, mineOnly, query, sort, userId]);

  const submit = async () => {
    if (!userId) {
      window.location.href = `/login?redirect=/midi/${midiId}`;
      return;
    }

    const trimmed = body.trim();
    if (!trimmed) return;

    setPosting(true);
    setErrorMessage("");

    const optimisticId = `local-${Date.now()}`;
    const optimistic: CommentRow = {
      id: optimisticId,
      body: trimmed,
      created_at: new Date().toISOString(),
      user_id: userId,
      username: "You",
    };
    setComments((current) => [optimistic, ...current]);

    try {
      const { data, error } = await pocketbase.from("midi_comments").insert({
        midi_id: midiId,
        user_id: userId,
        body: trimmed,
      });

      if (error) {
        throw error;
      }

      setBody("");
      setReplyTo(null);
      const created = data as { id?: string } | null;
      await awardXp("comment", created?.id);
      await fetchComments();
    } catch (error) {
      setComments((current) => current.filter((comment) => comment.id !== optimisticId));
      console.error("Insert comment error:", error);
      setErrorMessage("Could not post that comment. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  const remove = async (comment: CommentRow) => {
    if (!confirm("Delete this comment?")) return;

    const previous = comments;
    setComments((current) => current.filter((item) => item.id !== comment.id));

    const { error } = await pocketbase.from("midi_comments").delete().eq("id", comment.id);

    if (error) {
      setComments(previous);
      console.error("Delete comment error:", {
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint,
        code: (error as any).code,
      });
      alert("Could not delete comment.");
    }
  };

  const addPrompt = (prompt: string) => {
    setBody((current) => {
      const next = current.trim() ? `${current.trim()} ${prompt}` : prompt;
      return next.slice(0, MAX_COMMENT_LENGTH);
    });
  };

  const quote = (comment: CommentRow) => {
    const quoted = `@${comment.username} `;
    setReplyTo(comment);
    setBody((current) => (current.startsWith(quoted) ? current : `${quoted}${current}`).slice(0, MAX_COMMENT_LENGTH));
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] shadow-xl shadow-black/20">
      <div className="border-b border-white/10 bg-black/25 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare className="text-cyan-300" size={18} />
              <h2 className="text-xl font-black">Discussion</h2>
              <span className="rounded-full border border-white/10 bg-white/[0.045] px-2 py-0.5 text-xs text-gray-400">
                {comments.length}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Ask questions, leave arrangement notes, or thank the uploader.
            </p>
          </div>

          <button
            onClick={fetchComments}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/[0.045] p-2 text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
            title="Refresh comments"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} size={17} />
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_120px]">
          <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2.5">
            <Search size={16} className="text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search comments..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
            {query ? (
              <button onClick={() => setQuery("")} className="text-slate-500 hover:text-white" title="Clear search">
                <X size={15} />
              </button>
            ) : null}
          </label>

          <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2.5">
            <ArrowDownUp size={15} className="text-slate-500" />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
              className="w-full bg-transparent text-sm text-white outline-none"
            >
              <option value="newest" className="text-black">Newest</option>
              <option value="oldest" className="text-black">Oldest</option>
            </select>
          </label>
        </div>

        {userId ? (
          <button
            onClick={() => setMineOnly((value) => !value)}
            className={`mt-3 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              mineOnly
                ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100"
                : "border-white/10 bg-white/[0.045] text-slate-400 hover:text-white"
            }`}
          >
            My comments only
          </button>
        ) : null}

        {errorMessage ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={fetchComments}
              className="rounded-full border border-red-300/20 px-3 py-1 text-xs font-bold transition hover:bg-red-300/10"
            >
              Retry
            </button>
          </div>
        ) : null}
      </div>

      <div className="space-y-4 p-5">
        {!canPost ? (
          <a
            href={`/login?redirect=/midi/${midiId}`}
            className="flex items-center justify-between gap-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/15"
          >
            <span className="inline-flex items-center gap-2">
              <LogIn size={16} />
              Log in to join the discussion
            </span>
            <span>Open</span>
          </a>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => addPrompt(prompt)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-300/35 hover:text-white"
                >
                  <Sparkles size={12} className="text-cyan-300" />
                  {prompt}
                </button>
              ))}
            </div>

            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value.slice(0, MAX_COMMENT_LENGTH))}
              rows={4}
              maxLength={MAX_COMMENT_LENGTH}
              placeholder="Share a thought, request, or practice note..."
              className="w-full resize-none rounded-2xl border border-white/10 bg-black/35 p-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
            />

            {replyTo ? (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100">
                <span>
                  Replying to <span className="font-bold">{replyTo.username}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="rounded-full p-1 text-cyan-100/80 transition hover:bg-cyan-300/10 hover:text-white"
                  title="Cancel reply"
                >
                  <X size={14} />
                </button>
              </div>
            ) : null}

            <div className="mt-3 flex items-center justify-between gap-3">
              <span className={`text-xs ${remaining < 80 ? "text-orange-200" : "text-slate-500"}`}>
                {remaining} characters left
              </span>
              <button
                onClick={submit}
                disabled={posting || !body.trim()}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:from-blue-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {posting ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
                Post
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="skeleton h-24 rounded-2xl" />
              ))}
            </div>
          ) : filteredComments.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center">
              <MessageSquare className="mx-auto text-slate-500" size={28} />
              <p className="mt-3 font-bold text-white">{comments.length ? "No matching comments" : "No comments yet"}</p>
              <p className="mt-1 text-sm text-slate-400">
                {comments.length ? "Try clearing search or filters." : "Be the first to start the discussion."}
              </p>
            </div>
          ) : (
            filteredComments.map((comment) => (
              <article
                id={`comment-${comment.id}`}
                key={comment.id}
                className="card-lift rounded-3xl border border-white/10 bg-slate-950/55 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-400/10 text-sm font-black text-blue-100 ring-1 ring-blue-300/20">
                    {comment.username === "Anonymous" ? <UserCircle2 size={20} /> : initials(comment.username)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-white">{comment.username}</p>
                      {comment.user_id === userId ? (
                        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-[11px] font-bold text-cyan-100">
                          You
                        </span>
                      ) : null}
                      <time className="text-xs text-slate-500" dateTime={comment.created_at} title={fullDate(comment.created_at)}>
                        {timeAgo(comment.created_at)}
                      </time>
                    </div>

                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
                      {comment.body}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {canPost ? (
                        <button
                          onClick={() => quote(comment)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:text-white"
                        >
                          <Quote size={13} />
                          Reply
                        </button>
                      ) : null}

                      {userId && comment.user_id === userId ? (
                        <button
                          onClick={() => remove(comment)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-red-400/15 bg-red-400/10 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-400/15"
                        >
                          <Trash2 size={13} />
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
