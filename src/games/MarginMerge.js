import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Text, View } from 'react-native';
import { colors as C } from '../theme';
import { chains, chainIds } from '../core/merge/data';
import { buyInk, deliver, draw, emptyCells, erase, inkMax, INK_POT, move, newState, nextInkIn, orderCells, refillInk, skipOrder, SKIP_ORDER_COST } from '../core/merge/engine';
import { Button, Notice, Page, U, useGameState } from './ui';
import MergeBoard from './MergeBoard';
import { MergeHUD, Discovery, OrderMotion } from './MergeMotion';
import { dropKind, movementEvent } from '../core/merge/motion';

export default function MarginMerge({ initial, onSave, onExit, reducedMotion }) {
  const [state, change, current] = useGameState(initial || newState(Date.now() >>> 0, Date.now()), onSave);
  const [selected, setSelected] = useState(null), [message, setMessage] = useState(''), [book, setBook] = useState(false), [motion, setMotion] = useState(null);
  const serial = useRef(0);
  const animate = event => setMotion(event ? { ...event, id: ++serial.current } : null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    change(s => { refillInk(s, Date.now()); });
    const timer = setInterval(() => { const t = Date.now(); setNow(t); if (current.current.ink < inkMax(current.current) && nextInkIn(current.current, t) === 0) change(s => { refillInk(s, t); }); }, 1000);
    const subscription = AppState.addEventListener('change', status => { if (status === 'active') change(s => { refillInk(s, Date.now()); }); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  const itemName = item => chains[item.chain].items[item.tier - 1];
  function transfer(from, to, point = null) {
    const before = current.current;
    if (dropKind(before.cells, from, to) === 'none') return;
    let result;
    const next = change(s => { result = move(s, from, to); });
    const event = movementEvent(before, next, from, to, point);
    animate(event && { ...event, name: itemName(next.cells[to]).name });
    setSelected(null);
    if (result === 'merged') setMessage(`Merged into ${itemName(next.cells[to]).name}!${event.fresh ? ' A new discovery.' : ''}${event.leveled ? ` Hello, level ${next.level}!` : ''}`);
    else setMessage(result === 'swapped' ? 'Those doodles swapped places. Match two of the same tier to merge.' : 'A little more room.');
  }
  function drawDoodle() {
    let index;
    const next = change(s => { index = draw(s, Date.now()); });
    setSelected(null);
    if (index === null) { setMessage('No ink or empty squares available.'); return; }
    animate({ kind: 'spawn', to: index });
    setMessage(`Drew a ${itemName(next.cells[index]).name}. Find its match.`);
  }
  function sellSelected() {
    const index = selected;
    if (index === null || !current.current.cells[index]) return;
    const item = { ...current.current.cells[index] }; let coins;
    change(s => { coins = erase(s, index); });
    animate({ kind: 'sell', items: [{ index, item }], coins });
    setSelected(null); setMessage(`A little more room, and ${coins} coins for your pocket.`);
  }
  function deliverOrder(order) {
    const before = current.current, cells = orderCells(before, order);
    if (!cells) return;
    const items = cells.map(index => ({ index, item: { ...before.cells[index] } }));
    let delivered;
    const next = change(s => { delivered = deliver(s, order.id); });
    if (!delivered) return;
    animate({ kind: 'deliver', items, coins: order.coins, xp: order.xp, leveled: next.level > before.level, level: next.level, name: 'A lovely little delivery' });
    setSelected(null); setMessage(`Delivered! +${order.coins} coins and +${order.xp} XP.${next.level > before.level ? ` Hello, level ${next.level}!` : ''}`);
  }
  function tap(index) {
    if (selected === null) { if (state.cells[index]) { setSelected(index); setMessage(`${itemName(state.cells[index]).name}: choose a matching doodle or an empty square.`); } }
    else if (selected === index) setSelected(null);
    else transfer(selected, index);
  }
  const help = 'Draw a new doodle for one ink. Two identical doodles of the same tier merge into the next one. Tap a doodle, then its destination—or drag it there. Different doodles swap; an empty square lets you move. Matching targets are marked when you pick a doodle up. Drop outside the board to put it back.\n\nFill orders to earn coins and experience. New chains unlock at levels 3 and 5. Ink refills one drop every 30 seconds, including while the app is closed. Coins can buy 10 ink or replace an order. Select a doodle and use Sell if you need space. The collection book tracks all 32 discoveries.';
  return <Page name="Margin Merge" title={book ? 'Your little collection' : 'Make something lovely'} onExit={() => book ? setBook(false) : onExit()} help={help} reducedMotion={reducedMotion}>
    <MergeHUD state={state} event={motion} reducedMotion={reducedMotion} />
    {book ? chainIds.map(id => <View key={id}><Text style={U.title}>{chains[id].name} · unlock level {chains[id].unlockLevel}</Text>{chains[id].items.map((item, i) => <View style={U.card} key={item.name}><Text style={[U.title, !state.discovered.includes(`${id}:${i + 1}`) && { color: C.muted }]}>{state.discovered.includes(`${id}:${i + 1}`) ? item.icon : '○'} {state.discovered.includes(`${id}:${i + 1}`) ? item.name : `Undiscovered · tier ${i + 1}`}</Text></View>)}</View>) : <>
      <Text style={U.body}>A little ink, a little imagination. Select two matching doodles to make something new.</Text>
      <MergeBoard state={state} selected={selected} onTap={tap} onMove={transfer} motion={motion} reducedMotion={reducedMotion} />
      {motion && (motion.fresh || motion.leveled) && <Discovery key={motion.id} event={motion} reducedMotion={reducedMotion} />}
      <View style={U.row}><View style={{ flex: 1 }}><Button disabled={state.ink < 1 || !emptyCells(state).length} onPress={drawDoodle}>✎ Draw · 1 ink</Button></View><Button secondary disabled={selected === null} onPress={() => Alert.alert('Sell this doodle?', 'The selected item will become coins and free a square.', [{ text: 'Keep it', style: 'cancel' }, { text: 'Sell', onPress: sellSelected }])}>Sell</Button></View>
      <Text style={[U.body, { textAlign: 'center' }]}>{state.ink >= inkMax(state) ? 'Ink pot full' : `Next drop in ${nextInkIn(state, now)}s · refills offline`}</Text>
      <Notice>{message}</Notice>
      <Button secondary disabled={state.coins < INK_POT.cost} onPress={() => { change(s => { buyInk(s, Date.now()); }); setMessage('Ten fresh drops of ink.'); }}>Buy {INK_POT.ink} ink · {INK_POT.cost} coins</Button>
      <Text style={[U.title, { marginTop: 24 }]}>Little requests</Text>
      {state.orders.map(order => <OrderMotion key={order.id} identity={order.id} ready={!!orderCells(state, order)} reducedMotion={reducedMotion}><View style={[U.card, orderCells(state, order) && { borderColor: '#A3BB89', backgroundColor: '#EFF5E5' }]}><Text style={U.title}>{order.wants.map(w => `${itemName(w).icon} ${itemName(w).name}`).join(' + ')}</Text><Text style={U.body}>{order.coins} coins · {order.xp} XP</Text><View style={U.row}><Button small disabled={!orderCells(state, order)} onPress={() => deliverOrder(order)}>Deliver</Button><Button small secondary disabled={state.coins < SKIP_ORDER_COST} onPress={() => change(s => { skipOrder(s, order.id); })}>Replace · {SKIP_ORDER_COST} coins</Button></View></View></OrderMotion>)}
      <Button secondary onPress={() => setBook(true)}>Open collection · {state.discovered.length}/32</Button>
    </>}
  </Page>;
}
