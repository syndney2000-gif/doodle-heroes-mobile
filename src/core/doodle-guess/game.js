/* Doodle Guess — the rules: which drawing is today's, how much of it each
   guess reveals, what counts as right, and the shareable result. */

import { mulberry32 } from '../lib/rng';
import { drawings } from './drawings';
export const MAX_GUESSES = 6;
/** Share of the drawing's ink shown before each guess (and after the last). */
export const REVEAL = [0.22, 0.38, 0.52, 0.66, 0.82, 1];
/** Misses before the category hint appears. */
export const HINT_AFTER = 3;
const EPOCH = Date.UTC(2026, 0, 1);

/** Words that are never answers: they keep the guess list honest. */
const decoys = `horse cow pig sheep rabbit mouse lion tiger elephant giraffe monkey bear owl duck chicken frog snake
dragon dinosaur shark dolphin jellyfish starfish shell banana pear cherry grapes carrot cake cookie bread egg cheese
sandwich burger hot dog donut candle chair table bed door window tent mountain volcano island bridge train plane
helicopter bus truck tractor sword shield guitar drum piano trumpet phone computer camera television scissors hammer
axe ladder bucket shovel basket bell gift flag map compass envelope rainbow lightning snowflake fire leaf planet
alien witch pirate king queen angel skull bone eye hand foot shoe boot shirt dress scarf glove ring necklace watch
backpack suitcase toothbrush teapot bottle spoon fork knife plate bowl lollipop strawberry lemon orange watermelon
pineapple sunflower rose penguin koala fox wolf deer bat beetle ladybug worm caterpillar seal parrot igloo pyramid
windmill tower church school igloo`.split(/\s+/).filter(Boolean);
export const normalise = s => s.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();

/** Every word the guess box accepts, alphabetical. */
export const guessWords = [...new Set([...drawings.flatMap(d => [d.answer, ...d.also]), ...decoys.map(normalise)])].sort();
export function isRight(drawing, guess) {
  const g = normalise(guess);
  return g === normalise(drawing.answer) || drawing.also.some(a => normalise(a) === g);
}
export function isKnownWord(guess) {
  return guessWords.includes(normalise(guess));
}

/** Days since the puzzle's first day for a YYYY-MM-DD date. */
export function dayNumber(dateKey) {
  const [y, m, dd] = dateKey.split('-').map(Number);
  return Math.floor((Date.UTC(y, m - 1, dd) - EPOCH) / 86_400_000);
}

/** Today's drawing. Each pass through the set is shuffled differently, and
    every drawing appears once before any repeats. */
export function dailyDrawing(dateKey) {
  const n = drawings.length;
  const day = (dayNumber(dateKey) % n + n) % n;
  const cycle = Math.floor(dayNumber(dateKey) / n);
  const order = drawings.map((_, k) => k);
  const rand = mulberry32(0xd00d1e + cycle);
  for (let k = n - 1; k > 0; k--) {
    const j = Math.floor(rand() * (k + 1));
    [order[k], order[j]] = [order[j], order[k]];
  }
  return drawings[order[day]];
}
export const over = r => r.solved || r.guesses.length >= MAX_GUESSES;

/** How much ink to show right now. */
export function revealFor(r) {
  return over(r) ? 1 : REVEAL[r.guesses.length];
}
export function showHint(r) {
  return !r.solved && r.guesses.length >= HINT_AFTER;
}

/** Applies a guess. Returns false (and changes nothing) for repeats. */
export function guess(r, word) {
  const g = normalise(word);
  if (over(r) || !g || r.guesses.includes(g)) return false;
  r.guesses.push(g);
  if (isRight(r.drawing, g)) r.solved = true;
  return true;
}

/** Stars for the site-wide record: quick solves score higher. */
export function starsFor(r) {
  if (!r.solved) return 0;
  return r.guesses.length <= 2 ? 3 : r.guesses.length <= 4 ? 2 : 1;
}
export function shareText(r, dateKey) {
  const marks = r.guesses.map(g => isRight(r.drawing, g) ? '✅' : '✏️').join('');
  const score = r.solved ? `${r.guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  return `Doodle Guess ${dateKey} — ${score}\n${marks}\ndoodleheros.com/doodle-guess`;
}
