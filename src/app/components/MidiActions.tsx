"use client";

import { BookmarkButton } from "./BookmarkButton";

export function MidiActions({ midiId }: { midiId: string }) {
  return (
    <div className="flex justify-center">
      <BookmarkButton midiId={midiId} />
    </div>
  );
}
