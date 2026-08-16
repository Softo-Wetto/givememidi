import { createPocketBaseClient } from "@/lib/pocketbaseClient";
import { getServerUser } from "@/lib/pocketbase/server";
import { calculateCreatorPoints, getCreatorAwards, getCreatorLevel, getLevelProgress } from "@/lib/creator-awards";
import { ArrowRight, Award, CalendarDays, Download, FileText, Gauge, LogIn, Music2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentsSection } from "../../components/CommentsSection";
import { MidiActions } from "../../components/MidiActions";
import { MidiCard } from "../../components/MidiCard";
import { MidiPreview } from "../../components/MidiPreview";
import { PdfPreview } from "../../components/PdfPreview";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import { RatingStars } from "../../components/RatingStars";
import { ShareButton } from "../../components/ShareButton";

const pocketbase = createPocketBaseClient();

type Props = { params: { id: string } | Promise<{ id: string }> };
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
type CreatorStats = { uploads: number; downloads: number; totalRatings: number; avgRating: number | null; followers: number };
type RatingRow = { rating: number };
type CreatorUpload = { id: string; downloads: number | null };

export default async function MidiDetail({ params }: Props) {
  const { id } = await Promise.resolve(params);
  const viewer = await getServerUser();
  const { data, error } = await pocketbase
    .from("music_files")
    .select<MidiRow>(`*, uploader:profiles (id, username, avatar_url)`)
    .eq("id", id)
    .single<MidiRow>();

  if (error) {
    console.error("music_files fetch error:", error);
    return notFound();
  }
  if (!data) return notFound();

  const { data: ratingRows, error: ratingError } = await pocketbase
    .from("midi_ratings")
    .select<RatingRow>("rating")
    .eq("midi_id", data.id);
  if (ratingError) console.error("rating fetch error:", ratingError);
  const ratingCount = ratingRows?.length ?? 0;
  const ratingAverage = ratingCount ? (ratingRows ?? []).reduce((sum, row) => sum + Number(row.rating ?? 0), 0) / ratingCount : null;

  let creatorStats: CreatorStats | null = null;
  if (data.uploader?.id) {
    const [{ data: uploads, error: uploadError }, { count: followerCount, error: followerError }] = await Promise.all([
      pocketbase.from("music_files").select<CreatorUpload>("id, downloads").eq("uploaded_by", data.uploader.id),
      pocketbase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", data.uploader.id),
    ]);
    if (uploadError) console.error("uploader uploads fetch error:", uploadError);
    if (followerError) console.error("uploader followers fetch error:", followerError);
    const uploadRows = uploads ?? [];
    const uploadIds = uploadRows.map((upload) => upload.id);
    const { data: creatorRatings, error: creatorRatingError } = uploadIds.length
      ? await pocketbase.from("midi_ratings").select<RatingRow>("rating").in("midi_id", uploadIds)
      : { data: [], error: null };
    if (creatorRatingError) console.error("creator ratings fetch error:", creatorRatingError);
    const creatorRatingRows = creatorRatings ?? [];
    const ratingSum = creatorRatingRows.reduce((sum, row) => sum + Number(row.rating ?? 0), 0);
    creatorStats = {
      uploads: uploadRows.length,
      downloads: uploadRows.reduce((sum, row) => sum + Number(row.downloads ?? 0), 0),
      totalRatings: creatorRatingRows.length,
      avgRating: creatorRatingRows.length ? ratingSum / creatorRatingRows.length : null,
      followers: followerCount ?? 0,
    };
  }

  const loginHref = `/login?redirect=${encodeURIComponent(`/midi/${data.id}`)}`;
  const { data: related, error: relatedError } = data.genre
    ? await pocketbase.from("music_files").select<MidiRow>("id,title,composer,downloads,pdf_url,genre,bpm,created_at").eq("genre", data.genre).neq("id", data.id).limit(4)
    : { data: [], error: null };
  if (relatedError) console.error("related MIDI fetch error:", relatedError);

  return (
    <main className="gmm-detail">
      <section className="gmm-detail-hero">
        <Image src="/givememidi-editorial-hero.png" alt="MIDI keyboard and sheet music" fill priority sizes="100vw" />
        <div className="gmm-detail-hero-shade" />
        <div className="gmm-shell gmm-detail-hero-content">
          <div>
            <p className="gmm-kicker">MIDI detail / {data.pdf_url ? "MIDI + PDF" : "MIDI only"}</p>
            <h1>{data.title}</h1>
            <p className="gmm-detail-composer">{data.composer || "Unknown composer"}</p>

            <div className="gmm-detail-uploader">
              <span>Uploaded by</span>
              {data.uploader?.id ? (
                <Link href={`/u/${data.uploader.id}`}>
                  <ProfileAvatar src={data.uploader.avatar_url} name={data.uploader.username} sizeClassName="h-9 w-9" />
                  <strong>{data.uploader.username || "Anonymous"}</strong>
                </Link>
              ) : <strong>Anonymous</strong>}
              <span>/</span>
              <time title={formatUploadedAtFull(data.created_at)}>{formatUploadedAt(data.created_at)}</time>
            </div>

            <div className="gmm-detail-rating">
              <RatingStars midiId={data.id} />
              <span>{ratingAverage ? `${ratingAverage.toFixed(1)} / 5 from ${ratingCount} rating${ratingCount === 1 ? "" : "s"}` : "Be the first to rate this arrangement"}</span>
            </div>
          </div>

          <div className="gmm-detail-command">
            <MidiActions midiId={data.id} />
            <ShareButton label="Share MIDI" text={data.title} />
          </div>
        </div>
      </section>

      <section className="gmm-detail-facts">
        <div className="gmm-shell">
          <Fact index="01" label="Genre" value={data.genre || "Uncategorised"} />
          <Fact index="02" label="Tempo" value={data.bpm ? `${data.bpm} BPM` : "Not listed"} />
          <Fact index="03" label="Downloads" value={String(data.downloads ?? 0)} />
          <Fact index="04" label="Files" value={data.pdf_url ? "MIDI + PDF" : "MIDI"} />
        </div>
      </section>

      {data.description ? (
        <section className="gmm-detail-description">
          <div className="gmm-shell">
            <div><p className="gmm-kicker">Arrangement notes</p><h2>About this upload.</h2></div>
            <p>{data.description}</p>
          </div>
        </section>
      ) : null}

      <section className="gmm-detail-downloads">
        <div className="gmm-shell">
          <div><p className="gmm-kicker">Take it with you</p><h2>Download files</h2></div>
          <div className="gmm-detail-download-actions">
            {viewer ? <a href={`/api/download/${data.id}/midi`}><Download size={17} /> MIDI file</a> : <Link href={loginHref}><LogIn size={17} /> Sign in for MIDI</Link>}
            {data.pdf_url ? (viewer ? <a href={`/api/download/${data.id}/pdf`}><FileText size={17} /> Sheet music PDF</a> : <Link href={loginHref}><LogIn size={17} /> Sign in for PDF</Link>) : <span><FileText size={17} /> No PDF attached</span>}
          </div>
        </div>
      </section>

      {creatorStats && data.uploader ? <CreatorAwardPanel username={data.uploader.username || "Anonymous"} avatarUrl={data.uploader.avatar_url} stats={creatorStats} /> : null}

      <section className="gmm-detail-workspace">
        <div className="gmm-shell">
          <div className="gmm-detail-preview-column">
            <ToolHeading index="01" eyebrow="Piano roll" title="MIDI preview" icon={<Music2 size={19} />} />
            <div className="gmm-tool-panel"><MidiPreview url={data.midi_url} /></div>
          </div>
          <aside className="gmm-detail-comments">
            <ToolHeading index="02" eyebrow="Community" title="Discussion" icon={<Award size={19} />} />
            <CommentsSection midiId={data.id} />
          </aside>
        </div>
      </section>

      <section className="gmm-detail-pdf">
        <div className="gmm-shell">
          <ToolHeading index="03" eyebrow="Read and play" title="Sheet music" icon={<FileText size={19} />} />
          <div className="gmm-tool-panel gmm-pdf-tool">
            <PdfPreview url={data.pdf_url || null} title={`${data.title} sheet music`} canDownload={Boolean(viewer)} downloadUrl={`/api/download/${data.id}/pdf`} loginHref={loginHref} />
          </div>
        </div>
      </section>

      {(related?.length ?? 0) ? (
        <section className="gmm-detail-related">
          <div className="gmm-shell">
            <div className="gmm-related-heading"><div><p className="gmm-kicker">Keep listening</p><h2>More in {data.genre}</h2></div><Link href={`/midi?genre=${encodeURIComponent(data.genre || "")}`}>View genre <ArrowRight size={16} /></Link></div>
            <div className="gmm-related-grid">{(related ?? []).map((midi) => <MidiCard key={midi.id} id={midi.id} title={midi.title} composer={midi.composer} downloads={midi.downloads} pdfUrl={midi.pdf_url} genre={midi.genre} bpm={midi.bpm} createdAt={midi.created_at} />)}</div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function Fact({ index, label, value }: { index: string; label: string; value: string }) {
  return <div><span>{index}</span><small>{label}</small><strong>{value}</strong></div>;
}

function ToolHeading({ index, eyebrow, title, icon }: { index: string; eyebrow: string; title: string; icon: React.ReactNode }) {
  return <div className="gmm-tool-heading"><span>{index}</span><i>{icon}</i><div><p>{eyebrow}</p><h2>{title}</h2></div></div>;
}

function CreatorAwardPanel({ username, avatarUrl, stats }: { username: string; avatarUrl?: string | null; stats: CreatorStats }) {
  const points = calculateCreatorPoints(stats);
  const level = getCreatorLevel(points);
  const progress = getLevelProgress(points);
  const awards = getCreatorAwards(stats);
  return (
    <section className="gmm-detail-creator">
      <div className="gmm-shell">
        <ProfileAvatar src={avatarUrl} name={username} sizeClassName="h-16 w-16" />
        <div><p className="gmm-kicker">Uploader reward level</p><h2>{level.label}</h2><span>Awarded to {username}</span></div>
        <div className="gmm-creator-points"><strong>{points}</strong><span>points</span></div>
        <div className="gmm-creator-progress"><i style={{ width: `${progress}%` }} /></div>
        <p>{level.nextLabel ? `${level.nextPoints! - points} points to ${level.nextLabel}` : "Highest creator level reached"}</p>
        <div className="gmm-creator-awards">{awards.map((award) => <span key={award.label} title={award.hint}><Award size={13} /> {award.label}</span>)}</div>
      </div>
    </section>
  );
}

function formatUploadedAt(value?: string | null) {
  if (!value) return "Date unknown";
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatUploadedAtFull(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
