import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState, BackHandler, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors as C } from '../theme';

export const clone = value => JSON.parse(JSON.stringify(value));
export function useGameState(initial, onSave) {
  const [state, setState] = useState(() => clone(initial));
  const current = useRef(state);
  const alive = useRef(true);
  const save = useRef(onSave); save.current = onSave;
  const change = useRef(recipe => {
    const next = clone(current.current);
    const replacement = recipe(next);
    current.current = replacement || next;
    if (alive.current) setState(current.current); save.current(current.current);
    return current.current;
  }).current;
  useEffect(() => {
    alive.current = true;
    const subscription = AppState.addEventListener('change', status => { if (status !== 'active') save.current(current.current); });
    return () => { alive.current = false; subscription.remove(); save.current(current.current); };
  }, []);
  return [state, change, current];
}
export function usePuzzleClock(current, change, active) {
  useEffect(() => {
    if (!active) return;
    let foreground = AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
    let started = Date.now();
    const id = current.current.active;
    const flush = () => {
      const seconds = foreground ? Math.max(0, Math.floor((Date.now() - started) / 1000)) : 0;
      started += seconds * 1000;
      if (seconds) change(s => { if (s.sessions[id]) s.sessions[id].seconds += seconds; });
    };
    const timer = setInterval(flush, 1000);
    const subscription = AppState.addEventListener('change', status => {
      if (status === 'active') { started = Date.now(); foreground = true; }
      else { flush(); foreground = false; }
    });
    return () => { clearInterval(timer); subscription.remove(); flush(); };
  }, [active, current.current.active, current, change]);
}
export function Button({ children, onPress, disabled, secondary, selected, small, label }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled, selected: !!selected }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [U.button, secondary && U.secondary, small && U.small, selected && U.selected, (pressed || disabled) && { opacity: disabled ? 0.35 : 0.72 }]}>
    <Text style={[U.buttonText, secondary && { color: C.ink }, selected && { color: C.white }]}>{children}</Text>
  </Pressable>;
}
export function Header({ name, title, onExit, onHelp }) {
  return <View style={U.header}><Button small secondary onPress={onExit} label="Back to games">←</Button><View style={{ flex: 1 }}><Text style={U.eyebrow}>{name.toUpperCase()}</Text><Text style={U.heading}>{title}</Text></View><Button small secondary onPress={onHelp} label={`How to play ${name}`}>?</Button></View>;
}
export function Page({ children, name, title, onExit, help, reducedMotion, scroll = true, onHelpOpen, onHelpClose }) {
  const [showHelp, setShowHelp] = useState(false);
  const exit = useRef(onExit); exit.current = onExit;
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { exit.current(); return true; });
    return () => subscription.remove();
  }, []);
  const closeHelp = () => { setShowHelp(false); onHelpClose?.(); };
  return <View style={{ flex: 1 }}>
    {scroll ? <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={U.page}><Header name={name} title={title} onExit={onExit} onHelp={() => { onHelpOpen?.(); setShowHelp(true); }} />{children}</ScrollView></KeyboardAvoidingView>
      : <><View style={U.gameHeader}><Header name={name} title={title} onExit={onExit} onHelp={() => { onHelpOpen?.(); setShowHelp(true); }} /></View>{children}</>}
    <Modal visible={showHelp} transparent animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={closeHelp}><View style={U.shade}><View style={U.sheet} accessibilityViewIsModal><ScrollView><Text style={U.hero}>{name}</Text><Text style={U.body}>{help}</Text></ScrollView><Button onPress={closeHelp}>Let’s play</Button></View></View></Modal>
  </View>;
}
export function Notice({ children }) { return children ? <View style={U.notice}><Text accessibilityLiveRegion="polite" style={U.body}>{children}</Text></View> : null; }
export function Stats({ children }) { return <View style={U.stats}>{children.map((text, i) => <Text key={i} style={U.stat}>{text}</Text>)}</View>; }
export function Pop({ children, identity, reducedMotion }) {
  const value = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reducedMotion) { value.setValue(1); return; }
    value.setValue(0.92);
    const animation = Animated.spring(value, { toValue: 1, speed: 22, bounciness: 3, useNativeDriver: true });
    animation.start(); return () => animation.stop();
  }, [identity, reducedMotion]);
  return <Animated.View style={{ transform: [{ scale: value }] }}>{children}</Animated.View>;
}
export const U = StyleSheet.create({
  page: { padding: 20, paddingBottom: 35, width: '100%', maxWidth: 660, alignSelf: 'center' }, gameHeader: { padding: 14 }, header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  eyebrow: { color: C.muted, fontSize: 10, letterSpacing: 1.2, fontWeight: '700', textAlign: 'center' }, heading: { color: C.ink, fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 4 }, hero: { fontSize: 29, fontWeight: '800', letterSpacing: -0.8, color: C.ink, marginVertical: 12 },
  body: { color: C.muted, fontSize: 13, lineHeight: 21 }, title: { color: C.ink, fontSize: 16, fontWeight: '700', marginVertical: 8 }, button: { minHeight: 48, backgroundColor: C.green, borderRadius: 17, paddingVertical: 13, paddingHorizontal: 17, justifyContent: 'center', alignItems: 'center', marginVertical: 5 }, buttonText: { color: C.white, fontWeight: '700', fontSize: 13, textAlign: 'center' }, secondary: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line }, selected: { backgroundColor: C.green, borderColor: C.green }, small: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, card: { padding: 16, backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.line, marginVertical: 6 }, stats: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginVertical: 12 }, stat: { color: C.ink, fontSize: 11, backgroundColor: C.white, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 }, notice: { backgroundColor: C.soft, padding: 15, borderRadius: 17, marginVertical: 12 },
  board: { backgroundColor: C.white, borderWidth: 3, borderColor: C.line, borderRadius: 20, overflow: 'hidden', marginVertical: 12 }, stars: { color: '#A57A2F', fontSize: 30, letterSpacing: 5, textAlign: 'center' }, shade: { flex: 1, backgroundColor: '#18352580', padding: 20, alignItems: 'center', justifyContent: 'center' }, sheet: { backgroundColor: C.paper, padding: 23, width: '100%', maxWidth: 480, maxHeight: '85%', borderRadius: 25 },
});
