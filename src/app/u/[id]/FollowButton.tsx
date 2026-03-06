"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supbaseClient";

export default function FollowButton({ targetUserId }: { targetUserId: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const [me, setMe] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      const myId = data.user?.id ?? null;

      if (!alive) return;
      setMe(myId);

      if (!myId || myId === targetUserId) {
        setFollowing(false);
        setLoading(false);
        return;
      }

      const { data: row, error } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", myId)
        .eq("following_id", targetUserId)
        .maybeSingle();

      if (!alive) return;
      if (error) console.error("follow check error:", error);

      setFollowing(!!row);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [targetUserId]);

  const click = async () => {
    if (!me) {
      const next = pathname && pathname !== "/login" ? pathname : "/";
      router.push(`/login?redirect=${encodeURIComponent(next)}`);
      return;
    }
    if (me === targetUserId) return;

    setLoading(true);

    if (!following) {
      const { error } = await supabase.from("follows").insert({
        follower_id: me,
        following_id: targetUserId,
      });
      if (error) {
        console.error("follow insert error:", error);
        alert("Failed to follow.");
      } else {
        setFollowing(true);
        router.refresh();
      }
    } else {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", me)
        .eq("following_id", targetUserId);

      if (error) {
        console.error("follow delete error:", error);
        alert("Failed to unfollow.");
      } else {
        setFollowing(false);
        router.refresh();
      }
    }

    setLoading(false);
  };

  const disabled = loading || me === targetUserId;

  return (
    <button
      onClick={click}
      disabled={disabled}
      className={`px-5 py-2 rounded-xl font-semibold transition shadow-lg disabled:opacity-50
        ${
          following
            ? "border border-white/15 bg-white/5 hover:bg-white/10"
            : "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400"
        }`}
    >
      {me === targetUserId ? "You" : loading ? "..." : following ? "Following" : "Follow"}
    </button>
  );
}