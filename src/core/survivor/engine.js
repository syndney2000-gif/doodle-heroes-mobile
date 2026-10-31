/* Scribble Siege — the game rules, with no drawing or input code.
   The engine advances in fixed steps and takes all its randomness from one
   seeded generator, so a daily siege plays out the same for everyone given
   the same moves, and the rules can be tested without a browser. */

import { statefulRandom as mulberry32 } from '../lib/randomState';
import { BASE, BOSS_AT, MAX_LEVEL, MAX_PASSIVES, MAX_WEAPONS, RUN_SECONDS, enemies as ENEMIES, passives as PASSIVES, waveAt, weapons as WEAPONS, xpToNext } from './data';
export const STEP = 1 / 60;
const SPAWN_RING = 560; // enemies appear this far from the hero
const MAX_ENEMIES = 360;
const GRID = 64;
/* ---------- setup ---------- */

export function newGame(config) {
  const m = config.meta;
  const twist = config.twist;
  const maxHp = Math.round((BASE.health * config.hero.health + 10 * (m.toughness ?? 0)) * (twist?.playerHealth ?? 1));
  const g = {
    config,
    rand: mulberry32(config.seed),
    t: 0,
    status: 'playing',
    player: {
      x: 0,
      y: 0,
      hp: maxHp,
      maxHp,
      speed: BASE.speed * config.hero.speed * (1 + 0.04 * (m.swiftness ?? 0)),
      pickup: BASE.pickup * (1 + 0.15 * (m.magnetism ?? 0)),
      faceX: 1,
      faceY: 0,
      invulnerable: 0,
      regen: 0.2 * (m.recovery ?? 0)
    },
    level: 1,
    xp: 0,
    xpNeed: xpToNext(1),
    weapons: [{
      id: config.weapon,
      level: 1,
      timer: 0.3
    }],
    passives: [],
    enemies: [],
    projectiles: [],
    effects: [],
    gems: [],
    coins: [],
    floaters: [],
    kills: 0,
    coinsPicked: 0,
    pendingLevels: 0,
    cards: [],
    rerolls: 1 + (m.rerolls ?? 0),
    spawnBudget: 0,
    nextElite: 120,
    bossSpawned: false,
    bossDefeated: false,
    events: [],
    uid: 0
  };
  return g;
}

/* ---------- derived stats ---------- */

const passiveLevel = (g, id) => g.passives.find(p => p.id === id)?.level ?? 0;
function damageMultiplier(g) {
  return (1 + 0.1 * passiveLevel(g, 'sharpener')) * (1 + 0.05 * (g.config.meta.might ?? 0));
}
function cooldownMultiplier(g) {
  return Math.max(0.5, 1 - 0.07 * passiveLevel(g, 'coffee'));
}
function xpMultiplier(g) {
  return (1 + 0.1 * passiveLevel(g, 'notes')) * (1 + 0.05 * (g.config.meta.wisdom ?? 0)) * (g.config.twist?.xp ?? 1);
}
function moveSpeed(g) {
  return g.player.speed * (1 + 0.08 * passiveLevel(g, 'sneakers'));
}
function pickupRange(g) {
  return g.player.pickup * (1 + 0.25 * passiveLevel(g, 'magnet'));
}

/** Coins earned for the run as it stands: picked up, plus time and kill bonuses. */
export function runCoins(g) {
  const base = g.coinsPicked + Math.floor(g.t / 20) + Math.floor(g.kills / 40) + (g.status === 'won' ? 60 : 0);
  return Math.round(base * (1 + 0.1 * (g.config.meta.greed ?? 0)));
}

/* ---------- spatial grid ---------- */

function buildGrid(list) {
  const grid = new Map();
  for (const e of list) {
    const k = Math.floor(e.x / GRID) * 100003 + Math.floor(e.y / GRID);
    const cell = grid.get(k);
    if (cell) cell.push(e);else grid.set(k, [e]);
  }
  return grid;
}
function near(grid, x, y, r, out = []) {
  out.length = 0;
  const x0 = Math.floor((x - r) / GRID),
    x1 = Math.floor((x + r) / GRID);
  const y0 = Math.floor((y - r) / GRID),
    y1 = Math.floor((y + r) / GRID);
  for (let cx = x0; cx <= x1; cx++) {
    for (let cy = y0; cy <= y1; cy++) {
      const cell = grid.get(cx * 100003 + cy);
      if (cell) for (const e of cell) out.push(e);
    }
  }
  return out;
}

