import { describe, expect, test } from 'vitest';
import { DOWN, LEFT, RIGHT, UP, isSolved, orientations, parse, rotate, type NetBoard } from '../src/core/net/model';
import { solution, solve } from '../src/core/net/solver';
import { allPuzzles } from '../src/core/net/puzzles';
import { dailyPuzzle } from '../src/core/net/daily';

/** Counts solutions by plain backtracking, independent of the solver's
    rules: tiles are placed in reading order, checked against the tiles
    above and to the left, and loops are caught with a union-find. */
function countSolutions(b: NetBoard, limit = 2): number {
  const n = b.tiles.length;
  const opts = b.tiles.map(orientations);
  const masks = new Array<number>(n).fill(0);
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => { while (parent[x] !== x) x = parent[x]; return x; };
  let found = 0;

  const go = (i: number) => {
    if (found >= limit) return;
    if (i === n) { if (isSolved(b, masks)) found++; return; }
    const r = Math.floor(i / b.w), c = i % b.w;
    for (const m of opts[i]) {
      if (r === 0 && m & UP) continue;
      if (c === 0 && m & LEFT) continue;
      if (r === b.h - 1 && m & DOWN) continue;
      if (c === b.w - 1 && m & RIGHT) continue;
      if (r > 0 && !!(m & UP) !== !!(masks[i - b.w] & DOWN)) continue;
      if (c > 0 && !!(m & LEFT) !== !!(masks[i - 1] & RIGHT)) continue;
      const undo: [number, number][] = [];
      let loop = false;
      for (const j of [m & UP ? i - b.w : -1, m & LEFT ? i - 1 : -1]) {
        if (j < 0) continue;
        const a = find(i), z = find(j);
        if (a === z) { loop = true; break; }
        undo.push([a, parent[a]]);
        parent[a] = z;
      }
      if (!loop) { masks[i] = m; go(i + 1); masks[i] = 0; }
      for (const [k, v] of undo.reverse()) parent[k] = v;
    }
  };
  go(0);
  return found;
}

describe('model', () => {
  test('rotate turns wires clockwise', () => {
    expect(rotate(UP, 1)).toBe(RIGHT);
    expect(rotate(UP | RIGHT, 1)).toBe(RIGHT | DOWN);
    expect(rotate(LEFT, 1)).toBe(UP);
  });

  test('a straight wire has two orientations, a cross has one', () => {
    expect(orientations(UP | DOWN)).toHaveLength(2);
    expect(orientations(15)).toHaveLength(1);
    expect(orientations(UP | RIGHT)).toHaveLength(4);
  });

  test('isSolved needs every end matched and one tree', () => {
    const b = parse({ rows: ['24', '00'], source: [0, 0] });
    expect(isSolved(b, [RIGHT, LEFT, 0, 0])).toBe(false); // bottom tiles unpowered
    const b2 = parse({ rows: ['28'], source: [0, 0] });
    expect(isSolved(b2, [RIGHT, LEFT])).toBe(true);
  });
});

describe('solver', () => {
  test('edge tiles cannot point off the board', () => {
    const b = parse({ rows: ['24'], source: [0, 0] });
    expect(solution(b)).toEqual([RIGHT, LEFT]);
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
        expect(row).toMatch(/^[1-9a-f]+$/);
      }
      const b = parse(p);
      const sol = solution(b);
      expect(sol).not.toBeNull();
      expect(isSolved(b, sol!)).toBe(true);
      expect(countSolutions(b)).toBe(1);
    });
  }
});

describe('daily grids', () => {
  test('stable per date and different across dates', () => {
    expect(dailyPuzzle('2026-10-23').rows).toEqual(dailyPuzzle('2026-10-23').rows);
    expect(dailyPuzzle('2026-10-23').rows).not.toEqual(dailyPuzzle('2026-10-24').rows);
  });

  test('a year of dailies all solve by deduction', () => {
    const start = Date.UTC(2026, 0, 1);
    for (let d = 0; d < 365; d++) {
      const key = new Date(start + d * 86400000).toISOString().slice(0, 10);
      expect(solve(parse(dailyPuzzle(key))).solved, key).toBe(true);
    }
  });
});
