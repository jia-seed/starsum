export function generateBadgeUrl(
  totalStars: number,
  color: string,
  style: string
): string {
  return `https://img.shields.io/badge/total__stars-${totalStars}-${color}?style=${style}&logo=github`;
}

export function generateBadgeMarkdown(
  totalStars: number,
  color: string,
  style: string
): string {
  const url = generateBadgeUrl(totalStars, color, style);
  return `![Total Stars](${url})`;
}

export const BADGE_COLORS = [
  { name: "Yellow", value: "yellow" },
  { name: "Purple", value: "8B5CF6" },
  { name: "Blue", value: "blue" },
  { name: "Green", value: "green" },
  { name: "Red", value: "red" },
  { name: "Orange", value: "orange" },
  { name: "Bright Green", value: "brightgreen" },
] as const;

export const BADGE_STYLES = [
  { name: "For the Badge", value: "for-the-badge" },
  { name: "Flat", value: "flat" },
  { name: "Flat Square", value: "flat-square" },
  { name: "Plastic", value: "plastic" },
] as const;
