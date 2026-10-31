/* Isle Spans — deduction-only solver.
   Tracks, for every span, the fewest and most bridges it could still hold,
   and narrows those ranges with the same rules a person uses. It never
   guesses: if these rules finish the puzzle, the solution is unique. */

import { across, connected } from './model';
export function initialState(board) {
  return {
    min: board.spans.map(() => 0),
    max: board.spans.map(s => Math.min(2, board.islands[s.a].n, board.islands[s.b].n))
  };
}

/** Islands joined to `start` by spans known to carry at least one bridge. */
function groupOf(board, min, start) {
  const seen = new Set([start]);
  const stack = [start];
  while (stack.length) {
    const i = stack.pop();
    for (const sid of board.spansOf[i]) {
      if (min[sid] < 1) continue;
      const j = across(board.spans[sid], i);
      if (!seen.has(j)) {
        seen.add(j);
        stack.push(j);
      }
    }
  }
  return seen;
}

/**
 * Applies deductions until none apply, or until `maxSteps` have been taken
 * (a hint asks for one). Rules, in the order they're tried:
 *  - count: an island's number against what its spans can still carry;
 *  - crossing: a built span rules out every span crossing it;
 *  - isolation: a span value that would close off a group of islands from
 *    the rest is impossible;
 *  - connect: a group with only one way out must use it.
 */
export function solve(board, start, maxSteps = Infinity) {
  const init = start ?? initialState(board);
  const min = init.min.slice();
  const max = init.max.slice();
  const steps = [];
  const total = board.islands.length;
  const fail = () => ({
    min,
    max,
    steps,
    solved: false,
    contradiction: true
  });
  const record = (step, changes) => {
    if (changes.length) steps.push({
      ...step,
      changes
    });
    return changes.length > 0;
  };
  let progress = true;
  while (progress && steps.length < maxSteps) {
    progress = false;
    for (const isl of board.islands) {
      if (steps.length >= maxSteps) break;
      const ids = board.spansOf[isl.id];
      const sumMin = ids.reduce((t, s) => t + min[s], 0);
      const sumMax = ids.reduce((t, s) => t + max[s], 0);
      if (sumMin > isl.n || sumMax < isl.n) return fail();
      const changes = [];
      for (const s of ids) {
        const lo = Math.max(min[s], isl.n - (sumMax - max[s]));
        const hi = Math.min(max[s], isl.n - (sumMin - min[s]));
        if (lo > hi) return fail();
        if (lo !== min[s] || hi !== max[s]) {
          min[s] = lo;
          max[s] = hi;
          changes.push({
            span: s,
            min: lo,
            max: hi
          });
        }
      }
      if (record({
        rule: 'count',
        island: isl.id
      }, changes)) {
        progress = true;
        break;
      }
    }
    if (progress) continue;
    for (const span of board.spans) {
      if (steps.length >= maxSteps) break;
      if (min[span.id] < 1) continue;
      const changes = [];
      for (const t of span.crosses) {
        if (min[t] > 0) return fail();
        if (max[t] > 0) {
          max[t] = 0;
          changes.push({
            span: t,
            min: 0,
            max: 0
          });
        }
      }
      if (record({
        rule: 'crossing',
        span: span.id
      }, changes)) {
        progress = true;
        break;
      }
    }
    if (progress) continue;
    for (const span of board.spans) {
      if (steps.length >= maxSteps) break;
      const s = span.id;
      let hi = max[s];
      // Try the largest value first: if it would seal a group, lower the cap.
      while (hi > min[s] && hi >= 1) {
        const saved = min[s];
        min[s] = hi;
        const group = groupOf(board, min, span.a);
        const sealed = group.size < total && [...group].every(i => board.spansOf[i].reduce((t, x) => t + min[x], 0) === board.islands[i].n);
        min[s] = saved;
        if (!sealed) break;
        hi--;
      }
      if (hi < min[s]) return fail();
      if (hi !== max[s]) {
        max[s] = hi;
        record({
          rule: 'isolation',
          span: s
        }, [{
          span: s,
          min: min[s],
          max: hi
        }]);
        progress = true;
        break;
      }
    }
    if (progress) continue;
    const visited = new Set();
    for (const isl of board.islands) {
      if (steps.length >= maxSteps) break;
      if (visited.has(isl.id)) continue;
      const group = groupOf(board, min, isl.id);
      group.forEach(i => visited.add(i));
      if (group.size === total) continue;
      const exits = new Set();
      for (const i of group) {
        for (const sid of board.spansOf[i]) {
          if (max[sid] > 0 && !group.has(across(board.spans[sid], i))) exits.add(sid);
        }
      }
      if (exits.size === 0) return fail();
      if (exits.size === 1) {
        const [only] = exits;
        if (min[only] < 1) {
          min[only] = 1;
          record({
            rule: 'connect',
            span: only
          }, [{
            span: only,
            min: 1,
            max: max[only]
          }]);
          progress = true;
          break;
        }
      }
    }
  }
  const done = min.every((v, i) => v === max[i]);
  const solved = done && connected(board, min);
  return {
    min,
    max,
    steps,
    solved,
    contradiction: done && !solved
  };
}

/** The unique solution's bridge counts, or null if deduction can't finish. */
export function solution(board) {
  const result = solve(board);
  return result.solved ? result.min : null;
}

/** Hardest rule the solver needed: a rough difficulty measure. */
export function hardestRule(board) {
  const result = solve(board);
  if (!result.solved) return null;
  const order = ['count', 'crossing', 'isolation', 'connect'];
  return result.steps.reduce((worst, s) => order.indexOf(s.rule) > order.indexOf(worst) ? s.rule : worst, 'count');
}
