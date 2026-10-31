import { describe, expect, it } from 'vitest';
import { allPuzzles } from '../src/core/nonogram/puzzles';
import { cluesFor, FILLED, EMPTY, UNKNOWN, solveGrid } from '../src/core/nonogram/solver';
import { dailyPuzzle } from '../src/core/nonogram/daily';
import { applyCells, decodeProgress, emptyProgress, hint, isSolved, newSession, streakFor, undo } from '../src/core/session';
const sun = allPuzzles[0];

describe('native Island Sketch progress', () => {
  it('groups a stroke into one undo action without changing the previous state', () => {
    const before = newSession(sun);
    const next = applyCells(before, [{ row: 0, col: 0, value: FILLED }, { row: 0, col: 1, value: EMPTY }]);
    expect(next.history).toHaveLength(1);
    expect(before.grid[0]).toEqual([0, 0, 0, 0, 0]);
    expect(undo(next).grid).toEqual(before.grid);
  });
  it('completes a picture with unmarked empty squares and keeps completion immutable', () => {
    const session = newSession(sun);
    const changes = sun.solution.flatMap((row, r) => [...row].flatMap((cell, c) => cell === '#' ? [{ row: r, col: c, value: FILLED as 1 }] : []));
    const solved = applyCells(session, changes, '2026-10-31T12:00:00Z');
    expect(isSolved(solved)).toBe(true);
    expect(solved.completedAt).toBe('2026-10-31T12:00:00Z');
    expect(undo(solved)).toBe(solved);
    expect(applyCells(solved, [{ row: 0, col: 0, value: UNKNOWN }])).toBe(solved);
    expect(hint(solved).session).toBe(solved);
  });
  it('applies a solver deduction, explains its line, and retains the cost after undo', () => {
    const before = newSession(sun);
    const result = hint(before);
    expect(result.session.hints).toBe(1);
    expect(result.line).toBeDefined();
    expect(result.message).toContain('deduction');
    expect(undo(result.session).grid).toEqual(before.grid);
    expect(undo(result.session).hints).toBe(1);
  });
  it('does not reward or charge for hints when user marks conflict', () => {
    const before = applyCells(newSession(sun), [{ row: 0, col: 1, value: FILLED }]);
    expect(hint(before).session).toBe(before);
    expect(hint(before).message).toContain('conflicts');
  });
  it('round-trips current puzzle, history and settings, including a dated daily', () => {
    const daily = dailyPuzzle('2026-10-31');
    const session = hint(newSession(daily)).session;
    const progress = { ...emptyProgress(), activeId: daily.id, reducedMotion: true, sessions: { [daily.id]: session } };
    expect(decodeProgress(JSON.stringify(progress))).toEqual(progress);
    expect(decodeProgress(JSON.stringify(progress)).sessions[daily.id].puzzle).toEqual(daily);
    expect(dailyPuzzle('2026-10-31')).toEqual(daily);
  });
  it('rejects damaged saves instead of silently replacing progress', () => {
    expect(() => decodeProgress('{broken')).toThrow();
    expect(() => decodeProgress(JSON.stringify({ version: 2, sessions: {} }))).toThrow();
    const bad = { ...newSession(sun), grid: [[3]] };
    expect(() => decodeProgress(JSON.stringify({ version: 1, sessions: { sun: bad } }))).toThrow();
    expect(decodeProgress(null)).toEqual(emptyProgress());
  });
  it('uses distinct completion dates and permits a streak carried from yesterday', () => {
    const progress = emptyProgress();
    for (const [i, day] of ['2026-10-29', '2026-10-30', '2026-10-30'].entries()) {
      const session = newSession(allPuzzles[i]);
      progress.sessions[session.puzzle.id] = { ...session, completedAt: `${day}T12:00:00Z` };
    }
    expect(streakFor(progress, '2026-10-31')).toBe(2);
    expect(streakFor(progress, '2026-11-01')).toBe(0);
  });
  it('solves all bundled catalogue puzzles with deduction only', () => {
    for (const puzzle of allPuzzles) {
      const result = solveGrid(cluesFor(puzzle.solution));
      expect(result.solved, puzzle.id).toBe(true);
      expect(result.grid.map(row => row.map(c => c === FILLED ? '#' : '.').join(''))).toEqual(puzzle.solution);
    }
  });
  it('maintains a bounded undo history', () => {
    let session = newSession(sun);
    for (let i = 0; i < 100; i++) session = applyCells(session, [{ row: 0, col: 0, value: i % 2 ? EMPTY : UNKNOWN }]);
    expect(session.history).toHaveLength(80);
  });
});
