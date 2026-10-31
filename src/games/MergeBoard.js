import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors as C } from '../theme';
import { BOARD_H, BOARD_W, chains } from '../core/merge/data';
import { cellAt, cellCenter, dropKind, itemKey, MOVE_MS } from '../core/merge/motion';

const definition = item => chains[item.chain].items[item.tier - 1];
const spring = (value, toValue, extra = {}) => Animated.spring(value, { toValue, speed: 24, bounciness: 8, useNativeDriver: true, ...extra });

export default function MergeBoard({ state, selected, onTap, onMove, motion, reducedMotion }) {
  const [width, setWidth] = useState(300), [dragging, setDragging] = useState(null), [hover, setHover] = useState(null), [returning, setReturning] = useState(null);
  const grid = useRef(null), rect = useRef(null), touchStart = useRef(null), drag = useRef(null), serial = useRef(0);
  const x = useRef(new Animated.Value(0)).current, y = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(0)).current, lift = useRef(new Animated.Value(1)).current;
  const cell = width / BOARD_W;
  const latest = useRef({ state, onTap, onMove }); latest.current = { state, onTap, onMove };
  const measure = () => grid.current?.measureInWindow((left, top) => { rect.current = { left, top }; });
  function position(event, gesture) {
    if (!rect.current) return null;
    const pageX = Number.isFinite(gesture.moveX) && gesture.moveX !== 0 ? gesture.moveX : event.nativeEvent.pageX;
    const pageY = Number.isFinite(gesture.moveY) && gesture.moveY !== 0 ? gesture.moveY : event.nativeEvent.pageY;
    return { x: pageX - rect.current.left, y: pageY - rect.current.top };
  }
  function canDrag(_, gesture) {
    if (!rect.current || Math.hypot(gesture.dx, gesture.dy) <= 8 || gesture.numberActiveTouches > 1) return false;
    const start = touchStart.current || { x: gesture.x0, y: gesture.y0 };
    const from = cellAt(start.x - rect.current.left, start.y - rect.current.top, cell);
    return from !== null && !!latest.current.state.cells[from];
  }
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponderCapture: event => { touchStart.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }; measure(); return false; },
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponderCapture: canDrag,
    onMoveShouldSetPanResponder: canDrag,
    onPanResponderGrant: (event, gesture) => {
      if (!rect.current) return;
      const start = touchStart.current || { x: gesture.x0, y: gesture.y0 };
      const from = cellAt(start.x - rect.current.left, start.y - rect.current.top, cell);
      const item = latest.current.state.cells[from];
      if (from === null || !item) return;
      const point = position(event, gesture) || cellCenter(from, cell);
      drag.current = { from, item: { ...item } };
      x.setValue(point.x - cell / 2); y.setValue(point.y - cell / 2 - (reducedMotion ? 0 : 12));
      lift.setValue(reducedMotion ? 1 : 1.04); tilt.setValue(0);
      if (!reducedMotion) spring(lift, 1.16).start();
      setReturning(null); setDragging({ from, item }); setHover(from);
    },
    onPanResponderMove: (event, gesture) => {
      if (!drag.current) return;
      const point = position(event, gesture); if (!point) return;
      x.setValue(point.x - cell / 2); y.setValue(point.y - cell / 2 - (reducedMotion ? 0 : 12));
      if (!reducedMotion) tilt.setValue(Math.max(-1, Math.min(1, gesture.dx / 75)));
      const to = cellAt(point.x, point.y, cell);
      setHover(previous => previous === to ? previous : to);
    },
    onPanResponderRelease: (event, gesture) => {
      const active = drag.current; if (!active) return;
      const point = position(event, gesture) || cellCenter(active.from, cell);
      const to = cellAt(point.x, point.y, cell);
      drag.current = null; setDragging(null); setHover(null);
      const start = { x: point.x, y: point.y - (reducedMotion ? 0 : 12) };
      if (to !== null && to !== active.from) latest.current.onMove(active.from, to, start);
      else if (!reducedMotion) setReturning({ id: ++serial.current, kind: 'return', from: active.from, to: active.from, item: active.item, point: start });
    },
    onPanResponderTerminate: () => { drag.current = null; setDragging(null); setHover(null); },
    onPanResponderTerminationRequest: () => false,
  }), [cell, reducedMotion]);
  useEffect(() => {
    drag.current = null; setDragging(null); setHover(null); setReturning(null);
    return () => { drag.current = null; lift.stopAnimation(); };
  }, [cell, reducedMotion]);
  const source = dragging ? dragging.from : selected;
  const resultAtHover = source !== null && hover !== null ? dropKind(state.cells, source, hover) : 'none';
  return <View style={B.frame}>
    <View style={B.grid} ref={grid} collapsable={false} onLayout={event => { setWidth(event.nativeEvent.layout.width); measure(); }} {...responder.panHandlers}>
      {Array.from({ length: BOARD_H }, (_, row) => <View key={row} style={B.row}>{Array.from({ length: BOARD_W }, (_, col) => {
        const i = row * BOARD_W + col, item = state.cells[i];
        const match = source !== null && source !== i && dropKind(state.cells, source, i) === 'merged';
        const hovered = dragging && hover === i && i !== dragging.from;
        let arrival = null;
        if (motion?.to === i && ['spawn', 'merged', 'moved', 'swapped'].includes(motion.kind)) arrival = { ...motion, kind: motion.kind === 'spawn' ? 'spawn' : motion.kind === 'merged' ? 'merge' : 'land' };
        if (motion?.from === i && motion.kind === 'swapped') arrival = { ...motion, kind: 'land' };
        return <Pressable key={i} accessibilityRole="button" accessibilityState={{ selected: selected === i }}
          accessibilityLabel={item ? `${definition(item).name}, tier ${item.tier}, row ${row + 1}, column ${col + 1}` : `Empty square, row ${row + 1}, column ${col + 1}`}
          accessibilityHint={match ? 'Matches the selected doodle. Activate to merge.' : 'Select a doodle, then select its destination.'}
          onPress={() => { if (!drag.current) latest.current.onTap(i); }}
          style={({ pressed }) => [B.slot, { width: cell, height: cell }, source === i && B.picked, match && B.match, hovered && (resultAtHover === 'merged' ? B.mergeTarget : resultAtHover === 'moved' ? B.moveTarget : B.swapTarget), pressed && { backgroundColor: '#E7EDDF' }]}>
          {item ? <View pointerEvents="none" style={[B.itemCard, { backgroundColor: C.tiles[(item.tier - 1) % C.tiles.length] }, dragging?.from === i && { opacity: 0.2 }]}>
            <Piece key={`${itemKey(item)}:${arrival?.id || 'rest'}`} item={item} size={cell} arrival={arrival} picked={source === i} reducedMotion={reducedMotion} />
          </View> : <Text style={B.dot}>·</Text>}
          {match && <View pointerEvents="none" style={B.matchBadge}><Text style={B.matchBadgeText}>+</Text></View>}
          {hovered && <View pointerEvents="none" style={B.dropLabel}><Text style={B.dropText}>{resultAtHover === 'merged' ? 'MERGE' : resultAtHover === 'moved' ? 'MOVE' : 'SWAP'}</Text></View>}
        </Pressable>;
      })}</View>)}
    </View>
    {dragging && <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[B.floating, { width: cell, height: cell, transform: [{ translateX: x }, { translateY: y }, { scale: lift }, { rotate: tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-8deg', '8deg'] }) }] }]}><PieceFace item={dragging.item} size={cell} /></Animated.View>}
    {!reducedMotion && motion && <ActionEffect key={motion.id} event={motion} size={cell} />}
    {!reducedMotion && returning && <Flight key={`return-${returning.id}`} item={returning.item} size={cell} from={returning.point} to={cellCenter(returning.to, cell)} kind="return" />}
  </View>;
}
function PieceFace({ item, size }) {
  return <View style={[B.face, { width: size - 8, height: size - 8, backgroundColor: C.tiles[(item.tier - 1) % C.tiles.length] }]}><Text style={{ fontSize: Math.max(21, size * 0.48), lineHeight: Math.max(29, size * 0.66) }}>{definition(item).icon}</Text><View style={B.tier}><Text style={B.tierText}>{item.tier}</Text></View></View>;
}
function Piece({ item, size, arrival, picked, reducedMotion }) {
  const animated = !reducedMotion && !!arrival;
  const scale = useRef(new Animated.Value(animated ? arrival.kind === 'merge' ? 0.3 : 0.65 : 1)).current;
  const opacity = useRef(new Animated.Value(animated ? 0 : 1)).current;
  const turn = useRef(new Animated.Value(animated && arrival.kind !== 'land' ? -9 : 0)).current;
  const pick = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animated) { scale.setValue(1); opacity.setValue(1); turn.setValue(0); return; }
    const animation = Animated.sequence([
      Animated.delay(arrival.kind === 'spawn' ? 0 : MOVE_MS - 15),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 70, useNativeDriver: true }),
        spring(scale, 1, { bounciness: arrival.kind === 'merge' ? 13 : 8 }),
        spring(turn, 0, { bounciness: 10 }),
      ]),
    ]);
    animation.start(); return () => animation.stop();
  }, [arrival?.id, reducedMotion]);
  useEffect(() => {
    const animation = reducedMotion ? Animated.timing(pick, { toValue: picked ? 1 : 0, duration: 0, useNativeDriver: true }) : spring(pick, picked ? 1 : 0, { bounciness: 5 });
    animation.start(); return () => animation.stop();
  }, [picked, reducedMotion]);
  return <Animated.View style={{ transform: [{ translateY: pick.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }] }}><Animated.View style={{ opacity, transform: [{ scale }, { rotate: turn.interpolate({ inputRange: [-10, 10], outputRange: ['-10deg', '10deg'] }) }] }}><Text style={{ fontSize: Math.max(21, size * 0.48), lineHeight: Math.max(29, size * 0.66) }}>{definition(item).icon}</Text><View style={B.tier}><Text style={B.tierText}>{item.tier}</Text></View></Animated.View></Animated.View>;
}
function Flight({ item, size, from, to, kind, delay = 0 }) {
  const progress = useRef(new Animated.Value(0)).current;
  const [done, setDone] = useState(false);
  useEffect(() => {
    const animation = Animated.sequence([Animated.delay(delay), Animated.timing(progress, { toValue: 1, duration: kind === 'return' ? 230 : kind === 'deliver' ? 310 : MOVE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true })]);
    animation.start(({ finished } = {}) => { if (finished) setDone(true); });
    return () => animation.stop();
  }, []);
  if (done) return null;
  const fade = kind === 'sell' || kind === 'deliver';
  return <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[B.floating, { width: size, height: size, opacity: progress.interpolate({ inputRange: [0, fade ? 0.65 : 0.9, 1], outputRange: [1, 1, 0] }), transform: [
    { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [from.x - size / 2, to.x - size / 2] }) },
    { translateY: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [from.y - size / 2, (from.y + to.y) / 2 - size / 2 - (kind === 'return' ? 5 : 18), to.y - size / 2] }) },
    { scale: progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1.13, 1.05, fade ? 0.4 : 0.88] }) },
    { rotate: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-5deg', '5deg', '0deg'] }) },
  ] }]}><PieceFace item={item} size={size} /></Animated.View>;
}
function Burst({ center, size, fresh, spawn = false }) {
  const progress = useRef(new Animated.Value(0)).current, [done, setDone] = useState(false);
  useEffect(() => {
    const animation = Animated.sequence([Animated.delay(spawn ? 20 : MOVE_MS - 10), Animated.timing(progress, { toValue: 1, duration: fresh ? 650 : 430, easing: Easing.out(Easing.cubic), useNativeDriver: true })]);
    animation.start(({ finished } = {}) => { if (finished) setDone(true); });
    return () => animation.stop();
  }, []);
  if (done) return null;
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, { left: 5, top: 5 }]}>
    <Animated.View style={[B.ring, { left: center.x - size * 0.45, top: center.y - size * 0.45, width: size * 0.9, height: size * 0.9, borderRadius: size, opacity: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.8, 0.35, 0] }), transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.65, fresh ? 2.05 : 1.65] }) }] }]} />
    {Array.from({ length: spawn ? 4 : fresh ? 10 : 7 }, (_, i) => {
      const angle = -Math.PI / 2 + i * Math.PI * 2 / (spawn ? 4 : fresh ? 10 : 7), distance = size * (fresh ? 1.2 : 0.85);
      return <Animated.Text key={i} style={[B.spark, { color: [C.gold, '#88A477', '#C78AA7', '#86B7BE'][i % 4], left: center.x - 7, top: center.y - 10, fontSize: i % 3 ? 12 : 18, opacity: progress.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 0.65, 0] }), transform: [
        { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * distance] }) },
        { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * distance + 12] }) },
        { scale: progress.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.4, 1.2, 0.35] }) },
        { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${i % 2 ? 70 : -70}deg`] }) },
      ] }]}>{i % 3 ? '•' : '✦'}</Animated.Text>;
    })}
  </View>;
}
function ActionEffect({ event, size }) {
  if (event.kind === 'spawn') return <Burst center={cellCenter(event.to, size)} size={size} spawn />;
  if (event.kind === 'sell' || event.kind === 'deliver') return <>{event.items.map(({ index, item }, i) => <Flight key={index} item={item} size={size} from={cellCenter(index, size)} to={{ x: BOARD_W * size * 0.5, y: -15 }} kind={event.kind} delay={i * 55} />)}</>;
  if (!['merged', 'moved', 'swapped'].includes(event.kind)) return null;
  const to = cellCenter(event.to, size), from = cellCenter(event.from, size);
  return <><Flight item={event.item} size={size} from={event.point || from} to={to} kind={event.kind} />
    {event.kind === 'swapped' && <Flight item={event.other} size={size} from={to} to={from} kind="swapped" />}
    {event.kind === 'merged' && <Burst center={to} size={size} fresh={event.fresh} />}
  </>;
}
const B = StyleSheet.create({
  frame: { marginVertical: 16, backgroundColor: '#E8E6D9', padding: 5, borderRadius: 24, borderWidth: 2, borderColor: '#D8DECE', position: 'relative', overflow: 'visible', zIndex: 2 },
  grid: { position: 'relative', borderRadius: 17, overflow: 'hidden' }, row: { flexDirection: 'row' },
  slot: { borderWidth: 2, borderColor: '#E8E6D9', backgroundColor: '#F3F3E9', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemCard: { width: '100%', height: '100%', borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  picked: { borderColor: C.green }, match: { borderColor: '#91AC78', backgroundColor: '#DFEBCF' }, mergeTarget: { borderColor: '#4E7C3F', borderWidth: 3 }, moveTarget: { borderColor: '#8AAFB7', borderWidth: 3 }, swapTarget: { borderColor: '#C5A05A', borderWidth: 3 },
  dot: { color: '#C6CEBD', fontSize: 22 }, tier: { position: 'absolute', right: -7, bottom: -2, minWidth: 14, height: 14, borderRadius: 7, backgroundColor: '#FFFEF8D9', alignItems: 'center', justifyContent: 'center' }, tierText: { fontSize: 9, fontWeight: '800', color: C.ink },
  face: { borderWidth: 1, borderColor: '#FFFFFFD9', borderRadius: 12, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  floating: { position: 'absolute', left: 5, top: 5, backgroundColor: C.white, borderRadius: 13, zIndex: 30, elevation: 15, alignItems: 'center', justifyContent: 'center', shadowColor: '#283C24', shadowOpacity: 0.22, shadowRadius: 6, shadowOffset: { width: 0, height: 7 } },
  matchBadge: { position: 'absolute', right: 1, top: 0, width: 15, height: 15, borderRadius: 8, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }, matchBadgeText: { color: C.white, fontSize: 12, fontWeight: '800' },
  dropLabel: { position: 'absolute', bottom: 1, left: -1, right: -1, alignItems: 'center', backgroundColor: '#304C3BE8', borderRadius: 5, zIndex: 5 }, dropText: { fontSize: 7, color: C.white, letterSpacing: 0.4, fontWeight: '800' },
  ring: { position: 'absolute', borderWidth: 2, borderColor: '#E4C46F' }, spark: { position: 'absolute', fontWeight: '800' },
});
