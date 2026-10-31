import { hashString, mulberry32 } from '../lib/rng';
import { generate } from './generate';
/** The daily map for a date: the same for everyone, generated on the spot. */
export function dailyPuzzle(dateKey) {
  const rand = mulberry32(hashString(`${dateKey}:isle-spans`));
  const rows = generate({
    w: 9,
    h: 9,
    islands: 15,
    loopChance: 0.15
  }, rand, 500);
  if (!rows) throw new Error(`No solvable daily map found for ${dateKey}`);
  return {
    id: `daily-${dateKey}`,
    title: `Daily Map · ${dateKey}`,
    note: 'Daily maps are generated fresh each day and checked to make sure they can be solved without guessing.',
    rows
  };
}
