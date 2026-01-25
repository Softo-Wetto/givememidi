"use client";

import { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Music2, FileMusic, FileText, Info, Loader2 } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function UploadClient() {
  const [title, setTitle] = useState("");
  const [composer, setComposer] = useState("");
  const [genre, setGenre] = useState("");
  const [bpm, setBpm] = useState<number | "">("");
  const [midi, setMidi] = useState<File | null>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const GENRES = useMemo(
    () => [
      // Core
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

      // Electronic
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

      // Dance / Urban / Modern
      "K-Pop",
      "J-Pop",
      "Latin Pop",
      "Afrobeats",
      "Trap",
      "Boom Bap",
      "Neo-Soul",

      // World / Latin
      "Latin",
      "Salsa",
      "Bachata",
      "Merengue",
      "Reggaeton",
      "Bossa Nova",
      "Samba",
      "Flamenco",
      "World",

      // Instrumental / Other
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

  const canSubmit = title.trim().length > 0 && !!midi && !loading;

  const upload = async () => {
    if (!midi || !title.trim()) {
      alert("Title and MIDI file are required");
      return;
    }

    setLoading(true);

    try {
      // --- MIDI Upload ---
      const midiSafe = midi.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const midiPath = `${crypto.randomUUID()}-${midiSafe}`;

      const { error: midiError } = await supabase.storage
        .from("midis")
        .upload(midiPath, midi);

      if (midiError) throw midiError;

      // --- PDF Upload (optional) ---
      let pdfPath: string | null = null;

      if (pdf) {
        const pdfSafe = pdf.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        pdfPath = `${crypto.randomUUID()}-${pdfSafe}`;

        const { error: pdfError } = await supabase.storage
          .from("pdfs")
          .upload(pdfPath, pdf);

        if (pdfError) throw pdfError;
      }

      // --- Insert into DB ---
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        alert("Please log in to upload.");
        window.location.href = "/login?redirect=/upload";
        return;
      }

      const { error } = await supabase.from("music_files").insert({
        title,
        composer: composer || null,
        genre: genre || null,
        bpm: bpm === "" ? null : bpm,
        midi_url: midiPath,
        pdf_url: pdfPath,
        uploaded_by: userData.user.id,
      });

      if (error) throw error;

      alert("Upload successful!");
      setTitle("");
      setComposer("");
      setGenre("");
      setBpm("");
      setMidi(null);
      setPdf(null);
    } catch (err) {
      console.error(err);
      alert("Upload failed, see console");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* subtle glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/4 h-[420px] w-[420px] rounded-full bg-indigo-500/20 blur-3xl" />

      <div className="relative max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300">
            <Music2 size={16} className="text-blue-400" />
            Upload Center
          </div>

          <h1 className="mt-4 text-3xl md:text-4xl font-extrabold">
            Upload your MIDI{" "}
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              & sheet music
            </span>
          </h1>

          <p className="mt-2 text-gray-400">
            Add a MIDI file and optionally attach a PDF. Choose a genre from the list so browsing stays clean.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Main form */}
          <div className="lg:col-span-3 bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 shadow-xl">
            {/* Metadata */}
            <div className="flex items-center gap-2 text-sm text-gray-300 mb-4">
              <Info size={16} className="text-gray-400" />
              <span className="font-semibold">Details</span>
              <span className="text-gray-500">— make it easy to find later</span>
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

              {/* Genre (select) */}
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

            {/* Files */}
            <div className="mt-8 space-y-5">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <FileMusic size={16} className="text-blue-400" />
                <span className="font-semibold">Files</span>
                <span className="text-gray-500">— MIDI required, PDF optional</span>
              </div>

              {/* MIDI */}
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <label className="block text-sm font-medium mb-2">
                  🎵 MIDI File <span className="text-red-400">*</span>
                </label>
                <input
                  type="file"
                  accept=".mid,.midi"
                  onChange={(e) => setMidi(e.target.files?.[0] || null)}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0 file:bg-blue-600 file:text-white
                    hover:file:bg-blue-500"
                />
                {midi ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs text-blue-200">
                    <span className="font-semibold">Selected:</span>
                    <span className="truncate max-w-[260px]">{midi.name}</span>
                    <button
                      type="button"
                      onClick={() => setMidi(null)}
                      className="ml-1 text-blue-200/80 hover:text-blue-100"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-gray-500">Accepted: .mid, .midi</p>
                )}
              </div>

              {/* PDF */}
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <label className="block text-sm font-medium mb-2">
                  📄 Sheet Music PDF <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setPdf(e.target.files?.[0] || null)}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0 file:bg-green-600 file:text-white
                    hover:file:bg-green-500"
                />
                {pdf ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-green-500/10 border border-green-500/20 px-3 py-1 text-xs text-green-200">
                    <span className="font-semibold">Selected:</span>
                    <span className="truncate max-w-[260px]">{pdf.name}</span>
                    <button
                      type="button"
                      onClick={() => setPdf(null)}
                      className="ml-1 text-green-200/80 hover:text-green-100"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-gray-500">Optional — shows “PDF Available” badge on cards</p>
                )}
              </div>
            </div>

            {/* Submit */}
            <button
              disabled={!canSubmit}
              onClick={upload}
              className="mt-7 w-full py-3 rounded-2xl font-semibold transition
                bg-gradient-to-r from-blue-500 to-indigo-500
                hover:from-blue-400 hover:to-indigo-400
                disabled:opacity-40 disabled:cursor-not-allowed
                shadow-lg"
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={18} />
                  Uploading...
                </span>
              ) : (
                "Upload Files"
              )}
            </button>

            <p className="mt-3 text-xs text-gray-500">
              Tip: Keep titles consistent (e.g., “Artist – Track (Version)”) so your library looks clean.
            </p>
          </div>

          {/* Side panel */}
          <aside className="lg:col-span-2 space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="text-indigo-300" size={18} />
                <h3 className="font-bold text-lg">Upload checklist</h3>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400" />
                  Provide a clear title (required)
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400" />
                  Upload a MIDI file (.mid / .midi)
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-400" />
                  Add a PDF if you have sheet music (optional)
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  Choose a genre from the list
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-r from-blue-500/15 to-indigo-500/15 border border-white/10 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <Music2 className="text-blue-300" size={18} />
                <h3 className="font-bold text-lg">What happens next?</h3>
              </div>
              <p className="text-sm text-gray-300 mt-2 leading-relaxed">
                After upload, your MIDI appears in <span className="text-white font-semibold">All MIDI</span>.
                If you attached a PDF, cards show a <span className="text-green-300 font-semibold">PDF Available</span> badge,
                and the details page will include a sheet music preview + download.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
