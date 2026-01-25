import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const type = req.nextUrl.searchParams.get("type"); // midi | pdf

  if (!id || !type) {
    return new Response("Invalid request", { status: 400 });
  }

  const { data } = await supabase
    .from("music_files")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) return new Response("Not found", { status: 404 });

  const filePath = type === "pdf" ? data.pdf_url : data.midi_url;
  const bucket = type === "pdf" ? "pdfs" : "midis";
  const extension = type === "pdf" ? "pdf" : "mid";

  if (!filePath) return new Response("File missing", { status: 404 });

  const { data: signed } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 60);

  const file = await fetch(signed!.signedUrl);
  const buffer = await file.arrayBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Disposition": `attachment; filename="${data.title}.${extension}"`,
      "Content-Type": type === "pdf" ? "application/pdf" : "audio/midi",
    },
  });
}
