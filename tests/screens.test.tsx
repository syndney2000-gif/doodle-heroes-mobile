import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Alert, Animated, AppState } from 'react-native';
import App from '../App';
import LogicGame from '../src/games/LogicGames';
import DoodleGuess from '../src/games/DoodleGuess';
import MarginMerge from '../src/games/MarginMerge';
import ScribbleSiege from '../src/games/ScribbleSiege';
import { emptyGames } from '../src/core/mobileGames';
import { dailyDrawing } from '../src/core/doodle-guess/game';
import { newState } from '../src/core/merge/engine';
import storage from '@react-native-async-storage/async-storage';
const today='2026-10-31';
let renderer;
const text = node => typeof node === 'string' ? node : (node.children || []).map(text).join('');
const press = async (label, partial = true) => {
  const button = renderer.root.findAllByType('Pressable').find(b => b.props.accessibilityLabel === label || (partial ? text(b).includes(label) : text(b) === label));
  expect(button, `Missing button: ${label}`).toBeTruthy();
  expect(button.props.disabled, `Disabled button: ${label}`).not.toBe(true);
  await act(async () => { button.props.onPress(); });
};
async function mount(component) { await act(async () => { renderer=create(component); }); }
const base = { today, reducedMotion:true, onExit:vi.fn() };
beforeEach(async () => {
  Animated.__hold=false;
  vi.useFakeTimers(); vi.setSystemTime(new Date(today+'T12:00:00Z'));
  globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  vi.stubGlobal('requestAnimationFrame',callback=>setTimeout(()=>callback(Date.now()),16));
  vi.stubGlobal('cancelAnimationFrame',id=>clearTimeout(id));
  await storage.clear();
});
afterEach(async () => { if(renderer){await act(async()=>renderer.unmount());renderer=null;} vi.useRealTimers();vi.unstubAllGlobals(); });

