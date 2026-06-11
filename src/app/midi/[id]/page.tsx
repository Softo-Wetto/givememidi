import { createPocketBaseClient } from "@/lib/pocketbaseClient";
import { notFound } from "next/navigation";
import { MidiPreview } from "../../components/MidiPreview";
import { PdfPreview } from "../../components/PdfPreview";
import { MidiActions } from "../../components/MidiActions";
import { CommentsSection } from "../../components/CommentsSection";
import { RatingStars } from "../../components/RatingStars";
import { ShareButton } from "../../components/ShareButton";
import { MidiCard } from "../../components/MidiCard";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import Link from "next/link";
import { Award } from "lucide-react";
import {
  calculateCreatorPoints,
  getCreatorAwards,
  getCreatorLevel,
  getLevelProgress,
} from "@/lib/creator-awards";


const pocketbase = createPocketBaseClient();

type Props = { params: { id: string } | Promise<{ id: string }> };
type RatingAgg = { avg: number | null; count: number };
type MidiRow = {
  id: string;
  title: string;
  composer: string | null;
  description?: string | null;
  genre: string | null;
  bpm: number | null;
  midi_url: string;
  pdf_url: string | null;
  downloads: number | null;
  created_at: string | null;
  uploader?: { id: string; username: string | null; avatar_url?: string | null } | null;
};
type CreatorStats = {
  uploads: number;
  downloads: number;
  totalRatings: number;
  avgRating: number | null;
  followers: number;
};


