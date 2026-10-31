import { describe, expect, test } from 'vitest';
import { cardPool, chooseCard, grade, newGame, reroll, runCoins, step, type Game } from '../src/core/survivor/engine';
import { MAX_LEVEL, MAX_PASSIVES, MAX_WEAPONS, RUN_SECONDS, heroes, upgrades, waves, xpToNext } from '../src/core/survivor/data';

const pip = heroes[0];
const start = (seed = 1, meta = {}) => newGame({ hero: pip, weapon: pip.weapon, meta, seed });

/** A simple bot: walks away from the crowd's centre, picks the first card. */
function kite(g: Game) {
  if (!g.enemies.length) return { x: 0, y: 0 };
  let cx = 0, cy = 0, n = 0;
  for (const e of g.enemies) {
    const d = Math.hypot(e.x - g.player.x, e.y - g.player.y);
    if (d < 260) { cx += e.x; cy += e.y; n++; }
  }
  if (!n) return { x: Math.cos(g.t * 0.3), y: Math.sin(g.t * 0.3) };
  return { x: g.player.x - cx / n, y: g.player.y - cy / n };
}

function play(g: Game, mover: (g: Game) => { x: number; y: number }, seconds = RUN_SECONDS) {
  while (g.t < seconds && (g.status === 'playing' || g.status === 'levelup')) {
    if (g.status === 'levelup') chooseCard(g, 0);
    else step(g, mover(g));
  }
  return g;
}

describe('setup', () => {
  test('permanent upgrades feed the starting stats', () => {
    const plain = start();
    const strong = start(1, { toughness: 2, swiftness: 1, rerolls: 2 });
    expect(strong.player.maxHp).toBe(plain.player.maxHp + 20);
    expect(strong.player.speed).toBeGreaterThan(plain.player.speed);
    expect(strong.rerolls).toBe(plain.rerolls + 2);
  });

  test('experience needed rises every level', () => {
    for (let l = 1; l < 60; l++) expect(xpToNext(l + 1)).toBeGreaterThan(xpToNext(l));
  });

  test('waves are in time order and get busier', () => {
    for (let k = 1; k < waves.length; k++) {
      expect(waves[k].from).toBeGreaterThan(waves[k - 1].from);
      expect(waves[k].perSecond).toBeGreaterThan(waves[k - 1].perSecond);
    }
  });

  test('upgrade costs rise with each level bought', () => {
    for (const u of upgrades) for (let k = 1; k < u.max; k++) expect(u.cost(k)).toBeGreaterThan(u.cost(k - 1));
  });
});

describe('rules', () => {
  test('same seed and same moves give the same run', () => {
    const a = play(start(7), kite, 90);
    const b = play(start(7), kite, 90);
    expect(a.kills).toBe(b.kills);
    expect(a.player.x).toBe(b.player.x);
    expect(a.level).toBe(b.level);
  });

  test('cards never offer a maxed item or a fifth weapon or passive', () => {
    const g = play(start(3), kite, 300);
    for (const c of cardPool(g)) {
      if (c.kind === 'weapon') expect(c.level).toBeLessThanOrEqual(MAX_LEVEL);
      if (c.kind === 'passive') expect(c.level).toBeLessThanOrEqual(MAX_LEVEL);
    }
    expect(g.weapons.length).toBeLessThanOrEqual(MAX_WEAPONS);
    expect(g.passives.length).toBeLessThanOrEqual(MAX_PASSIVES);
  });

  test('rerolls are limited', () => {
    const g = start(5);
    while (g.status !== 'levelup') step(g, kite(g));
    const before = g.rerolls;
    reroll(g);
    expect(g.rerolls).toBe(before - 1);
    for (let k = 0; k < 5; k++) reroll(g);
    expect(g.rerolls).toBe(0);
  });

  test('standing still loses well before the ten minutes are up', () => {
    const g = play(start(11), () => ({ x: 0, y: 0 }));
    expect(g.status).toBe('dead');
    expect(g.t).toBeLessThan(RUN_SECONDS * 0.6);
    expect(grade(g)).not.toBe('S');
  });

  test('moving away from the crowd survives much longer than standing still', () => {
    const still = play(start(11), () => ({ x: 0, y: 0 }));
    const kiter = play(start(11), kite);
    expect(kiter.t).toBeGreaterThan(still.t * 1.5);
    expect(runCoins(kiter)).toBeGreaterThan(runCoins(still));
  });
});
