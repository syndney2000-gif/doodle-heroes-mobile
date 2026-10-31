import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, ActivityIndicator, Alert, Animated, AppState, BackHandler,
  Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Island from './src/components/Island';
import SketchBoard from './src/components/SketchBoard';
import useProgress from './src/useProgress';
import { colors as C } from './src/theme';
import { allPuzzles, chapters } from './src/core/nonogram/puzzles';
import { dailyPuzzle } from './src/core/nonogram/daily';
import { localDateKey } from './src/core/lib/rng';
import { formatTime, starsFor, starText } from './src/core/lib/scoring';
import { applyCells, hint, newSession, streakFor, undo } from './src/core/session';
import { FILLED, EMPTY, UNKNOWN } from './src/core/nonogram/solver';

function Button({ children, onPress, secondary, disabled, small, selected, accessibilityLabel }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel}
    accessibilityState={{ disabled: !!disabled, selected: !!selected }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [S.button, secondary && S.secondary, small && S.smallButton, selected && S.selected,
      disabled && { opacity: 0.4 }, pressed && { opacity: 0.75 }]}>
    <Text style={[S.buttonText, secondary && { color: C.ink }, small && { fontSize: 12 }, selected && { color: C.white }]}>{children}</Text>
  </Pressable>;
}
function TileIcon() {
  return <View style={S.tileIcon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {Array.from({ length: 9 }, (_, i) => <View key={i} style={[S.tinyTile, { backgroundColor: C.tiles[Math.floor(i / 3)] }]}><Text style={S.tinyStar}>{[1, 3, 4, 5, 7].includes(i) ? '✦' : ''}</Text></View>)}
  </View>;
}
function SectionTitle({ children, detail }) {
  return <View style={S.sectionTitle}><Text style={S.sectionText}>{children}</Text>{detail && <Text style={S.eyebrow}>{detail}</Text>}</View>;
}
function Reveal({ children, reducedMotion, identity }) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    value.setValue(reducedMotion ? 1 : 0);
    const animation = Animated.timing(value, { toValue: 1, duration: reducedMotion ? 0 : 220, useNativeDriver: true });
    animation.start(); return () => animation.stop();
  }, [identity, reducedMotion, value]);
  return <Animated.View style={{ opacity: value, transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>{children}</Animated.View>;
}

export default function App() {
  return <SafeAreaProvider><NativeApp /></SafeAreaProvider>;
}
function NativeApp() {
  const store = useProgress();
  const { progress, update } = store;
  const [screen, setScreen] = useState('home');
  const [mode, setMode] = useState(FILLED);
  const [zoom, setZoom] = useState(false);
  const [tutorial, setTutorial] = useState(false);
  const [systemReduced, setSystemReduced] = useState(false);
  const [message, setMessage] = useState('');
  const [hintLine, setHintLine] = useState(null);
  const [today, setToday] = useState(localDateKey());
  const [liveSeconds, setLiveSeconds] = useState(0);
  const session = progress?.sessions[progress.activeId];
  const reducedMotion = systemReduced || !!progress?.reducedMotion;
  const completed = progress ? Object.values(progress.sessions).filter(s => s.completedAt) : [];
  const completedCatalogue = completed.filter(s => allPuzzles.some(p => p.id === s.puzzle.id)).length;
  const nextPuzzle = allPuzzles.find(p => !progress?.sessions[p.id]?.completedAt) || allPuzzles[0];
  const back = () => { setScreen(screen === 'play' ? 'library' : 'home'); setMessage(''); };

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setSystemReduced);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduced);
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (tutorial) { setTutorial(false); return true; }
      if (screen === 'home') return false;
      back(); return true;
    });
    return () => subscription.remove();
  }, [screen, tutorial]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setToday(localDateKey());
    });
    const clock = setInterval(() => setToday(localDateKey()), 60000);
    return () => { subscription.remove(); clearInterval(clock); };
  }, []);
  // Count only foreground play time. Flush at navigation, background and every
  // ten seconds, rather than serializing the whole save on every frame or tick.
  useEffect(() => {
    setLiveSeconds(0);
    if (screen !== 'play' || !session || session.completedAt || tutorial) return;
    const id = session.puzzle.id;
    let started = Date.now();
    let active = AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
    function flush() {
      const seconds = active ? Math.max(0, Math.floor((Date.now() - started) / 1000)) : 0;
      started += seconds * 1000;
      if (seconds) update(p => ({ ...p, sessions: { ...p.sessions, [id]: { ...p.sessions[id], seconds: p.sessions[id].seconds + seconds } } }));
      setLiveSeconds(0);
    }
    const clock = setInterval(() => {
      if (!active) return;
      const seconds = Math.floor((Date.now() - started) / 1000);
      if (seconds >= 10) flush(); else setLiveSeconds(seconds);
    }, 1000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') { started = Date.now(); active = true; }
      else { flush(); active = false; }
    });
    return () => { clearInterval(clock); subscription.remove(); flush(); };
  }, [screen, session?.puzzle.id, !!session?.completedAt, tutorial, update]);

  function openPuzzle(puzzle) {
    update(p => ({ ...p, activeId: puzzle.id, sessions: { ...p.sessions, [puzzle.id]: p.sessions[puzzle.id] || newSession(puzzle) } }));
    setMode(FILLED); setHintLine(null); setMessage(''); setZoom(false); setScreen('play');
  }
  function openDaily() {
    try { openPuzzle(dailyPuzzle(today)); }
    catch { Alert.alert('Daily sketch unavailable', 'The local generator could not create today’s sketch. You can still play every catalogue puzzle.'); }
  }
  function changeSession(recipe) {
    update(p => {
      const current = p.sessions[p.activeId];
      if (!current) return p;
      const next = recipe(current);
      return next === current ? p : { ...p, sessions: { ...p.sessions, [p.activeId]: next } };
    });
  }
  function requestReset() {
    Alert.alert('Reset all mobile progress?', 'This removes every saved sketch, star and setting on this device.', [
      { text: 'Keep my progress', style: 'cancel' },
      { text: 'Reset progress', style: 'destructive', onPress: () => { setScreen('home'); store.reset(); } },
    ]);
  }
  const chooseHint = () => {
    const result = hint(session);
    changeSession(() => result.session); setMessage(result.message); setHintLine(result.line || null);
    AccessibilityInfo.announceForAccessibility(result.message);
  };

  if (store.error) return <SafeAreaView style={S.safe}><View style={S.center}><Text style={S.title}>Let’s protect your progress.</Text><Text style={S.body}>{store.error}</Text><Button onPress={store.retry}>Retry loading</Button><Button secondary onPress={requestReset}>Reset saved progress</Button></View></SafeAreaView>;
  if (!progress) return <SafeAreaView style={S.safe}><View style={S.center}><ActivityIndicator color={C.green} size="large" /><Text style={S.body}>Opening your little world…</Text></View></SafeAreaView>;

  const home = <>
    <View style={S.top}><Text style={S.brand}>doodle heroes<Text style={{ color: C.gold }}> ✳</Text></Text><Pressable accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => setScreen('settings')} style={S.avatar}><Text style={S.avatarText}>✿</Text></Pressable></View>
    <Text style={[S.eyebrow, { marginTop: 25 }]}>YOUR POCKET-SIZED HAPPY PLACE</Text>
    <Text style={S.hero}>A little wonder.{"\n"}One tile at a time.</Text>
    <Text style={S.body}>Your island escape, with a softer touch.</Text>
    <View style={S.islandCard}><Island reducedMotion={reducedMotion} /><View style={S.chapterBadge}><Text style={S.badgeText}>✦ THE LANTERN ISLES</Text></View></View>
    <Button onPress={() => openPuzzle(session && !session.completedAt ? session.puzzle : nextPuzzle)}>
      {session && !session.completedAt ? 'Continue your adventure' : 'Start a little adventure'}  →
    </Button>
    <Text style={S.caption}>{session && !session.completedAt ? session.puzzle.title : nextPuzzle.title} · Island Sketch</Text>
    <SectionTitle detail="TODAY">A fresh little challenge</SectionTitle>
    <Pressable accessibilityRole="button" accessibilityLabel="Play today’s daily Island Sketch" onPress={openDaily} style={({ pressed }) => [S.dailyCard, pressed && { opacity: 0.7 }]}>
      <TileIcon /><View style={{ flex: 1 }}><Text style={S.cardTitle}>Island Sketch</Text><Text style={S.cardCopy}>Find the picture in the pastels.</Text><Text style={S.chip}>10 × 10 · Daily logic</Text></View><Text style={S.arrow}>↗</Text>
    </Pressable>
    <View style={S.streak}><View><Text style={S.smallBold}>✦ {streakFor(progress, today)} lovely {streakFor(progress, today) === 1 ? 'day' : 'days'}</Text><Text style={S.cardCopy}>A little play goes a long way.</Text></View><Text style={S.dots}>{'●'.repeat(Math.min(7, streakFor(progress, today)))}{'○'.repeat(Math.max(0, 7 - streakFor(progress, today)))}</Text></View>
    <Button secondary onPress={() => setScreen('library')}>Explore the game collection  ▦</Button>
  </>;

  const library = <>
    <Text style={S.eyebrow}>YOUR LITTLE COLLECTION</Text><Text style={S.hero}>Find your{"\n"}kind of play.</Text><Text style={S.body}>Island Sketch is ready to explore. More games are on their way.</Text>
    <Button onPress={openDaily}>Today’s daily sketch  ✦</Button>
    {chapters.map(chapter => <View key={chapter.id}>
      <SectionTitle detail={`${chapter.puzzles.length} SKETCHES`}>{chapter.title}</SectionTitle>
      <Text style={[S.cardCopy, { marginBottom: 9 }]}>{chapter.blurb}</Text>
      {chapter.puzzles.map(puzzle => {
        const saved = progress.sessions[puzzle.id];
        return <Pressable key={puzzle.id} accessibilityRole="button" onPress={() => openPuzzle(puzzle)} style={({ pressed }) => [S.puzzleRow, pressed && { opacity: 0.7 }]}>
          <View style={S.puzzleIcon}><Text style={S.puzzleGlyph}>{saved?.completedAt ? '✦' : '▧'}</Text></View>
          <View style={{ flex: 1 }}><Text style={S.cardTitle}>{puzzle.title}</Text><Text style={S.cardCopy}>{puzzle.solution.length} × {puzzle.solution.length} · {saved?.completedAt ? `${starText(starsFor(saved.hints))} Complete` : saved ? 'Ready to continue' : 'A fresh page'}</Text></View><Text style={S.arrow}>→</Text>
        </Pressable>;
      })}
    </View>)}
    <SectionTitle detail="IN DEVELOPMENT">Next on the island</SectionTitle>
    {['Isle Spans · bridge-building logic', 'Lighthouse Wiring · rotating tiles', 'Doodle Guess · a daily mystery', 'Margin Merge · combine and discover', 'Scribble Siege · action survival'].map(name => <View style={S.upcoming} key={name}><Text style={S.cardCopy}>{name}</Text><Text style={S.eyebrow}>SOON</Text></View>)}
  </>;

  const play = session && <>
    <View style={S.top}><Pressable accessibilityRole="button" accessibilityLabel="Back to game library" onPress={back} style={S.avatar}><Text style={S.avatarText}>←</Text></Pressable><View style={{ flex: 1, alignItems: 'center' }}><Text style={S.eyebrow}>ISLAND SKETCH</Text><Text style={S.playTitle}>{session.puzzle.title}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="How to play" onPress={() => setTutorial(true)} style={S.avatar}><Text style={S.avatarText}>?</Text></Pressable></View>
    <View style={S.stats}><Text style={S.statText}>{session.grid.length} × {session.grid.length} · {session.puzzle.id.startsWith('daily-') ? 'Daily' : 'Catalogue'}</Text><Text style={S.statText}>{formatTime(session.seconds + liveSeconds)} · {session.hints} hints</Text></View>
    <View style={S.ruleStrip}><Text style={S.rule}>1 · 3 · 5{"\n"}<Text style={S.ruleCopy}>Follow clues</Text></Text><Text style={S.rule}>▧{"\n"}<Text style={S.ruleCopy}>Fill or mark</Text></Text><Text style={S.rule}>✧{"\n"}<Text style={S.ruleCopy}>Reveal a doodle</Text></Text></View>
    {!session.completedAt && <View style={S.tools}>
      {[[FILLED, '▧ Fill'], [EMPTY, '× Mark'], [UNKNOWN, '○ Erase']].map(([value, label]) => <View style={{ flex: 1 }} key={value}><Button small secondary selected={mode === value} onPress={() => setMode(value)}>{label}</Button></View>)}
    </View>}
    <SketchBoard session={session} mode={mode} zoom={zoom} disabled={!!session.completedAt} hintLine={hintLine} reducedMotion={reducedMotion}
      onStroke={changes => { changeSession(s => applyCells(s, changes)); setMessage(''); setHintLine(null); }} />
    {session.grid.length > 5 && <Button small secondary onPress={() => setZoom(!zoom)}>{zoom ? 'Smaller cells' : 'Larger cells'} · swipe below clues to scroll sideways</Button>}
    {!session.completedAt ? <>
      <View style={S.tools}><View style={{ flex: 1 }}><Button small secondary disabled={!session.history.length} onPress={() => { changeSession(undo); setHintLine(null); setMessage(''); }}>↶ Undo</Button></View><View style={{ flex: 1 }}><Button small secondary onPress={chooseHint}>✧ Hint</Button></View><View style={{ flex: 1 }}><Button small secondary onPress={() => Alert.alert('Clear this sketch?', 'Your timer and hint count will remain. Undo can restore the board.', [{ text: 'Keep drawing', style: 'cancel' }, { text: 'Clear', onPress: () => changeSession(s => applyCells(s, s.grid.flatMap((row, r) => row.map((_, c) => ({ row: r, col: c, value: UNKNOWN }))))) }])}>↺ Clear</Button></View></View>
      <View style={S.helpCard}><Text style={S.helpIcon}>✎</Text><Text style={[S.cardCopy, { flex: 1 }]}>{message || 'Tap or drag to fill squares. Use Mark for empty squares. Each clue describes a run, with a gap between runs. Pastel colors are decorative.'}</Text></View>
    </> : <Reveal identity={session.puzzle.id} reducedMotion={reducedMotion}><View style={S.completion}>
      <Text style={S.stars}>{starText(starsFor(session.hints))}</Text><Text style={S.completionTitle}>A little more light.</Text><Text style={S.body}>{session.puzzle.note}</Text>
      <Text style={S.caption}>Saved to your journal · {formatTime(session.seconds)} · {session.hints} hints</Text>
      <Button onPress={() => openPuzzle(allPuzzles.find(p => p.id !== session.puzzle.id && !progress.sessions[p.id]?.completedAt) || allPuzzles[0])}>Find the next little wonder  →</Button>
      <Button secondary onPress={() => setScreen('journal')}>Open your journal</Button>
    </View></Reveal>}
  </>;

  const journal = <>
    <Text style={S.eyebrow}>YOUR LITTLE JOURNAL</Text><Text style={S.hero}>Look how far{"\n"}you’ve wandered.</Text>
    <View style={S.progressCircle}><Text style={S.progressNumber}>{completedCatalogue}</Text><Text style={S.cardCopy}>of {allPuzzles.length} sketches</Text></View>
    <Text style={[S.body, { textAlign: 'center' }]}>{completed.length ? 'Every sketch brings a little more light.' : 'Your first discovery is waiting on the island.'}</Text>
    <View style={S.streak}><Text style={S.smallBold}>✦ Current streak</Text><Text style={S.smallBold}>{streakFor(progress, today)} days</Text></View>
    <SectionTitle>Little milestones</SectionTitle>
    {[['First light', 'Finish your first sketch', completed.length >= 1], ['A page of wonders', 'Complete all four Shore sketches', chapters[0].puzzles.every(p => progress.sessions[p.id]?.completedAt)], ['A thoughtful start', 'Finish a sketch without hints', completed.some(s => !s.hints)]].map(([title, copy, earned]) => <View key={title} style={S.puzzleRow}><View style={S.puzzleIcon}><Text style={[S.puzzleGlyph, !earned && { opacity: 0.25 }]}>{earned ? '✦' : '○'}</Text></View><View><Text style={S.cardTitle}>{title}</Text><Text style={S.cardCopy}>{earned ? 'Earned · ' : ''}{copy}</Text></View></View>)}
    <SectionTitle detail={`${completed.length} COMPLETE`}>Your discoveries</SectionTitle>
    {completed.length ? completed.map(s => <Pressable accessibilityRole="button" key={s.puzzle.id} style={S.puzzleRow} onPress={() => openPuzzle(s.puzzle)}><View style={{ flex: 1 }}><Text style={S.cardTitle}>{s.puzzle.title}</Text><Text style={S.cardCopy}>{formatTime(s.seconds)} · {s.hints} hints</Text></View><Text style={S.starsSmall}>{starText(starsFor(s.hints))}</Text></Pressable>) : <Text style={S.body}>Solve a sketch to add its picture to your journal.</Text>}
    <Button secondary onPress={() => setScreen('settings')}>Settings and accessibility</Button>
  </>;

  const settings = <>
    <Text style={S.eyebrow}>MAKE YOURSELF AT HOME</Text><Text style={S.hero}>Your pace.{"\n"}Your little world.</Text>
    <View style={S.setting}><View style={{ flex: 1 }}><Text style={S.cardTitle}>Reduce motion</Text><Text style={S.cardCopy}>Keep the island still and simplify transitions.</Text></View><Switch accessibilityLabel="Reduce motion" value={progress.reducedMotion} onValueChange={value => update(p => ({ ...p, reducedMotion: value }))} trackColor={{ false: C.line, true: '#9CB48A' }} thumbColor={C.white} /></View>
    {systemReduced && <Text style={S.cardCopy}>Your device’s reduced-motion preference is also respected.</Text>}
    <View style={S.helpCard}><Text style={S.body}>Everything in this build stays on your device. Island Sketch works without a website, account or internet connection once installed.</Text></View>
    <Text style={S.body}>Daily sketches use your local calendar date. A sketch already in progress keeps its original date when midnight passes.</Text>
    <Button secondary onPress={() => setTutorial(true)}>How to play Island Sketch</Button>
    <Button secondary onPress={requestReset}>Reset mobile progress</Button>
    <Text style={S.caption}>Meadow Tiles · native milestone 1{"\n"}12 catalogue puzzles + local daily generation{"\n"}The other five games and expedition map are next.</Text>
  </>;

  return <SafeAreaView style={S.safe} edges={['top', 'bottom', 'left', 'right']}>
    {store.saveError && <Pressable accessibilityRole="button" onPress={store.retrySave} style={S.saveError}><Text style={S.smallBold}>{store.saveError} Tap to retry.</Text></Pressable>}
    <ScrollView key={screen} contentContainerStyle={S.content} keyboardShouldPersistTaps="handled">
      <Reveal identity={screen} reducedMotion={reducedMotion}>{screen === 'home' ? home : screen === 'library' ? library : screen === 'play' ? play : screen === 'journal' ? journal : settings}</Reveal>
    </ScrollView>
    <View style={S.nav}>{[['home', '⌂', 'Home'], ['library', '▦', 'Games'], ['journal', '☆', 'Journal']].map(([id, icon, label]) => <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: screen === id }} onPress={() => { setScreen(id); setMessage(''); }} style={[S.navItem, screen === id && S.navActive]}><Text style={[S.navIcon, screen === id && { color: C.ink }]}>{icon}</Text><Text style={S.navLabel}>{label}</Text></Pressable>)}</View>
    <Modal visible={tutorial} transparent animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={() => setTutorial(false)}>
      <View style={S.modalShade}><View style={S.modalCard} accessibilityViewIsModal>
        <ScrollView><Text style={S.eyebrow}>A QUICK LITTLE GUIDE</Text><Text style={S.title}>A picture in the numbers.</Text><Text style={S.body}>Each number tells you the length of a filled run in that row or column. Leave at least one empty square between runs.</Text>
          <View style={S.example}><Text style={S.smallBold}>Clue: 2  1</Text><Text style={S.exampleCells}>■ ■ × ■ ×</Text></View>
          <Text style={S.body}>Fill paints squares. Mark adds an × to empty squares. Erase removes either. Drag across the board to paint a stroke; Undo reverses the whole stroke.</Text><Text style={S.body}>Every row and column must agree. The picture is complete when all filled squares are correct. Empty squares can stay unmarked.</Text><Text style={S.body}>Hints apply a deduction from the solver and explain the line. Three stars minus one per hint, with at least one star. Undoing a hint does not remove its cost.</Text><Text style={S.body}>On larger boards, enlarge the cells and scroll using the number-clue area. Pastel colors are decoration, not additional rules.</Text>
        </ScrollView><Button onPress={() => setTutorial(false)}>Let’s make a little wonder</Button>
      </View></View>
    </Modal>
  </SafeAreaView>;
}
const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper }, content: { padding: 22, paddingBottom: 32, maxWidth: 620, width: '100%', alignSelf: 'center' },
  center: { flex: 1, padding: 28, justifyContent: 'center', gap: 16 }, top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  brand: { fontSize: 23, fontWeight: '800', color: C.ink, letterSpacing: -0.8 }, avatar: { width: 46, height: 46, borderRadius: 24, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }, avatarText: { fontSize: 24, color: C.ink },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: C.muted, fontWeight: '700' }, hero: { color: C.ink, fontSize: 37, lineHeight: 41, fontWeight: '800', letterSpacing: -1.3, marginTop: 12 },
  title: { color: C.ink, fontSize: 28, fontWeight: '800', marginVertical: 12 }, body: { color: C.muted, fontSize: 14, lineHeight: 22, marginVertical: 10 },
  islandCard: { backgroundColor: '#EEF0E4', borderRadius: 30, marginTop: 12, marginBottom: 18, paddingBottom: 10, overflow: 'hidden' }, chapterBadge: { backgroundColor: C.white, borderRadius: 20, alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 7, marginTop: -8 }, badgeText: { color: C.ink, fontSize: 10, fontWeight: '600', letterSpacing: 0.6 },
  button: { minHeight: 52, paddingHorizontal: 17, paddingVertical: 15, backgroundColor: C.green, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginVertical: 5 }, buttonText: { color: C.white, fontSize: 14, fontWeight: '700', textAlign: 'center' }, secondary: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line }, smallButton: { minHeight: 47, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 12 }, selected: { backgroundColor: C.green, borderColor: C.green },
  caption: { color: C.muted, textAlign: 'center', fontSize: 11, lineHeight: 19, marginVertical: 9 }, sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 23, marginBottom: 12 }, sectionText: { fontSize: 17, fontWeight: '700', color: C.ink, flexShrink: 1 },
  dailyCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.white, borderRadius: 24 }, tileIcon: { width: 76, flexDirection: 'row', flexWrap: 'wrap', padding: 5, gap: 3, backgroundColor: '#F4F0E5', borderRadius: 13 }, tinyTile: { width: 20, height: 20, borderRadius: 4, alignItems: 'center', justifyContent: 'center' }, tinyStar: { color: C.white, fontSize: 12 }, cardTitle: { color: C.ink, fontSize: 15, fontWeight: '700' }, cardCopy: { color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 3 }, chip: { color: C.ink, fontSize: 10, backgroundColor: C.soft, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, alignSelf: 'flex-start', marginTop: 9 }, arrow: { color: C.ink, fontSize: 20 },
  streak: { paddingVertical: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, smallBold: { color: C.ink, fontSize: 12, fontWeight: '700', lineHeight: 18 }, dots: { color: '#7E9B69', fontSize: 12, letterSpacing: 3 },
  puzzleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 18, padding: 14, gap: 12, marginBottom: 9, borderWidth: 1, borderColor: C.line }, puzzleIcon: { backgroundColor: C.soft, width: 43, height: 43, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, puzzleGlyph: { fontSize: 23, color: C.green }, upcoming: { padding: 14, borderBottomWidth: 1, borderBottomColor: C.line, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  playTitle: { color: C.ink, fontWeight: '700', fontSize: 16, marginTop: 4, textAlign: 'center' }, stats: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginVertical: 18 }, statText: { color: C.muted, fontSize: 11, backgroundColor: C.white, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 9 }, ruleStrip: { backgroundColor: C.white, borderRadius: 16, padding: 8, flexDirection: 'row', gap: 5 }, rule: { flex: 1, backgroundColor: '#F0F3E9', textAlign: 'center', paddingVertical: 10, fontSize: 15, fontWeight: '700', borderRadius: 9, color: C.ink, lineHeight: 21 }, ruleCopy: { fontSize: 10, fontWeight: '400', color: C.muted }, tools: { flexDirection: 'row', gap: 8, marginTop: 9 }, helpCard: { flexDirection: 'row', gap: 12, backgroundColor: C.soft, borderRadius: 18, padding: 16, alignItems: 'center', marginVertical: 14 }, helpIcon: { color: '#7B965F', fontSize: 30 },
  completion: { backgroundColor: C.soft, padding: 20, borderRadius: 24, marginTop: 10 }, completionTitle: { color: C.ink, fontSize: 27, fontWeight: '800', marginTop: 7 }, stars: { color: '#A57A2F', fontSize: 33, letterSpacing: 6, textAlign: 'center' }, starsSmall: { color: '#A57A2F', fontSize: 18 }, progressCircle: { width: 176, height: 176, borderRadius: 88, borderWidth: 12, borderColor: '#CAD9B6', borderTopColor: C.gold, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 26, marginBottom: 13 }, progressNumber: { color: C.ink, fontSize: 48, fontWeight: '800' }, setting: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 23, borderBottomWidth: 1, borderBottomColor: C.line },
  nav: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: C.white, paddingVertical: 9, borderTopWidth: 1, borderTopColor: C.line }, navItem: { minWidth: 80, minHeight: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 }, navActive: { backgroundColor: C.soft }, navIcon: { color: C.muted, fontSize: 23, lineHeight: 25 }, navLabel: { color: C.ink, fontSize: 10 },
  saveError: { backgroundColor: '#F1DDA8', padding: 12 }, modalShade: { flex: 1, backgroundColor: '#18352580', padding: 22, alignItems: 'center', justifyContent: 'center' }, modalCard: { width: '100%', maxWidth: 480, maxHeight: '88%', borderRadius: 28, backgroundColor: C.paper, padding: 24 }, example: { backgroundColor: C.soft, padding: 16, borderRadius: 16, gap: 10 }, exampleCells: { color: C.green, fontSize: 26, letterSpacing: 6, textAlign: 'center' },
});
