"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../../lib/supbaseClient";
import {
  ArrowLeft,
  FileMusic,
  FileText,
  Info,
  Loader2,
  Save,
  Trash2,
  Upload,
} from "lucide-react";

type MusicFileRow = {
  id: string;
  title: string;
  composer: string | null;
  genre: string | null;
  bpm: number | null;
  midi_url: string;
  pdf_url: string | null;
  uploaded_by: string | null;
};

export default function EditMidiPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [row, setRow] = useState<MusicFileRow | null>(null);
  const [loading, setLoading] = useState(true);

  // form
  const [title, setTitle] = useState("");
  const [composer, setComposer] = useState("");
  const [genre, setGenre] = useState("");
  const [bpm, setBpm] = useState<number | "">("");

  // replacements
  const [newMidi, setNewMidi] = useState<File | null>(null);
  const [newPdf, setNewPdf] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const GENRES = useMemo(
    () => [
      "Pop",
      "Rock",
      "Hip-Hop / Rap",
      "R&B / Soul",
      "Jazz",
      "Blues",
      "Classical",
      "Film Score / Soundtrack",
      "Game / OST",
      "Musical / Theatre",
      "Funk",
      "Disco",
      "Reggae",
      "Ska",
      "Gospel",
      "Country",
      "Folk",
      "Singer-Songwriter",
      "Indie",
      "Alternative",
      "Punk",
      "Metal",
      "Hard Rock",
      "Progressive Rock",
      "Grunge",
      "Electronic",
      "EDM",
      "House",
      "Deep House",
      "Tech House",
      "Techno",
      "Trance",
      "Progressive House",
      "Drum & Bass",
      "Dubstep",
      "Garage / UKG",
      "Breakbeat",
      "Electro",
      "Synthwave",
      "Ambient",
      "Downtempo",
      "Chillout",
      "Lo-fi",
      "Vaporwave",
      "K-Pop",
      "J-Pop",
      "Latin Pop",
      "Afrobeats",
      "Trap",
      "Boom Bap",
      "Neo-Soul",
      "Latin",
      "Salsa",
      "Bachata",
      "Merengue",
      "Reggaeton",
      "Bossa Nova",
      "Samba",
      "Flamenco",
      "World",
      "Instrumental",
      "Piano Solo",
      "Guitar",
      "Orchestral",
      "Chiptune",
      "Experimental",
      "Easy Listening",
      "New Age",
      "Children",
      "Holiday / Christmas",
    ],
    []
  );

  useEffect(() => {
    const init = async () => {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;

      if (!uid) {
        router.push(`/login?redirect=/midi/${id}/edit`);
        return;
      }
      setUserId(uid);

      const { data, error } = await supabase
        .from("music_files")
        .select("id, title, composer, genre, bpm, midi_url, pdf_url, uploaded_by")
        .eq("id", id)
        .single();

      if (error || !data) {
        console.error("Edit fetch error:", error);
        router.push(`/midi/${id}`);
        return;
      }

      // ownership check (frontend)
      if (data.uploaded_by !== uid) {
        alert("You can only edit your own uploads.");
        router.push(`/midi/${id}`);
        return;
      }

      setRow(data as MusicFileRow);

      // seed form
      setTitle(data.title ?? "");
      setComposer(data.composer ?? "");
      setGenre(data.genre ?? "");
      setBpm(data.bpm ?? "");

      setLoading(false);
    };

    init();
  }, [id, router]);

  const canSave = !!row && title.trim().length > 0 && !saving && !loading;

  async function uploadReplacement(
    bucket: "midis" | "pdfs",
    file: File,
    uid: string
  ) {
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${uid}/${crypto.randomUUID()}-${safe}`;
    const res = await supabase.storage.from(bucket).upload(path, file, {
      upsert: false,
    });
    if (res.error) throw res.error;
    return path;
  }

  const save = async () => {
    if (!row || !userId) return;
    if (!title.trim()) {
      alert("Title is required.");
      return;
    }

    setSaving(true);

    try {
      // 1) (optional) upload new midi/pdf first
      let nextMidiUrl = row.midi_url;
      let nextPdfUrl = row.pdf_url;

      if (newMidi) {
        const uploadedPath = await uploadReplacement("midis", newMidi, userId);
        nextMidiUrl = uploadedPath;
      }

      if (newPdf) {
        const uploadedPath = await uploadReplacement("pdfs", newPdf, userId);
        nextPdfUrl = uploadedPath;
      }

      // 2) update DB
      const { error } = await supabase
        .from("music_files")
        .update({
          title: title.trim(),
          composer: composer.trim() ? composer.trim() : null,
          genre: genre || null,
          bpm: bpm === "" ? null : bpm,
          midi_url: nextMidiUrl,
          pdf_url: nextPdfUrl,
        })
        .eq("id", row.id);

      if (error) throw error;

      // 3) cleanup old files (best-effort) if replacements happened
      if (newMidi && row.midi_url && row.midi_url !== nextMidiUrl) {
        const r = await supabase.storage.from("midis").remove([row.midi_url]);
        if (r.error) console.warn("Old MIDI remove warning:", r.error);
      }
      if (newPdf && row.pdf_url && row.pdf_url !== nextPdfUrl) {
        const r = await supabase.storage.from("pdfs").remove([row.pdf_url]);
        if (r.error) console.warn("Old PDF remove warning:", r.error);
      }

      // update local
      const updated: MusicFileRow = {
        ...row,
        title: title.trim(),
        composer: composer.trim() ? composer.trim() : null,
        genre: genre || null,
        bpm: bpm === "" ? null : bpm,
        midi_url: nextMidiUrl,
        pdf_url: nextPdfUrl,
      };
      setRow(updated);

      setNewMidi(null);
      setNewPdf(null);

      alert("Saved!");
      router.push(`/midi/${row.id}`);
    } catch (err: any) {
      console.error("Save error:", err);
      alert(err?.message ?? "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!row) return;
    if (!confirm("Delete this upload? This cannot be undone.")) return;

    setDeleting(true);

    try {
      const midiPath = row.midi_url;
      const pdfPath = row.pdf_url;

      const { error } = await supabase.from("music_files").delete().eq("id", row.id);
      if (error) throw error;

      // best-effort storage cleanup
      if (midiPath) {
        const r = await supabase.storage.from("midis").remove([midiPath]);
        if (r.error) console.warn("MIDI remove warning:", r.error);
      }
      if (pdfPath) {
        const r = await supabase.storage.from("pdfs").remove([pdfPath]);
        if (r.error) console.warn("PDF remove warning:", r.error);
      }

      alert("Deleted.");
      router.push("/uploads");
    } catch (err: any) {
      console.error("Delete error:", err);
      alert(err?.message ?? "Could not delete.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !row) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="animate-spin" size={18} />
          Loading editor…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-black text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-72 w-[900px] rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-10 space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href={`/midi/${row.id}`}
            className="inline-flex items-center gap-2 text-gray-300 hover:text-white transition"
          >
            <ArrowLeft size={16} />
            Back to MIDI
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={remove}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl
                border border-red-500/30 text-red-300 hover:bg-red-500/10 transition
                disabled:opacity-50"
            >
              {deleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
              Delete
            </button>

            <button
              onClick={save}
              disabled={!canSave}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl
                bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400
                font-semibold shadow-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Save changes
            </button>
          </div>
        </div>

        {/* Editor card */}
        <section className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 shadow-xl">
          <div className="flex items-center gap-2 text-sm text-gray-300 mb-4">
            <Info size={16} className="text-gray-400" />
            <span className="font-semibold">Edit details</span>
            <span className="text-gray-500">— title is required</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                className="w-full p-3 rounded-xl bg-gray-900/60 border border-gray-700
                  focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400/40"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Song title"
              />
            </div>

            {/* Composer */}
            <div>
              <label className="block text-sm text-gray-300 mb-1">Composer</label>
              <input
                className="w-full p-3 rounded-xl bg-gray-900/60 border border-gray-700
                  focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400/40"
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                placeholder="Composer name"
              />
            </div>

            {/* Genre */}
            <div>
              <label className="block text-sm text-gray-300 mb-1">Genre</label>
              <select
                className="w-full p-3 rounded-xl bg-gray-900/60 border border-gray-700
                  focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400/40"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
              >
                <option value="">Select a genre…</option>
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* BPM */}
            <div>
              <label className="block text-sm text-gray-300 mb-1">BPM</label>
              <input
                type="number"
                min={1}
                max={400}
                className="w-full p-3 rounded-xl bg-gray-900/60 border border-gray-700
                  focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400/40"
                value={bpm}
                onChange={(e) => setBpm(e.target.value ? Number(e.target.value) : "")}
                placeholder="120"
              />
            </div>
          </div>

          {/* Replace files */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                <FileMusic size={16} className="text-blue-400" />
                <span className="font-semibold">Replace MIDI</span>
              </div>

              <input
                type="file"
                accept=".mid,.midi"
                onChange={(e) => setNewMidi(e.target.files?.[0] || null)}
                className="block w-full text-sm file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-500"
              />

              {newMidi ? (
                <p className="mt-2 text-xs text-blue-200 truncate">
                  Selected: {newMidi.name}
                </p>
              ) : (
                <p className="mt-2 text-xs text-gray-500">
                  Current file is kept unless you pick a new one.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                <FileText size={16} className="text-green-300" />
                <span className="font-semibold">Replace PDF</span>
              </div>

              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setNewPdf(e.target.files?.[0] || null)}
                className="block w-full text-sm file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0 file:bg-green-600 file:text-white hover:file:bg-green-500"
              />

              {newPdf ? (
                <p className="mt-2 text-xs text-green-200 truncate">
                  Selected: {newPdf.name}
                </p>
              ) : (
                <p className="mt-2 text-xs text-gray-500">
                  Current PDF is kept unless you pick a new one.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 text-xs text-gray-500">
            <p>
              Tip: Replacing files uploads a new path, updates the record, then attempts to remove the old file.
              If your older uploads didn’t use the <span className="text-gray-300">userId/</span> folder structure,
              storage cleanup may warn — that’s OK.
            </p>
          </div>
        </section>

        {/* Bottom save button (extra) */}
        <button
          onClick={save}
          disabled={!canSave}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl
            bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400
            font-semibold shadow-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
          Save changes
        </button>
      </div>
    </main>
  );
}