/* ---------- spawning ---------- */

function pick(g, weighted) {
  const total = weighted.reduce((s, [, w]) => s + w, 0);
  let r = g.rand() * total;
  for (const [v, w] of weighted) {
    r -= w;
    if (r <= 0) return v;
  }
  return weighted[weighted.length - 1][0];
}
function spawn(g, id, opts = {}) {
  const def = ENEMIES[id];
  const tw = g.config.twist;
  const a = g.rand() * Math.PI * 2;
  const hp = def.health * (opts.toughness ?? 1) * (tw?.enemyHealth ?? 1) * (opts.elite ? 6 : 1);
  g.enemies.push({
    uid: ++g.uid,
    def,
    x: g.player.x + Math.cos(a) * SPAWN_RING,
    y: g.player.y + Math.sin(a) * SPAWN_RING,
    hp,
    maxHp: hp,
    speed: def.speed * (tw?.enemySpeed ?? 1) * (opts.elite ? 0.9 : 1),
    damage: def.damage * (opts.elite ? 1.5 : 1),
    radius: def.radius * (opts.elite ? 1.6 : 1),
    xp: def.xp * (opts.elite ? 10 : 1),
    elite: !!opts.elite,
    flash: 0,
    phase: g.rand() * Math.PI * 2,
    rehit: new Map()
  });
}
function spawning(g, dt) {
  const wave = waveAt(g.t);
  if (g.t < BOSS_AT || g.bossDefeated) {
    g.spawnBudget += wave.perSecond * (g.config.twist?.spawn ?? 1) * dt;
  } else {
    g.spawnBudget += wave.perSecond * 0.5 * dt; // a thinner crowd while the boss is out
  }
  while (g.spawnBudget >= 1) {
    g.spawnBudget -= 1;
    if (g.enemies.length < MAX_ENEMIES) spawn(g, pick(g, wave.mix), {
      toughness: wave.toughness
    });
  }
  if (g.t >= g.nextElite && g.t < BOSS_AT) {
    g.nextElite += 120;
    spawn(g, 'stickman', {
      toughness: wave.toughness,
      elite: true
    });
  }
  if (!g.bossSpawned && g.t >= BOSS_AT) {
    g.bossSpawned = true;
    spawn(g, 'eraser');
    g.events.push('boss');
  }
}

/* ---------- combat ---------- */

