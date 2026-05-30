import type { PocketBaseAuth } from "@/lib/pocketbase/types";
import { POCKETBASE_AUTH_COOKIE } from "@/lib/pocketbase/config";

const maxAge = 60 * 60 * 24 * 30;

export function serializeAuthCookie(auth: PocketBaseAuth) {
  return `${POCKETBASE_AUTH_COOKIE}=${encodeURIComponent(
    JSON.stringify(auth)
  )}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function clearAuthCookie() {
  return `${POCKETBASE_AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function parseAuthCookie(value?: string | null): PocketBaseAuth | null {
  if (!value) return null;

  try {
    return JSON.parse(decodeURIComponent(value)) as PocketBaseAuth;
  } catch {
    return null;
  }
}

export function getBrowserAuth() {
  if (typeof document === "undefined") return null;

  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${POCKETBASE_AUTH_COOKIE}=`));

  return parseAuthCookie(cookie?.split("=").slice(1).join("="));
}

export function saveBrowserAuth(auth: PocketBaseAuth) {
  document.cookie = serializeAuthCookie(auth);
}

export function clearBrowserAuth() {
  document.cookie = clearAuthCookie();
}
