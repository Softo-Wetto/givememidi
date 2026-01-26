import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white p-6">
          <div className="text-gray-400">Loading…</div>
        </main>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
