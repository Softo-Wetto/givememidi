import { NextResponse } from "next/server";
import { getServerAuth } from "@/lib/pocketbase/server";
import {
  adminCreateRecord,
  adminGetRecord,
  adminListRecords,
} from "@/lib/pocketbase/admin";
import { escapeFilterValue } from "@/lib/pocketbase/shared";
import type { RawPocketBaseRecord, XpEvent } from "@/lib/pocketbase/types";
import { XP_REWARDS } from "@/lib/reward-store";

type AwardPayload = {
  action?: string;
  targetId?: string;
};

type AwardResult = {
  eventKey: string;
  action: string;
  label: string;
  xp: number;
  credits: number;
  targetCollection?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function eventExists(eventKey: string) {
  const params = new URLSearchParams({
    page: "1",
    perPage: "1",
    filter: `event_key = "${escapeFilterValue(eventKey)}"`,
  });
  const existing = await adminListRecords<XpEvent>("xp_events", params);
  return existing.items[0] ?? null;
}

async function userOwnsReward(userId: string, itemKey: string) {
  const params = new URLSearchParams({
    page: "1",
    perPage: "1",
    filter: `user_id = "${escapeFilterValue(userId)}" && item_key = "${escapeFilterValue(itemKey)}"`,
  });
  const rewards = await adminListRecords<RawPocketBaseRecord>("user_rewards", params);
  return Boolean(rewards.items[0]);
}

async function createAward(userId: string, result: AwardResult) {
  const existing = await eventExists(result.eventKey);
  if (existing) {
    return { awarded: false, event: existing };
  }

  const event = await adminCreateRecord<XpEvent>("xp_events", {
    user_id: userId,
    event_key: result.eventKey,
    action: result.action,
    label: result.label,
    xp: result.xp,
    credits: result.credits,
    target_collection: result.targetCollection ?? "",
    target_id: result.targetId ?? "",
    metadata: result.metadata ? JSON.stringify(result.metadata) : "",
    created_at: new Date().toISOString(),
  });

  return { awarded: true, event };
}

async function resolveAward(
  userId: string,
  payload: AwardPayload
): Promise<AwardResult | null> {
  if (!payload.targetId) return null;

  if (payload.action === "upload") {
    const record = await adminGetRecord<RawPocketBaseRecord>("music_files", payload.targetId);
    if (record.uploaded_by !== userId) return null;

    const hasPdf = Boolean(record.pdf_url || record.pdf_file);
    const hasDescription = Boolean(String(record.description ?? "").trim());
    const hasMetadata = Boolean(record.genre || record.bpm);
    const baseXp =
      XP_REWARDS.uploadBase.xp +
      (hasPdf ? XP_REWARDS.pdfBonus.xp : 0) +
      (hasDescription ? XP_REWARDS.descriptionBonus.xp : 0) +
      (hasMetadata ? XP_REWARDS.metadataBonus.xp : 0);
    const credits =
      XP_REWARDS.uploadBase.credits +
      (hasPdf ? XP_REWARDS.pdfBonus.credits : 0) +
      (hasDescription ? XP_REWARDS.descriptionBonus.credits : 0) +
      (hasMetadata ? XP_REWARDS.metadataBonus.credits : 0);
    const hasUploadBoost = await userOwnsReward(userId, "upload_xp_boost");
    const xp = hasUploadBoost ? Math.round(baseXp * 1.1) : baseXp;

    return {
      eventKey: `upload:${record.id}`,
      action: "upload",
      label: hasPdf ? "MIDI + PDF upload" : "MIDI upload",
      xp,
      credits,
      targetCollection: "music_files",
      targetId: record.id,
      metadata: { hasPdf, hasDescription, hasMetadata, hasUploadBoost },
    };
  }

  if (payload.action === "comment") {
    const record = await adminGetRecord<RawPocketBaseRecord>("midi_comments", payload.targetId);
    if (record.user_id !== userId) return null;
    return {
      eventKey: `comment:${record.id}`,
      action: "comment",
      label: XP_REWARDS.comment.label,
      xp: XP_REWARDS.comment.xp,
      credits: XP_REWARDS.comment.credits,
      targetCollection: "midi_comments",
      targetId: record.id,
    };
  }

  if (payload.action === "rating") {
    const record = await adminGetRecord<RawPocketBaseRecord>("midi_ratings", payload.targetId);
    if (record.user_id !== userId) return null;

    try {
      const midi = await adminGetRecord<RawPocketBaseRecord>("music_files", String(record.midi_id));
      if (midi.uploaded_by === userId) return null;
    } catch {
      // If the upload cannot be checked, still avoid failing the rating flow.
    }

    return {
      eventKey: `rating:${record.id}`,
      action: "rating",
      label: XP_REWARDS.rating.label,
      xp: XP_REWARDS.rating.xp,
      credits: XP_REWARDS.rating.credits,
      targetCollection: "midi_ratings",
      targetId: record.id,
    };
  }

  if (payload.action === "bookmark") {
    const record = await adminGetRecord<RawPocketBaseRecord>("bookmarks", payload.targetId);
    if (record.user_id !== userId) return null;
    return {
      eventKey: `bookmark:${record.id}`,
      action: "bookmark",
      label: XP_REWARDS.bookmark.label,
      xp: XP_REWARDS.bookmark.xp,
      credits: XP_REWARDS.bookmark.credits,
      targetCollection: "bookmarks",
      targetId: record.id,
    };
  }

  if (payload.action === "follow") {
    const record = await adminGetRecord<RawPocketBaseRecord>("follows", payload.targetId);
    if (record.follower_id !== userId) return null;
    if (record.following_id === userId) return null;
    return {
      eventKey: `follow:${record.id}`,
      action: "follow",
      label: XP_REWARDS.follow.label,
      xp: XP_REWARDS.follow.xp,
      credits: XP_REWARDS.follow.credits,
      targetCollection: "follows",
      targetId: record.id,
    };
  }

  return null;
}

export async function POST(request: Request) {
  const auth = await getServerAuth();
  if (!auth?.user.id) return jsonError("Please log in.", 401);

  const payload = (await request.json().catch(() => null)) as AwardPayload | null;
  if (!payload?.action || !payload.targetId) return jsonError("Missing award action.");

  const award = await resolveAward(auth.user.id, payload);
  if (!award) return jsonError("This action cannot be awarded.", 403);

  const result = await createAward(auth.user.id, award);
  return NextResponse.json({
    ok: true,
    awarded: result.awarded,
    event: result.event,
  });
}
