/* Lighthouse Wiring — puzzle generator.
   Grows a random tree of wires from the lighthouse that reaches every tile,
   scrambles each tile's rotation, and keeps the result only if the solver
   can finish it by deduction. */

import { OPPOSITE, SIDES, neighbour, rotate } from './model';
import { solve } from './solver';
function growTree(w, h, source, rand) {
  const masks = new Array(w * h).fill(0);
  const board = {
    w,
    h,
    tiles: masks,
    source
  };
  const inTree = new Set([source]);
  // Randomised Prim's: pick any wire end that could grow into a new tile.
  const frontier = SIDES.flatMap(s => neighbour(board, source, s) != null ? [[source, s]] : []);
  while (frontier.length) {
    const k = Math.floor(rand() * frontier.length);
    const [i, side] = frontier[k];
    frontier.splice(k, 1);
    const j = neighbour(board, i, side);
    if (inTree.has(j)) continue;
    masks[i] |= side;
    masks[j] |= OPPOSITE[side];
    inTree.add(j);
    for (const s of SIDES) {
      const t = neighbour(board, j, s);
      if (t != null && !inTree.has(t)) frontier.push([j, s]);
    }
  }
  return masks;
}
export function generate(w, h, rand, attempts = 300) {
  const source = [Math.floor(h / 2), Math.floor(w / 2)];
  const s = source[0] * w + source[1];
  for (let a = 0; a < attempts; a++) {
    const solved = growTree(w, h, s, rand);
    // Four-way crossings have only one orientation and give little to do;
    // keep them rare.
    if (solved.filter(m => m === 15).length > Math.max(1, w * h / 25)) continue;
    const scrambled = solved.map(m => rotate(m, Math.floor(rand() * 4)));
    const board = {
      w,
      h,
      tiles: scrambled,
      source: s
    };
    if (!solve(board).solved) continue;
    const hex = scrambled.map(m => m.toString(16));
    return {
      rows: Array.from({
        length: h
      }, (_, r) => hex.slice(r * w, (r + 1) * w).join('')),
      source
    };
  }
  return null;
}