describe('native game screens',()=>{
  it('opens the home and routes into all five newly playable games',async()=>{
    await mount(<App />);
    for(const title of ['Isle Spans','Lighthouse Wiring','Doodle Guess','Margin Merge','Scribble Siege']){
      await press(title);
      expect(renderer.root.findAllByType('Pressable').some(b=>b.props.accessibilityLabel==='Back to games')).toBe(true);
      await press('Back to games');
    }
  });
  it('builds a bridge with two island taps and can undo the stroke',async()=>{
    const save=vi.fn(); await mount(<LogicGame {...base} kind="bridges" initial={emptyGames().bridges} onSave={save} />);
    await press('Two Coves');
    const islands=()=>renderer.root.findAllByType('Pressable').filter(b=>b.props.accessibilityLabel?.startsWith('Island row'));
    await act(async()=>islands()[0].props.onPress());
    await act(async()=>islands()[1].props.onPress());
    expect(save.mock.calls.at(-1)[0].sessions['two-coves'].values.some(v=>v===1)).toBe(true);
    await press('Undo'); expect(save.mock.calls.at(-1)[0].sessions['two-coves'].values.every(v=>v===0)).toBe(true);
  });
  it('rotates a wire, locks it, and prevents accidental rotation',async()=>{
    const save=vi.fn();await mount(<LogicGame {...base} kind="net" initial={emptyGames().net} onSave={save} />);
    await press('First Light');
    const tile=()=>renderer.root.findAllByType('Pressable').find(b=>b.props.accessibilityLabel?.startsWith('Row 1, column 1,'));
    await act(async()=>tile().props.onPress());
    expect(save.mock.calls.at(-1)[0].sessions['first-light'].values[0]).toBe(1);
    await press('Lock');await act(async()=>tile().props.onPress());await press('Rotate');await act(async()=>tile().props.onPress());
    expect(save.mock.calls.at(-1)[0].sessions['first-light'].values[0]).toBe(1);
  });
  it('accepts a real daily answer and renders its saved result',async()=>{
    const save=vi.fn();await mount(<DoodleGuess {...base} initial={emptyGames().guess} onSave={save} />);
    await act(async()=>renderer.root.findByType('TextInput').props.onChangeText(dailyDrawing(today).answer));
    await press('Make a guess');
    expect(save.mock.calls.at(-1)[0].days[today].solved).toBe(true);
    expect(text(renderer.toJSON())).toContain('You saw it!');
  });
  it('merges two matching items through the tap controls',async()=>{
    const initial=newState(1,Date.now());initial.cells[0]={chain:'heroes',tier:1};initial.cells[1]={chain:'heroes',tier:1};
    const save=vi.fn();await mount(<MarginMerge {...base} initial={initial} onSave={save} />);
    await press('Ink Dot, tier 1, row 1, column 1');await press('Ink Dot, tier 1, row 1, column 2');
    const next=save.mock.calls.at(-1)[0];expect(next.cells[0]).toBeNull();expect(next.cells[1].tier).toBe(2);expect(next.merges).toBe(1);
  });
  it('starts a drag before PanResponder has populated x0 and commits the drop once',async()=>{
    const initial=newState(1,Date.now());initial.cells[0]={chain:'heroes',tier:1};initial.cells[1]={chain:'heroes',tier:1};
    const save=vi.fn();await mount(<MarginMerge {...base} reducedMotion={false} initial={initial} onSave={save} />);
    const board=()=>renderer.root.findAllByType('View').find(v=>typeof v.props.onMoveShouldSetPanResponderCapture==='function');
    const event={nativeEvent:{pageX:25,pageY:25}},gesture={x0:0,y0:0,moveX:55,moveY:25,dx:30,dy:0,numberActiveTouches:1};
    await act(async()=>board().props.onStartShouldSetPanResponderCapture(event));
    expect(board().props.onMoveShouldSetPanResponderCapture(event,gesture)).toBe(true);
    await act(async()=>board().props.onPanResponderGrant(event,gesture));
    await act(async()=>board().props.onPanResponderMove({nativeEvent:{pageX:75,pageY:25}},{...gesture,moveX:75,dx:50}));
    await act(async()=>board().props.onPanResponderRelease({nativeEvent:{pageX:75,pageY:25}},{...gesture,moveX:75,dx:50}));
    const saved=save.mock.calls.at(-1)[0];expect(saved.merges).toBe(1);expect(saved.cells[1].tier).toBe(2);expect(saved.cells[0]).toBeNull();
    expect(save.mock.calls.filter(([data])=>data.merges===1)).toHaveLength(1);
  });
  it('keeps a doodle in its original square when dropped outside the board',async()=>{
    const initial=newState(1,Date.now());initial.cells[0]={chain:'heroes',tier:1};
    const save=vi.fn();await mount(<MarginMerge {...base} reducedMotion={false} initial={initial} onSave={save} />);
    const board=()=>renderer.root.findAllByType('View').find(v=>typeof v.props.onMoveShouldSetPanResponderCapture==='function');
    await act(async()=>board().props.onStartShouldSetPanResponderCapture({nativeEvent:{pageX:25,pageY:25}}));
    const gesture={x0:0,y0:0,moveX:40,moveY:25,dx:15,dy:0,numberActiveTouches:1};
    await act(async()=>board().props.onPanResponderGrant({nativeEvent:{pageX:40,pageY:25}},gesture));
    await act(async()=>board().props.onPanResponderRelease({nativeEvent:{pageX:-20,pageY:25}},{...gesture,moveX:-20,dx:-45}));
    expect(save.mock.calls.at(-1)[0].cells).toEqual(initial.cells);expect(save.mock.calls.at(-1)[0].merges).toBe(0);
  });
  it('allows rapid merges and saves them before decorative effects complete',async()=>{
    const initial=newState(1,Date.now());for(const i of [0,1,2,3])initial.cells[i]={chain:'heroes',tier:1};
    const save=vi.fn();await mount(<MarginMerge {...base} reducedMotion={false} initial={initial} onSave={save} />);
    Animated.__hold=true;
    await press('Ink Dot, tier 1, row 1, column 1');await press('Ink Dot, tier 1, row 1, column 2');
    await press('Ink Dot, tier 1, row 1, column 3');await press('Ink Dot, tier 1, row 1, column 4');
    const result=save.mock.calls.at(-1)[0];expect(result.merges).toBe(2);expect(result.cells[1].tier).toBe(2);expect(result.cells[3].tier).toBe(2);
    expect(result).not.toHaveProperty('motion');
    await act(async()=>{for(const listener of AppState.listeners)listener('background');});
    expect(save.mock.calls.at(-1)[0].merges).toBe(2);
    Animated.__hold=false;
  });
  it('starts, pauses, saves, resumes and ends a siege with a single banked reward',async()=>{
    const save=vi.fn();await mount(<ScribbleSiege {...base} initial={emptyGames().siege} onSave={save} />);
    await press('Start a fresh siege');
    await act(async()=>vi.advanceTimersByTime(6100));
    await press('Pause');let saved=save.mock.calls.at(-1)[0];expect(saved.run.game.t).toBeGreaterThan(5);
    const pausedTime=saved.run.game.t;await act(async()=>vi.advanceTimersByTime(2000));
    expect(save.mock.calls.at(-1)[0].run.game.t).toBe(pausedTime);
    await press('Resume the adventure');await act(async()=>vi.advanceTimersByTime(1200));await press('Pause');
    expect(save.mock.calls.at(-1)[0].run.game.t).toBeGreaterThan(pausedTime);
    await press('End run and bank coins');
    await act(async()=>Alert.last[2].find(action=>action.text==='End and bank coins').onPress());
    saved=save.mock.calls.at(-1)[0];expect(saved.profile.runs).toBe(1);expect(saved.run).toBeNull();
  });
  it('resumes a suspended siege after unmounting and reopening the screen',async()=>{
    const save=vi.fn();await mount(<ScribbleSiege {...base} initial={emptyGames().siege} onSave={save} />);await press('Start a fresh siege');
    await act(async()=>vi.advanceTimersByTime(2100));await press('Pause');
    await act(async()=>renderer.unmount());renderer=null;
    const snapshot=JSON.parse(JSON.stringify(save.mock.calls.at(-1)[0]));const time=snapshot.run.game.t;
    await mount(<ScribbleSiege {...base} initial={snapshot} onSave={save} />);await press('Continue saved siege');
    await act(async()=>vi.advanceTimersByTime(1200));await press('Pause');
    expect(save.mock.calls.at(-1)[0].run.game.t).toBeGreaterThan(time);
  });
  it('saves a finger-drawn custom hero and starting weapon',async()=>{
    const save=vi.fn();await mount(<ScribbleSiege {...base} initial={emptyGames().siege} onSave={save} />);await press('Draw your own hero');
    const surface=()=>renderer.root.findAllByType('View').find(v=>typeof v.props.onPanResponderGrant==='function');
    await act(async()=>surface().props.onPanResponderGrant({nativeEvent:{locationX:30,locationY:30}}));
    await act(async()=>surface().props.onPanResponderMove({nativeEvent:{locationX:90,locationY:100}}));
    await act(async()=>surface().props.onPanResponderRelease());
    await press('Save my little hero');
    const custom=save.mock.calls.at(-1)[0].profile.custom;
    expect(custom.lines[0]).toHaveLength(2);expect(custom.weapon).toBe('darts');
  });
  it('pauses and snapshots Siege when the app goes into the background',async()=>{
    const save=vi.fn();await mount(<ScribbleSiege {...base} initial={emptyGames().siege} onSave={save} />);await press('Start a fresh siege');
    await act(async()=>vi.advanceTimersByTime(1200));
    await act(async()=>{for(const listener of AppState.listeners)listener('background');});
    expect(save.mock.calls.at(-1)[0].run.game.t).toBeGreaterThan(0);
    expect(text(renderer.toJSON())).toContain('A little breather.');
  });
});
