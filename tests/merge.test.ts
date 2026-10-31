import { describe, expect, test } from 'vitest';
import {
  INK_POT, buyInk, deliver, draw, erase, inkMax, move, newState, nextInkIn, orderCells, refillInk, skipOrder,
  type MergeState,
} from '../src/core/merge/engine';
import { BOARD_H, BOARD_W, INK_SECONDS, TOP_TIER, chainIds, chains } from '../src/core/merge/data';

const T = 1_000_000;
const put = (s: MergeState, i: number, chain: 'heroes' | 'paper', tier: number) => { s.cells[i] = { chain, tier }; };

describe('data', () => {
  test('every chain has eight distinct items', () => {
    for (const id of chainIds) {
      expect(chains[id].items).toHaveLength(TOP_TIER);
      expect(new Set(chains[id].items.map((i) => i.name)).size).toBe(TOP_TIER);
    }
  });
});

describe('board', () => {
  test('two matching items merge into the next tier', () => {
    const s = newState(1, T);
    put(s, 0, 'heroes', 1); put(s, 1, 'heroes', 1);
    expect(move(s, 0, 1)).toBe('merged');
    expect(s.cells[1]).toEqual({ chain: 'heroes', tier: 2 });
    expect(s.cells[0]).toBeNull();
    expect(s.discovered).toContain('heroes:2');
  });

  test('different items swap; empty cells just move', () => {
    const s = newState(1, T);
    put(s, 0, 'heroes', 1); put(s, 1, 'paper', 1);
    expect(move(s, 0, 1)).toBe('swapped');
    expect(s.cells[0]?.chain).toBe('paper');
    expect(move(s, 0, 5)).toBe('moved');
  });

  test('top-tier items do not merge further', () => {
    const s = newState(1, T);
    put(s, 0, 'heroes', TOP_TIER); put(s, 1, 'heroes', TOP_TIER);
    expect(move(s, 0, 1)).toBe('swapped');
  });

  test('drawing uses ink and stops on a full board', () => {
    const s = newState(1, T);
    const before = s.ink;
    expect(draw(s, T)).not.toBeNull();
    expect(s.ink).toBe(before - 1);
    s.ink = 1000;
    for (let k = 0; k < BOARD_W * BOARD_H; k++) draw(s, T);
    expect(draw(s, T)).toBeNull();
  });

  test('only unlocked chains are drawn', () => {
    const s = newState(7, T);
    s.ink = 1000;
    for (let k = 0; k < 40; k++) draw(s, T);
    for (const c of s.cells) if (c) expect(['heroes', 'paper']).toContain(c.chain);
  });

  test('erasing frees the cell for coins', () => {
    const s = newState(1, T);
    put(s, 3, 'paper', 4);
    expect(erase(s, 3)).toBe(4);
    expect(s.cells[3]).toBeNull();
  });
});

describe('ink', () => {
  test('refills one drop per interval, up to the maximum', () => {
    const s = newState(1, T);
    s.ink = 0; s.inkAt = T;
    refillInk(s, T + 3.5 * INK_SECONDS * 1000);
    expect(s.ink).toBe(3);
    expect(nextInkIn(s, T + 3.5 * INK_SECONDS * 1000)).toBe(INK_SECONDS / 2);
    refillInk(s, T + 1e9);
    expect(s.ink).toBe(inkMax(s));
  });

  test('a clock set backwards gives nothing', () => {
    const s = newState(1, T);
    s.ink = 0; s.inkAt = T;
    refillInk(s, T - 1e7);
    expect(s.ink).toBe(0);
  });

  test('coins buy a pot of ink', () => {
    const s = newState(1, T);
    s.coins = INK_POT.cost;
    const before = s.ink;
    expect(buyInk(s, T)).toBe(true);
    expect(s.ink).toBe(before + INK_POT.ink);
    expect(buyInk(s, T)).toBe(false);
  });
});

describe('orders', () => {
  test('an order can be delivered once the board holds what it wants', () => {
    const s = newState(3, T);
    const order = s.orders[0];
    expect(orderCells(s, order)).toBeNull();
    order.wants.forEach((w, k) => { s.cells[k] = { ...w }; });
    expect(deliver(s, order.id)).toBe(true);
    expect(s.coins).toBe(order.coins);
    expect(s.orders.some((o) => o.id === order.id)).toBe(false);
    expect(s.orders).toHaveLength(3);
  });

  test('orders only ask for unlocked chains and tiers you can reach', () => {
    const s = newState(9, T);
    for (let k = 0; k < 50; k++) {
      skipOrder(Object.assign(s, { coins: 100 }), s.orders[0].id);
      for (const w of s.orders[0].wants) {
        expect(chains[w.chain].unlockLevel).toBeLessThanOrEqual(s.level);
        expect(w.tier).toBeGreaterThanOrEqual(2);
        expect(w.tier).toBeLessThanOrEqual(TOP_TIER);
      }
    }
  });

  test('levelling up unlocks new chains', () => {
    const s = newState(1, T);
    for (let k = 0; k < 40 && s.level < 5; k++) {
      const order = s.orders[0];
      order.wants.forEach((w, i) => { s.cells[i] = { ...w }; });
      deliver(s, order.id);
    }
    expect(s.level).toBeGreaterThanOrEqual(5);
    s.ink = 1000;
    s.cells.fill(null);
    const seen = new Set<string>();
    for (let k = 0; k < 40; k++) { const c = draw(s, T); if (c != null) seen.add(s.cells[c]!.chain); }
    expect(seen.has('creatures')).toBe(true);
  });

  test('a saved state resumes with the same randomness', () => {
    const a = newState(42, T);
    const b = JSON.parse(JSON.stringify(a)) as MergeState;
    draw(a, T); draw(b, T);
    expect(a.cells).toEqual(b.cells);
  });
});
