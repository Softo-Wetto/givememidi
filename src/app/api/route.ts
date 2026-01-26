import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) return new Response("Missing NEXT_PUBLIC_SUPABASE_URL", { status: 500 });
  if (!serviceKey) return new Response("Missing SUPABASE_SERVICE_ROLE_KEY", { status: 500 });

  const supabase = createClient(url, serviceKey);

  const id = req.nextUrl.searchParams.get("id");
  const type = req.nextUrl.searchParams.get("type"); // midi | pdf

  if (!id || !type) return new Response("Invalid request", { status: 400 });

  const { data, error } = await supabase
    .from("music_files")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return new Response(error.message, { status: 500 });
  if (!data) return new Response("Not found", { status: 404 });

  const filePath = type === "pdf" ? data.pdf_url : data.midi_url;
  const bucket = type === "pdf" ? "pdfs" : "midis";
  const extension = type === "pdf" ? "pdf" : "mid";

  if (!filePath) return new Response("File missing", { status: 404 });

  const { data: signed, error: signErr } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 60);

  if (signErr || !signed?.signedUrl) return new Response("Failed to sign URL", { status: 500 });

  const file = await fetch(signed.signedUrl);
  if (!file.ok) return new Response("Failed to fetch file", { status: 502 });

  const buffer = await file.arrayBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Disposition": `attachment; filename="${data.title}.${extension}"`,
      "Content-Type": type === "pdf" ? "application/pdf" : "audio/midi",
    },
  });
}
