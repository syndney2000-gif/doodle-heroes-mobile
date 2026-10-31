import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors as C } from '../theme';
import { BOARD_H, BOARD_W, chains, chainIds, xpToNext } from '../core/merge/data';
import { buyInk, deliver, draw, emptyCells, erase, inkMax, INK_POT, move, newState, nextInkIn, orderCells, refillInk, skipOrder, SKIP_ORDER_COST } from '../core/merge/engine';
import { Button, Notice, Page, Pop, Stats, U, useGameState } from './ui';

export default function MarginMerge({ initial, onSave, onExit, reducedMotion }) {
  const [state, change, current] = useGameState(initial || newState(Date.now() >>> 0, Date.now()), onSave);
  const [selected, setSelected] = useState(null), [message, setMessage] = useState(''), [book, setBook] = useState(false), [lastMerge, setLastMerge] = useState('');
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    change(s => { refillInk(s, Date.now()); });
    const timer = setInterval(() => { const t = Date.now(); setNow(t); if (current.current.ink < inkMax(current.current) && nextInkIn(current.current, t) === 0) change(s => { refillInk(s, t); }); }, 1000);
    const subscription = AppState.addEventListener('change', status => { if (status === 'active') change(s => { refillInk(s, Date.now()); }); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  const itemName = item => chains[item.chain].items[item.tier - 1];
  function transfer(from, to) {
    let result;
    const next = change(s => { result = move(s, from, to); });
    setSelected(null);
    if (result === 'merged') { setLastMerge(`${next.merges}:${to}`); setMessage(`Discovered ${itemName(next.cells[to]).name}!`); }
    else setMessage(result === 'swapped' ? 'Those doodles swapped places. Match two of the same tier to merge.' : result === 'moved' ? 'A little more room.' : 'Select a doodle, then a destination.');
  }
  function tap(index) {
    if (selected === null) { if (state.cells[index]) { setSelected(index); setMessage(`${itemName(state.cells[index]).name}: choose a matching doodle or an empty square.`); } }
    else if (selected === index) setSelected(null);
    else transfer(selected, index);
  }
  const help = 'Draw a new doodle for one ink. Two identical doodles of the same tier merge into the next one. Tap a doodle, then its destination—or drag it there. Different doodles swap; an empty square lets you move.\n\nFill orders to earn coins and experience. New chains unlock at levels 3 and 5. Ink refills one drop every 30 seconds, including while the app is closed. Coins can buy 10 ink or replace an order. Select a doodle and use Sell if you need space. The collection book tracks all 32 discoveries.';
  return <Page name="Margin Merge" title={book ? 'Your little collection' : 'Make something lovely'} onExit={() => book ? setBook(false) : onExit()} help={help} reducedMotion={reducedMotion}>
    <Stats>{[`Level ${state.level} · ${state.xp}/${xpToNext(state.level)} XP`, `${state.coins} coins`, `${state.ink}/${inkMax(state)} ink`]}</Stats>
    {book ? chainIds.map(id => <View key={id}><Text style={U.title}>{chains[id].name} · unlock level {chains[id].unlockLevel}</Text>{chains[id].items.map((item, i) => <View style={U.card} key={item.name}><Text style={[U.title, !state.discovered.includes(`${id}:${i + 1}`) && { color: C.muted }]}>{state.discovered.includes(`${id}:${i + 1}`) ? item.icon : '○'} {state.discovered.includes(`${id}:${i + 1}`) ? item.name : `Undiscovered · tier ${i + 1}`}</Text></View>)}</View>) : <>
      <Text style={U.body}>A little ink, a little imagination. Select two matching doodles to make something new.</Text>
      <Pop identity={lastMerge} reducedMotion={reducedMotion}><MergeBoard state={state} selected={selected} onTap={tap} onMove={transfer} /></Pop>
      <View style={U.row}><View style={{ flex: 1 }}><Button disabled={state.ink < 1 || !emptyCells(state).length} onPress={() => { let index; change(s => { index = draw(s, Date.now()); }); setSelected(null); setMessage(index === null ? 'No ink or empty squares available.' : 'A fresh little doodle. Find its match.'); }}>✎ Draw · 1 ink</Button></View><Button secondary disabled={selected === null} onPress={() => Alert.alert('Sell this doodle?', 'The selected item will become coins and free a square.', [{ text: 'Keep it', style: 'cancel' }, { text: 'Sell', onPress: () => { change(s => { erase(s, selected); }); setSelected(null); } }])}>Sell</Button></View>
      <Text style={[U.body, { textAlign: 'center' }]}>{state.ink >= inkMax(state) ? 'Ink pot full' : `Next drop in ${nextInkIn(state, now)}s · refills offline`}</Text>
      <Notice>{message}</Notice>
      <Button secondary disabled={state.coins < INK_POT.cost} onPress={() => { change(s => { buyInk(s, Date.now()); }); setMessage('Ten fresh drops of ink.'); }}>Buy {INK_POT.ink} ink · {INK_POT.cost} coins</Button>
      <Text style={[U.title, { marginTop: 24 }]}>Little requests</Text>
      {state.orders.map(order => <View key={order.id} style={U.card}><Text style={U.title}>{order.wants.map(w => `${itemName(w).icon} ${itemName(w).name}`).join(' + ')}</Text><Text style={U.body}>{order.coins} coins · {order.xp} XP</Text><View style={U.row}><Button small disabled={!orderCells(state, order)} onPress={() => { change(s => { deliver(s, order.id); }); setSelected(null); setMessage('Delivered! Your island grows a little brighter.'); }}>Deliver</Button><Button small secondary disabled={state.coins < SKIP_ORDER_COST} onPress={() => change(s => { skipOrder(s, order.id); })}>Replace · {SKIP_ORDER_COST} coins</Button></View></View>)}
      <Button secondary onPress={() => setBook(true)}>Open collection · {state.discovered.length}/32</Button>
    </>}
  </Page>;
}
function MergeBoard({ state, selected, onTap, onMove }) {
  const [width, setWidth] = useState(300), [dragging, setDragging] = useState(null);
  const drag = useRef(null), callbacks = useRef({ onTap, onMove }); callbacks.current = { onTap, onMove };
  const board = useRef(null), cell = width / BOARD_W;
  const responder = React.useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => Math.hypot(gesture.dx, gesture.dy) > 8,
    onPanResponderGrant: (_, gesture) => {
      const active = {}; drag.current = active;
      board.current?.measureInWindow((x, y) => {
        if (drag.current !== active) return;
        const col = Math.floor((gesture.x0 - x) / cell), row = Math.floor((gesture.y0 - y) / cell);
        active.x = x; active.y = y; active.from = row * BOARD_W + col;
        active.valid = col >= 0 && col < BOARD_W && row >= 0 && row < BOARD_H;
        if (active.valid) setDragging(active.from);
      });
    },
    onPanResponderRelease: (event, gesture) => {
      const active = drag.current; drag.current = null; setDragging(null);
      if (!active?.valid) return;
      const col = Math.floor(((gesture.moveX || event.nativeEvent.pageX) - active.x) / cell), row = Math.floor(((gesture.moveY || event.nativeEvent.pageY) - active.y) / cell);
      if (col >= 0 && col < BOARD_W && row >= 0 && row < BOARD_H) callbacks.current.onMove(active.from, row * BOARD_W + col);
    },
    onPanResponderTerminate: () => { drag.current = null; setDragging(null); }, onPanResponderTerminationRequest: () => false,
  }), [cell]);
  return <View style={[U.board, { padding: 4 }]}><View onLayout={e => setWidth(e.nativeEvent.layout.width)} ref={board} collapsable={false} {...responder.panHandlers}>
    {Array.from({ length: BOARD_H }, (_, r) => <View key={r} style={{ flexDirection: 'row' }}>{Array.from({ length: BOARD_W }, (_, c) => {
      const i = r * BOARD_W + c, item = state.cells[i], def = item && chains[item.chain].items[item.tier - 1];
      return <Pressable key={i} accessibilityRole="button" accessibilityLabel={def ? `${def.name}, tier ${item.tier}, row ${r + 1}, column ${c + 1}` : `Empty square, row ${r + 1}, column ${c + 1}`} onPress={() => onTap(i)} style={[M.cell, { width: cell, height: cell, backgroundColor: item ? C.tiles[(item.tier - 1) % 5] : '#F0F1E8' }, (selected === i || dragging === i) && { borderColor: C.green, borderWidth: 3 }]}>
        <Text style={{ fontSize: Math.max(18, cell * 0.39) }}>{def?.icon || '·'}</Text>{item && <Text style={M.tier}>{item.tier}</Text>}
      </Pressable>;
    })}</View>)}
  </View></View>;
}
const M = StyleSheet.create({ cell: { borderWidth: 2, borderColor: C.white, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, tier: { position: 'absolute', right: 3, bottom: 1, fontSize: 9, fontWeight: '800', color: C.ink } });
