"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { supabase } from "../../lib/supbaseClient";

export function BookmarkButton({ midiId }: { midiId: string }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    supabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", userId)
      .eq("midi_id", midiId)
      .maybeSingle()
      .then(({ data }) => {
        setBookmarked(!!data);
        setLoading(false);
      });
  }, [userId, midiId]);

  const toggleBookmark = async () => {
    if (!userId) {
      router.push(
        `/login?redirect=${encodeURIComponent(window.location.pathname)}`
      );
      return;
    }

    setLoading(true);

    if (bookmarked) {
      await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", userId)
        .eq("midi_id", midiId);
      setBookmarked(false);
    } else {
      await supabase.from("bookmarks").insert({
        user_id: userId,
        midi_id: midiId,
      });
      setBookmarked(true);
    }

    setLoading(false);
  };

  if (loading) return null;

  return (
    <button
      onClick={toggleBookmark}
      className={`p-2 rounded-full transition
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
