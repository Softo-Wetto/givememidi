"use client";

import Link from "next/link";
import { ArrowRight, Keyboard, LogIn, LogOut, Music2, Search, ShieldCheck, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { pocketbase } from "../../lib/pocketbaseClient";

export function Footer() {
  const { user, loading } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    try {
      setSigningOut(true);
      await pocketbase.auth.signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <footer className="border-t border-white/10 bg-[radial-gradient(circle_at_top,#0f172a_0%,#020617_45%,#000_100%)] text-gray-300">
      <div className="pointer-events-none relative">
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="space-y-4 md:col-span-4">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_24px_rgba(96,165,250,0.18)]">
                <Music2 size={20} className="text-cyan-300" />
              </div>
              <div>
                <p className="text-lg font-extrabold leading-none text-white">GiveMeMIDI</p>
                <p className="mt-1 text-xs text-gray-400">MIDI + sheet music, made simple.</p>
              </div>
            </Link>

            <p className="text-sm leading-relaxed text-gray-400">
              Explore popular MIDI files, preview arrangements, download sheet music PDFs, and build your collection with bookmarks and comments.
            </p>

            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Keyboard size={16} className="text-cyan-300" />
                Quick search
              </div>
              <p className="mt-2 text-xs leading-relaxed text-gray-400">
                Press <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-300">/</kbd>{" "}
                anywhere to jump straight into MIDI search.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href={user ? "/profile" : "/login"}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:border-cyan-300/40 hover:bg-white/[0.06]"
              >
                {user ? <UserIcon size={16} className="text-cyan-300" /> : <LogIn size={16} className="text-cyan-300" />}
                {loading ? "Loading..." : user ? "Profile" : "Log in"}
              </Link>

              {!loading && user ? (
                <button
                  onClick={signOut}
                  disabled={signingOut}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:border-red-400/50 hover:bg-red-500/15 disabled:opacity-50"
                >
                  <LogOut size={16} />
                  {signingOut ? "Signing out..." : "Sign out"}
                </button>
              ) : null}
            </div>
          </div>

          <div className="space-y-3 md:col-span-2">
            <p className="text-sm font-semibold text-white">Explore</p>
            <ul className="space-y-2 text-sm">
              <FooterLink href="/midi" label="All MIDI" />
              <FooterLink href="/creators" label="Top creators" />
              <FooterLink href="/bookmarks" label="Bookmarks" />
              <FooterLink href="/upload" label="Upload" />
              <FooterLink href="/myuploads" label="My uploads" />
            </ul>
          </div>

          <div className="space-y-3 md:col-span-3">
            <p className="text-sm font-semibold text-white">Browse by vibe</p>
            <ul className="space-y-2 text-sm">
              <FooterLink href="/midi?genre=Classical" label="Classical" />
              <FooterLink href="/midi?genre=Game%20%2F%20OST" label="Game / OST" />
              <FooterLink href="/midi?genre=Jazz" label="Jazz" />
              <FooterLink href="/midi?sort=downloads" label="Most downloaded" />
              <FooterLink href="/midi" label="Newest uploads" />
            </ul>
          </div>

          <div className="space-y-3 md:col-span-3">
            <p className="text-sm font-semibold text-white">Trust & support</p>

            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                <ShieldCheck size={16} className="text-emerald-300" />
                Copyright & ownership
              </p>
              <p className="mt-2 text-xs leading-relaxed text-gray-400">
                Upload only content you have permission to share. If content violates your rights, contact us and we will review it promptly.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FooterButton href="/privacy" label="Privacy" />
              <FooterButton href="/terms" label="Terms" />
            </div>

            <Link
              href="/contact"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-gray-200 transition hover:border-cyan-300/40 hover:bg-white/[0.06]"
            >
              <Search size={16} />
              Report an issue
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-gray-500">© {new Date().getFullYear()} GiveMeMIDI. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="hidden sm:inline">Built with PocketBase + Next.js</span>
            <span className="hidden sm:inline">•</span>
            <Link href="/contact" className="transition hover:text-gray-300">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link href={href} className="text-gray-400 transition hover:text-white">
        {label}
      </Link>
    </li>
  );
}

function FooterButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-gray-200 transition hover:border-cyan-300/40 hover:bg-white/[0.06]"
    >
      {label}
    </Link>
  );
}
