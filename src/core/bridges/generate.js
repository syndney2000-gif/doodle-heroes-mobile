/* Isle Spans — puzzle generator.
   Grows a random solved map outward from one island, turns it into clues,
   then keeps it only if the deduction solver can finish it. */

import { parse } from './model';
import { solve } from './solver';
const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];
function growMap(o, rand) {
  const {
    w,
    h
  } = o;
  const island = new Map(); // "r,c" -> bridge total
  const water = Array.from({
    length: h
  }, () => new Array(w).fill(0)); // 1 = bridge passes
  const key = (r, c) => `${r},${c}`;
  const inside = (r, c) => r >= 0 && c >= 0 && r < h && c < w;
  const touchesIsland = (r, c) => DIRS.some(([dr, dc]) => island.has(key(r + dr, c + dc)));
  const add = (k, n) => island.set(k, (island.get(k) ?? 0) + n);
  const first = key(Math.floor(rand() * h), Math.floor(rand() * w));
  island.set(first, 0);
  const placed = [first];
  for (let tries = 0; tries < o.islands * 60 && placed.length < o.islands; tries++) {
    const from = placed[Math.floor(rand() * placed.length)];
    const [r0, c0] = from.split(',').map(Number);
    const [dr, dc] = DIRS[Math.floor(rand() * 4)];
    const dist = 2 + Math.floor(rand() * Math.max(1, Math.min(4, (dr ? h : w) / 2)));
    const r = r0 + dr * dist,
      c = c0 + dc * dist;
    if (!inside(r, c) || island.has(key(r, c)) || water[r][c]) continue;
    let clear = true;
    for (let k = 1; k < dist; k++) {
      const rr = r0 + dr * k,
        cc = c0 + dc * k;
      if (island.has(key(rr, cc)) || water[rr][cc]) {
        clear = false;
        break;
      }
    }
    if (!clear) continue;
    // Islands side by side would have no water between them for a bridge.
    if (touchesIsland(r, c)) continue;
    const n = rand() < 0.6 ? 1 : 2;
    for (let k = 1; k < dist; k++) water[r0 + dr * k][c0 + dc * k] = 1;
    island.set(key(r, c), 0);
    add(from, n);
    add(key(r, c), n);
    placed.push(key(r, c));
  }
  if (placed.length < o.islands * 0.75) return null;

  // Extra bridges between islands that can already see each other make
  // loops, which keeps maps from always being trees.
  for (const k of placed) {
    const [r0, c0] = k.split(',').map(Number);
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      if (rand() >= o.loopChance) continue;
      let r = r0 + dr,
        c = c0 + dc;
      const path = [];
      while (inside(r, c) && !island.has(key(r, c)) && !water[r][c]) {
        path.push([r, c]);
        r += dr;
        c += dc;
      }
      if (!inside(r, c) || !island.has(key(r, c)) || !path.length) continue;
      if (island.get(k) >= 7 || island.get(key(r, c)) >= 7) continue;
      for (const [pr, pc] of path) water[pr][pc] = 1;
      add(k, 1);
      add(key(r, c), 1);
    }
  }
  return Array.from({
    length: h
  }, (_, r) => Array.from({
    length: w
  }, (_, c) => String(island.get(key(r, c)) ?? '.')).join(''));
}

/** A uniquely solvable puzzle, or null if none turned up in `attempts`. */
export function generate(o, rand, attempts = 200) {
  for (let i = 0; i < attempts; i++) {
    const rows = growMap(o, rand);
    if (!rows) continue;
    if (solve(parse(rows)).solved) return rows;
  }
  return null;
}
