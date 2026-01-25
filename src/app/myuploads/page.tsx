"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supbaseClient";
import {
  Loader2,
  Music2,
  Pencil,
  Trash2,
  UploadCloud,
  FileText,
  ArrowRight,
} from "lucide-react";

type UploadRow = {
  id: string;
  title: string;
  composer: string | null;
  genre: string | null;
  bpm: number | null;
  downloads: number | null;
  created_at: string;
  pdf_url: string | null;
};

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

export default function MyUploadsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  const [rows, setRows] = useState<UploadRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [genre, setGenre] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const fetchUploads = async (uid: string) => {
    setLoading(true);

    let query = supabase
      .from("music_files")
      .select(
        "id, title, composer, genre, bpm, downloads, created_at, pdf_url"
      )
      .eq("uploaded_by", uid)
      .order("created_at", { ascending: false });

    if (q.trim()) query = query.ilike("title", `%${q.trim()}%`);
    if (genre) query = query.eq("genre", genre);

    const { data, error } = await query;

    if (error) {
      console.error("My uploads fetch error:", error);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as UploadRow[]);
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.error("getUser error:", error);

      if (!data?.user) {
        router.push("/login?redirect=/uploads");
        return;
      }

      setUserId(data.user.id);
      await fetchUploads(data.user.id);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    const t = setTimeout(() => fetchUploads(userId), 250); // small debounce
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, genre, userId]);

  const removeUpload = async (id: string) => {
    if (!confirm("Delete this upload? This cannot be undone.")) return;

    setDeletingId(id);

    // We’ll fetch the file paths first so we can remove storage objects too
    const { data: row, error: rowErr } = await supabase
      .from("music_files")
      .select("midi_url, pdf_url")
      .eq("id", id)
      .single();

    if (rowErr) console.error("Fetch row for delete error:", rowErr);

    const { error } = await supabase.from("music_files").delete().eq("id", id);

    if (error) {
      console.error("Delete DB row error:", error);
      alert("Could not delete. Are you the uploader?");
      setDeletingId(null);
      return;
    }

    // Best-effort storage cleanup (may fail if old files were not in user folder policies)
    if (row?.midi_url) {
      const r = await supabase.storage.from("midis").remove([row.midi_url]);
      if (r.error) console.warn("MIDI remove warning:", r.error);
    }
    if (row?.pdf_url) {
      const r = await supabase.storage.from("pdfs").remove([row.pdf_url]);
      if (r.error) console.warn("PDF remove warning:", r.error);
    }

    setRows((prev) => prev.filter((x) => x.id !== id));
    setDeletingId(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-black text-white">
      {/* glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-72 w-[900px] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-48 left-1/4 h-72 w-[700px] rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300">
              <Music2 size={16} className="text-blue-400" />
              Creator Hub
            </div>
            <h1 className="mt-4 text-3xl md:text-4xl font-extrabold">
              My{" "}
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Uploads
              </span>
            </h1>
            <p className="mt-2 text-gray-400">
              Manage your MIDI library — edit details, replace files, or remove uploads.
            </p>
          </div>

          <Link
            href="/upload"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl
              bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400
              font-semibold shadow-lg transition"
          >
            <UploadCloud size={18} />
            New Upload
          </Link>
        </div>

        {/* Filters */}
        <section className="bg-white/5 border border-white/10 rounded-3xl p-5 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search your uploads…"
              className="w-full p-3 rounded-2xl bg-gray-900/60 border border-gray-700
                focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400/40"
            />

            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full p-3 rounded-2xl bg-gray-900/60 border border-gray-700
                focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400/40"
            >
              <option value="">All genres</option>
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            <div className="flex items-center justify-between rounded-2xl bg-black/20 border border-white/10 px-4">
              <div className="text-sm text-gray-400">
                Showing <span className="text-white font-semibold">{rows.length}</span>
              </div>
              <button
                onClick={() => {
                  setQ("");
                  setGenre("");
                }}
                className="text-sm text-blue-300 hover:text-blue-200 transition"
              >
                Reset
              </button>
            </div>
          </div>
        </section>

        {/* Content */}
        {loading ? (
          <div className="min-h-[40vh] flex items-center justify-center gap-2 text-gray-400">
            <Loader2 className="animate-spin" size={18} />
            Loading your uploads…
          </div>
        ) : rows.length === 0 ? (
          <section className="bg-white/5 border border-white/10 rounded-3xl p-10 shadow-xl text-center">
            <FileText className="mx-auto text-blue-300" size={26} />
            <h2 className="mt-4 text-xl font-bold">No uploads yet</h2>
            <p className="mt-2 text-gray-400">
              Upload your first MIDI to start building your library.
            </p>
            <Link
              href="/upload"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-2xl
                bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400
                font-semibold shadow-lg transition"
            >
              Upload now <ArrowRight size={16} />
            </Link>
          </section>
        ) : (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rows.map((m) => (
              <div
                key={m.id}
                className="bg-white/5 border border-white/10 rounded-3xl p-5 shadow-xl flex flex-col"
              >
                <div className="w-full h-44 bg-white/10 rounded-2xl flex items-center justify-center overflow-hidden">
                  {m.pdf_url ? (
                    <img
                      src="/sheet-music-placeholder.png"
                      alt="Sheet music available"
                      className="object-contain w-5/6 h-5/6"
                    />
                  ) : (
                    <div className="text-gray-400 text-sm font-medium">❌ No PDF</div>
                  )}
                </div>

                <div className="mt-4 flex-1">
                  <h3 className="font-semibold text-lg truncate">{m.title}</h3>
                  <p className="text-sm text-gray-400 truncate">
                    {m.composer || "Unknown Composer"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="px-2 py-1 rounded-full text-xs border border-white/10 bg-black/20 text-gray-300">
                      {m.genre || "No genre"}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs border border-white/10 bg-black/20 text-gray-300">
                      BPM: {m.bpm ?? "—"}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs border border-white/10 bg-black/20 text-gray-300">
                      ⬇ {m.downloads ?? 0}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-gray-500">
                    Uploaded {timeAgo(m.created_at)}
                  </p>
                </div>

                <div className="mt-5 flex gap-3">
                  <Link
                    href={`/midi/${m.id}/edit`}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl
                      border border-white/10 bg-white/5 hover:bg-white/10 transition"
                  >
                    <Pencil size={16} className="text-blue-300" />
                    Edit
                  </Link>

                  <button
                    onClick={() => removeUpload(m.id)}
                    disabled={deletingId === m.id}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl
                      border border-red-500/30 text-red-300 hover:bg-red-500/10 transition
                      disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === m.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>

                <Link
                  href={`/midi/${m.id}`}
                  className="mt-3 text-sm text-blue-300 hover:text-blue-200 transition"
                >
                  View detail →
                </Link>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