function hurtEnemy(g, e, base) {
  const crit = g.rand() < 0.1;
  const amount = Math.round(base * damageMultiplier(g) * (crit ? 2 : 1));
  e.hp -= amount;
  e.flash = 0.1;
  if (g.floaters.length < 80) g.floaters.push({
    x: e.x,
    y: e.y - e.radius,
    text: String(amount),
    life: 0.6,
    crit
  });
  g.events.push('hit');
}
function nearestEnemies(g, n) {
  const {
    x,
    y
  } = g.player;
  return g.enemies.map(e => ({
    e,
    d: (e.x - x) ** 2 + (e.y - y) ** 2
  })).sort((a, b) => a.d - b.d).slice(0, n).map(v => v.e);
}
function useWeapons(g, dt, grid) {
  const p = g.player;
  const scratch = [];
  for (const w of g.weapons) {
    const stats = WEAPONS[w.id].levels[w.level - 1];
    if (w.id === 'orbit') {
      // Always on: each eraser hits what it touches, then waits to hit again.
      for (let k = 0; k < stats.count; k++) {
        const a = g.t * 3 + k * Math.PI * 2 / stats.count;
        const ex = p.x + Math.cos(a) * stats.area,
          ey = p.y + Math.sin(a) * stats.area;
        for (const e of near(grid, ex, ey, 40, scratch)) {
          if ((e.x - ex) ** 2 + (e.y - ey) ** 2 > (e.radius + 14) ** 2) continue;
          if ((e.rehit.get('orbit') ?? 0) > g.t) continue;
          e.rehit.set('orbit', g.t + stats.cooldown);
          hurtEnemy(g, e, stats.damage);
        }
      }
      continue;
    }
    w.timer -= dt;
    if (w.timer > 0) continue;
    w.timer += stats.cooldown * cooldownMultiplier(g);
    if (w.id === 'darts') {
      const targets = nearestEnemies(g, stats.count);
      targets.forEach((t, k) => {
        const a = Math.atan2(t.y - p.y, t.x - p.x) + (k - (targets.length - 1) / 2) * 0.08;
        g.projectiles.push({
          kind: 'dart',
          x: p.x,
          y: p.y,
          vx: Math.cos(a) * 430,
          vy: Math.sin(a) * 430,
          damage: stats.damage,
          pierce: stats.pierce,
          life: 1.3,
          radius: 7,
          hit: new Set()
        });
      });
    } else if (w.id === 'planes') {
      for (let k = 0; k < stats.count; k++) {
        const a = g.rand() * Math.PI * 2;
        g.projectiles.push({
          kind: 'plane',
          x: p.x,
          y: p.y,
          vx: Math.cos(a) * 290,
          vy: Math.sin(a) * 290,
          damage: stats.damage,
          pierce: stats.pierce,
          life: 1.9,
          radius: 11,
          hit: new Set()
        });
      }
    } else if (w.id === 'splash') {
      for (const e of near(grid, p.x, p.y, stats.area, scratch)) {
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= (stats.area + e.radius) ** 2) hurtEnemy(g, e, stats.damage);
      }
      g.effects.push({
        kind: 'splash',
        x: p.x,
        y: p.y,
        radius: stats.area,
        angle: 0,
        life: 0.35,
        maxLife: 0.35,
        damage: 0,
        id: ''
      });
      g.events.push('splash');
    } else if (w.id === 'ruler') {
      const facing = Math.atan2(p.faceY, p.faceX);
      for (let side = 0; side < stats.count; side++) {
        const a = facing + side * Math.PI;
        for (const e of near(grid, p.x, p.y, stats.area, scratch)) {
          const dx = e.x - p.x,
            dy = e.y - p.y;
          if (dx * dx + dy * dy > (stats.area + e.radius) ** 2) continue;
          let diff = Math.atan2(dy, dx) - a;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          if (Math.abs(diff) <= Math.PI / 3) hurtEnemy(g, e, stats.damage);
        }
        g.effects.push({
          kind: 'ruler',
          x: p.x,
          y: p.y,
          radius: stats.area,
          angle: a,
          life: 0.2,
          maxLife: 0.2,
          damage: 0,
          id: ''
        });
      }
      g.events.push('swipe');
    } else if (w.id === 'ink') {
      for (let k = 0; k < stats.count; k++) {
        const a = g.rand() * Math.PI * 2,
          d = 40 + g.rand() * 140;
        g.effects.push({
          kind: 'puddle',
          x: p.x + Math.cos(a) * d,
          y: p.y + Math.sin(a) * d,
          radius: stats.area,
          angle: 0,
          life: 3,
          maxLife: 3,
          damage: stats.damage,
          id: `ink${++g.uid}`
        });
      }
    }
  }
}
function updateEffects(g, dt, grid) {
  const scratch = [];
  for (const fx of g.effects) {
    fx.life -= dt;
    if (fx.kind !== 'puddle') continue;
    for (const e of near(grid, fx.x, fx.y, fx.radius, scratch)) {
      if ((e.x - fx.x) ** 2 + (e.y - fx.y) ** 2 > (fx.radius + e.radius * 0.5) ** 2) continue;
      if ((e.rehit.get(fx.id) ?? 0) > g.t) continue;
      e.rehit.set(fx.id, g.t + 0.5);
      hurtEnemy(g, e, fx.damage);
    }
  }
  g.effects = g.effects.filter(fx => fx.life > 0);
}
function updateProjectiles(g, dt, grid) {
  const scratch = [];
  for (const pr of g.projectiles) {
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.life -= dt;
    for (const e of near(grid, pr.x, pr.y, pr.radius + 50, scratch)) {
      if (pr.pierce <= 0) break;
      if (pr.hit.has(e.uid) || e.hp <= 0) continue;
      if ((e.x - pr.x) ** 2 + (e.y - pr.y) ** 2 > (e.radius + pr.radius) ** 2) continue;
      pr.hit.add(e.uid);
      pr.pierce--;
      hurtEnemy(g, e, pr.damage);
    }
  }
  g.projectiles = g.projectiles.filter(pr => pr.life > 0 && pr.pierce > 0);
}
function updateEnemies(g, dt, grid) {
  const p = g.player;
  const scratch = [];
  for (const e of g.enemies) {
    e.flash = Math.max(0, e.flash - dt);
    let dx = p.x - e.x,
      dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d;
    dy /= d;
    if (e.def.id === 'bat') {
      // Bats flutter: a sideways wobble on top of the chase.
      const wob = Math.sin(g.t * 6 + e.phase) * 0.8;
      const sx = -dy * wob,
        sy = dx * wob;
      dx += sx;
      dy += sy;
    }
    // Keep a little apart from neighbours so crowds spread out.
    let px = 0,
      py = 0;
    for (const o of near(grid, e.x, e.y, e.radius * 2, scratch)) {
      if (o === e) continue;
      const ox = e.x - o.x,
        oy = e.y - o.y;
      const od = Math.hypot(ox, oy);
      const min = e.radius + o.radius;
      if (od > 0 && od < min) {
        px += ox / od * (min - od);
        py += oy / od * (min - od);
      }
    }
    e.x += dx * e.speed * dt + px * 0.3;
    e.y += dy * e.speed * dt + py * 0.3;

    // Contact: the hero takes a knock, then a short moment of safety.
    if (d < e.radius + BASE.radius && p.invulnerable <= 0) {
      p.hp -= e.damage;
      p.invulnerable = BASE.invulnerable;
      g.events.push('hurt');
    }
    // Stragglers left far behind are moved back into the fight.
    if (d > SPAWN_RING * 1.6 && e.def.id !== 'eraser') {
      const a = g.rand() * Math.PI * 2;
      e.x = p.x + Math.cos(a) * SPAWN_RING;
      e.y = p.y + Math.sin(a) * SPAWN_RING;
    }
  }
  const alive = [];
  for (const e of g.enemies) {
    if (e.hp > 0) {
      alive.push(e);
      continue;
    }
    g.kills++;
    g.events.push('kill');
    if (e.def.id === 'eraser') {
      g.bossDefeated = true;
      for (let k = 0; k < 12; k++) g.coins.push({
        x: e.x + (g.rand() - 0.5) * 80,
        y: e.y + (g.rand() - 0.5) * 80,
        value: 5,
        pulled: false
      });
      continue;
    }
    g.gems.push({
      x: e.x,
      y: e.y,
      value: e.xp * xpMultiplier(g),
      pulled: false
    });
    if (e.elite) {
      g.pendingLevels++; // an elite drops a free level-up
      for (let k = 0; k < 4; k++) g.coins.push({
        x: e.x + (g.rand() - 0.5) * 40,
        y: e.y + (g.rand() - 0.5) * 40,
        value: 1,
        pulled: false
      });
    } else if (g.rand() < 0.03) {
      g.coins.push({
        x: e.x,
        y: e.y,
        value: 1,
        pulled: false
      });
    }
  }
  g.enemies = alive;
}
function updatePickups(g, dt) {
  const p = g.player;
  const range = pickupRange(g);
  const collect = (list, onTake) => {
    const keep = [];
    for (const it of list) {
      const dx = p.x - it.x,
        dy = p.y - it.y;
      const d = Math.hypot(dx, dy);
      if (d < range) it.pulled = true;
      if (it.pulled) {
        const pull = Math.min(d, 520 * dt);
        it.x += dx / (d || 1) * pull;
        it.y += dy / (d || 1) * pull;
      }
      if (d < BASE.radius + 6) onTake(it);else keep.push(it);
    }
    return keep;
  };
  g.gems = collect(g.gems, gem => {
    g.xp += gem.value;
    g.events.push('gem');
  });
  g.coins = collect(g.coins, c => {
    g.coinsPicked += c.value;
    g.events.push('coin');
  });
  // Too many gems lying around: merge the farthest into one big gem.
  if (g.gems.length > 300) {
    g.gems.sort((a, b) => (b.x - p.x) ** 2 + (b.y - p.y) ** 2 - ((a.x - p.x) ** 2 + (a.y - p.y) ** 2));
    const merged = g.gems.splice(0, 100);
    g.gems.push({
      x: merged[0].x,
      y: merged[0].y,
      value: merged.reduce((s, x) => s + x.value, 0),
      pulled: false
    });
  }
  while (g.xp >= g.xpNeed) {
    g.xp -= g.xpNeed;
    g.level++;
    g.xpNeed = xpToNext(g.level);
    g.pendingLevels++;
  }
}

