export type RewardItemType =
  | "premium_download"
  | "profile_theme"
  | "profile_banner"
  | "creator_badge"
  | "xp_boost";

export type RewardItem = {
  key: string;
  type: RewardItemType;
  label: string;
  description: string;
  cost: number;
  accent: string;
  metadata?: Record<string, string | number | boolean>;
};

export const XP_REWARDS = {
  uploadBase: { xp: 120, credits: 12, label: "MIDI upload" },
  pdfBonus: { xp: 70, credits: 7, label: "PDF score bonus" },
  descriptionBonus: { xp: 25, credits: 3, label: "Description bonus" },
  metadataBonus: { xp: 15, credits: 2, label: "Metadata bonus" },
  comment: { xp: 20, credits: 2, label: "Helpful comment" },
  rating: { xp: 10, credits: 1, label: "Community rating" },
  bookmark: { xp: 5, credits: 0, label: "Bookmark" },
  follow: { xp: 12, credits: 1, label: "Creator follow" },
};

export const REWARD_STORE: RewardItem[] = [
  {
    key: "premium_download_pass",
    type: "premium_download",
    label: "Premium download pass",
    description: "Unlock a future premium MIDI download slot when premium files are enabled.",
    cost: 80,
    accent: "from-blue-500 to-cyan-400",
  },
  {
    key: "neon_profile_theme",
    type: "profile_theme",
    label: "Neon profile theme",
    description: "Adds a cyan neon treatment to your public profile card.",
    cost: 140,
    accent: "from-cyan-400 to-blue-500",
    metadata: { cosmetic_theme: "neon" },
  },
  {
    key: "gold_profile_theme",
    type: "profile_theme",
    label: "Gold profile theme",
    description: "Adds a warm gold creator treatment to your public profile card.",
    cost: 220,
    accent: "from-yellow-300 to-orange-400",
    metadata: { cosmetic_theme: "gold" },
  },
  {
    key: "studio_wave_banner",
    type: "profile_banner",
    label: "Studio wave banner",
    description: "A blue waveform banner for your public profile.",
    cost: 160,
    accent: "from-blue-500 to-indigo-500",
    metadata: { banner_style: "studio_wave" },
  },
  {
    key: "aurora_banner",
    type: "profile_banner",
    label: "Aurora banner",
    description: "A bright aurora-style banner for standout creators.",
    cost: 260,
    accent: "from-fuchsia-400 to-cyan-300",
    metadata: { banner_style: "aurora" },
  },
  {
    key: "verified_arranger_badge",
    type: "creator_badge",
    label: "Verified arranger badge",
    description: "A special badge you can feature on your profile.",
    cost: 180,
    accent: "from-emerald-300 to-cyan-400",
    metadata: { featured_badge: "Verified Arranger" },
  },
  {
    key: "spotlight_creator_badge",
    type: "creator_badge",
    label: "Spotlight creator badge",
    description: "A premium profile badge for active contributors.",
    cost: 320,
    accent: "from-yellow-300 to-rose-400",
    metadata: { featured_badge: "Spotlight Creator" },
  },
  {
    key: "upload_xp_boost",
    type: "xp_boost",
    label: "Upload XP boost",
    description: "A cosmetic boost token for future upload campaigns.",
    cost: 120,
    accent: "from-violet-400 to-cyan-300",
    metadata: { boost_type: "upload_xp", boost_percent: 10 },
  },
];

export function getRewardItem(key: string) {
  return REWARD_STORE.find((item) => item.key === key) ?? null;
}

export function sumLedger<T extends { xp?: number | null; credits?: number | null }>(
  events: T[]
) {
  return events.reduce(
    (totals, event) => ({
      xp: totals.xp + (event.xp ?? 0),
      credits: totals.credits + (event.credits ?? 0),
    }),
    { xp: 0, credits: 0 }
  );
}
