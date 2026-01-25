"use client";

import Link from "next/link";
import { FaTwitter, FaGithub, FaInstagram } from "react-icons/fa";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { supabase } from "../../lib/supbaseClient";

export function Footer() {
  const { user, loading } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    try {
      setSigningOut(true);
      await supabase.auth.signOut();
    } finally {
      setSigningOut(false);
    }
  };

  const accountHref = user ? "/profile" : "/login";
  const accountLabel = user ? "Profile" : "Log in";

  return (
    <footer className="mt-24 border-t border-white/10 bg-gradient-to-b from-black via-gray-950 to-black text-gray-300">
      {/* top glow line */}
      <div className="pointer-events-none relative">
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand */}
          <div className="md:col-span-4 space-y-4">
            <div className="inline-flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-[0_0_24px_rgba(96,165,250,0.18)]">
                🎵
              </div>
              <div>
                <p className="text-white font-extrabold text-lg leading-none">
                  GiveMeMIDI
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  MIDI + Sheet Music, made simple.
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-400 leading-relaxed">
              Explore popular MIDI files, preview tracks, download sheet music PDFs,
              and build your collection with bookmarks and comments.
            </p>

            {/* Social */}
            <div className="flex gap-3 pt-1">
              <SocialIcon href="https://twitter.com/yourprofile" label="Twitter">
                <FaTwitter />
              </SocialIcon>
              <SocialIcon href="https://github.com/yourprofile" label="GitHub">
                <FaGithub />
              </SocialIcon>
              <SocialIcon href="https://instagram.com/yourprofile" label="Instagram">
                <FaInstagram />
              </SocialIcon>
            </div>

            {/* Account CTA */}
            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                href={accountHref}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                           border border-white/15 bg-white/[0.03]
                           hover:bg-white/[0.06] hover:border-blue-400/40
                           text-sm font-semibold text-gray-200 transition"
              >
                {user ? (
                  <UserIcon size={16} className="text-blue-300" />
                ) : (
                  <LogIn size={16} className="text-blue-300" />
                )}
                {loading ? "Loading…" : accountLabel}
              </Link>

              {!loading && user ? (
                <button
                  onClick={signOut}
                  disabled={signingOut}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                             border border-red-500/30 bg-red-500/10
                             hover:bg-red-500/15 hover:border-red-400/50
                             text-sm font-semibold text-red-200 transition
                             disabled:opacity-50"
                >
                  <LogOut size={16} />
                  {signingOut ? "Signing out..." : "Sign out"}
                </button>
              ) : null}
            </div>
          </div>

          {/* Explore */}
          <div className="md:col-span-2 space-y-3">
            <p className="text-sm font-semibold text-white">Explore</p>
            <ul className="space-y-2 text-sm">
              <FooterLink href="/midi" label="All MIDI" />
              <FooterLink href="/bookmarks" label="Bookmarks" />
              <FooterLink href="/upload" label="Upload" />
              <FooterLink href="/myuploads" label="My uploads" />
            </ul>
          </div>

          {/* Company */}
          <div className="md:col-span-3 space-y-3">
            <p className="text-sm font-semibold text-white">Company</p>
            <ul className="space-y-2 text-sm">
              <FooterLink href="/about" label="About" />
              <FooterLink href="/contact" label="Contact" />
              <FooterLink href="/profile" label="Profile" />
            </ul>
          </div>

          {/* Legal / Notice */}
          <div className="md:col-span-3 space-y-3">
            <p className="text-sm font-semibold text-white">Legal</p>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-gray-200 font-semibold">
                Copyright & ownership
              </p>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                Upload only content you have permission to share. If you believe content
                violates your rights, contact us and we’ll review promptly.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/privacy"
                className="inline-flex items-center justify-center px-4 py-3 rounded-xl
                           border border-white/15 bg-white/[0.03]
                           hover:bg-white/[0.06] hover:border-blue-400/40
                           text-sm font-semibold text-gray-200 transition"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="inline-flex items-center justify-center px-4 py-3 rounded-xl
                           border border-white/15 bg-white/[0.03]
                           hover:bg-white/[0.06] hover:border-blue-400/40
                           text-sm font-semibold text-gray-200 transition"
              >
                Terms
              </Link>
            </div>

            <Link
              href="/contact"
              className="inline-flex items-center justify-center w-full px-4 py-3 rounded-xl
                         border border-white/15 bg-white/[0.03]
                         hover:bg-white/[0.06] hover:border-blue-400/40
                         text-sm font-semibold text-gray-200 transition"
            >
              Report an issue →
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} GiveMeMIDI. All rights reserved.
          </p>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="hidden sm:inline">Built with Supabase + Next.js</span>
            <span className="hidden sm:inline">•</span>
            <Link href="/contact" className="hover:text-gray-300 transition">
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
      <Link href={href} className="text-gray-400 hover:text-white transition">
        {label}
      </Link>
    </li>
  );
}

function SocialIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
      className="h-10 w-10 rounded-xl border border-white/10 bg-white/5
                 flex items-center justify-center
                 text-gray-300 hover:text-white
                 hover:border-blue-400/40 hover:bg-white/10
                 hover:shadow-[0_0_18px_rgba(96,165,250,0.15)]
                 transition"
    >
      {children}
    </a>
  );
}
