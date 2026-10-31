import { hashString, mulberry32 } from '../lib/rng';
import { cluesFor, isLineSolvable } from './solver';
import type { Puzzle } from './puzzles';

const SIZE = 10;

/**
 * The daily puzzle for a date. Random grids are drawn from a seed until one
 * can be solved by line logic alone; the seed sequence is fixed, so the same
 * date always lands on the same grid.
 */
export function dailyPuzzle(dateKey: string): Puzzle {
  const rand = mulberry32(hashString(`${dateKey}:island-sketch`));
  for (let attempt = 0; attempt < 500; attempt++) {
    // Denser grids give longer runs and friendlier clues; vary it a little
    // so some days are harder than others.
    const density = 0.55 + rand() * 0.12;
    const solution = Array.from({ length: SIZE }, () =>
      Array.from({ length: SIZE }, () => (rand() < density ? '#' : '.')).join(''),
    );
    if (solution.every((row) => !row.includes('#'))) continue;
    if (isLineSolvable(cluesFor(solution))) {
      return {
        id: `daily-${dateKey}`,
        title: `Daily Sketch · ${dateKey}`,
        note: 'Daily sketches are random patterns rather than pictures. Every one can still be solved without guessing.',
        solution,
      };
    }
  }
  throw new Error(`No solvable daily puzzle found for ${dateKey}`);
}
