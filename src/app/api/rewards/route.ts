import { NextResponse } from "next/server";
import { getServerAuth } from "@/lib/pocketbase/server";
import {
  adminCreateRecord,
  adminListRecords,
  adminUpdateRecord,
} from "@/lib/pocketbase/admin";
import { escapeFilterValue } from "@/lib/pocketbase/shared";
import type { RawPocketBaseRecord, UserReward, XpEvent } from "@/lib/pocketbase/types";
import { getRewardItem, REWARD_STORE, sumLedger } from "@/lib/reward-store";

type RedeemPayload = {
  itemKey?: string;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function getUserEvents(userId: string) {
  const params = new URLSearchParams({
    page: "1",
    perPage: "500",
    sort: "-created_at",
    filter: `user_id = "${escapeFilterValue(userId)}"`,
  });
  const events = await adminListRecords<XpEvent>("xp_events", params);
  return events.items;
}

async function getUserRewards(userId: string) {
  const params = new URLSearchParams({
    page: "1",
    perPage: "200",
    sort: "-created_at",
    filter: `user_id = "${escapeFilterValue(userId)}"`,
  });
  const rewards = await adminListRecords<UserReward>("user_rewards", params);
  return rewards.items;
}

export async function GET() {
  try {
    const auth = await getServerAuth();
    if (!auth?.user.id) return jsonError("Please log in.", 401);

    const [events, rewards] = await Promise.all([
      getUserEvents(auth.user.id),
      getUserRewards(auth.user.id),
    ]);
    const totals = sumLedger(events);

    return NextResponse.json({
      ok: true,
      balance: totals,
      events: events.slice(0, 20),
      rewards,
      store: REWARD_STORE,
    });
  } catch (error) {
    console.error("Rewards load error:", error);
    return jsonError("Could not load rewards right now.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getServerAuth();
    if (!auth?.user.id) return jsonError("Please log in.", 401);

    const payload = (await request.json().catch(() => null)) as RedeemPayload | null;
    const item = payload?.itemKey ? getRewardItem(payload.itemKey) : null;
    if (!item) return jsonError("Unknown reward item.");

    const [events, rewards] = await Promise.all([
      getUserEvents(auth.user.id),
      getUserRewards(auth.user.id),
    ]);

    if (rewards.some((reward) => reward.item_key === item.key)) {
      return jsonError("You already own this reward.", 409);
    }

    const balance = sumLedger(events);
    if (balance.credits < item.cost) {
      return jsonError("Not enough credits for this reward.", 402);
    }

    const purchaseEvent = await adminCreateRecord<XpEvent>("xp_events", {
      user_id: auth.user.id,
      event_key: `redeem:${auth.user.id}:${item.key}`,
      action: "redeem",
      label: `Redeemed ${item.label}`,
      xp: 0,
      credits: -item.cost,
      target_collection: "user_rewards",
      target_id: item.key,
      metadata: JSON.stringify({ itemKey: item.key, itemType: item.type }),
      created_at: new Date().toISOString(),
    });

    const reward = await adminCreateRecord<UserReward>("user_rewards", {
      user_id: auth.user.id,
      item_key: item.key,
      item_type: item.type,
      label: item.label,
      description: item.description,
      metadata: JSON.stringify(item.metadata ?? {}),
      purchase_event: purchaseEvent.id,
      created_at: new Date().toISOString(),
    });

    const profileUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (item.metadata?.cosmetic_theme) profileUpdate.cosmetic_theme = item.metadata.cosmetic_theme;
    if (item.metadata?.banner_style) profileUpdate.banner_style = item.metadata.banner_style;
    if (item.metadata?.featured_badge) profileUpdate.featured_badge = item.metadata.featured_badge;

    if (Object.keys(profileUpdate).length > 1) {
      await adminUpdateRecord<RawPocketBaseRecord>("profiles", auth.user.id, profileUpdate);
    }

    return NextResponse.json({
      ok: true,
      reward,
      event: purchaseEvent,
      balance: {
        xp: balance.xp,
        credits: balance.credits - item.cost,
      },
    });
  } catch (error) {
    console.error("Reward redeem error:", error);
    return jsonError("Could not redeem this reward right now.", 500);
  }
}
