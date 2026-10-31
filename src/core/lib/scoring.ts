/* Shared by every game: stars depend only on hints, so the rule is the same
   everywhere and the help pages can describe it once. */

/** Three stars, minus one per hint, never below one. */
export function starsFor(hints: number): number {
  return Math.max(1, 3 - hints);
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function starText(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
}
