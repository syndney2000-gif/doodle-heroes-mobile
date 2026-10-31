import { statefulRandom } from '../lib/randomState';
import { heroes, upgrades, weapons, enemies, passives } from './data';

export const emptyProfile = () => ({ coins: 0, upgrades: {}, totalKills: 0, runs: 0, wins: 0, bestTime: {}, daily: {}, recentRuns: [], bankedIds: [], custom: null, jarSince: null });
export function unlocked(profile, hero) {
  if (hero.unlock.kind === 'free') return true;
  if (hero.unlock.kind === 'survive') return Object.values(profile.bestTime).some(t => t >= hero.unlock.seconds);
  if (hero.unlock.kind === 'kills') return profile.totalKills >= hero.unlock.total;
  return profile.wins > 0;
}
export function unlockText(hero) {
  const u = hero.unlock;
  return u.kind === 'survive' ? `Survive ${u.seconds / 60} minutes` : u.kind === 'kills' ? `Defeat ${u.total} scribbles` : u.kind === 'win' ? 'Survive a full siege' : 'Ready to play';
}
export function purchase(profile, id) {
  const def = upgrades.find(x => x.id === id), owned = profile.upgrades[id] || 0;
  if (!def || owned >= def.max || profile.coins < def.cost(owned)) return profile;
  return { ...profile, coins: profile.coins - def.cost(owned), upgrades: { ...profile.upgrades, [id]: owned + 1 } };
}
export function snapshotGame(game, id, daily = null) {
  return { id, daily, rngState: game.rand.state, game: JSON.parse(JSON.stringify(game, (_, value) => value instanceof Map ? { nativeMap: [...value] } : value instanceof Set ? { nativeSet: [...value] } : value)) };
}
export function restoreGame(snapshot) {
  if (!validSnapshot(snapshot)) throw Error('The saved siege is damaged.');
  const game = JSON.parse(JSON.stringify(snapshot.game), (_, value) => value?.nativeMap ? new Map(value.nativeMap) : value?.nativeSet ? new Set(value.nativeSet) : value);
  game.rand = statefulRandom(snapshot.rngState);
  return game;
}
export function bankRun(profile, result) {
  if (profile.bankedIds.includes(result.id)) return profile;
  const daily = { ...profile.daily };
  if (result.daily && (!daily[result.daily] || result.seconds > daily[result.daily].seconds || (result.seconds === daily[result.daily].seconds && result.kills > daily[result.daily].kills))) daily[result.daily] = { seconds: result.seconds, kills: result.kills };
  return { ...profile, coins: profile.coins + result.coins, totalKills: profile.totalKills + result.kills, runs: profile.runs + 1, wins: profile.wins + Number(result.won), bestTime: { ...profile.bestTime, [result.hero]: Math.max(profile.bestTime[result.hero] || 0, result.seconds) }, daily,
    bankedIds: [...profile.bankedIds, result.id].slice(-200), recentRuns: [result, ...profile.recentRuns].slice(0, 30) };
}
const number = value => Number.isFinite(value) && value >= 0;
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const points = lines => Array.isArray(lines) && lines.length <= 100 && lines.every(line => Array.isArray(line) && line.length <= 1000 && line.every(p => Array.isArray(p) && p.length === 2 && p.every(n => Number.isFinite(n) && n >= 0 && n <= 100)));
export function validProfile(p) {
  return object(p) && (p.jarSince === null || number(p.jarSince)) && ['coins', 'totalKills', 'runs', 'wins'].every(k => number(p[k])) && object(p.upgrades) && Object.entries(p.upgrades).every(([id, n]) => upgrades.some(u => u.id === id && Number.isInteger(n) && n >= 0 && n <= u.max)) && object(p.bestTime) && Object.values(p.bestTime).every(number) && object(p.daily) && Object.values(p.daily).every(v => object(v) && number(v.seconds) && number(v.kills)) && Array.isArray(p.bankedIds) && p.bankedIds.every(x => typeof x === 'string') && Array.isArray(p.recentRuns) && p.recentRuns.every(r => object(r) && typeof r.id === 'string' && number(r.seconds) && number(r.kills) && number(r.coins) && typeof r.date === 'string' && typeof r.won === 'boolean') && (p.custom === null || (object(p.custom) && typeof p.custom.name === 'string' && weapons[p.custom.weapon] && points(p.custom.lines)));
}
export function validSnapshot(s) {
  const g = s?.game;
  const fields = (item, keys, positive = true) => object(item) && keys.every(k => positive ? number(item[k]) : Number.isFinite(item[k]));
  const levels = list => list.every(p => object(p) && Number.isInteger(p.level) && p.level >= 1 && p.level <= 5);
  const meta = m => object(m) && Object.entries(m).every(([id, n]) => upgrades.some(u => u.id === id && Number.isInteger(n) && n >= 0 && n <= u.max));
  if (!object(s) || typeof s.id !== 'string' || !Number.isInteger(s.rngState) || s.rngState < 0 || s.rngState > 0xffffffff || !object(g) || !number(g.t) || !['playing', 'levelup', 'dead', 'won'].includes(g.status) || !fields(g.player, ['x','y','faceX','faceY'], false) || !fields(g.player, ['hp','maxHp','speed','pickup','invulnerable','regen']) || !object(g.config) || !weapons[g.config.weapon] || !g.config.hero || !['pip','ed','mo','rae','custom'].includes(g.config.hero.id) || !number(g.config.hero.health) || !number(g.config.hero.speed) || typeof g.config.hero.colour !== 'string' || !meta(g.config.meta)) return false;
  if (g.config.twist && !fields(g.config.twist, ['enemySpeed','enemyHealth','xp','playerHealth','spawn'])) return false;
  if (!['level','xp','xpNeed','kills','coinsPicked','pendingLevels','rerolls','spawnBudget','nextElite','uid'].every(k => number(g[k]))) return false;
  if (!['enemies','projectiles','effects','gems','coins','floaters','weapons','passives','cards','events'].every(k => Array.isArray(g[k]))) return false;
  if (!g.weapons.length || g.weapons.length > 4 || g.passives.length > 4 || !levels(g.weapons) || !levels(g.passives) || !g.weapons.every(w => weapons[w.id] && Number.isFinite(w.timer)) || !g.passives.every(p => passives[p.id])) return false;
  if (!g.cards.every(c => c && (c.kind === 'weapon' ? weapons[c.id] && levels([c]) : c.kind === 'passive' ? passives[c.id] && levels([c]) : ['snack','pocket-money'].includes(c.kind)))) return false;
  if (g.enemies.length > 362 || !g.enemies.every(e => fields(e, ['uid','maxHp','speed','damage','radius','xp','flash']) && fields(e, ['hp','x','y','phase'], false) && enemies[e.def?.id] && typeof e.elite === 'boolean' && Array.isArray(e.rehit?.nativeMap) && e.rehit.nativeMap.every(pair => Array.isArray(pair) && pair.length === 2 && typeof pair[0] === 'string' && number(pair[1])))) return false;
  if (!g.projectiles.every(p => fields(p, ['x','y','vx','vy'], false) && fields(p, ['damage','pierce','life','radius']) && ['dart','plane'].includes(p.kind) && Array.isArray(p.hit?.nativeSet) && p.hit.nativeSet.every(number))) return false;
  if (!g.effects.every(f => fields(f, ['x','y','angle'], false) && fields(f, ['radius','life','maxLife','damage']) && ['splash','ruler','puddle'].includes(f.kind) && typeof f.id === 'string')) return false;
  if (![...g.gems, ...g.coins].every(p => fields(p, ['x','y'], false) && number(p.value) && typeof p.pulled === 'boolean')) return false;
  if (!g.floaters.every(f => fields(f, ['x','y'], false) && number(f.life) && typeof f.text === 'string')) return false;
  return true;
}

export function jarRate(profile) {
  return 4 + 3 * heroes.filter(hero => unlocked(profile, hero)).length + 2 * (profile.upgrades.greed || 0) + Math.min(10, profile.wins * 2);
}
export function jarCoins(profile, now = Date.now()) {
  return profile.jarSince === null ? 0 : Math.floor(Math.min(12, Math.max(0, (now - profile.jarSince) / 3600000)) * jarRate(profile));
}
export function collectJar(profile, now = Date.now()) {
  const coins = jarCoins(profile, now);
  if (profile.jarSince !== null && !coins && now >= profile.jarSince) return profile;
  return { ...profile, coins: profile.coins + coins, jarSince: now };
}
