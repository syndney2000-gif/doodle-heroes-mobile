import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors as C } from '../theme';
import { inkMax } from '../core/merge/engine';
import { xpToNext } from '../core/merge/data';

function Counter({ value, label, icon, reducedMotion }) {
  const [shown, setShown] = useState(value);
  const previous = useRef(value), pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reducedMotion || previous.current === value) { previous.current = value; setShown(value); return; }
    const from = previous.current, started = Date.now(); let frame;
    pulse.setValue(0.92);
    const bounce = Animated.spring(pulse, { toValue: 1, speed: 24, bounciness: 8, useNativeDriver: true }); bounce.start();
    const tick = () => {
      const time = Math.min(1, (Date.now() - started) / 300), eased = 1 - (1 - time) ** 3;
      const next = Math.round(from + (value - from) * eased);
      previous.current = next; setShown(next);
      if (time < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); bounce.stop(); };
  }, [value, reducedMotion]);
  return <View accessible accessibilityLabel={`${value} ${label}`} style={A.counter}><Animated.Text accessibilityElementsHidden style={[A.counterIcon, { transform: [{ scale: pulse }] }]}>{icon}</Animated.Text><View><Text style={A.amount}>{shown}</Text><Text style={A.label}>{label}</Text></View></View>;
}
export function MergeHUD({ state, event, reducedMotion }) {
  const fill = useRef(new Animated.Value(state.xp / xpToNext(state.level))).current;
  const oldLevel = useRef(state.level), [width, setWidth] = useState(260);
  useEffect(() => {
    const ratio = state.xp / xpToNext(state.level);
    const leveled = state.level > oldLevel.current; oldLevel.current = state.level;
    if (reducedMotion) { fill.setValue(ratio); return; }
    const timing = (value, duration) => Animated.timing(fill, { toValue: value, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    const animation = leveled ? Animated.sequence([timing(1, 150), timing(0, 0), timing(ratio, 260)]) : timing(ratio, 260);
    animation.start(); return () => animation.stop();
  }, [state.xp, state.level, reducedMotion]);
  return <View style={A.hud}>
    <View style={A.row}><View style={A.level}><Text style={A.levelNumber}>{state.level}</Text><Text style={A.label}>LEVEL</Text></View><View style={{ flex: 1 }}><Text style={A.xpCopy}>{state.xp} / {xpToNext(state.level)} little ideas</Text><View style={A.track} onLayout={e => setWidth(e.nativeEvent.layout.width)}><Animated.View style={[A.fill, { transform: [{ translateX: fill.interpolate({ inputRange: [0, 1], outputRange: [-width / 2, 0] }) }, { scaleX: fill }] }]} /></View></View></View>
    <View style={A.row}><Counter value={state.coins} icon="✦" label="coins" reducedMotion={reducedMotion} /><Counter value={state.ink} icon="✎" label={`ink / ${inkMax(state)}`} reducedMotion={reducedMotion} /></View>
    {event && ['deliver', 'sell'].includes(event.kind) && <Reward key={event.id} event={event} reducedMotion={reducedMotion} />}
  </View>;
}
function Reward({ event, reducedMotion }) {
  const progress = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current, [done, setDone] = useState(reducedMotion);
  useEffect(() => {
    if (reducedMotion) { setDone(true); return; }
    const animation = Animated.sequence([Animated.delay(130), Animated.timing(progress, { toValue: 1, duration: 950, easing: Easing.out(Easing.cubic), useNativeDriver: true })]);
    animation.start(({ finished } = {}) => { if (finished) setDone(true); }); return () => animation.stop();
  }, [reducedMotion]);
  return done ? null : <Animated.View pointerEvents="none" accessibilityElementsHidden style={[A.reward, { opacity: progress.interpolate({ inputRange: [0, 0.12, 0.75, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [24, -14] }) }, { scale: progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.75, 1.1, 1] }) }] }]}><Text style={A.rewardText}>+{event.coins} coins{event.xp ? `  ·  +${event.xp} XP` : ''}</Text></Animated.View>;
}
export function Discovery({ event, reducedMotion }) {
  const progress = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (reducedMotion) { progress.setValue(1); setDone(false); return; }
    const animation = Animated.sequence([
      Animated.delay(180),
      Animated.spring(progress, { toValue: 1, speed: 20, bounciness: 5, useNativeDriver: true }),
      Animated.delay(1150),
      Animated.timing(progress, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]);
    animation.start(({ finished } = {}) => { if (finished) setDone(true); }); return () => animation.stop();
  }, [reducedMotion]);
  if (done) return null;
  return <Animated.View pointerEvents="none" accessibilityLiveRegion="polite" style={[A.discovery, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }, { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}><Text style={A.discoveryIcon}>{event.leveled ? '☼' : '✦'}</Text><View style={{ flex: 1 }}><Text style={A.discoveryTitle}>{event.leveled ? `Hello, level ${event.level}!` : 'A new little discovery'}</Text><Text style={A.discoveryCopy}>{event.name}{event.leveled ? ' · your sketchbook is growing' : ' · added to your collection'}</Text></View></Animated.View>;
}
export function OrderMotion({ ready, identity, reducedMotion, children }) {
  const scale = useRef(new Animated.Value(1)).current, fade = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reducedMotion) { fade.setValue(1); scale.setValue(1); return; }
    const animation = Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: reducedMotion ? 0 : 190, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, speed: 22, bounciness: 7, useNativeDriver: true }),
    ]);
    if (!reducedMotion) scale.setValue(0.97);
    animation.start(); return () => animation.stop();
  }, [identity, reducedMotion]);
  const priorReady = useRef(ready);
  useEffect(() => {
    if (!ready || priorReady.current === ready || reducedMotion) { priorReady.current = ready; return; }
    priorReady.current = ready;
    const animation = Animated.sequence([
      Animated.timing(scale, { toValue: 1.035, duration: 130, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, speed: 22, bounciness: 7, useNativeDriver: true }),
    ]);
    animation.start(); return () => animation.stop();
  }, [ready, reducedMotion]);
  return <Animated.View style={{ opacity: fade, transform: [{ scale }] }}>{children}</Animated.View>;
}
const A = StyleSheet.create({
  hud: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 23, padding: 15, marginVertical: 9, gap: 12, zIndex: 3 }, row: { flexDirection: 'row', alignItems: 'center', gap: 15 }, level: { width: 47, height: 47, borderRadius: 24, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }, levelNumber: { color: C.green, fontSize: 21, fontWeight: '800' }, label: { fontSize: 9, color: C.muted, letterSpacing: 0.6 }, xpCopy: { fontSize: 10, color: C.muted, marginBottom: 8 }, track: { height: 7, borderRadius: 8, backgroundColor: '#ECEBDE', overflow: 'hidden' }, fill: { width: '100%', height: '100%', borderRadius: 8, backgroundColor: '#94AF79' }, counter: { flex: 1, flexDirection: 'row', gap: 9, alignItems: 'center' }, counterIcon: { color: '#AA8640', fontSize: 23 }, amount: { color: C.ink, fontWeight: '800', fontSize: 18 }, reward: { position: 'absolute', top: 55, right: 15, backgroundColor: '#36543EF0', paddingVertical: 9, paddingHorizontal: 14, borderRadius: 20, zIndex: 40 }, rewardText: { color: '#FFF5C5', fontWeight: '800', fontSize: 12 }, discovery: { flexDirection: 'row', gap: 11, alignItems: 'center', backgroundColor: '#F5EAC5', borderRadius: 18, padding: 13, borderWidth: 1, borderColor: '#E3CE8D', marginTop: 5 }, discoveryIcon: { color: '#AA8232', fontSize: 26 }, discoveryTitle: { color: C.ink, fontSize: 13, fontWeight: '800' }, discoveryCopy: { color: C.muted, fontSize: 11, lineHeight: 17, marginTop: 3 },
});
