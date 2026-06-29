import { NextRequest, NextResponse } from "next/server";
import { isGiveMeMidiAdmin } from "@/lib/givememidi-admin";
import { getServerAuth } from "@/lib/pocketbase/server";

const SCORE_PATH_PATTERN = /href=["']([^"']*\/scores\/[0-9][^"']*)["']/gi;
const ABSOLUTE_SCORE_PATTERN = /https?:\/\/musescore\.com\/[^\s"'<>]+\/scores\/[0-9][^\s"'<>]*/gi;

function normalizeScoreUrl(raw: string, source: URL) {
  try {
    const url = new URL(raw.replace(/&amp;/g, "&"), source.origin);
    url.hash = "";
    ["from", "share", "utm_source", "utm_medium", "utm_campaign"].forEach((key) => url.searchParams.delete(key));
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const auth = await getServerAuth();
  if (!isGiveMeMidiAdmin(auth?.user.email)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { url?: string } | null;
  if (!body?.url || !/^https?:\/\//i.test(body.url)) {
    return NextResponse.json({ error: "A valid source URL is required." }, { status: 400 });
  }

  const source = new URL(body.url);
  const response = await fetch(source.toString(), {
    headers: {
      "User-Agent": "GiveMeMIDI import discovery (+https://midi.softowetto.com)",
      Accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: `Source page returned ${response.status}.` },
      { status: 502 }
    );
  }

  const html = await response.text();
  const links = new Set<string>();

  for (const match of html.matchAll(SCORE_PATH_PATTERN)) {
    const normalized = normalizeScoreUrl(match[1], source);
    if (normalized) links.add(normalized);
  }

  for (const match of html.matchAll(ABSOLUTE_SCORE_PATTERN)) {
    const normalized = normalizeScoreUrl(match[0], source);
    if (normalized) links.add(normalized);
  }

  const direct = normalizeScoreUrl(source.toString(), source);
  if (source.pathname.includes("/scores/") && direct) links.add(direct);

  return NextResponse.json({ links: Array.from(links).slice(0, 250) });
}