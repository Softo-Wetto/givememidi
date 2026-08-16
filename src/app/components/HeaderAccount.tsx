"use client";

import { Award, Bookmark, ChevronDown, ClipboardList, LogIn, LogOut, UploadCloud, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isGiveMeMidiAdmin } from "@/lib/givememidi-admin";
import { pocketbase } from "../../lib/pocketbaseClient";
import { useAuth } from "./AuthProvider";
import { ProfileAvatar } from "./ProfileAvatar";

type LoadedProfile = {
  userId: string;
  username: string | null;
  avatar_url: string | null;
};

export function HeaderAccount() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<LoadedProfile | null>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    let active = true;
    if (!user) return;

    void pocketbase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .maybeSingle<{ username: string | null; avatar_url: string | null }>()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.error("Header profile fetch error:", error);
        setProfile({
          userId: user.id,
          username: data?.username ?? null,
          avatar_url: data?.avatar_url ?? null,
        });
      });

    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<{ username?: string; avatarUrl?: string | null }>).detail;
      if (!detail || !user) return;
      setProfile((current) => ({
        userId: user.id,
        username: typeof detail.username === "string" ? detail.username : current?.username ?? null,
        avatar_url: "avatarUrl" in detail ? detail.avatarUrl ?? null : current?.avatar_url ?? null,
      }));
    };
    window.addEventListener("givememidi:profile-updated", update);
    return () => window.removeEventListener("givememidi:profile-updated", update);
  }, [user]);

  if (loading) return <span className="gmm-account-loading" aria-label="Loading account" />;
  if (!user) return <Link href="/login" className="gmm-account-login"><LogIn size={16} /> Log in</Link>;

  const currentProfile = profile?.userId === user.id ? profile : null;
  const username = currentProfile?.username ?? null;
  const avatarUrl = currentProfile?.avatar_url ?? null;
  const name = username || user.email || "Account";
  const admin = isGiveMeMidiAdmin(user.email);

  return (
    <div ref={menuRef} className="gmm-account">
      <button type="button" className="gmm-account-trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <ProfileAvatar src={avatarUrl} name={name} sizeClassName="h-8 w-8" />
        <span>{username || "Account"}</span>
        <ChevronDown size={14} className={open ? "rotate-180" : ""} />
      </button>

      {open ? (
        <div className="gmm-account-menu">
          <div className="gmm-account-summary">
            <ProfileAvatar src={avatarUrl} name={name} sizeClassName="h-11 w-11" />
            <span><strong>{username || "GiveMeMIDI user"}</strong><small>{user.email}</small></span>
          </div>
          <AccountLink href="/profile" icon={<UserRound size={16} />} label="Profile" close={() => setOpen(false)} />
          <AccountLink href="/bookmarks" icon={<Bookmark size={16} />} label="Bookmarks" close={() => setOpen(false)} />
          <AccountLink href="/myuploads" icon={<UploadCloud size={16} />} label="My uploads" close={() => setOpen(false)} />
          <AccountLink href="/connections" icon={<Users size={16} />} label="Connections" close={() => setOpen(false)} />
          <AccountLink href="/awards" icon={<Award size={16} />} label="Awards & ranks" close={() => setOpen(false)} />
          {admin ? <AccountLink href="/admin/imports" icon={<ClipboardList size={16} />} label="Import inbox" close={() => setOpen(false)} /> : null}
          <button
            type="button"
            className="gmm-account-signout"
            onClick={async () => {
              await pocketbase.auth.signOut();
              setOpen(false);
              router.push("/");
            }}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function AccountLink({ href, icon, label, close }: { href: string; icon: React.ReactNode; label: string; close: () => void }) {
  return <Link href={href} onClick={close} className="gmm-account-link">{icon}<span>{label}</span></Link>;
}
