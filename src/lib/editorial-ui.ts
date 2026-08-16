export type ArtworkVariant = 0 | 1 | 2 | 3;

export function artworkVariant(seed: string): ArtworkVariant {
  let hash = 0;

  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return (hash % 4) as ArtworkVariant;
}

export function formatMetric(value: number): string {
  if (value < 1_000) return String(value);
  if (value < 1_000_000) {
    return `${(value / 1_000).toFixed(1).replace(".0", "")}K`;
  }

  return `${(value / 1_000_000).toFixed(1).replace(".0", "")}M`;
}

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
