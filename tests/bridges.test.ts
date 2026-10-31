import { describe, expect, test } from 'vitest';
import { connected, parse, type Board } from '../src/core/bridges/model';
import { solve, solution } from '../src/core/bridges/solver';
import { allPuzzles } from '../src/core/bridges/puzzles';
import { dailyPuzzle } from '../src/core/bridges/daily';

/** Every valid solution, found by plain search. It shares no logic with the
    deduction solver, so it independently confirms uniqueness. Stops at 2. */
function countSolutions(board: Board, limit = 2): number {
  const counts = board.spans.map(() => 0);
  const used = board.islands.map(() => 0);
  let found = 0;
  const order = board.spans.map((s) => s.id);

  const go = (k: number) => {
    if (found >= limit) return;
    if (k === order.length) {
      if (board.islands.every((i) => used[i.id] === i.n) && connected(board, counts)) found++;
      return;
    }
    const s = board.spans[order[k]];
    for (let v = 0; v <= 2; v++) {
      if (v > 0 && s.crosses.some((t) => counts[t] > 0)) break;
      if (used[s.a] + v > board.islands[s.a].n || used[s.b] + v > board.islands[s.b].n) break;
      counts[s.id] = v; used[s.a] += v; used[s.b] += v;
      // Prune: once an island's last span is decided, its count must be exact.
      const settled = (i: number) => board.spansOf[i].every((t) => order.indexOf(t) <= k);
      if (!(settled(s.a) && used[s.a] !== board.islands[s.a].n) && !(settled(s.b) && used[s.b] !== board.islands[s.b].n)) go(k + 1);
      counts[s.id] = 0; used[s.a] -= v; used[s.b] -= v;
    }
  };
  go(0);
  return found;
}

describe('parse', () => {
  test('finds spans to the nearest island and crossings', () => {
    const b = parse([
      '.1.',
      '1.1',
      '.1.',
    ]);
    expect(b.islands).toHaveLength(4);
    expect(b.spans).toHaveLength(2);
    expect(b.spans[0].crosses).toEqual([1]);
  });

  test('islands side by side have no span between them', () => {
    expect(parse(['11']).spans).toHaveLength(0);
  });
});

describe('solver', () => {
  test('a 4 with two neighbours takes double bridges to both', () => {
    const b = parse(['2.4.2']);
    expect(solution(b)).toEqual([2, 2]);
  });

  test('two 1s alone together is fine, but not when others need them', () => {
    // The middle 1–1 pair would seal itself off, so each 1 must reach outward.
    const b = parse([
      '2.1.1.2',
    ]);
    // spans: 2-1, 1-1, 1-2. Solution: 2–1 single? No: 2 needs 2 but has one neighbour.
    expect(solve(b).contradiction || !solve(b).solved).toBe(true);
    const ok = parse(['1.2.1']);
    expect(solution(ok)).toEqual([1, 1]);
  });

  test('isolation stops a pair of 1s from joining when others exist', () => {
    const b = parse([
      '1.1',
      '...',
      '2.2',
    ]);
    expect(solution(b)).not.toBeNull();
    const sol = solution(b)!;
    const top = b.spans.find((s) => b.islands[s.a].r === 0 && b.islands[s.b].r === 0)!;
    expect(sol[top.id]).toBe(0);
  });
});

describe('catalogue', () => {
  test('ids are unique', () => {
    const ids = allPuzzles.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const p of allPuzzles) {
    test(`${p.id}: deduction finishes, and search finds exactly one solution`, () => {
      for (const row of p.rows) {
        expect(row).toHaveLength(p.rows[0].length);
        expect(row).toMatch(/^[.1-8]+$/);
      }
      const board = parse(p.rows);
      const sol = solution(board);
      expect(sol).not.toBeNull();
      for (const isl of board.islands) {
        expect(board.spansOf[isl.id].reduce((t, s) => t + sol![s], 0)).toBe(isl.n);
      }
      for (const s of board.spans) {
        if (sol![s.id]) for (const t of s.crosses) expect(sol![t]).toBe(0);
      }
      expect(connected(board, sol!)).toBe(true);
      expect(countSolutions(board)).toBe(1);
    });
  }
});

describe('daily maps', () => {
  test('stable per date and different across dates', () => {
    expect(dailyPuzzle('2026-10-23').rows).toEqual(dailyPuzzle('2026-10-23').rows);
    expect(dailyPuzzle('2026-10-23').rows).not.toEqual(dailyPuzzle('2026-10-24').rows);
  });

  test('a year of dailies all solve by deduction', () => {
    const start = Date.UTC(2026, 0, 1);
    for (let d = 0; d < 365; d++) {
      const key = new Date(start + d * 86400000).toISOString().slice(0, 10);
      expect(solve(parse(dailyPuzzle(key).rows)).solved, key).toBe(true);
    }
  });
});
