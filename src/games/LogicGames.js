import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { colors as C } from '../theme';
import { chapters as bridgeChapters } from '../core/bridges/puzzles';
import { chapters as netChapters } from '../core/net/puzzles';
import { dailyPuzzle as bridgeDaily } from '../core/bridges/daily';
import { dailyPuzzle as netDaily } from '../core/net/daily';
import { parse as spansBoard } from '../core/bridges/model';
import { parse as netBoard, powered, rotate, SIDES } from '../core/net/model';
import { cycleBridge, editLogic, logicHint, newLogicSession, turnWire, undoLogic } from '../core/mobileGames';
import { formatTime, starsFor, starText } from '../core/lib/scoring';
import { Button, Notice, Page, Pop, Stats, U, useGameState, usePuzzleClock } from './ui';

const helpers = {
  bridges: { name: 'Isle Spans', chapters: bridgeChapters, daily: bridgeDaily, help: 'Join islands with straight bridges. Tap an island, then the nearest island in the same row or column. Repeat to cycle one bridge, two bridges, then none. Bridges cannot cross or pass through islands. Match every island’s number and connect all islands into one group.\n\nUndo reverses a connection. Hints use the deduction solver and cost one star, down to a minimum of one. On wide maps, swipe through the water to scroll. Tap numbers to build; the bridge color and count label show your progress.' },
  net: { name: 'Lighthouse Wiring', chapters: netChapters, daily: netDaily, help: 'Tap a tile to rotate it clockwise. Every wire end must meet a matching neighbor, every tile must connect to the lighthouse, and the finished network must have no loops. Green wires and filled centers show connected power.\n\nSwitch to Lock mode to protect tiles you are sure of; tap again in Lock mode to unlock. Hints rotate and lock one deduced tile. Undo reverses a turn or lock. Swipe along the edge of a large board to scroll.' },
};
export default function LogicGame({ kind, initial, onSave, onExit, reducedMotion, today }) {
  const config = helpers[kind];
  const [state, change, current] = useGameState(initial, onSave);
  const [helpOpen, setHelpOpen] = useState(false);
  const [list, setList] = useState(!initial.active);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState(null);
  const [target, setTarget] = useState(null);
  const [lockMode, setLockMode] = useState(false);
  const session = state.sessions[state.active];
  usePuzzleClock(current, change, !list && !!session && !session.completedAt && !helpOpen);
  function open(puzzle) {
    change(s => { s.sessions[puzzle.id] ||= newLogicSession(kind, puzzle); s.active = puzzle.id; });
    setSelected(null); setTarget(null); setMessage(''); setList(false); setLockMode(false);
  }
  function setSession(next) { change(s => { s.sessions[s.active] = next; }); }
  function daily() { try { open(config.daily(today)); } catch { setMessage('The daily generator could not finish this map. Every catalogue puzzle is still available.'); } }
  const board = useMemo(() => session ? kind === 'bridges' ? spansBoard(session.puzzle.rows) : netBoard(session.puzzle) : null, [session?.puzzle, kind]);
  const completion = session?.completedAt;
  function touchIsland(id) {
    if (completion) return;
    setTarget(null);
    if (selected === null) { setSelected(id); setMessage('Now tap a neighboring island in the same row or column.'); return; }
    if (id === selected) { setSelected(null); return; }
    const span = board.spans.find(s => (s.a === selected && s.b === id) || (s.a === id && s.b === selected));
    if (!span) { setSelected(id); setMessage('No direct crossing there. Choose a straight, unobstructed neighbor of the selected island.'); return; }
    const result = cycleBridge(session, span.id); setSession(result.session); setMessage(result.message); setSelected(null);
  }
  return <Page name={config.name} title={list ? 'Choose a little challenge' : session.puzzle.title} onExit={() => list ? onExit() : setList(true)} help={config.help} reducedMotion={reducedMotion} onHelpOpen={() => setHelpOpen(true)} onHelpClose={() => setHelpOpen(false)}>
    {list ? <>
      <Text style={U.hero}>{kind === 'bridges' ? 'A way across.' : 'A little more light.'}</Text><Text style={U.body}>Twelve handcrafted puzzles, plus a new daily. Your progress stays on this device.</Text>
      <Button onPress={daily}>Play today’s {kind === 'bridges' ? 'map' : 'grid'}  ✦</Button><Notice>{message}</Notice>
      {config.chapters.map(chapter => <View key={chapter.id}><Text style={[U.title, { marginTop: 22 }]}>{chapter.title}</Text><Text style={U.body}>{chapter.blurb}</Text>
        {chapter.puzzles.map(p => <Pressable accessibilityRole="button" key={p.id} onPress={() => open(p)} style={U.card}><Text style={U.title}>{p.title}  →</Text><Text style={U.body}>{p.rows.length} × {p.rows[0].length} · {state.sessions[p.id]?.completedAt ? starText(starsFor(state.sessions[p.id].hints)) + ' Complete' : state.sessions[p.id] ? 'Continue' : 'A fresh page'}</Text></Pressable>)}
      </View>)}
    </> : <>
      <Stats>{[`${board.w} × ${board.h}`, formatTime(session.seconds), `${session.hints} hints`]}</Stats>
      {kind === 'bridges' ? <Bridges board={board} session={session} selected={selected} target={target} onIsland={touchIsland} /> : <>
        {!completion && <View style={U.row}><Button small secondary selected={!lockMode} onPress={() => setLockMode(false)}>↻ Rotate</Button><Button small secondary selected={lockMode} onPress={() => setLockMode(true)}>▣ Lock</Button></View>}
        <Wires board={board} session={session} target={target} reducedMotion={reducedMotion} onTile={i => { setSession(turnWire(session, i, lockMode)); setTarget(null); setMessage(''); }} />
        <Text style={[U.body, { textAlign: 'center' }]}>{powered(board, board.tiles.map((tile, i) => rotate(tile, session.values[i]))).size} / {board.tiles.length} tiles powered · ★ lighthouse</Text>
      </>}
      {completion ? <Pop identity={session.puzzle.id} reducedMotion={reducedMotion}><View style={U.notice}><Text style={U.stars}>{starText(starsFor(session.hints))}</Text><Text style={U.hero}>{kind === 'bridges' ? 'Together at last.' : 'The island glows.'}</Text><Text style={U.body}>{session.puzzle.note}</Text><Button onPress={() => { const next = config.chapters.flatMap(c => c.puzzles).find(p => !state.sessions[p.id]?.completedAt); if (next) open(next); else setList(true); }}>Next little adventure →</Button><Button secondary onPress={() => setList(true)}>All puzzles</Button></View></Pop> : <>
        <View style={U.row}><Button small secondary disabled={!session.history.length} onPress={() => { setSession(undoLogic(session)); setSelected(null); setMessage(''); setTarget(null); }}>↶ Undo</Button><Button small secondary onPress={() => { const result = logicHint(kind, session); setSession(result.session); setMessage(result.message); setTarget(result.target); setSelected(null); }}>✧ Hint</Button><Button small secondary onPress={() => Alert.alert('Clear this puzzle?', 'Time and hint count stay. Undo can restore the board.', [{ text: 'Keep playing', style: 'cancel' }, { text: 'Clear', onPress: () => { setSession(editLogic(kind, session, session.values.map(() => 0), [])); setSelected(null); } }])}>↺ Clear</Button></View>
        <Notice>{message || (kind === 'bridges' ? 'Tap two islands to connect them. Repeat for a double bridge, then removal. Match all numbers and keep the whole island connected.' : 'Tap to turn a tile. Connect every wire to the lighthouse with no loose ends and no loops.')}</Notice>
      </>}
    </>}
  </Page>;
}
function Bridges({ board, session, selected, target, onIsland }) {
  const unit = 39, pad = 28, width = (board.w - 1) * unit + pad * 2, height = (board.h - 1) * unit + pad * 2;
  const point = id => ({ x: pad + board.islands[id].c * unit, y: pad + board.islands[id].r * unit });
  return <View style={U.board}><ScrollView horizontal contentContainerStyle={{ padding: 7 }}><View style={{ width, height }}>
    <Svg width={width} height={height}>
      {Array.from({ length: board.h }, (_, r) => <Line key={r} x1="0" x2={width} y1={pad + r * unit} y2={pad + r * unit} stroke="#E8EEE3" strokeDasharray="2 9" />)}
      {board.spans.map(s => {
        const a = point(s.a), b = point(s.b), count = session.values[s.id], active = target === s.id;
        return <React.Fragment key={s.id}>{count ? Array.from({ length: count }, (_, k) => {
          const offset = count === 2 ? (k ? 4 : -4) : 0;
          return <Line key={k} x1={a.x + (s.dir === 'v' ? offset : 0)} y1={a.y + (s.dir === 'h' ? offset : 0)} x2={b.x + (s.dir === 'v' ? offset : 0)} y2={b.y + (s.dir === 'h' ? offset : 0)} stroke={active ? '#BA8A35' : C.green} strokeWidth="3.5" strokeLinecap="round" />;
        }) : active ? <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.gold} strokeWidth="7" strokeDasharray="5 6" /> : null}</React.Fragment>;
      })}
    </Svg>
    {board.islands.map(island => {
      const p = point(island.id), count = board.spansOf[island.id].reduce((sum, i) => sum + session.values[i], 0);
      return <Pressable accessibilityRole="button" accessibilityLabel={`Island row ${island.r + 1}, column ${island.c + 1}, needs ${island.n} bridges, has ${count}`} disabled={!!session.completedAt} key={island.id} onPress={() => onIsland(island.id)} style={[L.islandHit, { left: p.x - 22, top: p.y - 22 }]}><View style={[L.island, selected === island.id && { backgroundColor: C.gold }, count === island.n && selected !== island.id && { backgroundColor: C.green }, count > island.n && { borderColor: '#AC563C', borderWidth: 3 }]}><Text style={[L.number, count === island.n && selected !== island.id && { color: C.white }]}>{island.n}</Text></View></Pressable>;
    })}
  </View></ScrollView></View>;
}
function WireTile({ mask, turns, size, power, source, locked, highlighted, disabled, onPress, reducedMotion, row, col }) {
  const angle = useRef(new Animated.Value(turns * 90)).current;
  useEffect(() => {
    const animation = Animated.timing(angle, { toValue: turns * 90, duration: reducedMotion ? 0 : 160, useNativeDriver: true });
    animation.start(); return () => animation.stop();
  }, [turns, reducedMotion]);
  const center = size / 2, color = power ? C.green : '#869184';
  return <Pressable accessibilityRole="button" disabled={disabled} accessibilityLabel={`Row ${row + 1}, column ${col + 1}, ${power ? 'powered' : 'unpowered'}${source ? ', lighthouse' : ''}${locked ? ', locked' : ''}`} onPress={onPress} style={[L.wireTile, { width: size, height: size, backgroundColor: highlighted ? '#F2DDA9' : power ? '#E6EDD9' : '#F3F0E5' }, locked && { borderColor: C.gold }]}>
    <Animated.View pointerEvents="none" style={{ transform: [{ rotate: angle.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'], extrapolate: 'extend' }) }] }}><Svg width={size - 4} height={size - 4} viewBox={`0 0 ${size} ${size}`}>
      {SIDES.filter(side => mask & side).map(side => <Line key={side} x1={center} y1={center} x2={side === 2 ? size : side === 8 ? 0 : center} y2={side === 1 ? 0 : side === 4 ? size : center} stroke={color} strokeWidth="5" strokeLinecap="round" />)}<Circle cx={center} cy={center} r="4" fill={power ? C.green : C.white} stroke={color} strokeWidth="2" />
    </Svg></Animated.View>
    {source && <Text pointerEvents="none" style={L.source}>★</Text>}{locked && <Text pointerEvents="none" style={L.lock}>▣</Text>}
  </Pressable>;
}
function Wires({ board, session, target, onTile, reducedMotion }) {
  const [large, setLarge] = useState(false);
  const size = large ? 58 : 48;
  const power = powered(board, board.tiles.map((tile, i) => rotate(tile, session.values[i])));
  return <><View style={U.board}><ScrollView horizontal contentContainerStyle={{ padding: 8 }}><View>{Array.from({ length: board.h }, (_, r) => <View key={r} style={{ flexDirection: 'row' }}>{Array.from({ length: board.w }, (_, c) => {
    const i = r * board.w + c;
    return <WireTile key={i} row={r} col={c} mask={board.tiles[i]} turns={session.values[i]} size={size} power={power.has(i)} source={board.source === i} locked={session.locks.includes(i)} highlighted={target === i} disabled={!!session.completedAt} onPress={() => onTile(i)} reducedMotion={reducedMotion} />;
  })}</View>)}</View></ScrollView></View><Button small secondary onPress={() => setLarge(!large)}>{large ? 'Standard tiles' : 'Larger tiles'} · scroll using board edges</Button></>;
}
const L = StyleSheet.create({
  islandHit: { position: 'absolute', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, island: { width: 32, height: 32, borderRadius: 18, borderWidth: 2, borderColor: C.green, backgroundColor: '#E4D9B7', alignItems: 'center', justifyContent: 'center' }, number: { color: C.ink, fontSize: 15, fontWeight: '800' }, wireTile: { borderWidth: 2, borderColor: C.white, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, source: { position: 'absolute', fontSize: 22, color: '#B08024', backgroundColor: '#FAF0CB', borderRadius: 12, paddingHorizontal: 2 }, lock: { position: 'absolute', right: 2, bottom: 0, fontSize: 10, color: '#8C6D2C' },
});
