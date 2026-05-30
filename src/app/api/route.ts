import { NextRequest } from "next/server";
import { createPocketBaseClient } from "@/lib/pocketbaseClient";

type MusicFileRow = {
  title: string;
  midi_url?: string | null;
  pdf_url?: string | null;
};

export async function GET(req: NextRequest) {
  const pocketbase = createPocketBaseClient();

  const id = req.nextUrl.searchParams.get("id");
  const type = req.nextUrl.searchParams.get("type"); // midi | pdf

  if (!id || !type) return new Response("Invalid request", { status: 400 });

  const { data, error } = await pocketbase
    .from("music_files")
    .select("*")
    .eq("id", id)
    .single<MusicFileRow>();

  if (error) return new Response(error.message, { status: 500 });
  if (!data) return new Response("Not found", { status: 404 });

  const filePath = type === "pdf" ? data.pdf_url : data.midi_url;
  const extension = type === "pdf" ? "pdf" : "mid";

  if (!filePath) return new Response("File missing", { status: 404 });

  const file = await fetch(filePath);
  if (!file.ok) return new Response("Failed to fetch file", { status: 502 });

  const buffer = await file.arrayBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Disposition": `attachment; filename="${data.title}.${extension}"`,
      "Content-Type": type === "pdf" ? "application/pdf" : "audio/midi",
    },
  });
}