/* ---------- level-up cards ---------- */

export function cardPool(g) {
  const pool = [];
  for (const w of g.weapons) if (w.level < MAX_LEVEL) pool.push({
    kind: 'weapon',
    id: w.id,
    level: w.level + 1
  });
  if (g.weapons.length < MAX_WEAPONS) {
    for (const id of Object.keys(WEAPONS)) {
      if (!g.weapons.some(w => w.id === id)) pool.push({
        kind: 'weapon',
        id,
        level: 1
      });
    }
  }
  for (const p of g.passives) if (p.level < MAX_LEVEL) pool.push({
    kind: 'passive',
    id: p.id,
    level: p.level + 1
  });
  if (g.passives.length < MAX_PASSIVES) {
    for (const id of Object.keys(PASSIVES)) {
      if (!g.passives.some(p => p.id === id)) pool.push({
        kind: 'passive',
        id,
        level: 1
      });
    }
  }
  return pool;
}
function dealCards(g) {
  const pool = cardPool(g);
  const hand = [];
  while (hand.length < 3 && pool.length) hand.push(pool.splice(Math.floor(g.rand() * pool.length), 1)[0]);
  if (!hand.length) hand.push({
    kind: 'snack'
  }, {
    kind: 'pocket-money'
  });
  g.cards = hand;
}
export function chooseCard(g, index) {
  if (g.status !== 'levelup') return;
  const card = g.cards[index];
  if (!card) return;
  if (card.kind === 'weapon') {
    const owned = g.weapons.find(w => w.id === card.id);
    if (owned) owned.level = card.level;else g.weapons.push({
      id: card.id,
      level: 1,
      timer: 0.2
    });
  } else if (card.kind === 'passive') {
    const owned = g.passives.find(p => p.id === card.id);
    if (owned) owned.level = card.level;else g.passives.push({
      id: card.id,
      level: 1
    });
    if (card.id === 'hardcover') {
      g.player.maxHp += 20;
      g.player.hp += 20;
    }
  } else if (card.kind === 'snack') {
    g.player.hp = Math.min(g.player.maxHp, g.player.hp + 30);
  } else {
    g.coinsPicked += 10;
  }
  finishLevelUp(g);
}
export function reroll(g) {
  if (g.status !== 'levelup' || g.rerolls <= 0) return;
  g.rerolls--;
  dealCards(g);
}

