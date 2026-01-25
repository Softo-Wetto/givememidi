import { supabase } from "./supbaseClient";

function randomUsername() {
  // short, readable, unique-ish
  const adjectives = ["blue", "swift", "lucky", "neon", "mellow", "brisk", "cosmic", "amber", "pixel", "solar"];
  const nouns = ["piano", "violin", "drummer", "composer", "melody", "chorus", "octave", "sonata", "midi", "rhythm"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj}_${noun}_${num}`;
}

export async function ensureProfileForCurrentUser() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return;

  // Does profile exist?
  const { data: existing, error: readErr } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", user.id)
    .maybeSingle();

  if (readErr) {
    console.error("Profile read error:", readErr);
    return;
  }
  if (existing) return;

  // Create one (retry if username collision)
  for (let i = 0; i < 5; i++) {
    const username = randomUsername();
    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      username,
    });
    if (!error) return;
  }

  console.error("Failed to create profile after retries.");
}
