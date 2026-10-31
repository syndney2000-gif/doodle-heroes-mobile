import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors as C } from '../theme';
import { MAX_GUESSES, guessWords, isKnownWord, normalise, over, revealFor, shareText, showHint, starsFor } from '../core/doodle-guess/game';
import { guessRound, newGuess, submitGuess } from '../core/mobileGames';
import { revealedPaths } from '../core/doodle-guess/geometry';
import { starText } from '../core/lib/scoring';
import { Button, Notice, Page, Stats, U, useGameState } from './ui';

export default function DoodleGuess({ initial, onSave, onExit, reducedMotion, today }) {
  const seed = { ...initial, active: initial.active || today, days: { ...initial.days } };
  seed.days[seed.active] ||= newGuess(seed.active);
  const [state, change] = useGameState(seed, onSave);
  const [word, setWord] = useState('');
  const [message, setMessage] = useState('');
  const input = useRef(null);
  const day = state.days[state.active], round = guessRound(day), finished = over(round);
  const suggestions = !finished && normalise(word).length > 1 ? guessWords.filter(w => w.startsWith(normalise(word))).slice(0, 6) : [];
  function submit(value = word) {
    if (!isKnownWord(value)) { setMessage('Choose a word from the suggestion list, or try another common object, animal or place. This did not use a guess.'); return; }
    const next = submitGuess(day, value);
    if (next === day) { setMessage('You have already tried that word. Try something new.'); return; }
    change(s => { s.days[s.active] = next; }); setWord(''); setMessage('');
    if (next.completedAt) Keyboard.dismiss(); else input.current?.focus();
  }
  const help = 'A mystery doodle appears a few strokes at a time. You have six guesses. Each wrong guess reveals more ink; after three misses, you get a category hint. Choose a suggested word or type a common word and tap Guess. Repeated or unknown words do not cost a guess.\n\nThere is one puzzle per local calendar day, and progress stays on your phone. A saved round keeps its date when midnight passes. Share your score without revealing the answer.';
  return <Page name="Doodle Guess" title={`A little mystery · ${state.active}`} onExit={onExit} help={help} reducedMotion={reducedMotion}>
    <Stats>{[`${day.guesses.length} / ${MAX_GUESSES} guesses`, finished ? day.solved ? 'Solved ✦' : 'All ink revealed' : 'Daily doodle']}</Stats>
    {state.active !== today && <Button secondary onPress={() => { change(s => { s.active = today; s.days[today] ||= newGuess(today); }); setWord(''); setMessage(''); }}>Open today’s doodle →</Button>}
    <View style={D.drawing} accessible accessibilityLabel={`Mystery drawing, ${Math.round(revealFor(round) * 100)} percent of its ink revealed`}><Drawing drawing={round.drawing} fraction={revealFor(round)} reducedMotion={reducedMotion} /></View>
    {showHint(round) && !finished && <Notice>Little clue: it’s in the {round.drawing.category} category.</Notice>}
    {!finished ? <>
      <Text style={U.title}>What could it be?</Text>
      <TextInput ref={input} accessibilityLabel="Your doodle guess" placeholder="An animal? An object?" placeholderTextColor={C.muted} value={word} onChangeText={setWord} onSubmitEditing={() => submit()} autoCorrect={false} autoCapitalize="none" returnKeyType="go" maxLength={50} style={D.input} />
      <View style={U.row}>{suggestions.map(w => <Pressable accessibilityRole="button" key={w} onPress={() => submit(w)} style={D.suggestion}><Text style={U.body}>{w}</Text></Pressable>)}</View>
      <Button disabled={!word.trim()} onPress={() => submit()}>Make a guess  ✎</Button><Notice>{message}</Notice>
    </> : <View style={U.notice}><Text style={U.stars}>{day.solved ? starText(starsFor(round)) : '✎'}</Text><Text style={U.hero}>{day.solved ? 'You saw it!' : 'A new little discovery.'}</Text><Text style={U.body}>The doodle was: {round.drawing.answer}. {day.solved ? 'Your result is saved in the journal.' : 'A fresh mystery arrives tomorrow.'}</Text><Button onPress={async () => { try { await Share.share({ message: shareText(round, state.active).replace('doodleheros.com/doodle-guess', 'Doodle Heroes · Meadow Tiles') }); } catch { setMessage('Sharing is unavailable on this device.'); } }}>Share your little result</Button><Notice>{message}</Notice></View>}
    <Text style={U.title}>Your guesses</Text>
    {day.guesses.length ? day.guesses.map((g, i) => <View key={g} style={D.guess}><Text style={U.body}>{i + 1}. {g}</Text><Text style={U.body}>{i === day.guesses.length - 1 && day.solved ? '✓ Found it' : 'More ink →'}</Text></View>) : <Text style={U.body}>Every guess brings the picture a little closer.</Text>}
  </Page>;
}
function Drawing({ drawing, fraction, reducedMotion }) {
  const [amount, setAmount] = useState(reducedMotion ? fraction : 0);
  const last = useRef(0), identity = useRef(drawing.id);
  useEffect(() => {
    if (identity.current !== drawing.id) { identity.current = drawing.id; last.current = 0; }
    if (reducedMotion) { last.current = fraction; setAmount(fraction); return; }
    const from = last.current, start = Date.now(); let frame;
    const animate = () => {
      const t = Math.min(1, (Date.now() - start) / 650);
      const next = from + (fraction - from) * t;
      last.current = next; setAmount(next);
      if (t < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate); return () => cancelAnimationFrame(frame);
  }, [drawing.id, fraction, reducedMotion]);
  return <Svg width="100%" height="100%" viewBox="0 0 100 100">{revealedPaths(drawing, amount).map((d, i) => <Path key={i} d={d} stroke={C.ink} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" fill="none" />)}</Svg>;
}
const D = StyleSheet.create({
  drawing: { width: '100%', aspectRatio: 1, backgroundColor: C.white, borderWidth: 3, borderColor: C.line, borderRadius: 26, padding: 22, marginVertical: 12 }, input: { borderWidth: 1.5, borderColor: '#A6B69B', backgroundColor: C.white, color: C.ink, padding: 16, minHeight: 52, borderRadius: 17, fontSize: 17 }, suggestion: { backgroundColor: C.soft, borderRadius: 20, minHeight: 44, paddingHorizontal: 13, justifyContent: 'center', marginTop: 8 }, guess: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 12 },
});
