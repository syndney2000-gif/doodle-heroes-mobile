/* Lighthouse Wiring — deduction-only solver.
   Each tile keeps the list of orientations still possible. Rules:
   - edge: a tile can't point off the board, and two neighbours must agree
     about the wire between them;
   - loop: two tiles already joined by known wires can't be linked again;
   - sealed: a link that would close off a finished group is impossible;
   - exit: a group with one possible way out must take it.
   If these finish the puzzle, the solution is unique. */

import { OPPOSITE, SIDES, neighbour, orientations } from './model';
export function initialOptions(b) {
  return b.tiles.map(m => orientations(m));
}

/** Link state between tile i and its neighbour on `side`. */
function link(options, i, side) {
  const has = options[i].filter(m => m & side).length;
  return has === options[i].length ? 'yes' : has === 0 ? 'no' : 'maybe';
}

/** `rules` limits which deductions run; guide examples use it to show one
    technique at a time. */
export function solve(b, start, maxSteps = Infinity, rules = ['edge', 'loop', 'sealed', 'exit']) {
  const options = (start ?? initialOptions(b)).map(o => o.slice());
  const steps = [];
  const n = b.tiles.length;
  const fail = () => ({
    options,
    steps,
    solved: false,
    contradiction: true
  });

  /** Keeps only options passing `keep`; reports whether anything changed. */
  const restrict = (i, keep) => {
    const next = options[i].filter(keep);
    if (!next.length) return null;
    if (next.length === options[i].length) return false;
    options[i] = next;
    return true;
  };

  /* Groups of tiles joined by wires both sides agree on. */
  const groups = () => {
    const parent = Array.from({
      length: n
    }, (_, i) => i);
    const find = x => parent[x] === x ? x : parent[x] = find(parent[x]);
    for (let i = 0; i < n; i++) {
      for (const side of [2, 4]) {
        const j = neighbour(b, i, side);
        if (j != null && link(options, i, side) === 'yes' && link(options, j, OPPOSITE[side]) === 'yes') {
          parent[find(i)] = find(j);
        }
      }
    }
    return find;
  };
  let progress = true;
  while (progress && steps.length < maxSteps) {
    progress = false;

    // Edge consistency, one tile at a time so each step is explainable.
    for (let i = 0; i < n && steps.length < maxSteps && rules.includes('edge'); i++) {
      let changed = false;
      for (const side of SIDES) {
        const j = neighbour(b, i, side);
        let r;
        if (j == null) r = restrict(i, m => !(m & side));else {
          const other = link(options, j, OPPOSITE[side]);
          r = other === 'yes' ? restrict(i, m => !!(m & side)) : other === 'no' ? restrict(i, m => !(m & side)) : false;
        }
        if (r === null) return fail();
        changed ||= r;
      }
      if (changed) {
        steps.push({
          rule: 'edge',
          tiles: [i]
        });
        progress = true;
      }
    }
    if (progress) continue;
    let find = groups();
    for (let i = 0; i < n && !progress && steps.length < maxSteps && rules.includes('loop'); i++) {
      for (const side of [2, 4]) {
        const j = neighbour(b, i, side);
        if (j == null || link(options, i, side) !== 'maybe' || find(i) !== find(j)) continue;
        if (restrict(i, m => !(m & side)) === null || restrict(j, m => !(m & OPPOSITE[side])) === null) return fail();
        steps.push({
          rule: 'loop',
          tiles: [i, j]
        });
        progress = true;
        break;
      }
    }
    if (progress) continue;

    // Sealed: if linking i–j would leave the merged group fully determined
    // with no loose ends, and it isn't everything, the link can't exist.
    for (let i = 0; i < n && !progress && steps.length < maxSteps && rules.includes('sealed'); i++) {
      for (const side of [2, 4]) {
        const j = neighbour(b, i, side);
        if (j == null || link(options, i, side) !== 'maybe') continue;
        const withI = options[i].filter(m => m & side);
        const withJ = options[j].filter(m => m & OPPOSITE[side]);
        if (withI.length !== 1 || withJ.length !== 1) continue;
        const trial = options.map((o, k) => k === i ? withI : k === j ? withJ : o);
        // Walk the group the link would create through determined tiles.
        const seen = new Set([i]);
        const stack = [i];
        let open = false;
        while (stack.length && !open) {
          const k = stack.pop();
          if (trial[k].length !== 1) {
            open = true;
            break;
          }
          for (const s of SIDES) {
            if (!(trial[k][0] & s)) continue;
            const t = neighbour(b, k, s);
            if (t == null) {
              open = true;
              break;
            }
            if (!seen.has(t)) {
              seen.add(t);
              stack.push(t);
            }
          }
        }
        if (open || seen.size === n) continue;
        if (restrict(i, m => !(m & side)) === null || restrict(j, m => !(m & OPPOSITE[side])) === null) return fail();
        steps.push({
          rule: 'sealed',
          tiles: [i, j]
        });
        progress = true;
        break;
      }
    }
    if (progress) continue;

    // Exit: a group (not everything) with exactly one possible link outward.
    find = groups();
    const members = new Map();
    for (let i = 0; i < n; i++) {
      const root = find(i);
      if (!members.has(root)) members.set(root, []);
      members.get(root).push(i);
    }
    if (members.size > 1 && rules.includes('exit')) {
      for (const tiles of members.values()) {
        if (steps.length >= maxSteps) break;
        const exits = [];
        for (const i of tiles) {
          for (const side of SIDES) {
            const j = neighbour(b, i, side);
            if (j != null && find(j) !== find(i) && link(options, i, side) !== 'no') exits.push([i, side]);
          }
        }
        if (!exits.length) return fail();
        if (exits.length === 1) {
          const [i, side] = exits[0];
          if (link(options, i, side) === 'yes') continue;
          if (restrict(i, m => !!(m & side)) === null) return fail();
          steps.push({
            rule: 'exit',
            tiles: [i]
          });
          progress = true;
          break;
        }
      }
    }
  }
  const solved = options.every(o => o.length === 1);
  return {
    options,
    steps,
    solved,
    contradiction: false
  };
}

/** The unique solved masks, or null if deduction can't finish. */
export function solution(b) {
  const r = solve(b);
  return r.solved ? r.options.map(o => o[0]) : null;
}
