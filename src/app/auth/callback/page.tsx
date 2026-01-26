import { Suspense } from "react";
import CallbackClient from "./CallbackClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center p-6">
          <div className="text-gray-400">Signing you in…</div>
        </main>
      }
    >
      <CallbackClient />
    </Suspense>
  );
}
