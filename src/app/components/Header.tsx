"use client";

import { Award, Bookmark, ClipboardList, LogIn, LogOut, Menu, Music2, Upload, UploadCloud, UserRound, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { isGiveMeMidiAdmin } from "@/lib/givememidi-admin";
import { isNavActive } from "@/lib/editorial-ui";
import { pocketbase } from "../../lib/pocketbaseClient";
import { useAuth } from "./AuthProvider";
import { HeaderAccount } from "./HeaderAccount";
import { HeaderSearch } from "./HeaderSearch";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/midi", label: "Library" },
  { href: "/creators", label: "Creators" },
  { href: "/awards", label: "Awards" },
];

export function Header() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = isGiveMeMidiAdmin(user?.email);

  const close = () => setMobileOpen(false);
  const goUpload = () => {
    close();
    if (loading) return;
    if (user) {
      router.push("/upload");
      return;
    }

    const next = pathname !== "/login" ? pathname : "/upload";
    router.push(`/login?redirect=${encodeURIComponent(next)}`);
  };

  return (
    <header className="gmm-site-header">
      <div className="gmm-header-inner">
        <Link href="/" className="gmm-wordmark" onClick={close} aria-label="GiveMeMIDI home">
          <span className="gmm-wordmark-icon"><Music2 size={20} /></span>
          <span>GiveMe<span>MIDI</span></span>
        </Link>

        <nav className="gmm-desktop-nav" aria-label="Primary navigation">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} data-active={isNavActive(pathname, item.href)}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="gmm-header-search-wrap"><HeaderSearch /></div>

        <div className="gmm-header-actions">
          <button type="button" onClick={goUpload} className="gmm-upload-command">
            <Upload size={16} /> <span>Upload</span>
          </button>
          <HeaderAccount />
        </div>

        <button
          type="button"
          className="gmm-mobile-toggle"
          onClick={() => setMobileOpen((value) => !value)}
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="gmm-mobile-menu">
          <HeaderSearch onNavigate={close} />
          <nav aria-label="Mobile navigation">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} data-active={isNavActive(pathname, item.href)} onClick={close}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="gmm-mobile-actions">
            <button type="button" onClick={goUpload}><Upload size={16} /> Upload MIDI</button>
            {user ? (
              <>
                <MobileLink href="/profile" icon={<UserRound size={16} />} label="Profile" close={close} />
                <MobileLink href="/bookmarks" icon={<Bookmark size={16} />} label="Bookmarks" close={close} />
                <MobileLink href="/myuploads" icon={<UploadCloud size={16} />} label="My uploads" close={close} />
                <MobileLink href="/connections" icon={<Users size={16} />} label="Connections" close={close} />
                <MobileLink href="/awards" icon={<Award size={16} />} label="Awards & ranks" close={close} />
                {isAdmin ? <MobileLink href="/admin/imports" icon={<ClipboardList size={16} />} label="Import inbox" close={close} /> : null}
                <button
                  type="button"
                  className="text-red-300"
                  onClick={async () => {
                    await pocketbase.auth.signOut();
                    close();
                    router.push("/");
                  }}
                >
                  <LogOut size={16} /> Sign out
                </button>
              </>
            ) : (
              <MobileLink href="/login" icon={<LogIn size={16} />} label="Log in" close={close} />
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}

function MobileLink({ href, icon, label, close }: { href: string; icon: React.ReactNode; label: string; close: () => void }) {
  return <Link href={href} onClick={close}>{icon}<span>{label}</span></Link>;
}
