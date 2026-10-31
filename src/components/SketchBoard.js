import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { cluesFor, FILLED, EMPTY, UNKNOWN } from '../core/nonogram/solver';
import { colors as C } from '../theme';

export default function SketchBoard({ session, mode, zoom, onStroke, disabled, hintLine, reducedMotion }) {
  const n = session.grid.length;
  const cell = n === 5 ? 46 : zoom ? 44 : 30;
  const clueWidth = 68;
  const clues = useMemo(() => cluesFor(session.puzzle.solution), [session.puzzle]);
  const maxClues = Math.max(...clues.cols.map(c => c.length));
  const board = useRef(null);
  const stroke = useRef(null);
  const [preview, setPreview] = useState(null);
  const latest = useRef({ session, mode, disabled, onStroke });
  latest.current = { session, mode, disabled, onStroke };
  function visit(pageX, pageY) {
    const active = stroke.current;
    if (!active) return;
    const col = Math.floor((pageX - active.x) / cell);
    const row = Math.floor((pageY - active.y) / cell);
    if (row < 0 || col < 0 || row >= n || col >= n) return;
    const previous = active.last;
    active.last = { row, col };
    if (previous) {
      const distance = Math.max(Math.abs(previous.row - row), Math.abs(previous.col - col));
      for (let i = 1; i < distance; i++) {
        const r = Math.round(previous.row + (row - previous.row) * i / distance);
        const c = Math.round(previous.col + (col - previous.col) * i / distance);
        active.changes.set(`${r}:${c}`, { row: r, col: c, value: active.value });
      }
    }
    const key = `${row}:${col}`;
    if (active.changes.has(key)) return;
    if (active.value === null) {
      const target = latest.current.mode;
      active.value = latest.current.session.grid[row][col] === target ? UNKNOWN : target;
    }
    active.changes.set(key, { row, col, value: active.value });
    setPreview([...active.changes.values()]);
  }
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !latest.current.disabled,
    onMoveShouldSetPanResponder: () => !latest.current.disabled,
    onPanResponderGrant: event => {
      const { pageX, pageY } = event.nativeEvent;
      const active = { x: 0, y: 0, changes: new Map(), value: null };
      stroke.current = active;
      board.current?.measureInWindow((x, y) => {
        if (stroke.current !== active) return;
        active.x = x; active.y = y; active.ready = true;
        visit(pageX, pageY);
      });
    },
    onPanResponderMove: event => {
      if (stroke.current?.ready) visit(event.nativeEvent.pageX, event.nativeEvent.pageY);
    },
    onPanResponderRelease: () => {
      const changes = stroke.current ? [...stroke.current.changes.values()] : [];
      stroke.current = null; setPreview(null);
      if (changes.length) latest.current.onStroke(changes);
    },
    onPanResponderTerminate: () => { stroke.current = null; setPreview(null); },
    onPanResponderTerminationRequest: () => false,
  }), [cell, n]);
  const changes = new Map((preview || []).map(c => [`${c.row}:${c.col}`, c.value]));
  const clueText = (numbers) => numbers.length ? numbers : [0];
  return <View style={styles.frame}>
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ padding: 10 }}>
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 6 }}>
          <View style={{ width: clueWidth }} />
          {clues.cols.map((numbers, c) => <View key={c} style={[styles.colClue, { width: cell, height: maxClues * 17 + 7 }, hintLine?.kind === 'col' && hintLine.index === c && styles.hint]}>
            {clueText(numbers).map((num, i) => <Text key={i} style={styles.number}>{num}</Text>)}
          </View>)}
        </View>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: clueWidth }}>
            {clues.rows.map((numbers, r) => <View key={r} style={[styles.rowClue, { height: cell }, hintLine?.kind === 'row' && hintLine.index === r && styles.hint]}><Text style={styles.number}>{clueText(numbers).join('  ')}</Text></View>)}
          </View>
          <View ref={board} collapsable={false} {...responder.panHandlers} style={{ width: cell * n }}>
            {session.grid.map((row, r) => <View key={r} style={{ flexDirection: 'row' }}>
              {row.map((value, c) => {
                const shown = changes.has(`${r}:${c}`) ? changes.get(`${r}:${c}`) : value;
                return <AnimatedTile key={c} value={shown} reducedMotion={reducedMotion} disabled={disabled} accessibilityRole="button"
                  accessibilityLabel={`Row ${r + 1}, column ${c + 1}, ${shown === FILLED ? 'filled' : shown === EMPTY ? 'marked empty' : 'unknown'}`}
                  accessibilityHint="Activate to apply the selected fill, mark or erase tool"
                  onPress={() => onStroke([{ row: r, col: c, value: value === mode ? UNKNOWN : mode }])}
                  style={[styles.cell, { width: cell, height: cell }, { backgroundColor: shown === FILLED ? C.green : C.tiles[Math.floor(r / Math.max(1, Math.ceil(n / 5)))] }]}>
                  <Text style={[styles.mark, shown === FILLED && { color: C.white }]}>{shown === EMPTY ? '×' : shown === FILLED ? '✦' : ''}</Text>
                </AnimatedTile>;
              })}
            </View>)}
          </View>
        </View>
      </View>
    </ScrollView>
  </View>;
}
function AnimatedTile({ value, reducedMotion, style, children, ...props }) {
  const scale = useRef(new Animated.Value(1)).current;
  const previous = useRef(value);
  useEffect(() => {
    if (previous.current === value || reducedMotion) { previous.current = value; scale.setValue(1); return; }
    previous.current = value;
    scale.setValue(0.91);
    const animation = Animated.timing(scale, { toValue: 1, duration: 130, useNativeDriver: true });
    animation.start(); return () => animation.stop();
  }, [value, reducedMotion, scale]);
  return <Animated.View style={{ transform: [{ scale }] }}><Pressable {...props} style={style}>{children}</Pressable></Animated.View>;
}
const styles = StyleSheet.create({
  frame: { backgroundColor: C.white, borderWidth: 4, borderColor: C.line, borderRadius: 22, marginVertical: 14, overflow: 'hidden' },
  cell: { borderWidth: 2, borderColor: C.white, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  mark: { color: '#4C594C', fontSize: 20, fontWeight: '600' },
  number: { fontSize: 12, color: C.ink, fontWeight: '700' },
  colClue: { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4, borderRadius: 7 },
  rowClue: { alignItems: 'flex-end', justifyContent: 'center', paddingRight: 8, borderRadius: 7 },
  hint: { backgroundColor: '#F0DDA8' },
});
