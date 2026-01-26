import { Suspense } from "react";
import AllMidiClientPage from "./AllMidiClientPage";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Loading MIDI…</div>}>
      <AllMidiClientPage />
    </Suspense>
  );
}
