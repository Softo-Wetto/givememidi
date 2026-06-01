"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  Compass,
  Menu,
  X,
  Search,
  Upload,
  Music,
  LogIn,
  Bookmark,
  LogOut,
  ChevronDown,
  Info,
  Loader2,
  Mail,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { User as UserIcon } from "lucide-react";
import { UploadCloud } from "lucide-react";
import { pocketbase } from "../../lib/pocketbaseClient";
import { useAuth } from "./AuthProvider";
import { Users } from "lucide-react";

type ProfileRow = {
  username: string | null;
};

type SearchSuggestion = {
  id: string;
  title: string;
  composer: string | null;
  genre: string | null;
};

export function Header() {
  const router = useRouter();
  const pathname = usePathname();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchSuggesting, setSearchSuggesting] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const { user, loading: authLoading } = useAuth();
  const [username, setUsername] = useState<string | null>(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);

  const activePath = useMemo(() => pathname ?? "/", [pathname]);

  const closeAll = () => {
    setMobileOpen(false);
    setDiscoverOpen(false);
    setProfileOpen(false);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    if (!profileOpen && !discoverOpen) return;

    const close = () => {
      setProfileOpen(false);
      setDiscoverOpen(false);
    };

    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [profileOpen, discoverOpen]);

  // Scroll animation
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      searchInputRef.current?.focus();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    let cancelled = false;

    const timer = window.setTimeout(async () => {
      if (q.length < 2) {
        setSearchSuggestions([]);
        setSearchSuggesting(false);
        return;
      }

      setSearchSuggesting(true);

      const safeQuery = q.replace(/[,"%]/g, " ").replace(/\s+/g, " ").trim();
      if (!safeQuery) {
        setSearchSuggestions([]);
        setSearchSuggesting(false);
        return;
      }

      const { data, error } = await pocketbase
        .from("music_files")
        .select<SearchSuggestion>("id,title,composer,genre")
        .or(`title.ilike.%${safeQuery}%,composer.ilike.%${safeQuery}%,genre.ilike.%${safeQuery}%`)
        .limit(6);

      if (cancelled) return;
      if (error) {
        console.error("Search suggestions error:", error);
        setSearchSuggestions([]);
      } else {
        setSearchSuggestions((data ?? []) as SearchSuggestion[]);
      }
      setSearchSuggesting(false);
    }, q.length < 2 ? 0 : 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  // Load username
  useEffect(() => {
    let alive = true;

    const loadUsername = async () => {
      if (!user) {
        setUsername(null);
        return;
      }

      const { data: prof, error } = await pocketbase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle<ProfileRow>();

      if (!alive) return;

      if (error) {
        console.error("Header profile fetch error:", error);
        setUsername(null);
        return;
      }

      setUsername(prof?.username ?? null);
    };

    loadUsername();

    return () => {
      alive = false;
    };
  }, [user]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    router.push(`/midi?search=${encodeURIComponent(q)}`);
    setSearchQuery("");
    setSearchFocused(false);
    setMobileOpen(false);
  };

  const openSuggestion = (suggestion: SearchSuggestion) => {
    router.push(`/midi/${suggestion.id}`);
    setSearchQuery("");
    setSearchFocused(false);
    setMobileOpen(false);
  };

  const goUpload = () => {
    closeAll();

    if (authLoading) return;

    if (user) {
      router.push("/upload");
      return;
    }

    const next = pathname && pathname !== "/login" ? pathname : "/upload";
    router.push(`/login?redirect=${encodeURIComponent(next)}`);
  };

  const searchDropdown =
    searchFocused && searchQuery.trim().length >= 2 ? (
      <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            const q = searchQuery.trim();
            if (!q) return;
            router.push(`/midi?search=${encodeURIComponent(q)}`);
            setSearchQuery("");
            setSearchFocused(false);
            setMobileOpen(false);
          }}
          className="flex w-full items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-left text-sm text-slate-200 transition hover:bg-white/[0.06]"
        >
          <span>
            Search all for <span className="font-semibold text-white">{searchQuery.trim()}</span>
          </span>
          <Search size={15} className="text-cyan-300" />
        </button>

        {searchSuggesting ? (
          <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-400">
            <Loader2 size={15} className="animate-spin" />
            Finding matches...
          </div>
        ) : searchSuggestions.length > 0 ? (
          <div className="py-1">
            {searchSuggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  openSuggestion(suggestion);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.06]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200 ring-1 ring-cyan-300/15">
                  <Music size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-white">
                    {suggestion.title}
                  </span>
                  <span className="block truncate text-xs text-slate-400">
                    {suggestion.composer || "Unknown composer"}
                    {suggestion.genre ? ` • ${suggestion.genre}` : ""}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-4 py-3 text-sm text-slate-500">No quick matches yet.</div>
        )}
      </div>
    ) : null;

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 border-b border-gray-800
        ${
          scrolled
            ? "bg-black/80 backdrop-blur-xl py-2 shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
            : "bg-black/60 backdrop-blur py-4"
        }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 group shrink-0"
            onClick={closeAll}
          >
            <Music className="w-6 h-6 text-blue-400 group-hover:rotate-6 transition" />
            <span className="text-xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              GiveMeMIDI
            </span>
          </Link>

          {/* Search (desktop) */}
          <form
            onSubmit={handleSearch}
            className="relative hidden md:flex flex-1 max-w-md items-center
              bg-gray-800/70 rounded-2xl overflow-visible border border-gray-700
              focus-within:ring-2 focus-within:ring-blue-400/60 transition"
          >
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search MIDI, composer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
              className="w-full px-4 py-2.5 bg-transparent text-white placeholder-gray-400 focus:outline-none"
            />
            {!searchQuery ? (
              <kbd className="mr-1 hidden rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 lg:inline">
                /
              </kbd>
            ) : null}
            <button
              type="submit"
              className="px-4 text-gray-300 hover:text-white transition"
              aria-label="Search"
            >
              <Search size={18} />
            </button>
            {searchDropdown}
          </form>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3 relative">
            {/* Discover + Upload group (keeps them right beside each other) */}
            <div className="relative flex items-center gap-2">
              {/* Discover */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDiscoverOpen((v) => !v);
                    setProfileOpen(false);
                  }}
                  className={`group inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition
                    ${
                      discoverOpen
                        ? "border border-cyan-300/40 bg-cyan-300/10 text-white shadow-[0_0_24px_rgba(34,211,238,0.14)]"
                        : "border border-white/10 bg-white/5 text-gray-200 hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-white"
                    }`}
                  aria-haspopup="menu"
                  aria-expanded={discoverOpen}
                >
                  <Compass size={16} className="text-cyan-300 transition group-hover:rotate-12" />
                  <span>Discover</span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${
                      discoverOpen
                        ? "rotate-180 text-white"
                        : "text-gray-400 group-hover:text-white"
                    }`}
                  />
                </button>

                {discoverOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 mt-3 w-[25rem] overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl animate-in fade-in zoom-in-95"
                    role="menu"
                  >
                    <div className="relative overflow-hidden border-b border-white/10 px-5 py-4">
                      <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-cyan-400/20 blur-3xl" />
                      <div className="relative flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
                            Library
                          </p>
                          <p className="mt-1 text-base font-bold text-white">Find your next MIDI</p>
                          <p className="mt-1 text-xs leading-5 text-slate-400">
                            Browse scores, creators, community picks, and support links.
                          </p>
                        </div>
                        <span className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-cyan-200">
                          <Sparkles size={18} />
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-2 p-2">
                      <Link
                        href="/midi"
                        onClick={() => setDiscoverOpen(false)}
                        className="group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-gray-200 transition hover:bg-white/[0.06]"
                        role="menuitem"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-400/10 text-blue-200 ring-1 ring-blue-300/15">
                          <Music size={17} />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-white">All MIDI</span>
                          <span className="block truncate text-xs text-slate-400">
                            Search the full library by title, composer, or genre.
                          </span>
                        </span>
                      </Link>

                      <Link
                        href="/creators"
                        onClick={() => setDiscoverOpen(false)}
                        className="group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-gray-200 transition hover:bg-white/[0.06]"
                        role="menuitem"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-200 ring-1 ring-amber-200/15">
                          <Award size={17} />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-white">Top Creators</span>
                          <span className="block truncate text-xs text-slate-400">
                            See points, upload streaks, and community favorites.
                          </span>
                        </span>
                      </Link>

                      <Link
                        href="/midi?sort=downloads"
                        onClick={() => setDiscoverOpen(false)}
                        className="group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-gray-200 transition hover:bg-white/[0.06]"
                        role="menuitem"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-200 ring-1 ring-emerald-200/15">
                          <TrendingUp size={17} />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-white">Most Downloaded</span>
                          <span className="block truncate text-xs text-slate-400">
                            Jump into MIDI files people are saving most.
                          </span>
                        </span>
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-2 border-t border-white/10 bg-white/[0.02] p-2">
                      <Link
                        href="/about"
                        onClick={() => setDiscoverOpen(false)}
                        className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-300/30 hover:text-white"
                        role="menuitem"
                      >
                        <Info size={14} className="text-indigo-200" />
                        About
                      </Link>

                      <Link
                        href="/contact"
                        onClick={() => setDiscoverOpen(false)}
                        className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-300/30 hover:text-white"
                        role="menuitem"
                      >
                        <Mail size={14} className="text-cyan-200" />
                        Contact
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload */}
              <button
                type="button"
                onClick={goUpload}
                className="flex items-center gap-2 px-4 py-2 rounded-xl
                  bg-gradient-to-r from-blue-500 to-indigo-500
                  hover:from-blue-400 hover:to-indigo-400
                  font-semibold text-white shadow-lg transition"
              >
                <Upload size={16} />
                Upload
              </button>
            </div>

            {/* Profile / Login */}
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDiscoverOpen(false);
                    setProfileOpen((v) => !v);
                  }}
                  className="flex items-center gap-2 pl-2 pr-3 py-2 rounded-xl
                    bg-gray-900/50 border border-gray-700
                    hover:border-blue-400/70 hover:bg-gray-900/70 transition
                    shadow-[0_0_0_rgba(0,0,0,0)] hover:shadow-[0_0_18px_rgba(96,165,250,0.15)]"
                  title={user.email ?? "Account"}
                >
                  <span className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-800 border border-gray-700">
                    <UserIcon size={16} className="text-blue-300" />
                  </span>

                  <div className="hidden lg:flex flex-col leading-tight text-left">
                    <span className="text-sm font-semibold text-white max-w-[140px] truncate">
                      {username ?? "User"}
                    </span>
                    <span className="text-[11px] text-gray-400 max-w-[140px] truncate">
                      {user.email}
                    </span>
                  </div>
                </button>

                {profileOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 mt-2 w-64 rounded-2xl
                      bg-gray-900 border border-gray-700 shadow-2xl overflow-hidden
                      animate-in fade-in zoom-in-95"
                  >
                    <div className="px-4 py-3 border-b border-gray-700">
                      <p className="text-xs text-gray-400">Signed in as</p>
                      <p className="truncate text-sm font-semibold text-white">
                        {username ?? "User"}
                      </p>
                      <p className="truncate text-xs text-gray-400 mt-0.5">
                        {user.email}
                      </p>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-white/5 transition"
                      >
                        <UserIcon size={16} className="text-blue-300" />
                        Profile
                      </Link>

                      <Link
                        href="/bookmarks"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-white/5 transition"
                      >
                        <Bookmark size={16} className="text-blue-400" />
                        Bookmarks
                      </Link>

                      <Link
                        href="/myuploads"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition"
                      >
                        <UploadCloud size={16} className="text-indigo-300" />
                        My Uploads
                      </Link>

                      <Link
                        href="/connections"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-white/5 transition"
                      >
                        <Users size={16} className="text-emerald-300" />
                        Connections
                      </Link>
                    </div>

                    <div className="h-px bg-gray-700" />

                    <button
                      type="button"
                      onClick={async () => {
                        await pocketbase.auth.signOut();
                        setProfileOpen(false);
                        router.push("/");
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-300 hover:bg-red-500/10 transition"
                    >
                      <LogOut size={16} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 px-4 py-2 rounded-xl
                  border border-gray-700 text-gray-200
                  hover:border-blue-400 hover:text-white
                  hover:shadow-[0_0_12px_rgba(96,165,250,0.25)]
                  transition-all duration-200"
              >
                <LogIn size={16} />
                Log In
              </Link>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden text-gray-300 hover:text-white"
            aria-label="Open menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden mt-4 pb-6 border-t border-gray-800 pt-6">
            <form
              onSubmit={handleSearch}
              className="relative flex items-center bg-gray-800/70 rounded-2xl overflow-visible border border-gray-700"
            >
              <input
                type="text"
                placeholder="Search MIDI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
                className="w-full px-4 py-3 bg-transparent text-white focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 text-gray-300 hover:text-white"
                aria-label="Search"
              >
                <Search size={18} />
              </button>
              {searchDropdown}
            </form>

            <nav className="mt-4 grid gap-2 text-sm">
              <Link
                href="/midi"
                onClick={closeAll}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-gray-200 transition hover:border-cyan-300/30 hover:text-white"
              >
                <Music size={16} className="text-blue-200" />
                All MIDI
              </Link>

              <Link
                href="/creators"
                onClick={closeAll}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-gray-200 transition hover:border-amber-200/30 hover:text-white"
              >
                <Award size={16} className="text-amber-200" />
                Top Creators
              </Link>

              <Link
                href="/contact"
                onClick={closeAll}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-gray-200 transition hover:border-cyan-300/30 hover:text-white"
              >
                <Mail size={16} className="text-cyan-200" />
                Contact
              </Link>

              <Link
                href="/about"
                onClick={closeAll}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-gray-200 transition hover:border-indigo-300/30 hover:text-white"
              >
                <Info size={16} className="text-indigo-200" />
                About
              </Link>
            </nav>

            <div className="flex flex-col gap-3 pt-4">
              <button
                type="button"
                onClick={goUpload}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                  bg-gradient-to-r from-blue-500 to-indigo-500
                  hover:from-blue-400 hover:to-indigo-400
                  font-semibold text-white shadow-lg transition"
              >
                <Upload size={16} />
                Upload MIDI
              </button>

              {user ? (
                <>
                  <Link
                    href="/profile"
                    onClick={closeAll}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                      border border-gray-700 text-gray-200 hover:border-blue-400 transition"
                  >
                    <UserIcon size={16} className="text-blue-300" />
                    Profile
                  </Link>

                  <Link
                    href="/bookmarks"
                    onClick={closeAll}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                      border border-gray-700 text-gray-200 hover:border-blue-400 transition"
                  >
                    <Bookmark size={16} className="text-blue-400" />
                    Bookmarks
                  </Link>

                  <Link
                    href="/myuploads"
                    onClick={closeAll}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                      border border-gray-700 text-gray-200 hover:border-blue-400 transition"
                  >
                    <UploadCloud size={16} className="text-indigo-300" />
                    My Uploads
                  </Link>

                  <Link
                    href="/connections"
                    onClick={closeAll}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                      border border-gray-700 text-gray-200 hover:border-blue-400 transition"
                  >
                    <Users size={16} className="text-emerald-300" />
                    Connections
                  </Link>

                  <button
                    type="button"
                    onClick={async () => {
                      await pocketbase.auth.signOut();
                      closeAll();
                      router.push("/");
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                      text-red-300 border border-red-500/30 hover:bg-red-500/10 transition"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={closeAll}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                    border border-gray-700 text-gray-200 hover:border-blue-400 transition"
                >
                  <LogIn size={16} />
                  Log In
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
