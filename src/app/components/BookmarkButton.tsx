"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { supabase } from "../../lib/supbaseClient";

type BookmarkRow = { id: string };

export function BookmarkButton({ midiId }: { midiId: string }) {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1) Get user once
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.error("getUser error:", error);

      if (!cancelled) {
        setUserId(data.user?.id ?? null);
        setAuthReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // 2) When we know auth state and have a user, check if this midi is bookmarked
  useEffect(() => {
    if (!authReady || !userId) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("bookmarks")
          .select("id")
          .eq("user_id", userId)
          .eq("midi_id", midiId)
          .maybeSingle<BookmarkRow>();

        if (error) console.error("bookmark fetch error:", error);

        if (!cancelled) {
          setBookmarked(Boolean(data));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, userId, midiId]);

  const toggleBookmark = async () => {
    // auth check is now clean: no setState-in-effect needed
    if (!authReady) return;

    if (!userId) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    try {
      setLoading(true);

      if (bookmarked) {
        const { error } = await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", userId)
          .eq("midi_id", midiId);

        if (error) {
          console.error("Remove bookmark error:", error);
          return;
        }

        setBookmarked(false);
      } else {
        const { error } = await supabase.from("bookmarks").insert({
          user_id: userId,
          midi_id: midiId,
        });

        if (error) {
          console.error("Add bookmark error:", error);
          return;
        }

        setBookmarked(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Hide until we know auth state (matches your previous behavior)
  if (!authReady) return null;

  return (
    <button
      type="button"
      onClick={toggleBookmark}
      disabled={loading}
      className={`p-2 rounded-full transition disabled:opacity-60
        ${
          bookmarked
            ? "bg-yellow-500/20 text-yellow-400"
            : "bg-gray-800 text-gray-400 hover:text-white"
        }`}
      title={bookmarked ? "Remove bookmark" : "Add bookmark"}
    >
      <Bookmark size={18} fill={bookmarked ? "currentColor" : "none"} />
    </button>
  );
}
