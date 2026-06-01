import { NextResponse } from "next/server";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0, s-maxage=0",
  "CDN-Cache-Control": "no-store",
  "Cloudflare-CDN-Cache-Control": "no-store",
  Pragma: "no-cache",
  Expires: "0",
};

export function middleware() {
  const response = NextResponse.next();

  for (const [key, value] of Object.entries(NO_STORE_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\..*).*)"],
};
