"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Menu, X, Search, Upload, Music, LogIn, Bookmark, LogOut } from "lucide-react";
import { User as UserIcon } from "lucide-react";
import { UploadCloud } from "lucide-react";
import { supabase } from "../../lib/supbaseClient";
import { useAuth } from "./AuthProvider";

type ProfileRow = {
  username: string | null;
};

type NavLinkProps = {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
};

function NavLink({ href, label, active, onNavigate }: NavLinkProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`group relative px-3 py-2 rounded-xl text-sm font-medium transition-all
        ${
          active
            ? "text-white bg-white/5 border border-white/10"
            : "text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10"
        }`}
    >
      {label}
      <span
        className={`pointer-events-none absolute left-3 right-3 -bottom-[1px] h-[2px] origin-left scale-x-0
          bg-gradient-to-r from-blue-400 to-indigo-400
          transition-transform duration-300
          ${active ? "scale-x-100" : "group-hover:scale-x-100"}`}
      />
    </Link>
  );
}

export function Header() {
  const router = useRouter();
  const pathname = usePathname();

  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { user, loading: authLoading } = useAuth();
  const [username, setUsername] = useState<string | null>(null);

  const [profileOpen, setProfileOpen] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return;

    const close = () => setProfileOpen(false);
    window.addEventListener("click", close);

    return () => window.removeEventListener("click", close);
  }, [profileOpen]);

  // Scroll animation
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Load username when user changes
  useEffect(() => {
    let alive = true;

    const loadUsername = async () => {
      if (!user) {
        setUsername(null);
        return;
      }

      const { data: prof, error } = await supabase
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
    setMobileOpen(false);
  };

  const activePath = useMemo(() => pathname ?? "/", [pathname]);

  const closeMobile = () => setMobileOpen(false);

  const goUpload = () => {
    closeMobile();

    if (authLoading) return;

    if (user) {
      router.push("/upload");
      return;
    }

    const next = pathname && pathname !== "/login" ? pathname : "/upload";
    router.push(`/login?redirect=${encodeURIComponent(next)}`);
  };

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
          <Link href="/" className="flex items-center gap-2 group shrink-0" onClick={closeMobile}>
            <Music className="w-6 h-6 text-blue-400 group-hover:rotate-6 transition" />
            <span className="text-xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              GiveMeMIDI
            </span>
          </Link>

          {/* Search (desktop) */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 max-w-md items-center
              bg-gray-800/70 rounded-2xl overflow-hidden border border-gray-700
              focus-within:ring-2 focus-within:ring-blue-400/60 transition"
          >
            <input
              type="text"
              placeholder="Search MIDI, composer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 bg-transparent text-white placeholder-gray-400 focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 text-gray-300 hover:text-white transition"
              aria-label="Search"
            >
              <Search size={18} />
            </button>
          </form>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2">
            <NavLink href="/midi" label="All MIDI" active={activePath === "/midi"} />
            <NavLink href="/contact" label="Contact" active={activePath === "/contact"} />
            <NavLink href="/about" label="About" active={activePath === "/about"} />
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3 relative">
            {/* Upload button */}
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

            {/* Profile / Login on far right */}
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
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

                {/* Dropdown */}
                {profileOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 mt-2 w-64 rounded-2xl
                      bg-gray-900 border border-gray-700 shadow-2xl overflow-hidden
                      animate-in fade-in zoom-in-95"
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-gray-700">
                      <p className="text-xs text-gray-400">Signed in as</p>
                      <p className="truncate text-sm font-semibold text-white">
                        {username ?? "User"}
                      </p>
                      <p className="truncate text-xs text-gray-400 mt-0.5">
                        {user.email}
                      </p>
                    </div>

                    {/* Links */}
                    <div className="py-1">
                      <Link
                        href="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5
                          text-sm text-gray-200 hover:bg-white/5 transition"
                      >
                        <UserIcon size={16} className="text-blue-300" />
                        Profile
                      </Link>

                      <Link
                        href="/bookmarks"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5
                          text-sm text-gray-200 hover:bg-white/5 transition"
                      >
                        <Bookmark size={16} className="text-blue-400" />
                        Bookmarks
                      </Link>

                      <Link
                        href="/myuploads"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5
                          text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition"
                      >
                        <UploadCloud size={16} className="text-indigo-300" />
                        My Uploads
                      </Link>
                    </div>

                    <div className="h-px bg-gray-700" />

                    {/* Sign out */}
                    <button
                      type="button"
                      onClick={async () => {
                        await supabase.auth.signOut();
                        setProfileOpen(false);
                        router.push("/");
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3
                        text-sm text-red-300 hover:bg-red-500/10 transition"
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
            {/* Mobile Search */}
            <form
              onSubmit={handleSearch}
              className="flex items-center bg-gray-800/70 rounded-2xl overflow-hidden border border-gray-700"
            >
              <input
                type="text"
                placeholder="Search MIDI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 bg-transparent text-white focus:outline-none"
              />
              <button type="submit" className="px-4 text-gray-300 hover:text-white" aria-label="Search">
                <Search size={18} />
              </button>
            </form>

            {/* Links */}
            <nav className="flex flex-col gap-2 text-sm mt-4">
              <Link
                href="/midi"
                onClick={closeMobile}
                className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-200 hover:text-white transition"
              >
                All MIDI
              </Link>

              <Link
                href="/contact"
                onClick={closeMobile}
                className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-200 hover:text-white transition"
              >
                Contact
              </Link>

              <Link
                href="/about"
                onClick={closeMobile}
                className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-200 hover:text-white transition"
              >
                About
              </Link>
            </nav>

            {/* Mobile Actions */}
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
                    onClick={closeMobile}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                      border border-gray-700 text-gray-200 hover:border-blue-400 transition"
                  >
                    <UserIcon size={16} className="text-blue-300" />
                    Profile
                  </Link>

                  <Link
                    href="/bookmarks"
                    onClick={closeMobile}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                      border border-gray-700 text-gray-200 hover:border-blue-400 transition"
                  >
                    <Bookmark size={16} className="text-blue-400" />
                    Bookmarks
                  </Link>

                  <Link
                    href="/myuploads"
                    onClick={closeMobile}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                      border border-gray-700 text-gray-200 hover:border-blue-400 transition"
                  >
                    <UploadCloud size={16} className="text-indigo-300" />
                    My Uploads
                  </Link>

                  <button
                    type="button"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      closeMobile();
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
                  onClick={closeMobile}
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
