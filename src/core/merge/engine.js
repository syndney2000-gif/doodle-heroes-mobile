/* Margin Merge — the rules, with no DOM. State is plain data so it can be
   saved as JSON, and randomness comes from a seed kept in the state. */

import { BOARD_H, BOARD_W, INK_BASE, INK_PER_LEVEL, INK_SECONDS, TOP_TIER, chainIds, chains, orderValue, sellValue, xpToNext } from './data';
/* ---------- randomness that survives a save ---------- */

function rand(s) {
  // xorshift32, with its state stored on the game so saves resume exactly.
  let x = s.seed | 0 || 1;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  s.seed = x >>> 0;
  return s.seed / 4294967296;
}
const key = it => `${it.chain}:${it.tier}`;
export const inkMax = s => INK_BASE + INK_PER_LEVEL * (s.level - 1);
export const unlockedChains = s => chainIds.filter(c => chains[c].unlockLevel <= s.level);
export function newState(seed, now) {
  const s = {
    cells: new Array(BOARD_W * BOARD_H).fill(null),
    ink: INK_BASE,
    inkAt: now,
    coins: 0,
    xp: 0,
    level: 1,
    discovered: [],
    orders: [],
    nextOrderId: 1,
    seed: seed || 1,
    merges: 0,
    delivered: 0
  };
  for (let k = 0; k < 3; k++) s.orders.push(makeOrder(s));
  return s;
}

/* ---------- ink ---------- */

/** Adds the ink that has refilled since it was last counted. */
export function refillInk(s, now) {
  const max = inkMax(s);
  if (now < s.inkAt) {
    s.inkAt = now;
    return;
  } // clock went backwards
  if (s.ink >= max) {
    s.inkAt = now;
    return;
  }
  const drops = Math.floor((now - s.inkAt) / (INK_SECONDS * 1000));
  if (drops <= 0) return;
  s.ink = Math.min(max, s.ink + drops);
  s.inkAt = s.ink >= max ? now : s.inkAt + drops * INK_SECONDS * 1000;
}

/** Seconds until the next drop of ink, or 0 when full. */
export function nextInkIn(s, now) {
  if (s.ink >= inkMax(s)) return 0;
  return Math.max(0, Math.ceil((s.inkAt + INK_SECONDS * 1000 - now) / 1000));
}

/* ---------- the board ---------- */

function discover(s, it) {
  if (!s.discovered.includes(key(it))) s.discovered.push(key(it));
}
export const emptyCells = s => s.cells.flatMap((c, i) => c ? [] : [i]);

/** The sketchbook draws a new item into an empty cell, for one ink. */
export function draw(s, now) {
  refillInk(s, now);
  const empty = emptyCells(s);
  if (s.ink < 1 || !empty.length) return null;
  const wasFull = s.ink >= inkMax(s);
  s.ink--;
  if (wasFull) s.inkAt = now; // refilling starts from the moment it dips below full
  const chainsNow = unlockedChains(s);
  const item = {
    chain: chainsNow[Math.floor(rand(s) * chainsNow.length)],
    tier: rand(s) < 0.12 ? 2 : 1
  };
  const cell = empty[Math.floor(rand(s) * empty.length)];
  s.cells[cell] = item;
  discover(s, item);
  return cell;
}
/** Drags the item in `from` onto `to`: merge if they match, else move or swap. */
export function move(s, from, to) {
  const a = s.cells[from],
    b = s.cells[to];
  if (!a || from === to) return 'none';
  if (!b) {
    s.cells[to] = a;
    s.cells[from] = null;
    return 'moved';
  }
  if (a.chain === b.chain && a.tier === b.tier && a.tier < TOP_TIER) {
    const up = {
      chain: a.chain,
      tier: a.tier + 1
    };
    s.cells[to] = up;
    s.cells[from] = null;
    s.merges++;
    discover(s, up);
    gainXp(s, a.tier);
    return 'merged';
  }
  s.cells[to] = a;
  s.cells[from] = b;
  return 'swapped';
}

/** Erases an item for a few coins, to make room. */
export function erase(s, cell) {
  const it = s.cells[cell];
  if (!it) return 0;
  s.cells[cell] = null;
  const coins = sellValue(it.tier);
  s.coins += coins;
  return coins;
}

/* ---------- levels and orders ---------- */

function gainXp(s, amount) {
  s.xp += amount;
  while (s.xp >= xpToNext(s.level)) {
    s.xp -= xpToNext(s.level);
    s.level++;
    s.ink = Math.min(inkMax(s), s.ink + INK_PER_LEVEL); // a level-up tops up the ink a little
  }
}
function makeOrder(s) {
  const chainsNow = unlockedChains(s);
  const maxTier = Math.min(TOP_TIER, 2 + Math.floor(s.level / 2));
  const count = s.level >= 4 && rand(s) < 0.4 ? 2 : 1;
  const wants = [];
  for (let k = 0; k < count; k++) {
    wants.push({
      chain: chainsNow[Math.floor(rand(s) * chainsNow.length)],
      tier: 2 + Math.floor(rand(s) * (maxTier - 1))
    });
  }
  const coins = wants.reduce((t, w) => t + orderValue(w.tier), 0);
  return {
    id: s.nextOrderId++,
    wants,
    coins,
    xp: wants.reduce((t, w) => t + w.tier * 3, 0)
  };
}

/** Cells that would be used to fill an order, or null if the board can't. */
export function orderCells(s, order) {
  const used = [];
  for (const w of order.wants) {
    const cell = s.cells.findIndex((c, i) => c && c.chain === w.chain && c.tier === w.tier && !used.includes(i));
    if (cell < 0) return null;
    used.push(cell);
  }
  return used;
}
export function deliver(s, orderId) {
  const k = s.orders.findIndex(o => o.id === orderId);
  if (k < 0) return false;
  const order = s.orders[k];
  const cells = orderCells(s, order);
  if (!cells) return false;
  for (const c of cells) s.cells[c] = null;
  s.coins += order.coins;
  s.delivered++;
  gainXp(s, order.xp);
  s.orders[k] = makeOrder(s);
  return true;
}

/** Swaps an order you don't like for a new one, for a few coins. */
export const SKIP_ORDER_COST = 5;
export function skipOrder(s, orderId) {
  const k = s.orders.findIndex(o => o.id === orderId);
  if (k < 0 || s.coins < SKIP_ORDER_COST) return false;
  s.coins -= SKIP_ORDER_COST;
  s.orders[k] = makeOrder(s);
  return true;
}

/** Coins buy a pot of ink when you can't wait. */
export const INK_POT = {
  ink: 10,
  cost: 25
};
export function buyInk(s, now) {
  refillInk(s, now);
  if (s.coins < INK_POT.cost) return false;
  s.coins -= INK_POT.cost;
  s.ink += INK_POT.ink; // may go over the usual maximum
  return true;
}
