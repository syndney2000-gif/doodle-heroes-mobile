import { BOARD_H, BOARD_W, TOP_TIER } from './data';
export const MOVE_MS = 170;
export function cellCenter(index, size) {
  return { x: (index % BOARD_W + 0.5) * size, y: (Math.floor(index / BOARD_W) + 0.5) * size };
}
export function cellAt(x, y, size) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(size) || size <= 0 || x < 0 || y < 0 || x >= BOARD_W * size || y >= BOARD_H * size) return null;
  return Math.floor(y / size) * BOARD_W + Math.floor(x / size);
}
export function dropKind(cells, from, to) {
  if (!Number.isInteger(from) || from < 0 || from >= cells.length || !cells[from] || !Number.isInteger(to) || to < 0 || to >= cells.length || from === to) return 'none';
  const a = cells[from], b = cells[to];
  if (!b) return 'moved';
  return a.chain === b.chain && a.tier === b.tier && a.tier < TOP_TIER ? 'merged' : 'swapped';
}
export const itemKey = item => item ? `${item.chain}:${item.tier}` : 'empty';
export function movementEvent(before, after, from, to, point = null) {
  const kind = dropKind(before.cells, from, to);
  if (kind === 'none') return null;
  return {
    kind, from, to, point, item: { ...before.cells[from] }, other: before.cells[to] ? { ...before.cells[to] } : null,
    fresh: after.discovered.length > before.discovered.length,
    leveled: after.level > before.level, level: after.level,
    result: after.cells[to] ? { ...after.cells[to] } : null,
  };
}
