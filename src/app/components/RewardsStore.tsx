"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Award,
  BadgeCheck,
  Coins,
  Loader2,
  LockKeyhole,
  ShoppingBag,
  Trophy,
} from "lucide-react";
import type { RewardItem } from "@/lib/reward-store";

type RewardRow = {
  id: string;
  item_key: string;
  item_type: string;
  label: string;
  description?: string | null;
  created_at?: string | null;
};

type XpEventRow = {
  id: string;
  label: string;
  xp: number;
  credits: number;
  created_at?: string | null;
};

type RewardsPayload = {
  balance: { xp: number; credits: number };
  events: XpEventRow[];
  rewards: RewardRow[];
  store: RewardItem[];
};

function formatDate(value?: string | null) {
  if (!value) return "Just now";
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function RewardsStore() {
  const [data, setData] = useState<RewardsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const ownedKeys = useMemo(
    () => new Set((data?.rewards ?? []).map((reward) => reward.item_key)),
    [data?.rewards]
  );

  async function load() {
    const response = await fetch("/api/rewards", { cache: "no-store" });
    if (response.ok) {
      setData((await response.json()) as RewardsPayload);
    }
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function redeem(item: RewardItem) {
    setRedeeming(item.key);
    setMessage("");

    const response = await fetch("/api/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemKey: item.key }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    if (!response.ok) {
      setMessage(payload?.error ?? "Could not redeem this reward.");
      setRedeeming(null);
      return;
    }

    setMessage(`${item.label} unlocked.`);
    setRedeeming(null);
    await load();
  }

  if (loading) {
    return (
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6">
        <div className="flex items-center gap-2 text-slate-300">
          <Loader2 className="animate-spin text-cyan-300" size={18} />
          Loading rewards...
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6">
        <div className="flex items-center gap-3">
          <LockKeyhole className="text-cyan-300" />
          <div>
            <h2 className="text-xl font-black text-white">Creator store</h2>
            <p className="mt-1 text-sm text-slate-400">Log in to view credits and redeem rewards.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] shadow-2xl shadow-black/25">
      <div className="border-b border-white/10 bg-black/25 p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200 ring-1 ring-cyan-300/20">
              <ShoppingBag size={22} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300/80">
                Creator economy
              </p>
              <h2 className="text-xl font-black text-white">XP wallet and rewards</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <WalletStat icon={<Trophy size={17} />} label="XP" value={data.balance.xp} />
            <WalletStat icon={<Coins size={17} />} label="Credits" value={data.balance.credits} />
          </div>
        </div>

        {message ? (
          <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100">
            {message}
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 p-5 xl:grid-cols-[1fr_360px]">
        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            Spend credits
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {data.store.map((item) => {
              const owned = ownedKeys.has(item.key);
              const canAfford = data.balance.credits >= item.cost;

              return (
                <div key={item.key} className="hover-shine card-lift rounded-3xl border border-white/10 bg-black/20 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${item.accent} text-slate-950 shadow-lg`}>
                      <Award size={20} />
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-xs font-bold text-slate-300">
                      {item.cost} credits
                    </span>
                  </div>
                  <h3 className="mt-5 font-black text-white">{item.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
                  <button
                    onClick={() => redeem(item)}
                    disabled={owned || !canAfford || redeeming === item.key}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {redeeming === item.key ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : owned ? (
                      <BadgeCheck size={16} />
                    ) : (
                      <Coins size={16} />
                    )}
                    {owned ? "Owned" : canAfford ? "Redeem" : "Need more credits"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="space-y-5">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              Inventory
            </p>
            <div className="space-y-2">
              {data.rewards.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
                  No rewards yet. Earn credits by uploading, commenting, rating, bookmarking, and following creators.
                </div>
              ) : (
                data.rewards.map((reward) => (
                  <div key={reward.id} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="font-bold text-white">{reward.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{reward.item_type}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              Recent XP
            </p>
            <div className="space-y-2">
              {data.events.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
                  Start interacting to create your XP history.
                </div>
              ) : (
                data.events.slice(0, 8).map((event) => (
                  <div key={event.id} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-white">{event.label}</p>
                      <span className={event.credits < 0 ? "text-rose-200" : "text-cyan-200"}>
                        {event.credits > 0 ? "+" : ""}
                        {event.credits}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {event.xp > 0 ? `+${event.xp} XP - ` : ""}
                      {formatDate(event.created_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function WalletStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
        <span className="text-cyan-300">{icon}</span>
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-white">{value.toLocaleString()}</p>
    </div>
  );
}
