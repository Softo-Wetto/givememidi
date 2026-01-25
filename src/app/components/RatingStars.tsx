"use client";

import { useEffect, useMemo, useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supbaseClient";

type Props = {
  midiId: string;
  /** Optional: show compact mode (smaller) */
  compact?: boolean;
};

export function RatingStars({ midiId, compact }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const size = compact ? 16 : 18;

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;

      if (!mounted) return;
      setUserId(uid);

      if (!uid) {
        setMyRating(null);
        setLoading(false);
        return;
      }

      const { data: r, error } = await supabase
        .from("midi_ratings")
        .select("rating")
        .eq("midi_id", midiId)
        .eq("user_id", uid)
        .maybeSingle<{ rating: number }>();

      if (!mounted) return;

      if (error) {
        console.error("Fetch my rating error:", error);
        setMyRating(null);
      } else {
        setMyRating(r?.rating ?? null);
      }
      setLoading(false);
    };

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evt, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      // reload rating when auth changes
      setLoading(true);
      setMyRating(null);
      // fire and forget
      load();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midiId]);

  const display = hover ?? myRating ?? 0;

  const canRate = useMemo(() => !!userId && !saving && !loading, [userId, saving, loading]);

  const setRating = async (value: number) => {
    if (!userId) {
      window.location.href = `/login?redirect=/midi/${midiId}`;
      return;
    }

    setSaving(true);
    try {
      // Upsert one rating per user per midi
      const { error } = await supabase
        .from("midi_ratings")
        .upsert(
          { midi_id: midiId, user_id: userId, rating: value },
          { onConflict: "midi_id,user_id" }
        );

      if (error) throw error;

      setMyRating(value);
    } catch (e) {
      console.error("Upsert rating error:", e);
      alert("Could not save rating.");
    } finally {
      setSaving(false);
    }
  };

  const clearRating = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("midi_ratings")
        .delete()
        .eq("midi_id", midiId)
        .eq("user_id", userId);

      if (error) throw error;

      setMyRating(null);
    } catch (e) {
      console.error("Delete rating error:", e);
      alert("Could not remove rating.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className={`inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2 text-gray-400">
            <Loader2 className="animate-spin" size={size} /> Loading…
          </span>
        ) : (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => {
              const filled = i <= display;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!canRate}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => setRating(i)}
                  className={`transition disabled:opacity-50 ${
                    canRate ? "cursor-pointer" : "cursor-default"
                  }`}
                  title={userId ? `Rate ${i} star${i === 1 ? "" : "s"}` : "Log in to rate"}
                >
                  <Star
                    size={size}
                    className={
                      filled
                        ? "text-yellow-300 fill-yellow-300"
                        : "text-gray-500"
                    }
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* small helper actions */}
      {!loading && userId ? (
        <div className="text-xs text-gray-400">
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="animate-spin" size={14} /> Saving…
            </span>
          ) : myRating ? (
            <button
              onClick={clearRating}
              className="hover:text-gray-200 transition underline decoration-white/10 hover:decoration-white/30"
              type="button"
            >
              Clear
            </button>
          ) : (
            <span>Click to rate</span>
          )}
        </div>
      ) : !loading ? (
        <a
          href={`/login?redirect=/midi/${midiId}`}
          className="text-xs text-blue-300 hover:text-blue-200 transition"
        >
          Log in to rate →
        </a>
      ) : null}
    </div>
  );
}
