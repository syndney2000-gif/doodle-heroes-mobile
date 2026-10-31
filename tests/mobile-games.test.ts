import { describe, expect, it } from 'vitest';
import { allPuzzles as bridges } from '../src/core/bridges/puzzles';
import { allPuzzles as networks } from '../src/core/net/puzzles';
import { parse as bridgeBoard, connected } from '../src/core/bridges/model';
import { solution as bridgeSolution } from '../src/core/bridges/solver';
import { parse as netBoard, rotate } from '../src/core/net/model';
import { solution as netSolution } from '../src/core/net/solver';
import { dailyDrawing } from '../src/core/doodle-guess/game';
import { newState, draw } from '../src/core/merge/engine';
import { heroes, upgrades } from '../src/core/survivor/data';
import { chooseCard, newGame, step } from '../src/core/survivor/engine';
import { mulberry32 } from '../src/core/lib/rng';
import { statefulRandom } from '../src/core/lib/randomState';
import { bankRun, collectJar, emptyProfile, jarCoins, purchase, restoreGame, snapshotGame, validSnapshot } from '../src/core/survivor/snapshot';
import { cycleBridge, decodeGames, editLogic, emptyGames, gameRecords, guessRound, logicHint, logicSolved, newGuess, newLogicSession, submitGuess, turnWire, undoLogic } from '../src/core/mobileGames';
import { decodeProgress, emptyProgress } from '../src/core/session';
const clone = x => JSON.parse(JSON.stringify(x));
const game = () => newGame({ hero: heroes[0], weapon: 'darts', seed: 1234, meta: {} });
function play(g, ticks = 1200) {
  for (let i = 0; i < ticks; i++) {
    if (g.status === 'levelup') chooseCard(g, 0);
    else if (g.status === 'playing') step(g, { x: Math.cos(g.t), y: Math.sin(g.t) });
    g.events.length = 0;
  }
}

