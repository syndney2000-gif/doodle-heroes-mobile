import { parse as parseSpans, connected } from './bridges/model';
import { solution as spansAnswer } from './bridges/solver';
import { parse as parseNet, rotate, isSolved as netSolved } from './net/model';
import { solution as netAnswer } from './net/solver';
import { drawings } from './doodle-guess/drawings';
import { dailyDrawing, guess, over, starsFor as guessStars } from './doodle-guess/game';
import { chains, BOARD_H, BOARD_W } from './merge/data';
import { emptyProfile, validProfile, validSnapshot } from './survivor/snapshot';

export function emptyGames() {
  return { bridges: { active: null, sessions: {} }, net: { active: null, sessions: {} }, guess: { active: null, days: {} }, merge: null, siege: { profile: emptyProfile(), run: null, result: null } };
}
export function newLogicSession(kind, puzzle) {
  const board = kind === 'bridges' ? parseSpans(puzzle.rows) : parseNet(puzzle);
  return { puzzle, values: Array(kind === 'bridges' ? board.spans.length : board.tiles.length).fill(0), locks: [], history: [], hints: 0, seconds: 0, completedAt: null };
}
export function logicSolved(kind, session) {
  if (kind === 'net') {
    const b = parseNet(session.puzzle);
    return netSolved(b, b.tiles.map((tile, i) => rotate(tile, session.values[i])));
  }
  const b = parseSpans(session.puzzle.rows), counts = session.values;
  return b.islands.every(i => b.spansOf[i.id].reduce((sum, sid) => sum + counts[sid], 0) === i.n) &&
    b.spans.every(s => !counts[s.id] || s.crosses.every(id => !counts[id])) && connected(b, counts);
}
export function editLogic(kind, session, values, locks = session.locks, now = new Date().toISOString()) {
  if (session.completedAt || (JSON.stringify(values) === JSON.stringify(session.values) && JSON.stringify(locks) === JSON.stringify(session.locks))) return session;
  const next = { ...session, values, locks, history: [...session.history.slice(-79), { values: session.values, locks: session.locks }] };
  return { ...next, completedAt: logicSolved(kind, next) ? now : null };
}
export function undoLogic(session) {
  if (session.completedAt || !session.history.length) return session;
  return { ...session, ...session.history[session.history.length - 1], history: session.history.slice(0, -1) };
}
export function cycleBridge(session, spanId) {
  if (session.completedAt) return { session, message: '' };
  const b = parseSpans(session.puzzle.rows), span = b.spans[spanId];
  if (!span) return { session, message: 'Choose two islands in a straight line with no island between them.' };
  const limit = Math.min(2, b.islands[span.a].n, b.islands[span.b].n);
  const values = session.values.slice(); values[spanId] = (values[spanId] + 1) % (limit + 1);
  if (values[spanId] && span.crosses.some(id => values[id])) return { session, message: 'These bridges would cross. Remove the crossing bridge first.' };
  return { session: editLogic('bridges', session, values), message: values[spanId] ? `${values[spanId]} bridge${values[spanId] === 1 ? '' : 's'} built.` : 'Bridge removed.' };
}
export function turnWire(session, tile, lock = false) {
  if (session.completedAt) return session;
  if (lock) return editLogic('net', session, session.values, session.locks.includes(tile) ? session.locks.filter(i => i !== tile) : [...session.locks, tile]);
  if (session.locks.includes(tile)) return session;
  const values = session.values.slice(); values[tile]++;
  return editLogic('net', session, values);
}
export function logicHint(kind, session) {
  if (session.completedAt) return { session, message: 'Already complete.' };
  const b = kind === 'bridges' ? parseSpans(session.puzzle.rows) : parseNet(session.puzzle);
  const answer = kind === 'bridges' ? spansAnswer(b) : netAnswer(b);
  if (!answer) return { session, message: 'No deduction is available for this puzzle.' };
  if (kind === 'bridges') {
    if (session.values.some((v, i) => v > answer[i])) return { session, message: 'Some bridges conflict with the clues. Undo a bridge you are unsure about first.' };
    const i = answer.findIndex((v, k) => v !== session.values[k]);
    if (i < 0) return { session, message: 'Every bridge is in place.' };
    const values = session.values.slice(); values[i] = answer[i];
    return { session: { ...editLogic(kind, session, values), hints: session.hints + 1 }, target: i,
      message: `The deduction solver fixes this crossing at ${answer[i]} bridge${answer[i] === 1 ? '' : 's'}. Follow the highlighted connection.` };
  }
  const masks = b.tiles.map((tile, i) => rotate(tile, session.values[i]));
  if (session.locks.some(i => masks[i] !== answer[i])) return { session, message: 'A locked tile conflicts with the network. Unlock a tile you are unsure about first.' };
  const i = masks.findIndex((mask, k) => mask !== answer[k]);
  if (i < 0) return { session, message: 'The network is complete.' };
  const values = session.values.slice();
  while (rotate(b.tiles[i], values[i]) !== answer[i]) values[i]++;
  return { session: { ...editLogic(kind, session, values, [...session.locks, i]), hints: session.hints + 1 }, target: i,
    message: `The solver fixes row ${Math.floor(i / b.w) + 1}, column ${i % b.w + 1}. This tile is now oriented and locked.` };
}
export function newGuess(date) { return { drawingId: dailyDrawing(date).id, guesses: [], solved: false, completedAt: null }; }
export function guessRound(day) { return { drawing: drawings.find(d => d.id === day.drawingId), guesses: day.guesses.slice(), solved: day.solved }; }
export function submitGuess(day, word, now = new Date().toISOString()) {
  const round = guessRound(day);
  if (!guess(round, word)) return day;
  return { ...day, guesses: round.guesses, solved: round.solved, completedAt: over(round) ? now : null };
}
export function gameRecords(games) {
  const records = [];
  for (const kind of ['bridges', 'net']) for (const s of Object.values(games[kind].sessions)) {
    if (s.completedAt) records.push({ id: `${kind}:${s.puzzle.id}`, game: kind === 'bridges' ? 'Isle Spans' : 'Lighthouse Wiring', title: s.puzzle.title, date: s.completedAt, stars: Math.max(1, 3 - s.hints) });
  }
  for (const [date, day] of Object.entries(games.guess.days)) if (day.completedAt && day.solved) records.push({ id: `guess:${date}`, game: 'Doodle Guess', title: `Daily doodle · ${date}`, date: day.completedAt, stars: guessStars(guessRound(day)) });
  for (const result of games.siege.profile.recentRuns || []) records.push({ id: `siege:${result.id}`, game: 'Scribble Siege', title: `${result.won ? 'Survived' : 'A brave run'} · ${Math.floor(result.seconds)}s`, date: result.date, stars: result.won ? 3 : result.seconds >= 240 ? 2 : 1 });
  return records;
}
const object = x => x && typeof x === 'object' && !Array.isArray(x);
const integer = (x, min = 0) => Number.isSafeInteger(x) && x >= min;
const finite = x => Number.isFinite(x) && x >= 0;
const dateKey = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && Number.isFinite(Date.parse(`${x}T12:00:00Z`));
const completed = x => x === null || (typeof x === 'string' && Number.isFinite(Date.parse(x)));
export function decodeGames(raw) {
  if (raw === undefined) return emptyGames(); // migrate Island Sketch-only saves
  if (!object(raw)) throw Error('Invalid collection save.');
  const data = emptyGames();
  for (const kind of ['bridges', 'net']) {
    const group = raw[kind];
    if (!object(group) || !object(group.sessions)) throw Error(`Invalid ${kind} save.`);
    for (const [id, s] of Object.entries(group.sessions)) {
      const p = s?.puzzle;
      if (!object(p) || p.id !== id || !/^[a-z0-9-]+$/.test(id) || typeof p.title !== 'string' || typeof p.note !== 'string' || !Array.isArray(p.rows) || p.rows.length < 3 || p.rows.length > 15 || !p.rows.every(row => typeof row === 'string' && row.length === p.rows[0].length && (kind === 'bridges' ? /^[.1-8]+$/ : /^[1-9a-f]+$/).test(row)) || p.rows[0].length > 15) throw Error('Invalid saved map.');
      if (kind === 'net' && (!Array.isArray(p.source) || p.source.length !== 2 || !p.source.every((v, i) => integer(v) && v < (i ? p.rows[0].length : p.rows.length)))) throw Error('Invalid lighthouse.');
      const b = kind === 'bridges' ? parseSpans(p.rows) : parseNet(p);
      const n = kind === 'bridges' ? b.spans.length : b.tiles.length;
      if (kind === 'bridges' && !b.islands.length) throw Error('Empty bridge map.');
      const values = v => Array.isArray(v) && v.length === n && v.every(x => integer(x) && x <= (kind === 'bridges' ? 2 : 1000000));
      const locks = v => Array.isArray(v) && v.every(x => integer(x) && x < n);
      if (!values(s.values) || !locks(s.locks) || !integer(s.hints) || !integer(s.seconds) || !completed(s.completedAt) || !Array.isArray(s.history) || s.history.some(h => !values(h.values) || !locks(h.locks))) throw Error('Invalid saved board.');
      data[kind].sessions[id] = { ...s, history: s.history.slice(-80), completedAt: s.completedAt && logicSolved(kind, s) ? s.completedAt : null };
    }
    data[kind].active = typeof group.active === 'string' && Object.prototype.hasOwnProperty.call(data[kind].sessions, group.active) ? group.active : null;
  }
  if (!object(raw.guess) || !object(raw.guess.days)) throw Error('Invalid daily doodle.');
  for (const [key, day] of Object.entries(raw.guess.days)) {
    if (!dateKey(key) || day?.drawingId !== dailyDrawing(key).id || !Array.isArray(day.guesses) || day.guesses.length > 6 || !day.guesses.every(g => typeof g === 'string') || !completed(day.completedAt)) throw Error('Invalid guesses.');
    let replay = newGuess(key);
    for (const word of day.guesses) replay = submitGuess(replay, word, day.completedAt || new Date().toISOString());
    data.guess.days[key] = { ...replay, completedAt: over(guessRound(replay)) ? replay.completedAt : null };
  }
  data.guess.active = dateKey(raw.guess.active) && data.guess.days[raw.guess.active] ? raw.guess.active : null;
  const m = raw.merge;
  const item = x => x === null || (object(x) && chains[x.chain] && integer(x.tier, 1) && x.tier <= 8);
  if (m !== null && (!object(m) || !Array.isArray(m.cells) || m.cells.length !== BOARD_W * BOARD_H || !m.cells.every(item) || !['ink', 'coins', 'xp', 'seed', 'merges', 'delivered', 'nextOrderId'].every(k => integer(m[k])) || !integer(m.level, 1) || !finite(m.inkAt) || !Array.isArray(m.discovered) || !m.discovered.every(x => typeof x === 'string' && /^(heroes|paper|tools|creatures):[1-8]$/.test(x)) || !Array.isArray(m.orders) || m.orders.length !== 3 || !m.orders.every(o => integer(o.id) && integer(o.coins) && integer(o.xp) && Array.isArray(o.wants) && o.wants.length > 0 && o.wants.every(w => w && item(w))))) throw Error('Invalid merge save.');
  data.merge = m;
  if (!object(raw.siege) || !validProfile(raw.siege.profile) || (raw.siege.run !== null && !validSnapshot(raw.siege.run))) throw Error('Invalid siege save.');
  data.siege = raw.siege;
  return data;
}