export default async function MidiDetail({ params }: Props) {
  // ✅ works in both Next “params sync” and “params async” modes
  const { id } = await Promise.resolve(params);

const { data, error } = await pocketbase
  .from("music_files")
  .select<MidiRow>(`
    *,
    uploader:profiles (
      id,
      username,
      avatar_url
    )
  `)
  .eq("id", id)
  .single<MidiRow>();

 if (error) {
    console.error("music_files fetch error:", error);
    return notFound();
  }
  if (!data) return notFound();

  // Rating stats (avg + count)
  const { data: ratingRows, error: ratingErr } = await pocketbase
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

  let creatorStats: CreatorStats | null = null;
  if (data.uploader?.id) {
    const [{ data: uploaderUploads, error: uploaderUploadsErr }, { count: followersCount, error: followersErr }] =
      await Promise.all([
        pocketbase
          .from("music_files")
          .select("id, downloads")
          .eq("uploaded_by", data.uploader.id),
        pocketbase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", data.uploader.id),
      ]);

    if (uploaderUploadsErr) console.error("uploader uploads fetch error:", uploaderUploadsErr);
    if (followersErr) console.error("uploader followers fetch error:", followersErr);

    const uploaderMidiIds = (uploaderUploads ?? []).map((upload: any) => upload.id);
    let creatorRatingRows: any[] = [];
    if (uploaderMidiIds.length > 0) {
      const { data: ratings, error: creatorRatingsErr } = await pocketbase
        .from("midi_ratings")
        .select("midi_id, rating")
        .in("midi_id", uploaderMidiIds);

      if (creatorRatingsErr) console.error("creator ratings fetch error:", creatorRatingsErr);
      creatorRatingRows = ratings ?? [];
    }

    const totalRatings = creatorRatingRows.length;
    const ratingSum = creatorRatingRows.reduce((sum, row) => sum + (row.rating ?? 0), 0);

    creatorStats = {
      uploads: uploaderMidiIds.length,
      downloads: (uploaderUploads ?? []).reduce((sum: number, row: any) => sum + (row.downloads ?? 0), 0),
      totalRatings,
      avgRating: totalRatings > 0 ? ratingSum / totalRatings : null,
      followers: followersCount ?? 0,
    };
  }

  // increment download count (you may want to move this to a "download click" later)
  await pocketbase
    .from("music_files")
    .update({ downloads: (data.downloads ?? 0) + 1 })
    .eq("id", id);

  const midiSigned = data.midi_url;
  const pdfSigned = data.pdf_url || null;
  const { data: relatedRows, error: relatedErr } = data.genre
    ? await pocketbase
        .from("music_files")
        .select<MidiRow>("id,title,composer,downloads,pdf_url,genre,bpm,created_at")
        .eq("genre", data.genre)
        .neq("id", data.id)
        .limit(4)
    : { data: [], error: null };

  if (relatedErr) console.error("related MIDI fetch error:", relatedErr);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#111827_0%,#020617_42%,#000_100%)] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-72 w-[900px] rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-10 space-y-10">
        <section
          className="hover-shine relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.055] p-8 shadow-xl"
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgba(0,0,0,0.98), rgba(2,6,23,0.96) 48%, rgba(15,23,42,0.94)), url('/sheet-music-placeholder.png')",
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        >
          <div className="pointer-events-none absolute inset-0 z-0 bg-black/45" />
          <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_18%_12%,rgba(34,211,238,0.14),transparent_34%),radial-gradient(circle_at_86%_0%,rgba(99,102,241,0.13),transparent_30%)]" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
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

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-400">
              <span>Uploaded by</span>
              {data.uploader?.id ? (
                <Link
                  href={`/u/${data.uploader.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 py-1 pl-1 pr-3 font-semibold text-gray-100 transition hover:border-cyan-300/40 hover:text-cyan-100"
                >
                  <ProfileAvatar
                    src={data.uploader.avatar_url}
                    name={data.uploader.username}
                    sizeClassName="h-8 w-8"
                  />
                  {data.uploader.username ?? "Anonymous"}
                </Link>
              ) : (
                <span className="font-semibold text-gray-200">Anonymous</span>
              )}

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
              <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-end">
                <MidiActions midiId={data.id} />
                <ShareButton label="Share MIDI" text={data.title} />
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Genre" value={data.genre || "—"} />
            <Stat label="BPM" value={data.bpm ? String(data.bpm) : "—"} />
            <Stat label="Downloads" value={String((data.downloads ?? 0) + 1)} />
            <Stat label="Formats" value={`MIDI${data.pdf_url ? " + PDF" : ""}`} />
          </div>

          {data.description ? (
            <div className="relative z-10 mt-8 overflow-hidden rounded-3xl border border-blue-300/15 bg-gradient-to-br from-blue-400/10 via-white/[0.045] to-indigo-400/10 p-6 shadow-xl shadow-blue-950/20">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-blue-100">
                Arrangement notes
              </div>
              <p className="whitespace-pre-wrap text-base leading-8 text-slate-200">
                {data.description}
              </p>
            </div>
          ) : null}

          <div className="relative z-10 mt-8 flex flex-col sm:flex-row gap-4">
            <a
              href={midiSigned}
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

          <div className="relative z-10 mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
            <span className="font-semibold text-white">Quick tip:</span>{" "}
            Use the preview before downloading, then bookmark the file if it belongs in your reference library.
          </div>

          <div className="relative z-10">
          {creatorStats ? (
            <CreatorAwardPanel
              username={data.uploader?.username ?? "Anonymous"}
              avatarUrl={data.uploader?.avatar_url}
              stats={creatorStats}
            />
          ) : null}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-8">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 shadow-xl">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300/80">
                    Piano roll
                  </p>
                  <h2 className="mt-1 text-xl font-black">MIDI Preview</h2>
                </div>
                <span className="hidden rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-xs text-slate-400 sm:inline">
                  Interactive
                </span>
              </div>
              <MidiPreview url={midiSigned} />
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 shadow-xl">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300/80">
                    Score
                  </p>
                  <h2 className="mt-1 text-xl font-black">Sheet Music Preview</h2>
                </div>
                <span className="hidden rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-xs text-slate-400 sm:inline">
                  PDF viewer
                </span>
              </div>
              {pdfSigned ? (
                <div className="w-full min-h-[720px]">
                  <PdfPreview url={pdfSigned} title={`${data.title} sheet music`} />
                </div>
              ) : (
                <PdfPreview url={null} title={`${data.title} sheet music`} />
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <CommentsSection midiId={data.id} />
          </div>
        </section>

        {(relatedRows?.length ?? 0) > 0 ? (
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">More in {data.genre}</h2>
                <p className="text-sm text-slate-400">Similar uploads you might want to preview next.</p>
              </div>
              <Link href={`/midi?genre=${encodeURIComponent(data.genre || "")}`} className="text-sm font-bold text-cyan-200 hover:text-white">
                View genre →
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {(relatedRows ?? []).map((midi: any) => (
                <MidiCard
                  key={midi.id}
                  id={midi.id}
                  title={midi.title}
                  composer={midi.composer}
                  downloads={midi.downloads}
                  pdfUrl={midi.pdf_url}
                  genre={midi.genre}
                  bpm={midi.bpm}
                  createdAt={midi.created_at}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function CreatorAwardPanel({
  username,
  avatarUrl,
  stats,
}: {
  username: string;
  avatarUrl?: string | null;
  stats: CreatorStats;
}) {
  const points = calculateCreatorPoints(stats);
  const level = getCreatorLevel(points);
  const progress = getLevelProgress(points);
  const awards = getCreatorAwards(stats);

  return (
    <div className="mt-6 rounded-3xl border border-yellow-300/15 bg-gradient-to-br from-yellow-400/12 via-white/[0.045] to-blue-500/10 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ProfileAvatar src={avatarUrl} name={username} sizeClassName="h-12 w-12" />
          <div>
            <p className="text-sm text-slate-400">Uploader reward level</p>
            <h3 className="text-xl font-black text-white">{level.label}</h3>
            <p className="mt-0.5 text-xs text-slate-500">Awarded to {username}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Points</p>
          <p className="text-2xl font-black text-yellow-100">{points}</p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-cyan-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-400">
        {level.nextLabel ? `${level.nextPoints! - points} points to ${level.nextLabel}` : "Highest creator level reached"}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {awards.map((award) => (
          <span
            key={award.label}
            title={award.hint}
            className="inline-flex items-center gap-1.5 rounded-full border border-yellow-300/15 bg-yellow-300/10 px-3 py-1 text-xs font-bold text-yellow-100"
          >
            <Award size={13} />
            {award.label}
          </span>
        ))}
      </div>
    </div>
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