describe('native bridge and wiring actions', () => {
  it('cycles low-number islands without trapping a single bridge', () => {
    const s = newLogicSession('bridges', bridges[0]);
    const b = bridgeBoard(s.puzzle.rows), id = b.spans.findIndex(span => b.islands[span.a].n === 1 || b.islands[span.b].n === 1);
    const built = cycleBridge(s, id).session;
    expect(built.values[id]).toBe(1);
    expect(cycleBridge(built, id).session.values[id]).toBe(0);
    expect(undoLogic(built).values).toEqual(s.values);
  });
  it('blocks crossing bridges and preserves the previous state', () => {
    const puzzle = { id: 'cross', title: 'Cross', note: '', rows: ['..2..','.....','2...2','.....','..2..'] };
    const s = newLogicSession('bridges', puzzle), b = bridgeBoard(puzzle.rows);
    const crossing = b.spans.find(span => span.crosses.length)!;
    const built = cycleBridge(s, crossing.id).session;
    expect(cycleBridge(built, crossing.crosses[0]).session).toBe(built);
    expect(cycleBridge(built, crossing.crosses[0]).message).toContain('cross');
  });
  it('requires connectivity even when every island number matches', () => {
    const p = { id: 'groups', title: '', note: '', rows: ['1...1','.....','1...1'] };
    const s = newLogicSession('bridges', p), b = bridgeBoard(p.rows);
    const values = b.spans.map(span => span.dir === 'h' ? 1 : 0);
    expect(connected(b, values)).toBe(false);
    expect(logicSolved('bridges', { ...s, values })).toBe(false);
  });
  it('completes every bridge catalogue via native edits', () => {
    for (const p of bridges) {
      const s = newLogicSession('bridges', p), answer = bridgeSolution(bridgeBoard(p.rows));
      const result = editLogic('bridges', s, answer!);
      expect(result.completedAt, p.id).toBeTruthy();
      expect(editLogic('bridges', result, s.values)).toBe(result);
    }
  });
  it('locks, undoes and completes every native wiring grid', () => {
    for (const p of networks) {
      const s = newLogicSession('net', p), b = netBoard(p), answer = netSolution(b)!;
      const locked = turnWire(s, 0, true);
      expect(turnWire(locked, 0)).toBe(locked);
      expect(undoLogic(locked).locks).toEqual([]);
      const turns = b.tiles.map((mask, i) => [0,1,2,3].find(k => rotate(mask,k) === answer[i])!);
      expect(editLogic('net', s, turns).completedAt, p.id).toBeTruthy();
    }
  });
  it('keeps hint cost after undo and warns about a wrong locked wire', () => {
    const s = newLogicSession('net', networks[0]), hinted = logicHint('net', s);
    expect(hinted.session.hints).toBe(1);
    expect(undoLogic(hinted.session).hints).toBe(1);
    const answer = netSolution(netBoard(s.puzzle))!;
    const i = netBoard(s.puzzle).tiles.findIndex((mask, k) => mask !== answer[k]);
    const wrong = turnWire(s, i, true);
    expect(logicHint('net', wrong).session).toBe(wrong);
  });
});
describe('collection saves and migration', () => {
  it('migrates an Island Sketch-only save without losing progress', () => {
    const p = emptyProgress(); delete p.games; delete p.lastGame;
    expect(decodeProgress(JSON.stringify(p)).games).toEqual(emptyGames());
  });
  it('round-trips all five games including a suspended combat snapshot', () => {
    const all = emptyGames();
    all.bridges.active = bridges[0].id; all.bridges.sessions[bridges[0].id] = cycleBridge(newLogicSession('bridges', bridges[0]),0).session;
    all.net.active = networks[0].id; all.net.sessions[networks[0].id] = turnWire(newLogicSession('net', networks[0]),1);
    const day = '2026-10-31'; all.guess.active = day; all.guess.days[day] = submitGuess(newGuess(day), dailyDrawing(day).answer);
    all.merge = newState(55, 1000); draw(all.merge, 1000);
    const g = game(); play(g); all.siege.run = snapshotGame(g, 'saved-run');
    all.siege.profile.custom = { name: 'My Hero', weapon: 'orbit', lines: [[[20,20],[50,80]]] };
    expect(decodeGames(clone(all))).toEqual(all);
  });
  it('keeps a daily doodle bound to its original date and completion idempotent', () => {
    const day = newGuess('2026-10-31'), solved = submitGuess(day, dailyDrawing('2026-10-31').answer, '2026-11-01T00:01:00Z');
    expect(submitGuess(solved, 'cat')).toBe(solved);
    const all = emptyGames(); all.guess.days['2026-10-31'] = solved;
    expect(gameRecords(all)).toHaveLength(1);
    expect(guessRound(solved).drawing.id).toBe(day.drawingId);
  });
  it('rejects damaged game data before trying to render it', () => {
    const bad = emptyGames(); bad.merge = { cells: [] };
    expect(() => decodeGames(bad)).toThrow();
    const wires = emptyGames(); wires.net.sessions.x = { values: [999] };
    expect(() => decodeGames(wires)).toThrow();
  });
});
describe('persistent siege simulation', () => {
  it('uses exactly the original random sequence', () => {
    const a = mulberry32(879), b = statefulRandom(879);
    for(let i=0;i<500;i++) expect(b()).toBe(a());
  });
  it('resumes Maps, Sets and the exact random sequence in combat', () => {
    const a = game(); play(a, 1800);
    const snapshot = snapshotGame(a, 'run-one');
    expect(validSnapshot(snapshot)).toBe(true);
    const b = restoreGame(clone(snapshot));
    for(const e of b.enemies) expect(e.rehit).toBeInstanceOf(Map);
    for(const p of b.projectiles) expect(p.hit).toBeInstanceOf(Set);
    play(a, 1200); play(b, 1200);
    expect(snapshotGame(b, 'run-one')).toEqual(snapshotGame(a, 'run-one'));
  });
  it('banks rewards once and buys permanent upgrades without overspending', () => {
    const result = { id:'r1', hero:'pip', daily:null, seconds:100, kills:50, coins:100, won:false, date:'2026-10-31T12:00:00Z' };
    const paid = bankRun(emptyProfile(),result);
    expect(bankRun(paid,result)).toBe(paid);
    expect(paid.runs).toBe(1); expect(paid.coins).toBe(100);
    const bought = purchase(paid, upgrades[0].id);
    expect(bought.coins).toBe(40); expect(bought.upgrades.might).toBe(1);
    expect(purchase(bought,upgrades[0].id)).toBe(bought);
  });
  it('caps idle earnings, preserves partial hours and handles a backwards clock', () => {
    const p = collectJar(emptyProfile(), 1_000_000);
    expect(jarCoins(p, 1_000_000 - 1000)).toBe(0);
    expect(jarCoins(p, 1_000_000 + 100*3600000)).toBe(84);
    expect(collectJar(p, 1_000_000 + 100)).toBe(p);
    const collected=collectJar(p,1_000_000+3600000);
    expect(collected.coins).toBe(7);
  });
});

describe('save corruption boundaries', () => {
  it('rejects malformed siege entities before restoring the simulation', () => {
    const g=game();play(g,1200);
    const saved=snapshotGame(g,'invalid-entity');
    const broken=clone(saved);broken.game.enemies.push({def:{id:'unknown'},rehit:{nativeMap:[]}});
    expect(validSnapshot(broken)).toBe(false);
    expect(()=>restoreGame(broken)).toThrow();
    const weapon=clone(saved);weapon.game.weapons[0].id='unknown';
    expect(validSnapshot(weapon)).toBe(false);
  });
});