/** Skipping a card is worth a few coins. */
export function skip(g) {
  if (g.status !== 'levelup') return;
  g.coinsPicked += 3;
  finishLevelUp(g);
}
function finishLevelUp(g) {
  g.pendingLevels--;
  if (g.pendingLevels > 0) dealCards(g);else {
    g.status = 'playing';
    g.cards = [];
  }
}

/* ---------- the step ---------- */

/** Advances one fixed step. `move` is the stick direction, length ≤ 1. */
export function step(g, move, dt = STEP) {
  if (g.status !== 'playing') return;
  const p = g.player;
  g.t += dt;
  const len = Math.hypot(move.x, move.y);
  if (len > 0.05) {
    const s = Math.min(1, len);
    p.x += move.x / len * s * moveSpeed(g) * dt;
    p.y += move.y / len * s * moveSpeed(g) * dt;
    p.faceX = move.x / len;
    p.faceY = move.y / len;
  }
  p.invulnerable = Math.max(0, p.invulnerable - dt);
  p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
  spawning(g, dt);
  const grid = buildGrid(g.enemies);
  useWeapons(g, dt, grid);
  updateProjectiles(g, dt, grid);
  updateEffects(g, dt, grid);
  updateEnemies(g, dt, grid);
  updatePickups(g, dt);
  for (const f of g.floaters) {
    f.life -= dt;
    f.y -= 30 * dt;
  }
  g.floaters = g.floaters.filter(f => f.life > 0);
  if (p.hp <= 0) {
    p.hp = 0;
    g.status = 'dead';
    g.events.push('dead');
    return;
  }
  if (g.t >= RUN_SECONDS) {
    g.status = 'won';
    g.events.push('win');
    return;
  }
  if (g.pendingLevels > 0) {
    g.status = 'levelup';
    dealCards(g);
    g.events.push('levelup');
  }
}
export function grade(g) {
  if (g.status === 'won') return 'S';
  if (g.t >= 420) return 'A';
  if (g.t >= 240) return 'B';
  return 'C';
}
