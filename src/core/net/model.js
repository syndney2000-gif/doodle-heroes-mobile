/* Lighthouse Wiring — board model.
   Each tile is a 4-bit mask of the sides its wire reaches:
   1 = up, 2 = right, 4 = down, 8 = left. A puzzle is written as rows of hex
   digits giving each tile as the player first sees it (scrambled), plus the
   position of the lighthouse that powers the network. */

export const UP = 1,
  RIGHT = 2,
  DOWN = 4,
  LEFT = 8;
export const SIDES = [UP, RIGHT, DOWN, LEFT];
export const OPPOSITE = {
  [UP]: DOWN,
  [RIGHT]: LEFT,
  [DOWN]: UP,
  [LEFT]: RIGHT
};
export const STEP = {
  [UP]: [-1, 0],
  [RIGHT]: [0, 1],
  [DOWN]: [1, 0],
  [LEFT]: [0, -1]
};
/** Rotate a mask clockwise by `turns` quarter turns. */
export function rotate(mask, turns) {
  const k = (turns % 4 + 4) % 4;
  return (mask << k | mask >> 4 - k) & 15;
}

/** Distinct masks a tile can show by rotating. */
export function orientations(mask) {
  return [...new Set([0, 1, 2, 3].map(k => rotate(mask, k)))];
}
export function parse(p) {
  const h = p.rows.length;
  const w = p.rows[0].length;
  const tiles = p.rows.flatMap(row => [...row].map(ch => parseInt(ch, 16)));
  return {
    w,
    h,
    tiles,
    source: p.source[0] * w + p.source[1]
  };
}
export function neighbour(b, i, side) {
  const [dr, dc] = STEP[side];
  const r = Math.floor(i / b.w) + dr,
    c = i % b.w + dc;
  return r < 0 || c < 0 || r >= b.h || c >= b.w ? null : r * b.w + c;
}

/** Tiles reachable from the lighthouse through matching wire ends. */
export function powered(b, masks) {
  const seen = new Set([b.source]);
  const stack = [b.source];
  while (stack.length) {
    const i = stack.pop();
    for (const side of SIDES) {
      if (!(masks[i] & side)) continue;
      const j = neighbour(b, i, side);
      if (j == null || !(masks[j] & OPPOSITE[side]) || seen.has(j)) continue;
      seen.add(j);
      stack.push(j);
    }
  }
  return seen;
}

/** Solved: every wire end meets another, and all tiles form one tree. */
export function isSolved(b, masks) {
  let links = 0;
  for (let i = 0; i < masks.length; i++) {
    for (const side of SIDES) {
      if (!(masks[i] & side)) continue;
      const j = neighbour(b, i, side);
      if (j == null || !(masks[j] & OPPOSITE[side])) return false;
      links++;
    }
  }
  // Each link was counted from both ends; a tree on n tiles has n − 1 links.
  return links / 2 === masks.length - 1 && powered(b, masks).size === masks.length;
}
