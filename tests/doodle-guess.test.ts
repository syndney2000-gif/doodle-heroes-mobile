import { describe, expect, test } from 'vitest';
import { drawings } from '../src/core/doodle-guess/drawings';
import {
  MAX_GUESSES, REVEAL, dailyDrawing, guess, guessWords, isRight, normalise, over, revealFor, shareText, showHint, starsFor,
  type Round,
} from '../src/core/doodle-guess/game';
import { inkLength, strokePoints } from '../src/core/doodle-guess/geometry';

const round = (id = 'cat'): Round => ({ drawing: drawings.find((d) => d.id === id)!, guesses: [], solved: false });

describe('drawings', () => {
  test('ids are unique and every drawing has ink inside the page', () => {
    expect(new Set(drawings.map((d) => d.id)).size).toBe(drawings.length);
    for (const d of drawings) {
      expect(inkLength(d), d.id).toBeGreaterThan(50);
      for (const s of d.strokes) for (const [x, y] of strokePoints(s)) {
        expect(x, d.id).toBeGreaterThanOrEqual(0); expect(x, d.id).toBeLessThanOrEqual(100);
        expect(y, d.id).toBeGreaterThanOrEqual(0); expect(y, d.id).toBeLessThanOrEqual(100);
      }
    }
  });

  test('no accepted word belongs to two drawings', () => {
    const owner = new Map<string, string>();
    for (const d of drawings) {
      for (const w of [d.answer, ...d.also].map(normalise)) {
        expect(owner.get(w) ?? d.id, `"${w}" is used by ${owner.get(w)} and ${d.id}`).toBe(d.id);
        owner.set(w, d.id);
      }
    }
  });

  test('every answer and alternative can be typed into the guess box', () => {
    for (const d of drawings) for (const w of [d.answer, ...d.also]) expect(guessWords).toContain(normalise(w));
  });
});

describe('daily drawing', () => {
  test('stable for a date, and every drawing appears once before any repeats', () => {
    expect(dailyDrawing('2026-10-23').id).toBe(dailyDrawing('2026-10-23').id);
    const seen = new Set<string>();
    const start = Date.UTC(2026, 0, 1);
    for (let k = 0; k < drawings.length; k++) {
      seen.add(dailyDrawing(new Date(start + k * 86_400_000).toISOString().slice(0, 10)).id);
    }
    expect(seen.size).toBe(drawings.length);
  });
});

describe('a round', () => {
  test('each miss reveals more, and the hint comes after three', () => {
    const r = round();
    expect(revealFor(r)).toBe(REVEAL[0]);
    guess(r, 'dog');
    expect(revealFor(r)).toBe(REVEAL[1]);
    guess(r, 'fox'); guess(r, 'owl');
    expect(showHint(r)).toBe(true);
  });

  test('alternatives and odd spacing still count', () => {
    expect(isRight(round().drawing, '  Kitten ')).toBe(true);
    expect(isRight(round('ice-cream').drawing, 'ice cream')).toBe(true);
  });

  test('repeat guesses are ignored', () => {
    const r = round();
    expect(guess(r, 'dog')).toBe(true);
    expect(guess(r, 'DOG')).toBe(false);
    expect(r.guesses).toHaveLength(1);
  });

  test('six misses ends the round and shows the whole drawing', () => {
    const r = round();
    for (const w of ['dog', 'fox', 'owl', 'cow', 'pig', 'bat']) guess(r, w);
    expect(r.guesses).toHaveLength(MAX_GUESSES);
    expect(over(r)).toBe(true);
    expect(revealFor(r)).toBe(1);
    expect(starsFor(r)).toBe(0);
  });

  test('a quick solve scores three stars and shares cleanly', () => {
    const r = round();
    guess(r, 'dog'); guess(r, 'cat');
    expect(r.solved).toBe(true);
    expect(starsFor(r)).toBe(3);
    expect(shareText(r, '2026-10-23')).toContain('2/6');
    expect(shareText(r, '2026-10-23')).toContain('✏️✅');
  });
});
