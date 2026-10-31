import { localDateKey } from './lib/rng';
import { cluesFor, solveGrid, UNKNOWN, FILLED, EMPTY } from './nonogram/solver';
import type { Cell } from './nonogram/solver';
import type { Puzzle } from './nonogram/puzzles';

export interface Session {
  puzzle: Puzzle;
  grid: Cell[][];
  history: Cell[][][];
  hints: number;
  seconds: number;
  completedAt: string | null;
}
export interface Progress {
  version: 1;
  sessions: Record<string, Session>;
  activeId: string | null;
  reducedMotion: boolean;
}
export const emptyProgress = (): Progress => ({ version: 1, sessions: {}, activeId: null, reducedMotion: false });
export const newSession = (puzzle: Puzzle): Session => ({
  puzzle, grid: puzzle.solution.map(row => Array<Cell>(row.length).fill(UNKNOWN)),
  history: [], hints: 0, seconds: 0, completedAt: null,
});
export function isSolved(session: Session): boolean {
  return session.grid.every((row, r) => row.every((cell, c) => (cell === FILLED) === (session.puzzle.solution[r][c] === '#')));
}
export function applyCells(session: Session, changes: { row: number; col: number; value: Cell }[], now = new Date().toISOString()): Session {
  if (session.completedAt) return session;
  const grid = session.grid.map(row => row.slice());
  for (const { row, col, value } of changes) {
    if (grid[row]?.[col] !== undefined && [UNKNOWN, FILLED, EMPTY].includes(value)) grid[row][col] = value;
  }
  if (JSON.stringify(grid) === JSON.stringify(session.grid)) return session;
  const next = { ...session, grid, history: [...session.history.slice(-79), session.grid] };
  return { ...next, completedAt: isSolved(next) ? now : null };
}
export function undo(session: Session): Session {
  if (session.completedAt || !session.history.length) return session;
  return { ...session, grid: session.history[session.history.length - 1], history: session.history.slice(0, -1) };
}
export function hint(session: Session): { session: Session; message: string; line?: { kind: 'row' | 'col'; index: number } } {
  if (session.completedAt) return { session, message: 'This sketch is already complete.' };
  // Identify conflicts first. solveGrid skips fully specified lines, so do not
  // treat its contradiction flag alone as a complete validator of user input.
  const wrong = session.grid.some((row, r) => row.some((cell, c) => cell !== UNKNOWN &&
    (cell === FILLED) !== (session.puzzle.solution[r][c] === '#')));
  if (wrong) return { session, message: 'A filled or marked square conflicts with the clues. Try Undo, or erase a square you are unsure about.' };
  const result = solveGrid(cluesFor(session.puzzle.solution), session.grid, 1);
  const step = result.steps[0];
  if (!step) return { session, message: 'No further line deduction is available. Check the clues or finish marking the empty squares.' };
  const changes = step.changes.map(change => ({
    row: step.line.kind === 'row' ? step.line.index : change.at,
    col: step.line.kind === 'col' ? step.line.index : change.at, value: change.value,
  }));
  const next = applyCells(session, changes);
  return {
    session: { ...next, hints: session.hints + 1 }, line: step.line,
    message: `${step.line.kind === 'row' ? 'Row' : 'Column'} ${step.line.index + 1}: only one value is possible for ${changes.length === 1 ? 'this square' : `these ${changes.length} squares`}. The hint has applied that deduction.`,
  };
}

const validGrid = (grid: unknown, solution: string[]): grid is Cell[][] => Array.isArray(grid) &&
  grid.length === solution.length && grid.every((row, r) => Array.isArray(row) &&
    row.length === solution[r].length && row.every(cell => [UNKNOWN, FILLED, EMPTY].includes(cell)));
const count = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
export function decodeProgress(raw: string | null): Progress {
  if (raw === null) return emptyProgress();
  const data = JSON.parse(raw);
  if (!data || data.version !== 1 || !data.sessions || typeof data.sessions !== 'object' || Array.isArray(data.sessions)) {
    throw new Error('This save uses an unsupported format.');
  }
  const progress = emptyProgress();
  for (const [key, value] of Object.entries(data.sessions)) {
    const item = value as Session;
    const puzzle = item?.puzzle;
    if (!puzzle || typeof puzzle.id !== 'string' || puzzle.id !== key || !/^[a-z0-9-]+$/.test(key) ||
        typeof puzzle.title !== 'string' || typeof puzzle.note !== 'string' ||
        !Array.isArray(puzzle.solution) || ![5, 10, 15].includes(puzzle.solution.length) ||
        !puzzle.solution.every(row => typeof row === 'string' && row.length === puzzle.solution.length && /^[#.]+$/.test(row)) ||
        !validGrid(item.grid, puzzle.solution)) throw new Error('A saved puzzle is damaged.');
    const completedAt = typeof item.completedAt === 'string' && Number.isFinite(Date.parse(item.completedAt)) && isSolved(item) ? item.completedAt : null;
    progress.sessions[key] = {
      puzzle, grid: item.grid, hints: count(item.hints), seconds: count(item.seconds), completedAt,
      history: Array.isArray(item.history) ? item.history.filter(grid => validGrid(grid, puzzle.solution)).slice(-80) : [],
    };
  }
  progress.activeId = typeof data.activeId === 'string' && Object.hasOwn(progress.sessions, data.activeId) ? data.activeId : null;
  progress.reducedMotion = data.reducedMotion === true;
  return progress;
}

export function streakFor(progress: Progress, today: string): number {
  const days = new Set(Object.values(progress.sessions).filter(s => s.completedAt).map(s => localDateKey(new Date(s.completedAt!))));
  const date = new Date(`${today}T12:00:00Z`);
  if (!days.has(today)) date.setUTCDate(date.getUTCDate() - 1);
  let streak = 0;
  while (days.has(date.toISOString().slice(0, 10))) { streak++; date.setUTCDate(date.getUTCDate() - 1); }
  return streak;
}
