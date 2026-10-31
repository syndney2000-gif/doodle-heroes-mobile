import { hashString, mulberry32 } from '../lib/rng';
import { generate } from './generate';
/** The daily grid for a date: the same for everyone, generated on the spot. */
export function dailyPuzzle(dateKey) {
  const rand = mulberry32(hashString(`${dateKey}:lighthouse-wiring`));
  const g = generate(7, 7, rand, 2000);
  if (!g) throw new Error(`No solvable daily grid found for ${dateKey}`);
  return {
    id: `daily-${dateKey}`,
    title: `Daily Grid · ${dateKey}`,
    note: 'Daily grids are generated fresh each day and checked to make sure they can be solved without guessing.',
    ...g
  };
}
