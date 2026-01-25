import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { MidiPreview } from "../../components/MidiPreview";
import { PdfPreview } from "../../components/PdfPreview";
import { MidiActions } from "../../components/MidiActions";
import { CommentsSection } from "../../components/CommentsSection";
import { RatingStars } from "../../components/RatingStars";


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Props = { params: { id: string } | Promise<{ id: string }> };
type RatingAgg = { avg: number | null; count: number };


export default async function MidiDetail({ params }: Props) {
  // ✅ works in both Next “params sync” and “params async” modes
  const { id } = await Promise.resolve(params);

const { data, error } = await supabase
  .from("music_files")
  .select(`
    *,
    uploader:profiles (
      id,
      username
    )
  `)
  .eq("id", id)
  .single();

 if (error) {
    console.error("music_files fetch error:", error);
    return notFound();
  }
  if (!data) return notFound();

  // Rating stats (avg + count)
  const { data: ratingRows, error: ratingErr } = await supabase
    .from("midi_ratings")
    .select("rating")
    .eq("midi_id", data.id);

  if (ratingErr) console.error("rating fetch error:", ratingErr);

  const count = ratingRows?.length ?? 0;
  const avg =
    count > 0
      ? (ratingRows!.reduce((sum, r: any) => sum + (r.rating ?? 0), 0) / count)
      : null;

  const ratingAgg: RatingAgg = { avg, count };

  // increment download count (you may want to move this to a "download click" later)
  await supabase
    .from("music_files")
    .update({ downloads: (data.downloads ?? 0) + 1 })
    .eq("id", id);

  const midiRes = await supabase.storage
    .from("midis")
    .createSignedUrl(data.midi_url, 60);

  if (!midiRes.data) return notFound();

  let pdfSigned: string | null = null;
  if (data.pdf_url) {
    const pdfRes = await supabase.storage
      .from("pdfs")
      .createSignedUrl(data.pdf_url, 60);
    pdfSigned = pdfRes.data?.signedUrl || null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-black text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-72 w-[900px] rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-10 space-y-10">
        <section className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-gray-300">
                <span className="text-blue-300">🎵</span> MIDI Detail
                {data.pdf_url ? (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-green-600/20 text-green-300 border border-green-500/20">
                    PDF Available
                  </span>
                ) : (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-600/20 text-gray-300 border border-white/10">
                    No PDF
                  </span>
                )}
              </div>

              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
                {data.title}
              </h1>
              <p className="text-gray-300 text-lg">
                {data.composer || "Unknown Composer"}
              </p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400">
              <span>Uploaded by</span>
              <span className="font-semibold text-gray-200">
                {data.uploader?.username ?? "Anonymous"}
              </span>

              <span className="text-gray-600">•</span>

              <span>
                Uploaded{" "}
                <span
                  className="font-semibold text-gray-200"
                  title={formatUploadedAtFull(data.created_at)}
                >
                  {formatUploadedAt(data.created_at)}
                </span>
              </span>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
            <RatingStars midiId={data.id} />

            <div className="text-sm text-gray-400">
              {ratingAgg.count === 0 ? (
                <span>No ratings yet</span>
              ) : (
                <span>
                  <span className="font-semibold text-gray-200">
                    {ratingAgg.avg!.toFixed(1)}
                  </span>{" "}
                  / 5 ·{" "}
                  <span className="font-semibold text-gray-200">
                    {ratingAgg.count}
                  </span>{" "}
                  rating{ratingAgg.count === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>

            </div>

            <div className="flex items-center justify-center lg:justify-end">
              <MidiActions midiId={data.id} />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Genre" value={data.genre || "—"} />
            <Stat label="BPM" value={data.bpm ? String(data.bpm) : "—"} />
            <Stat label="Downloads" value={String((data.downloads ?? 0) + 1)} />
            <Stat label="Formats" value={`MIDI${data.pdf_url ? " + PDF" : ""}`} />
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <a
              href={midiRes.data.signedUrl}
              download={`${data.title}.mid`}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl
                         bg-gradient-to-r from-blue-500 to-indigo-500
                         hover:from-blue-400 hover:to-indigo-400
                         font-semibold shadow-lg transition"
            >
              🎵 Download MIDI
            </a>

            {pdfSigned ? (
              <a
                href={pdfSigned}
                download={`${data.title}.pdf`}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl
                           bg-gradient-to-r from-green-500 to-emerald-500
                           hover:from-green-400 hover:to-emerald-400
                           font-semibold shadow-lg transition"
              >
                📄 Download Sheet Music (PDF)
              </a>
            ) : (
              <div className="flex-1 flex items-center justify-center px-6 py-4 rounded-2xl
                              border border-white/10 bg-white/5 text-gray-400">
                Sheet music not available
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-xl">
              <h2 className="text-xl font-semibold mb-4">MIDI Preview</h2>
              <MidiPreview url={midiRes.data.signedUrl} />
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-xl">
              <h2 className="text-xl font-semibold mb-4">Sheet Music Preview</h2>
              {pdfSigned ? (
                <div className="w-full h-[720px]">
                  <PdfPreview url={pdfSigned} />
                </div>
              ) : (
                <div className="h-[360px] flex items-center justify-center bg-gray-900/50 border border-white/10 rounded-xl text-gray-400">
                  No PDF Preview Available
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <CommentsSection midiId={data.id} />
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function formatUploadedAt(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  // e.g. "7 Jan 2026"
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function formatUploadedAtFull(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  // e.g. "7 Jan 2026, 9:14 PM"
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}
