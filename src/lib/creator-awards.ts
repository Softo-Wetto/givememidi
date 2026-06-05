export type CreatorAwardInput = {
  uploads: number;
  downloads: number;
  totalRatings?: number;
  avgRating?: number | null;
  followers?: number;
};

export type CreatorLevel = {
  label: string;
  nextLabel: string | null;
  minPoints: number;
  nextPoints: number | null;
};

export type CreatorLevelDefinition = {
  label: string;
  minPoints: number;
  description: string;
  requirement: string;
  accent: string;
};

export type CreatorAward = {
  label: string;
  hint: string;
};

export type CreatorAwardBadge = CreatorAward & {
  category: "points" | "uploads" | "downloads" | "ratings" | "followers";
  requirement: string;
  isUnlocked: (input: CreatorAwardInput, points: number) => boolean;
};

export const POINT_RULES = [
  { label: "Upload a MIDI", value: "+120 points each" },
  { label: "Download earned", value: "+4 points each" },
  { label: "Rating received", value: "+18 points each" },
  { label: "Follower gained", value: "+25 points each" },
  { label: "High rating bonus", value: "Average rating x 40 when you have 3+ ratings" },
];

export const CREATOR_LEVELS: CreatorLevelDefinition[] = [
  {
    label: "Newcomer",
    minPoints: 0,
    description: "You have entered the library and can start earning through uploads and community activity.",
    requirement: "Start uploading MIDI files.",
    accent: "from-slate-400 to-slate-200",
  },
  {
    label: "Bronze Arranger",
    minPoints: 250,
    description: "Your first uploads are starting to create value for other musicians.",
    requirement: "Roughly 2 uploads, or 1 upload with steady downloads and ratings.",
    accent: "from-orange-500 to-amber-300",
  },
  {
    label: "Silver Creator",
    minPoints: 700,
    description: "You are building a recognizable contribution streak.",
    requirement: "Keep uploading and collect ratings from listeners.",
    accent: "from-slate-300 to-cyan-100",
  },
  {
    label: "Gold Virtuoso",
    minPoints: 1400,
    description: "Your catalog has real momentum and is being used by the community.",
    requirement: "A growing catalog plus downloads, followers, or strong ratings.",
    accent: "from-yellow-300 to-orange-300",
  },
  {
    label: "Platinum Maestro",
    minPoints: 2600,
    description: "You are one of the library's reliable creators.",
    requirement: "Consistent uploads and visible community response.",
    accent: "from-cyan-200 to-indigo-200",
  },
  {
    label: "Diamond Producer",
    minPoints: 4500,
    description: "Your work is becoming a serious reference point for other users.",
    requirement: "A strong mix of uploads, downloads, ratings, and followers.",
    accent: "from-sky-300 to-fuchsia-300",
  },
  {
    label: "Master Transcriber",
    minPoints: 7000,
    description: "Your MIDI catalog shows depth, consistency, and craft.",
    requirement: "Sustained contribution with high engagement.",
    accent: "from-violet-300 to-cyan-300",
  },
  {
    label: "Hall of Fame",
    minPoints: 10000,
    description: "A top-tier creator rank for uploads that keep helping the community.",
    requirement: "Long-term creator activity and broad community use.",
    accent: "from-amber-200 to-rose-300",
  },
  {
    label: "Legend",
    minPoints: 15000,
    description: "The highest recognition tier for standout GiveMeMIDI creators.",
    requirement: "Exceptional contribution across uploads, ratings, downloads, and followers.",
    accent: "from-cyan-200 via-blue-300 to-amber-200",
  },
];

