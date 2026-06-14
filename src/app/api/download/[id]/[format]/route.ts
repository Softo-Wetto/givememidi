import { NextResponse } from "next/server";
import {
  adminGetRecord,
  adminUpdateRecord,
} from "@/lib/pocketbase/admin";
import { getPocketBaseFileUrl } from "@/lib/pocketbase/config";
import { getServerAuth, getServerUser } from "@/lib/pocketbase/server";
import { pbRequest } from "@/lib/pocketbase/shared";
import type { RawPocketBaseRecord } from "@/lib/pocketbase/types";

type MusicFileRecord = RawPocketBaseRecord & {
  title?: string | null;
  midi_file?: string | null;
  pdf_file?: string | null;
  midi_url?: string | null;
  pdf_url?: string | null;
  downloads?: number | null;
};

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Cloudflare-CDN-Cache-Control": "no-store",
};

function safeFileName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[\\/:*?"<>|\r\n]+/g, "-")
    .trim() || "givememidi";
}

function withFileToken(url: string, token?: string | null) {
  if (!token) return url;
  const parsed = new URL(url);
  parsed.searchParams.set("token", token);
  return parsed.toString();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; format: string }> }
) {
  const [{ id, format }, auth, user] = await Promise.all([
    params,
    getServerAuth(),
    getServerUser(),
  ]);

  if (!auth || !user) {
    return NextResponse.json(
      { error: "Sign in to download this file." },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  if (format !== "midi" && format !== "pdf") {
    return NextResponse.json(
      { error: "Unsupported download format." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const record = await adminGetRecord<MusicFileRecord>("music_files", id);
    const isPdf = format === "pdf";
    const storedFile = isPdf ? record.pdf_file : record.midi_file;
    const legacyUrl = isPdf ? record.pdf_url : record.midi_url;
    const baseUrl = storedFile
      ? getPocketBaseFileUrl("music_files", record.id, storedFile)
      : legacyUrl;

    if (!baseUrl) {
      return NextResponse.json(
        { error: "This file is not available." },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    let fileToken: string | null = null;
    if (storedFile) {
      const tokenResponse = await pbRequest<{ token: string }>("/api/files/token", {
        method: "POST",
        token: auth.token,
      });
      fileToken = tokenResponse.token;
    }

    const upstream = await fetch(withFileToken(baseUrl, fileToken), {
      cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: "The file could not be retrieved." },
        { status: upstream.status === 404 ? 404 : 502, headers: NO_STORE_HEADERS }
      );
    }

    const extension = isPdf ? "pdf" : "mid";
    const contentType = upstream.headers.get("content-type") ||
      (isPdf ? "application/pdf" : "audio/midi");
    const headers = new Headers(NO_STORE_HEADERS);
    headers.set("Content-Type", contentType);
    headers.set(
      "Content-Disposition",
      `attachment; filename="${safeFileName(record.title || "givememidi")}.${extension}"`
    );

    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);

    if (!isPdf) {
      await adminUpdateRecord("music_files", record.id, {
        downloads: (record.downloads ?? 0) + 1,
      }).catch((error) => {
        console.error("Unable to update MIDI download count", error);
      });
    }

    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    console.error("Protected download failed", error);
    return NextResponse.json(
      { error: "The download could not be prepared." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
