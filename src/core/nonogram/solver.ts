/* Nonogram line solver.
   Everything here is pure and framework-free so the same code checks the
   puzzle catalogue in tests, renders walkthrough boards at build time, and
   drives hints in the browser. */

export const UNKNOWN = 0;
export const FILLED = 1;
export const EMPTY = 2;
export type Cell = typeof UNKNOWN | typeof FILLED | typeof EMPTY;

export interface Clues {
  rows: number[][];
  cols: number[][];
}

/** Lengths of the filled runs in a line, e.g. ##.#  ->  [2, 1]. */
export function runs(line: ArrayLike<boolean>): number[] {
  const out: number[] = [];
  let n = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i]) n++;
    else if (n) { out.push(n); n = 0; }
  }
  if (n) out.push(n);
  return out;
}

/** Clues for a solution written as rows of '#' (filled) and '.' (empty). */
export function cluesFor(solution: string[]): Clues {
  const h = solution.length;
  const w = solution[0].length;
  const at = (r: number, c: number) => solution[r][c] === '#';
  const rows = solution.map((_, r) => runs(Array.from({ length: w }, (_, c) => at(r, c))));
  const cols = Array.from({ length: w }, (_, c) => runs(Array.from({ length: h }, (_, r) => at(r, c))));
  return { rows, cols };
}

/**
 * Everything that can be deduced about one line from its clue alone.
 * Returns the improved line, or null if the line cannot match the clue.
 *
 * Considers every arrangement of the clue's blocks that agrees with the
 * cells already known: a cell that is filled in all of them must be filled,
 * and one that is empty in all of them must be empty.
 */
export function solveLine(clue: number[], line: Cell[]): Cell[] | null {
  const n = line.length;
  const k = clue.length;

  // fit[i][j]: cells i.. can hold blocks j.. (cell i-1 is already settled).
  const fit: boolean[][] = Array.from({ length: n + 2 }, () => new Array(k + 1).fill(false));
  // noEmptyFrom[i][len]: no EMPTY cell in line[i .. i+len-1], via a prefix count.
  const emptyBefore = new Array(n + 1).fill(0);
  for (let i = 0; i < n; i++) emptyBefore[i + 1] = emptyBefore[i] + (line[i] === EMPTY ? 1 : 0);
  const blockFits = (i: number, len: number) =>
    i + len <= n && emptyBefore[i + len] - emptyBefore[i] === 0 && (i + len === n || line[i + len] !== FILLED);
  const after = (i: number, len: number) => Math.min(i + len + 1, n);

  fit[n][k] = true;
  for (let i = n - 1; i >= 0; i--) {
    for (let j = k; j >= 0; j--) {
      let ok = line[i] !== FILLED && fit[i + 1][j];
      if (!ok && j < k && blockFits(i, clue[j])) ok = fit[after(i, clue[j])][j + 1];
      fit[i][j] = ok;
    }
  }
  if (!fit[0][0]) return null;

  // Walk forward through the states that are both reachable and completable,
  // recording what each cell can be along the way.
  const reach: boolean[][] = Array.from({ length: n + 1 }, () => new Array(k + 1).fill(false));
  const canFill = new Array(n).fill(false);
  const canEmpty = new Array(n).fill(false);
  reach[0][0] = true;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= k; j++) {
      if (!reach[i][j]) continue;
      if (line[i] !== FILLED && fit[i + 1][j]) {
        canEmpty[i] = true;
        reach[i + 1][j] = true;
      }
      if (j < k && blockFits(i, clue[j])) {
        const next = after(i, clue[j]);
        if (fit[next][j + 1]) {
          for (let t = i; t < i + clue[j]; t++) canFill[t] = true;
          if (i + clue[j] < n) canEmpty[i + clue[j]] = true;
          reach[next][j + 1] = true;
        }
      }
    }
  }

  return line.map((cell, i) => {
    if (cell !== UNKNOWN) return cell;
    if (canFill[i] && !canEmpty[i]) return FILLED;
    if (canEmpty[i] && !canFill[i]) return EMPTY;
    return UNKNOWN;
  });
}

export type LineRef = { kind: 'row' | 'col'; index: number };

export interface Step {
  line: LineRef;
  /** Indices along the line, and the value each one became. */
  changes: { at: number; value: Cell }[];
}

export interface GridSolve {
  grid: Cell[][];
  steps: Step[];
  solved: boolean;
  contradiction: boolean;
}

function getLine(grid: Cell[][], ref: LineRef): Cell[] {
  return ref.kind === 'row' ? grid[ref.index].slice() : grid.map((row) => row[ref.index]);
}

function setLine(grid: Cell[][], ref: LineRef, at: number, value: Cell) {
  if (ref.kind === 'row') grid[ref.index][at] = value;
  else grid[at][ref.index] = value;
}

/**
 * Applies line deductions until nothing more follows. With `maxSteps` it
 * stops early, which is how a hint asks for "the next thing you can work out".
 */
export function solveGrid(clues: Clues, start?: Cell[][], maxSteps = Infinity): GridSolve {
  const h = clues.rows.length;
  const w = clues.cols.length;
  const grid: Cell[][] = start
    ? start.map((row) => row.slice())
    : Array.from({ length: h }, () => new Array<Cell>(w).fill(UNKNOWN));
  const steps: Step[] = [];
  const lines: LineRef[] = [
    ...clues.rows.map((_, index) => ({ kind: 'row' as const, index })),
    ...clues.cols.map((_, index) => ({ kind: 'col' as const, index })),
  ];

  let progress = true;
  while (progress && steps.length < maxSteps) {
    progress = false;
    for (const ref of lines) {
      if (steps.length >= maxSteps) break;
      const before = getLine(grid, ref);
      if (!before.includes(UNKNOWN)) continue;
      const clue = ref.kind === 'row' ? clues.rows[ref.index] : clues.cols[ref.index];
      const after = solveLine(clue, before);
      if (!after) return { grid, steps, solved: false, contradiction: true };
      const changes = after.flatMap((value, at) => (value !== before[at] ? [{ at, value }] : []));
      if (!changes.length) continue;
      for (const { at, value } of changes) setLine(grid, ref, at, value);
      steps.push({ line: ref, changes });
      progress = true;
    }
  }

  const solved = grid.every((row) => !row.includes(UNKNOWN));
  return { grid, steps, solved, contradiction: false };
}

/** True when the puzzle can be finished by line logic alone, which also
    proves it has exactly one solution. */
export function isLineSolvable(clues: Clues): boolean {
  return solveGrid(clues).solved;
}
