"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ensureProfileForCurrentUser } from "../../../lib/ensureProfile";

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/upload";

  useEffect(() => {
    (async () => {
      await ensureProfileForCurrentUser();
      window.location.href = redirect;
    })();
  }, [redirect]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center p-6">
      <div className="text-gray-400">Signing you in…</div>
    </main>
  );
}