export const CREATOR_AWARD_BADGES: CreatorAwardBadge[] = [
  {
    label: "New Creator",
    hint: "Start uploading to earn awards",
    category: "uploads",
    requirement: "Create an account and start your first upload.",
    isUnlocked: (input) => input.uploads === 0,
  },
  {
    label: "First Upload",
    hint: "Published a MIDI",
    category: "uploads",
    requirement: "Upload at least 1 MIDI file.",
    isUnlocked: (input) => input.uploads >= 1,
  },
  {
    label: "Five File Run",
    hint: "5+ uploads",
    category: "uploads",
    requirement: "Upload 5 MIDI files.",
    isUnlocked: (input) => input.uploads >= 5,
  },
  {
    label: "Prolific",
    hint: "10+ uploads",
    category: "uploads",
    requirement: "Upload 10 MIDI files.",
    isUnlocked: (input) => input.uploads >= 10,
  },
  {
    label: "Catalog Builder",
    hint: "25+ uploads",
    category: "uploads",
    requirement: "Upload 25 MIDI files.",
    isUnlocked: (input) => input.uploads >= 25,
  },
  {
    label: "Point Earner",
    hint: "300+ creator points",
    category: "points",
    requirement: "Reach 300 creator points.",
    isUnlocked: (_input, points) => points >= 300,
  },
  {
    label: "Gold Vault",
    hint: "1,400+ creator points",
    category: "points",
    requirement: "Reach Gold Virtuoso rank.",
    isUnlocked: (_input, points) => points >= 1400,
  },
  {
    label: "Diamond Run",
    hint: "4,500+ creator points",
    category: "points",
    requirement: "Reach Diamond Producer rank.",
    isUnlocked: (_input, points) => points >= 4500,
  },
  {
    label: "Crowd Favorite",
    hint: "250+ downloads",
    category: "downloads",
    requirement: "Earn 250 total downloads.",
    isUnlocked: (input) => input.downloads >= 250,
  },
  {
    label: "Download Magnet",
    hint: "1,000+ downloads",
    category: "downloads",
    requirement: "Earn 1,000 total downloads.",
    isUnlocked: (input) => input.downloads >= 1000,
  },
  {
    label: "Rated",
    hint: "10+ ratings",
    category: "ratings",
    requirement: "Receive 10 ratings across your uploads.",
    isUnlocked: (input) => (input.totalRatings ?? 0) >= 10,
  },
  {
    label: "Top Rated",
    hint: "4.5+ average rating",
    category: "ratings",
    requirement: "Hold a 4.5+ average rating with at least 5 ratings.",
    isUnlocked: (input) =>
      input.avgRating !== null &&
      input.avgRating !== undefined &&
      (input.totalRatings ?? 0) >= 5 &&
      input.avgRating >= 4.5,
  },
  {
    label: "Rising",
    hint: "25+ followers",
    category: "followers",
    requirement: "Gain 25 followers.",
    isUnlocked: (input) => (input.followers ?? 0) >= 25,
  },
  {
    label: "Community Anchor",
    hint: "100+ followers",
    category: "followers",
    requirement: "Gain 100 followers.",
    isUnlocked: (input) => (input.followers ?? 0) >= 100,
  },
];

export function calculateCreatorPoints({
  uploads,
  downloads,
  totalRatings = 0,
  avgRating = null,
  followers = 0,
}: CreatorAwardInput) {
  const ratingBonus =
    avgRating !== null && totalRatings >= 3 ? Math.round(avgRating * 40) : 0;

  return (
    uploads * 120 +
    downloads * 4 +
    totalRatings * 18 +
    followers * 25 +
    ratingBonus
  );
}

export function getCreatorLevel(points: number): CreatorLevel {
  const currentIndex = CREATOR_LEVELS.reduce(
    (best, level, index) => (points >= level.minPoints ? index : best),
    0
  );
  const current = CREATOR_LEVELS[currentIndex];
  const next = CREATOR_LEVELS[currentIndex + 1] ?? null;

  return {
    label: current.label,
    nextLabel: next?.label ?? null,
    minPoints: current.minPoints,
    nextPoints: next?.minPoints ?? null,
  };
}

export function getLevelProgress(points: number) {
  const level = getCreatorLevel(points);
  if (level.nextPoints === null) return 100;

  const span = level.nextPoints - level.minPoints;
  const earned = points - level.minPoints;
  return Math.max(4, Math.min(100, Math.round((earned / span) * 100)));
}

export function getCreatorAwards(input: CreatorAwardInput): CreatorAward[] {
  const points = calculateCreatorPoints(input);
  const awards = CREATOR_AWARD_BADGES.filter((badge) => badge.isUnlocked(input, points));

  return awards.slice(0, 5).map(({ label, hint }) => ({ label, hint }));
}
