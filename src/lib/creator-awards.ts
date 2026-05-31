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

export type CreatorAward = {
  label: string;
  hint: string;
};

const LEVELS = [
  { label: "Newcomer", minPoints: 0 },
  { label: "Bronze Arranger", minPoints: 300 },
  { label: "Silver Creator", minPoints: 800 },
  { label: "Gold Virtuoso", minPoints: 1600 },
  { label: "Platinum Maestro", minPoints: 3000 },
  { label: "Hall of Fame", minPoints: 6000 },
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
  const currentIndex = LEVELS.reduce(
    (best, level, index) => (points >= level.minPoints ? index : best),
    0
  );
  const current = LEVELS[currentIndex];
  const next = LEVELS[currentIndex + 1] ?? null;

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
  const awards: CreatorAward[] = [];
  const points = calculateCreatorPoints(input);

  if (points >= 300) awards.push({ label: "Point Earner", hint: "300+ creator points" });
  if (points >= 1600) awards.push({ label: "Gold Vault", hint: "1,600+ creator points" });
  if (input.uploads >= 1) awards.push({ label: "First Upload", hint: "Published a MIDI" });
  if (input.uploads >= 10) awards.push({ label: "Prolific", hint: "10+ uploads" });
  if (input.downloads >= 250) awards.push({ label: "Crowd Favorite", hint: "250+ downloads" });
  if ((input.followers ?? 0) >= 25) awards.push({ label: "Rising", hint: "25+ followers" });
  if (
    input.avgRating !== null &&
    input.avgRating !== undefined &&
    (input.totalRatings ?? 0) >= 5 &&
    input.avgRating >= 4.5
  ) {
    awards.push({ label: "Top Rated", hint: "4.5+ average rating" });
  }

  if (awards.length === 0) {
    awards.push({ label: "New Creator", hint: "Start uploading to earn awards" });
  }

  return awards.slice(0, 5);
}
